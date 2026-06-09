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
const hasMov = (eq, eff) => MOVEMENTS.some((m) => m.equipment.includes(eq) && m.equipment.some((e) => eff.has(e)));

for (const equipment of EQUIP_SETS) {
  const eff = effOf(equipment);
  for (const time of TIMES) for (const level of LEVELS) for (const goal of GOALS) {
    for (let r = 0; r < REPEAT; r++) {
      const w = generateWorkout({ time, level, goal, equipment });
      runs++;
      const all = [...w.warmup.movements, ...w.main.movements, ...w.cooldown.movements];

      // COVERAGE: every selected piece of gear that has a usable movement must
      // actually appear in the MAIN piece (up to the number of main slots).
      const wildcard = equipment.includes('full_gym') || equipment.includes('park');
      const selectedReal = equipment.filter((e) => e !== 'none');
      if (selectedReal.length && !wildcard) {
        const mainEq = new Set(w.main.movements.flatMap((pm) => byName.get(pm.name)?.equipment || []));
        const coverable = selectedReal.filter((eq) => hasMov(eq, eff));
        const covered = coverable.filter((eq) => mainEq.has(eq));
        const expected = Math.min(coverable.length, w.main.movements.length);
        covChecks++;
        if (covered.length < expected)
          violations.push(`COVERAGE: equip=[${equipment}] ${level}/${goal} t=${time} — covered ${covered.length}/${expected} (main uses [${[...mainEq]}])`);
      }
      // sanity: structure present
      if (!w.warmup.movements.length || !w.main.movements.length || !w.cooldown.movements.length) {
        violations.push(`EMPTY SECTION: equip=${equipment} t=${time} ${level}/${goal}`);
      }
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
