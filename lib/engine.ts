import {
  COOLDOWN_POOL,
  MOVEMENTS,
  WARMUP_POOL,
  WarmupMove,
} from './movements';
import {
  Equipment,
  GeneratorInput,
  Goal,
  Level,
  MainPiece,
  Movement,
  PrescribedMovement,
  Unit,
  Workout,
  WorkoutSection,
} from './types';

// ---------- small utilities ----------
function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

function roundTo(n: number, step: number): number {
  return Math.max(step, Math.round(n / step) * step);
}

// ---------- equipment / level filtering ----------
const FULL_GYM_WILDCARD: Equipment[] = [
  'none',
  'pullup_bar',
  'dumbbells',
  'kettlebell',
  'barbell',
  'bands',
  'jump_rope',
  'box',
  'rings',
  'rower',
  'bike',
  'skierg',
];

// Resolve the "effective" equipment set, expanding the wildcards.
function effectiveEquipment(selected: Equipment[]): Set<Equipment> {
  const set = new Set<Equipment>(selected);
  // bodyweight is always possible.
  set.add('none');
  if (selected.includes('full_gym')) {
    FULL_GYM_WILDCARD.forEach((e) => set.add(e));
  }
  if (selected.includes('park')) {
    // A park typically has open space, a bar, and a bench-like surface.
    set.add('pullup_bar');
    set.add('box');
  }
  return set;
}

function movementAvailable(m: Movement, eff: Set<Equipment>): boolean {
  return m.equipment.some((e) => eff.has(e));
}

function levelOk(m: Movement, level: Level): boolean {
  return m.levels.includes(level);
}

// Level scaling for volume.
const LEVEL_REP_MULT: Record<Level, number> = {
  beginner: 0.7,
  intermediate: 1,
  advanced: 1.25,
};

// ---------- time budgeting ----------
function warmupMinutes(time: number): number {
  if (time <= 15) return 4;
  if (time <= 20) return 5;
  if (time <= 30) return 6;
  return time >= 60 ? 8 : 7;
}
function cooldownMinutes(time: number): number {
  if (time <= 20) return 3;
  if (time <= 30) return 4;
  return time >= 60 ? 6 : 5;
}

// ---------- prescription formatting (Hebrew) ----------
function formatDetail(reps: number, unit: Unit): string {
  switch (unit) {
    case 'reps':
      return `${reps} חזרות`;
    case 'cal':
      return `${reps} קלוריות`;
    case 'm':
      return `${reps} מטר`;
    case 'sec':
      return `${reps} שניות`;
  }
}

function prescribe(m: Movement, level: Level, repsOverride?: number): PrescribedMovement {
  let reps =
    repsOverride ??
    Math.round(m.baseReps * LEVEL_REP_MULT[level]);
  // keep monostructural distances/cals tidy
  if (m.unit === 'm') reps = roundTo(reps, 50);
  if (m.unit === 'cal') reps = Math.max(6, reps);
  if (m.unit === 'sec') reps = roundTo(reps, 5);
  return {
    name: m.name,
    detail: formatDetail(reps, m.unit),
    youtube: m.youtube,
    scaling: m.scaling,
  };
}

// ---------- warm-up & cool-down ----------
function buildWarmup(time: number, eff: Set<Equipment>): WorkoutSection {
  const mins = warmupMinutes(time);
  const count = time <= 20 ? 4 : time <= 40 ? 5 : 6;
  // Drop warm-up moves whose required equipment the athlete doesn't have, so a
  // bodyweight-only warm-up stays fully doable (no "Scapular Pull-ups" w/o a bar).
  const pool = WARMUP_POOL.filter((w) => !w.needs || eff.has(w.needs));
  const moves: WarmupMove[] = sample(pool, count);
  return {
    title: 'חימום',
    durationLabel: `${mins} דק׳`,
    movements: moves.map((w) => ({
      name: w.name,
      detail: w.detail,
      youtube: w.youtube,
    })),
    note: 'בצעו 2 סבבים בקצב קל-בינוני. המטרה: להעלות דופק, לפתוח מפרקים ולהתעורר לתנועה.',
  };
}

