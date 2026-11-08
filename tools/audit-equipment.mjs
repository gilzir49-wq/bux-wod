// Equipment-respect fuzz test — runs the REAL engine hundreds of times across
// equipment/level/goal/time combos and asserts the engine never prescribes a
// movement (warm-up OR main OR cool-down) that the chosen equipment can't do.
// Run with: npx --yes tsx tools/audit-equipment.mjs
import { generateWorkout } from '../lib/engine.ts';
import { MOVEMENTS, WARMUP_POOL, COOLDOWN_POOL } from '../lib/movements.ts';

// Map equipment-gated warm-up/cool-down moves (by name) to what they need.
const GATED = new Map();
for (const m of [...WARMUP_POOL, ...COOLDOWN_POOL]) if (m.needs) GATED.set(m.name, m.needs);

// Replicate the engine's availability rule (kept private in engine.ts).
const FULL_GYM = ['none','pullup_bar','dumbbells','kettlebell','barbell','bands','jump_rope','box','rings','rower','bike','skierg'];
function effOf(sel) {
  const s = new Set(sel); s.add('none');
  if (sel.includes('full_gym')) FULL_GYM.forEach(e => s.add(e));
  if (sel.includes('park')) { s.add('pullup_bar'); s.add('box'); }
  return s;
}
const byName = new Map();
for (const m of MOVEMENTS) byName.set(m.name, m);

const TIMES = [15,20,30,40,45,60];
const LEVELS = ['beginner','intermediate','advanced'];
const GOALS = ['strength','cardio','general','gymnastics'];
const EQUIP_SETS = [
  ['none'],
  ['dumbbells'],
  ['kettlebell'],
  ['barbell'],
  ['jump_rope'],
  ['pullup_bar'],
  ['rings'],
  ['box'],
  ['bands'],
  ['rower'],['bike'],['skierg'],
  ['park'],
  ['full_gym'],
  ['none','dumbbells','jump_rope'],
  ['pullup_bar','kettlebell'],
  ['dumbbells','box','rings'],
];

let runs = 0, checks = 0, violations = [], covChecks = 0;
const REPEAT = 6; // each combo several times (engine is randomized)
const STRUCTURES = ['full', 'strength', 'metcon'];
const hasMov = (eq, eff) => MOVEMENTS.some((m) => m.equipment.includes(eq) && m.equipment.some((e) => eff.has(e)));

for (const equipment of EQUIP_SETS) {
  const eff = effOf(equipment);
  for (const time of TIMES) for (const level of LEVELS) for (const goal of GOALS) {
    for (const structure of STRUCTURES) for (let r = 0; r < REPEAT; r++) {
      const w = generateWorkout({ time, level, goal, equipment, structure, includeWarmup: true, includeCooldown: true });
      runs++;
      const blocks = [w.warmup, w.strength, w.main, w.cooldown].filter(Boolean);
      const all = blocks.flatMap((b) => b.movements);

      // COVERAGE applies to the metcon (when present). A strength-only block is
      // a single lift and isn't expected to cover every selected piece of gear.
      const wildcard = equipment.includes('full_gym') || equipment.includes('park');
      const selectedReal = equipment.filter((e) => e !== 'none');
      if (w.main && selectedReal.length && !wildcard) {
        const mainEq = new Set(w.main.movements.flatMap((pm) => byName.get(pm.name)?.equipment || []));
        const coverable = selectedReal.filter((eq) => hasMov(eq, eff));
        const covered = coverable.filter((eq) => mainEq.has(eq));
        const expected = Math.min(coverable.length, w.main.movements.length);
        covChecks++;
        if (covered.length < expected)
          violations.push(`COVERAGE: equip=[${equipment}] ${level}/${goal} t=${time} s=${structure} — covered ${covered.length}/${expected}`);
      }
      // sanity: warm-up + cool-down present (toggles on) and a work block exists
      if (!w.warmup || !w.warmup.movements.length) violations.push(`NO WARMUP: ${equipment} s=${structure}`);
      if (!w.cooldown || !w.cooldown.movements.length) violations.push(`NO COOLDOWN: ${equipment} s=${structure}`);
      if (!w.strength?.movements.length && !w.main?.movements.length)
        violations.push(`EMPTY WORK: equip=${equipment} t=${time} ${level}/${goal} s=${structure}`);
      for (const pm of all) {
        // gated warm-up/cool-down mobility move (e.g. Scapular Pull-ups → bar)
        if (GATED.has(pm.name)) {
          checks++;
          if (!eff.has(GATED.get(pm.name)))
            violations.push(`WARMUP LEAK: "${pm.name}" needs ${GATED.get(pm.name)} but equip=[${equipment}]`);
          continue;
        }
        const lib = byName.get(pm.name);
        if (!lib) continue; // pure-bodyweight mobility move; always fine
        checks++;
        const ok = lib.equipment.some((e) => eff.has(e));
        if (!ok) violations.push(`LEAK: "${pm.name}" needs [${lib.equipment}] but equip=[${equipment}] (t=${time} ${level}/${goal})`);
      }
    }
  }
}

console.log(`runs: ${runs}  movement-checks: ${checks}  coverage-checks: ${covChecks}`);
if (violations.length) {
  console.log(`\n❌ ${violations.length} VIOLATIONS:`);
  [...new Set(violations)].slice(0, 40).forEach((v) => console.log('  ' + v));
  process.exit(1);
} else {
  console.log('\n✅ ZERO violations — engine never prescribes unavailable equipment.');
}