function buildCooldown(time: number): WorkoutSection {
  const mins = cooldownMinutes(time);
  const count = time <= 20 ? 3 : 4;
  const moves: WarmupMove[] = sample(COOLDOWN_POOL, count);
  return {
    title: 'שחרור ומוביליטי',
    durationLabel: `${mins} דק׳`,
    movements: moves.map((w) => ({
      name: w.name,
      detail: w.detail,
      youtube: w.youtube,
    })),
    note: 'נשמו עמוק, הישארו בכל מתיחה בלי כאב והורידו דופק בהדרגה. כל הכבוד על האימון! 🦌',
  };
}

// ---------- movement pools by modality ----------
function poolFor(
  modality: Movement['modality'],
  level: Level,
  eff: Set<Equipment>,
): Movement[] {
  return MOVEMENTS.filter(
    (m) =>
      m.modality === modality &&
      movementAvailable(m, eff) &&
      levelOk(m, level),
  );
}

const LEVEL_RANK: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };

// All movements that use a given piece of equipment and are reachable with the
// athlete's gear. Prefer level-appropriate ones; if none (e.g. a beginner who
// owns a SkiErg / pull-up bar, whose movements are graded intermediate+), fall
// back to the EASIEST available tier — those movements carry scaling notes, so
// it's correct to still feature the gear the athlete explicitly said they have.
function movementsForEquipment(eq: Equipment, eff: Set<Equipment>, level: Level): Movement[] {
  const cands = MOVEMENTS.filter((m) => m.equipment.includes(eq) && movementAvailable(m, eff));
  if (!cands.length) return [];
  const levelMatch = cands.filter((m) => m.levels.includes(level));
  if (levelMatch.length) return levelMatch;
  const rank = (m: Movement) => Math.min(...m.levels.map((l) => LEVEL_RANK[l]));
  const minRank = Math.min(...cands.map(rank));
  return cands.filter((m) => rank(m) === minRank);
}

// fall back to an easier level if the requested level has nothing.
function poolWithFallback(
  modality: Movement['modality'],
  level: Level,
  eff: Set<Equipment>,
): Movement[] {
  const order: Level[] =
    level === 'advanced'
      ? ['advanced', 'intermediate', 'beginner']
      : level === 'intermediate'
      ? ['intermediate', 'beginner', 'advanced']
      : ['beginner', 'intermediate'];
  for (const lv of order) {
    const p = poolFor(modality, lv, eff);
    if (p.length) return p;
  }
  return [];
}

// ---------- main piece builders ----------
interface BuildCtx {
  input: GeneratorInput;
  eff: Set<Equipment>;
  mainMinutes: number;
}

// Choose 2-4 movements for a metcon. Two priorities, in order:
//   1) GUARANTEE the gear the athlete said they have actually shows up — every
//      selected piece of equipment that has a usable movement gets one in the
//      piece (up to the slot count). This is what members expect: "I told it I
//      have a kettlebell, so the workout should use my kettlebell."
//   2) Fill the rest with goal-weighted variety across modalities.
function chooseMetconMovements(
  ctx: BuildCtx,
  weighting: { weightlifting: number; gymnastics: number; cardio: number },
  desiredCount: number,
): Movement[] {
  const { input, eff } = ctx;
  const wl = poolWithFallback('weightlifting', input.level, eff);
  const gym = poolWithFallback('gymnastics', input.level, eff);
  const cardio = poolWithFallback('cardio', input.level, eff);
  const everyAvail = [...wl, ...gym, ...cardio];

  const chosen: Movement[] = [];
  const usedIds = new Set<string>();
  const add = (m?: Movement): boolean => {
    if (m && !usedIds.has(m.id)) {
      usedIds.add(m.id);
      chosen.push(m);
      return true;
    }
    return false;
  };

  // ---- 1) cover each explicitly selected piece of equipment ----
  // "full_gym"/"park" mean "I have lots of stuff" — no specific item to honor,
  // so we skip coverage and let the goal weighting drive the selection.
  const wildcard = input.equipment.includes('full_gym') || input.equipment.includes('park');
  const selectedReal = input.equipment.filter((e) => e !== 'none');
  if (selectedReal.length && !wildcard) {
    for (const eq of shuffle(selectedReal)) {
      if (chosen.length >= desiredCount) break;
      const usesEq = movementsForEquipment(eq, eff, input.level).filter((m) => !usedIds.has(m.id));
      if (!usesEq.length) continue;
      // among movements that use this gear, prefer the modality the goal favors
      // (e.g. strength + dumbbells → a loaded DB lift, cardio + rower → calories)
      const maxW = Math.max(...usesEq.map((m) => weighting[m.modality] ?? 0));
      const best = usesEq.filter((m) => (weighting[m.modality] ?? 0) === maxW);
      add(pick(best.length ? best : usesEq));
    }
  }

  // ---- 2) fill remaining slots by goal-weighted modality draw ----
  const buckets: { pool: Movement[]; weight: number }[] = [
    { pool: wl, weight: wl.length ? weighting.weightlifting : 0 },
    { pool: gym, weight: gym.length ? weighting.gymnastics : 0 },
    { pool: cardio, weight: cardio.length ? weighting.cardio : 0 },
  ].filter((b) => b.pool.length > 0 && b.weight > 0);

  let guard = 0;
  while (chosen.length < desiredCount && guard < 40 && buckets.length) {
    guard++;
    const total = buckets.reduce((s, b) => s + b.weight, 0);
    let r = Math.random() * total;
    let bucket = buckets[0];
    for (const b of buckets) {
      r -= b.weight;
      if (r <= 0) {
        bucket = b;
        break;
      }
    }
    const candidates = bucket.pool.filter((m) => !usedIds.has(m.id));
    if (!candidates.length) {
      buckets.splice(buckets.indexOf(bucket), 1);
      continue;
    }
    add(pick(candidates));
  }

  // guarantee at least one movement
  if (!chosen.length && everyAvail.length) add(pick(everyAvail));
  return chosen;
}

function goalWeighting(goal: Goal) {
  switch (goal) {
    case 'strength':
      return { weightlifting: 6, gymnastics: 2, cardio: 1 };
    case 'cardio':
      return { weightlifting: 1, gymnastics: 3, cardio: 6 };
    case 'gymnastics':
      return { weightlifting: 1, gymnastics: 7, cardio: 2 };
    case 'general':
    default:
      return { weightlifting: 3, gymnastics: 3, cardio: 3 };
  }
}

const GOAL_LABEL: Record<Goal, string> = {
  strength: 'כוח',
  cardio: 'סיבולת',
  general: 'כושר כללי',
  gymnastics: 'גימנסטיקה',
};

// Pick a format that fits the goal & time, then size it.
function buildMain(ctx: BuildCtx): MainPiece {
  const { input, mainMinutes } = ctx;
  const weighting = goalWeighting(input.goal);

  // Decide format.
  const formats = formatChoicesFor(input.goal, mainMinutes);
  const format = pick(formats);

  switch (format) {
    case 'EMOM':
      return buildEMOM(ctx, weighting);
    case 'AMRAP':
      return buildAMRAP(ctx, weighting);
    case 'Chipper':
      return buildChipper(ctx, weighting);
    case 'Rounds For Time':
      return buildRoundsForTime(ctx, weighting);
    case 'For Time':
    default:
      return buildForTime(ctx, weighting);
  }
}

function formatChoicesFor(goal: Goal, mainMinutes: number): MainPiece['format'][] {
  if (goal === 'strength') {
    return mainMinutes >= 18
      ? ['Rounds For Time', 'EMOM']
      : ['Rounds For Time', 'EMOM', 'For Time'];
  }
  if (goal === 'gymnastics') {
    return ['EMOM', 'AMRAP', 'Rounds For Time'];
  }
  if (goal === 'cardio') {
    return mainMinutes >= 16 ? ['AMRAP', 'For Time'] : ['AMRAP', 'For Time', 'EMOM'];
  }
  // general
  return mainMinutes >= 22
    ? ['AMRAP', 'Chipper', 'Rounds For Time']
    : ['AMRAP', 'For Time', 'Rounds For Time', 'EMOM'];
}

// AMRAP: round of 2-4 movements, "as many rounds as possible" in mainMinutes.
function buildAMRAP(ctx: BuildCtx, weighting: ReturnType<typeof goalWeighting>): MainPiece {
  const count = ctx.mainMinutes >= 18 ? 4 : ctx.mainMinutes >= 12 ? 3 : 2;
  const moves = chooseMetconMovements(ctx, weighting, count);
  const reps = repScaleForAmrap(ctx);
  const prescribed = moves.map((m) => prescribe(m, ctx.input.level, scaledReps(m, ctx, reps)));
  return {
    format: 'AMRAP',
    formatLine: `AMRAP — כמה שיותר סבבים ב-${ctx.mainMinutes} דקות`,
    goalLine: amrapGoalLine(moves),
    movements: prescribed,
    note: 'קצב קבוע מהדקה הראשונה. רשמו כמה סבבים + חזרות השלמתם.',
  };
}

// For Time: fixed rounds of a couplet/triplet, as fast as possible.
function buildForTime(ctx: BuildCtx, weighting: ReturnType<typeof goalWeighting>): MainPiece {
  const count = ctx.mainMinutes >= 16 ? 3 : 2;
  const moves = chooseMetconMovements(ctx, weighting, count);
  const rounds = ctx.mainMinutes >= 20 ? 5 : ctx.mainMinutes >= 12 ? 4 : 3;
  const prescribed = moves.map((m) => prescribe(m, ctx.input.level));
  return {
    format: 'For Time',
    formatLine: `${rounds} סבבים על זמן (For Time)`,
    goalLine: `סיימו את כל ${rounds} הסבבים מהר ככל האפשר — בטכניקה נקייה. Cap זמן: ${ctx.mainMinutes} דקות.`,
    movements: prescribed,
    note: `בצעו ${rounds} סבבים של הרשימה הבאה, אחד אחרי השני.`,
  };
}

// Rounds For Time with a heavier strength bias.
function buildRoundsForTime(
  ctx: BuildCtx,
  weighting: ReturnType<typeof goalWeighting>,
): MainPiece {
  const moves = chooseMetconMovements(ctx, weighting, ctx.mainMinutes >= 18 ? 3 : 2);
  const rounds = ctx.input.goal === 'strength' ? (ctx.mainMinutes >= 20 ? 5 : 4) : 4;
  const prescribed = moves.map((m) =>
    prescribe(m, ctx.input.level, ctx.input.goal === 'strength' ? strengthReps(m, ctx) : undefined),
  );
  return {
    format: 'Rounds For Time',
    formatLine: `${rounds} סבבים על זמן`,
    goalLine:
      ctx.input.goal === 'strength'
        ? 'משקלים מאתגרים, חזרות נמוכות. נוחו בין סטים כדי לשמור על טכניקה וכוח.'
        : `קצב חזק ויציב לאורך כל ${rounds} הסבבים.`,
    movements: prescribed,
    note: `בצעו ${rounds} סבבים. אפשר לנוח בין סבב לסבב לפי הצורך.`,
  };
}

// EMOM: every minute on the minute, alternating stations.
function buildEMOM(ctx: BuildCtx, weighting: ReturnType<typeof goalWeighting>): MainPiece {
  const stations = ctx.mainMinutes >= 16 ? 3 : 2;
  const moves = chooseMetconMovements(ctx, weighting, stations);
  const prescribed = moves.map((m, i) => {
    const p = prescribe(m, ctx.input.level, emomReps(m, ctx));
    return { ...p, detail: `דקה ${i + 1}: ${p.detail}` };
  });
  const totalMin = roundTo(ctx.mainMinutes, stations);
  return {
    format: 'EMOM',
    formatLine: `EMOM ${totalMin} דקות — תחנה כל דקה`,
    goalLine:
      'בכל דקה בצעו את התחנה ונוחו עד תחילת הדקה הבאה. בחרו עומס/חזרות שמשאירים ~15 שניות מנוחה.',
    movements: prescribed,
    note: `מחזוריות של ${stations} תחנות שחוזרת עד תום ${totalMin} הדקות.`,
  };
}

// Chipper: one long list, done once, top to bottom.
function buildChipper(ctx: BuildCtx, weighting: ReturnType<typeof goalWeighting>): MainPiece {
  const count = ctx.mainMinutes >= 30 ? 6 : 5;
  const moves = chooseMetconMovements(ctx, weighting, count);
  const prescribed = moves.map((m) =>
    prescribe(m, ctx.input.level, Math.round(m.baseReps * LEVEL_REP_MULT[ctx.input.level] * 1.5)),
  );
  return {
    format: 'Chipper',
    formatLine: `Chipper — סבב אחד, מלמעלה למטה (Cap ${ctx.mainMinutes} דק׳)`,
    goalLine: 'חתכו את הרשימה תחנה-תחנה. חלקו את החזרות לסטים קטנים כדי לא להישרף.',
    movements: prescribed,
    note: 'בצעו את כל התחנות פעם אחת, לפי הסדר, עד שמסיימים את הרשימה.',
  };
}

// ---------- rep scaling helpers ----------
function repScaleForAmrap(ctx: BuildCtx) {
  // smaller rounds so multiple rounds happen.
  return ctx.mainMinutes >= 18 ? 1 : 0.85;
}
function scaledReps(m: Movement, ctx: BuildCtx, factor: number): number {
  return Math.max(
    m.unit === 'cal' ? 6 : 5,
    Math.round(m.baseReps * LEVEL_REP_MULT[ctx.input.level] * factor),
  );
}
function strengthReps(m: Movement, ctx: BuildCtx): number {
  if (m.modality === 'weightlifting') {
    // heavier → fewer reps
    return Math.max(3, Math.round(m.baseReps * 0.6 * LEVEL_REP_MULT[ctx.input.level]));
  }
  return Math.round(m.baseReps * LEVEL_REP_MULT[ctx.input.level]);
}
function emomReps(m: Movement, ctx: BuildCtx): number {
  return Math.max(
    m.unit === 'cal' ? 8 : 6,
    Math.round(m.baseReps * 0.7 * LEVEL_REP_MULT[ctx.input.level]),
  );
}

function amrapGoalLine(moves: Movement[]): string {
  const hasGymHard = moves.some((m) => m.modality === 'gymnastics' && (m.load ?? 0) >= 2);
  if (hasGymHard) return 'קצב חכם — שברו את התרגילים הקשים לסטים קטנים לפני שמגיע הכשל.';
  return 'קצב חלק ורציף. נסו לשמור על תנועה כל הזמן ולמזער הפסקות.';
}

// ---------- public API ----------
export function generateWorkout(input: GeneratorInput): Workout {
  const eff = effectiveEquipment(input.equipment);
  const wMin = warmupMinutes(input.time);
  const cMin = cooldownMinutes(input.time);
  const mainMinutes = Math.max(6, input.time - wMin - cMin);

  const ctx: BuildCtx = { input, eff, mainMinutes };
  const warmup = buildWarmup(input.time, eff);
  const main = buildMain(ctx);
  const cooldown = buildCooldown(input.time);

  const title = `אימון ${GOAL_LABEL[input.goal]} · ${input.time} דק׳`;

  return {
    id: uid(),
    createdAt: Date.now(),
    time: input.time,
    level: input.level,
    goal: input.goal,
    equipment: input.equipment,
    title,
    warmup,
    main,
    cooldown,
  };
}
