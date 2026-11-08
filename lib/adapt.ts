// ===== Adapt "יומן באקס" today's workout to the athlete's gear + time =====
// Keeps the coach's structure, time domain and stimulus — only the movements
// change, and the volume is shortened/kept to fit the athlete's time.
//
// The movement-swap engine (parsing + rules + strengthAway) is ported from the
// battle-tested יומן-באקס engine (blocklab/lib/away/adapt.ts, 21 passing tests)
// so both apps adapt identically. On top of it we add real TIME scaling
// (shorten reps/distances, drop the strength block when very short) and a
// clean handling of the coach's ">" scaling chains. Unrecognised lines pass
// through unchanged (safe default). Everything renders as text only.

import { DiaryWod, DiarySection } from './diary';
import { Equipment } from './types';

export interface AdaptedLine {
  text: string;
  swapped: boolean;
}
export interface AdaptedSection {
  type: string;
  title: string;
  titleSwapped: boolean;
  badge: string;
  lines: AdaptedLine[];
}
export interface AdaptedWod {
  title: string;
  date: string;
  sections: AdaptedSection[];
  timeNote: string;
  origMinutes: number;
  timeMin: number;
}

// ---- effective equipment (mirrors the engine's wildcards) ----
function effOf(selected: Equipment[]): Set<Equipment> {
  const s = new Set<Equipment>(selected);
  s.add('none');
  if (selected.includes('full_gym')) {
    (['pullup_bar', 'dumbbells', 'kettlebell', 'barbell', 'bands', 'jump_rope', 'box', 'rings', 'rower', 'bike', 'skierg'] as Equipment[]).forEach((e) => s.add(e));
  }
  if (selected.includes('park')) {
    s.add('pullup_bar');
    s.add('box');
  }
  return s;
}

type AwayKey = 'dumbbells' | 'kettlebell' | 'pullup_bar' | 'bands' | 'jump_rope' | 'box' | 'cardio_machine' | 'barbell';
type Has = (e: AwayKey) => boolean;

function buildHas(equipment: Equipment[]): Has {
  const eff = effOf(equipment);
  const map: Record<AwayKey, boolean> = {
    dumbbells: eff.has('dumbbells'),
    kettlebell: eff.has('kettlebell'),
    pullup_bar: eff.has('pullup_bar') || eff.has('rings'),
    bands: eff.has('bands'),
    jump_rope: eff.has('jump_rope'),
    box: eff.has('box'),
    cardio_machine: eff.has('rower') || eff.has('bike') || eff.has('skierg'),
    barbell: eff.has('barbell'),
  };
  return (e) => map[e];
}

// ---------------------------------------------------------------- quantities ----------------------------------
interface Parsed {
  prefix: string;
  qty: string | null;
  unit: string; // "m" | "cal" | "sec" | ""
  rest: string;
}
const PREFIX = /^((?:\d+\.\s+)?(?:[a-e]\)\s*)?(?:[a-z][a-z \-]{0,18}\d*\s*:\s+|[a-d]\s*[-–]\s+)?)/i;
const SETS = /^(\d+\s*x\s*\d+(?:\s*[-/]\s*\d+)*(?:\/side)?(?:\s*(?:sec|min)\b)?)\s+/i;
const QTY = /^(max|\d+(?:[./]\d+)*(?:\s*-\s*\d+(?:[./]\d+)*)*)(?![:\d])\s*(m|meters?|cal(?:ories)?|sec|s|min)?\b\.?\s*(?:x\s*)?/i;

function parse(text: string): Parsed {
  let t = text.trim();
  const p = PREFIX.exec(t);
  const prefix = p ? p[0] : '';
  t = t.slice(prefix.length);
  const sets = SETS.exec(t);
  if (sets) return { prefix, qty: sets[1]!.replace(/\s*x\s*/i, ' x '), unit: '', rest: t.slice(sets[0].length) };
  const q = QTY.exec(t);
  if (!q) return { prefix, qty: null, unit: '', rest: t };
  const u = (q[2] ?? '').toLowerCase();
  const unit = u.startsWith('m') && u !== 'min' ? 'm' : u.startsWith('cal') ? 'cal' : u === 's' || u === 'sec' ? 'sec' : u;
  const qty = /^max$/i.test(q[1]!) ? 'Max' : q[1]!.replace(/\s+/g, '');
  return { prefix, qty, unit, rest: t.slice(q[0].length) };
}
function firstNum(qty: string | null): number | null {
  if (!qty) return null;
  const n = Number(/^\d+(?:\.\d+)?/.exec(qty)?.[0]);
  return Number.isFinite(n) ? n : null;
}
function scale(qty: string | null, f: number): string | null {
  if (!qty || f === 1) return qty;
  if (/sec|min/i.test(qty)) return qty;
  const sx = /^(\d+ x )(.*)$/.exec(qty);
  if (sx) return sx[1] + scale(sx[2]!, f)!;
  return qty.replace(/\d+(?:\.\d+)?/g, (n) => String(Math.max(1, Math.round(Number(n) * f))));
}
const round50 = (n: number) => Math.max(50, Math.round(n / 50) * 50);
function withQty(prefix: string, qty: string | null, unit: string, name: string): string {
  if (!qty) return `${prefix}${name}`;
  const u = unit === 'm' ? 'm ' : unit === 'cal' ? ' cal ' : unit === 'sec' ? ' sec ' : ' ';
  return `${prefix}${qty}${u}${name}`.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- line rules ----------------------------------
interface Ctx {
  has: Has;
  weights: boolean;
}
type Rule = { test: RegExp; out: (p: Parsed, c: Ctx) => string | null };
const DB = (c: Ctx) => (c.has('dumbbells') ? 'DB' : 'KB');

function pullAlt(p: Parsed, c: Ctx, factor = 1): string {
  if (c.has('bands')) return withQty(p.prefix, scale(p.qty, factor * 1.5), '', 'Band Rows');
  if (c.weights) return withQty(p.prefix, scale(p.qty, factor * 1.5), '', `${DB(c)} Bent-over Rows`);
  return withQty(p.prefix, scale(p.qty, factor * 2), '', 'Superman Lat Pulls (lying on the floor)');
}
function cardioToRun(p: Parsed): string {
  if (firstNum(p.qty) === null) return `${p.prefix}Run`;
  const n = firstNum(p.qty) ?? 0;
  const meters = p.unit === 'cal' ? round50(n * 12) : p.unit === 'm' ? round50(n * 0.8) : p.unit === 'sec' || p.unit === 'min' ? 0 : round50(n * 12);
  if (!meters) return `${p.prefix}${p.qty ?? ''}${p.unit ? ' ' + p.unit : ''} Run`.replace(/\s+/g, ' ').trim();
  return `${p.prefix}${meters}m Run`;
}
const RULES: Rule[] = [
  {
    test: /\b(row|bike|ski|erg|any machine|air bike|assault|echo)\b/i,
    out: (p, c) => {
      if (c.has('cardio_machine')) return null;
      const comma = /,\s*(?=\d)/.exec(p.rest);
      if (comma) {
        const tail = p.rest.slice(comma.index + comma[0].length);
        const head = adaptLine(`${p.qty ?? ''}${p.unit === 'm' ? 'm' : p.unit === 'cal' ? ' cal' : ''} ${p.rest.slice(0, comma.index)}`.trim(), c) ?? '';
        const t2 = adaptLine(tail, c) ?? tail;
        return `${p.prefix}${head}, ${t2}`;
      }
      const run = /^(\d+)\s*m\s*run\b/i.exec(`${p.qty ?? ''}${p.unit === 'm' ? 'm' : ''} ${p.rest}`);
      if (run) return `${p.prefix}${run[1]}m Run`;
      if (/\brun\b/i.test(p.rest) && p.unit === 'm' && p.qty) return `${p.prefix}${p.qty}m Run`;
      return cardioToRun(p);
    },
  },
  { test: /\b(double[- ]?unders?|dus?)\b|single[- ]single[- ]double/i, out: (p, c) => (c.has('jump_rope') ? null : withQty(p.prefix, scale(p.qty, 2), '', 'Jumping Jacks')) },
  { test: /\bsingle[- ]?unders?\b/i, out: (p, c) => (c.has('jump_rope') ? null : withQty(p.prefix, p.qty, '', 'Jumping Jacks')) },
  { test: /\brope climbs?\b/i, out: (p, c) => (c.has('pullup_bar') ? withQty(p.prefix, scale(p.qty, 3), '', 'Pull-ups') : pullAlt(p, c, 3)) },
  { test: /\bmuscle[- ]?ups?\b/i, out: (p, c) => (c.has('pullup_bar') && !/ring/i.test(p.rest) ? null : withQty(p.prefix, scale(p.qty, 3), '', 'Push-ups') + ' + ' + pullAlt({ ...p, prefix: '' }, c, 3)) },
  { test: /\bburpee[- ]pull[- ]?ups?\b/i, out: (p, c) => (c.has('pullup_bar') ? null : withQty(p.prefix, p.qty, '', 'Burpee Tuck Jumps')) },
  { test: /\b(toes?[- ]to[- ]bar|t2b|knees?[- ]to[- ]elbows?|knee raises?|hanging)\b/i, out: (p, c) => (c.has('pullup_bar') ? null : withQty(p.prefix, p.qty, '', 'V-ups')) },
  { test: /\b(chest[- ]to[- ]bar|c2b|pull[- ]?ups?|chin[- ]?ups?|ring rows?|kip(?:ping)? swings?|scap pull)/i, out: (p, c) => (c.has('pullup_bar') ? null : pullAlt(p, c)) },
  { test: /\b(ring|bar|parallette)?\s*dips?\b/i, out: (p, c) => (c.has('box') ? withQty(p.prefix, p.qty, '', 'Bench Dips') : withQty(p.prefix, scale(p.qty, 2), '', 'Push-ups')) },
  { test: /\bwall[- ]?ball sit[- ]?ups?\b/i, out: (p) => withQty(p.prefix, p.qty, '', 'Sit-ups') },
  { test: /\bwall[- ]?balls?(?: shots?)?\b/i, out: (p, c) => (c.weights ? withQty(p.prefix, p.qty, '', `${DB(c)} Thrusters (light)`) : withQty(p.prefix, p.qty, '', 'Jump Squats')) },
  { test: /\b(kb|kettlebell|american|russian|db|dumbbell)\b.*\bswings?\b/i, out: (p, c) => (c.has('kettlebell') ? null : c.has('dumbbells') ? withQty(p.prefix, p.qty, '', 'DB Swings') : withQty(p.prefix, p.qty, '', 'Jump Squats')) },
  { test: /\bburpee box jump[- ]?overs?\b/i, out: (p, c) => (c.has('box') ? null : withQty(p.prefix, p.qty, '', 'Burpee Broad Jumps')) },
  { test: /\bbox jump[- ]?overs?\b/i, out: (p, c) => (c.has('box') ? null : withQty(p.prefix, p.qty, '', 'Broad Jumps')) },
  { test: /\bbox jumps?\b/i, out: (p, c) => (c.has('box') ? null : withQty(p.prefix, p.qty, '', 'Tuck Jumps')) },
  { test: /\b(box )?step[- ]?(ups?|overs?)\b/i, out: (p, c) => (c.has('box') ? null : withQty(p.prefix, p.qty, '', c.weights ? `${DB(c)} Reverse Lunges` : 'Reverse Lunges')) },
  { test: /\b(bar[- ]facing|over the bar|over (?:the )?db|lateral) (burpees?|bpz)|\bburpees? over\b|\bbpz over\b/i, out: (p, c) => (c.has('barbell') ? null : withQty(p.prefix, p.qty, '', 'Lateral Burpees over a line')) },
  { test: /\bfarmers?'? (carry|walk)\b/i, out: (p, c) => (c.weights ? null : `${p.prefix}${p.unit === 'm' && p.qty ? `${p.qty}m ` : ''}Bear Crawl`.trim()) },
  { test: /\b(carry|carries)\b/i, out: (p, c) => (c.weights ? `${p.prefix}${p.unit === 'm' && p.qty ? `${p.qty}m ` : ''}${DB(c)} Farmers Carry`.trim() : `${p.prefix}${p.unit === 'm' && p.qty ? `${p.qty}m ` : ''}Bear Crawl`.trim()) },
  { test: /\bsandbag\b.*\b(lunges?)\b/i, out: (p, c) => withQty(p.prefix, p.qty, '', c.weights ? `${DB(c)} Walking Lunges` : 'Walking Lunges') },
  { test: /\bsandbag\b.*\bsquats?\b/i, out: (p, c) => withQty(p.prefix, p.qty, '', c.weights ? `${DB(c)} Front Squats` : 'Air Squats') },
  { test: /\bsandbag\b.*\bdeadlifts?\b/i, out: (p, c) => withQty(p.prefix, p.qty, '', c.weights ? `${DB(c)} Deadlifts` : 'Single-leg RDL (bodyweight)') },
  { test: /\bsandbag\b/i, out: (p, c) => withQty(p.prefix, p.qty, '', c.weights ? `${DB(c)} Clean & Press` : 'Burpees') },
  { test: /\bghd\b/i, out: (p) => withQty(p.prefix, p.qty, '', 'Sit-ups') },
  {
    test: /\b(db|dumbbell|kb|kettlebell|devil press)\b/i,
    out: (p, c) => {
      if (c.weights) {
        const isDb = /\b(db|dumbbells?)\b/i.test(p.rest);
        const isKb = /\b(kb|kettlebells?)\b/i.test(p.rest);
        if (isDb && !c.has('dumbbells')) return withQty(p.prefix, p.qty, p.unit, stripLoad(p.rest.replace(/\b(db|dumbbells?)\b/gi, 'KB')));
        if (isKb && !c.has('kettlebell')) return withQty(p.prefix, p.qty, p.unit, stripLoad(p.rest.replace(/\b(kb|kettlebells?)\b/gi, 'DB')));
        return null;
      }
      if (/lunge/i.test(p.rest)) return withQty(p.prefix, p.qty, p.unit, 'Walking Lunges');
      if (/thruster/i.test(p.rest)) return withQty(p.prefix, p.qty, '', 'Jump Squats');
      if (/squat/i.test(p.rest)) return withQty(p.prefix, p.qty, '', 'Air Squats');
      if (/deadlift|rdl/i.test(p.rest) && !/high pull/i.test(p.rest)) return withQty(p.prefix, p.qty, '', 'Single-leg RDL (bodyweight)');
      if (/press|jerk|push/i.test(p.rest) && !/devil|clean/i.test(p.rest)) return withQty(p.prefix, p.qty, '', 'Pike Push-ups');
      if (/row/i.test(p.rest)) return pullAlt(p, c);
      return withQty(p.prefix, p.qty, '', 'Burpees');
    },
  },
  { test: /\b(deadlifts?|sdhp|sumo)\b/i, out: (p, c) => (c.has('barbell') ? null : c.weights ? withQty(p.prefix, p.qty, '', `${DB(c)} Deadlifts`) : withQty(p.prefix, p.qty, '', 'Single-leg RDL (bodyweight)')) },
  { test: /\b(cleans?|snatch(?:es)?)\b|\bc&j\b/i, out: (p, c) => (c.has('barbell') ? null : c.weights ? withQty(p.prefix, p.qty, '', `${DB(c)} ${/snatch/i.test(p.rest) ? 'Alternating Snatches' : /jerk/i.test(p.rest) ? 'Hang Clean & Jerks' : 'Hang Power Cleans'}`) : withQty(p.prefix, p.qty, '', 'Burpees')) },
  { test: /\bthrusters?\b/i, out: (p, c) => (c.has('barbell') ? null : c.weights ? withQty(p.prefix, p.qty, '', `${DB(c)} Thrusters`) : withQty(p.prefix, p.qty, '', 'Jump Squats')) },
  { test: /\b(shoulder[- ]to[- ]overhead|s2oh|push press|push jerks?|strict press|overhead press|jerks?)\b/i, out: (p, c) => (c.has('barbell') ? null : c.weights ? withQty(p.prefix, p.qty, '', `${DB(c)} Push Press`) : withQty(p.prefix, p.qty, '', 'Pike Push-ups')) },
  { test: /\b(front|back|overhead) squats?\b/i, out: (p, c) => (c.has('barbell') ? null : c.weights ? withQty(p.prefix, p.qty, '', `${DB(c)} Front Squats`) : withQty(p.prefix, scale(p.qty, 2), '', 'Air Squats')) },
  { test: /\bbench press\b/i, out: (p, c) => (c.has('barbell') ? null : withQty(p.prefix, scale(p.qty, c.weights ? 1 : 2), '', c.weights ? `${DB(c)} Floor Press` : 'Push-ups')) },
];
function stripLoad(s: string): string {
  return s
    .replace(/\s*\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?\s*(?:kg|lb|lbs|cm|")\b/gi, '')
    .replace(/\s*\d+\s*x\s*(?=\s|$)/gi, ' ')
    .replace(/\s*@\s*\d+\s*%/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function adaptLine(text: string, c: Ctx): string | null {
  if (/[a-z]{3,}\.\s+[A-Z][a-z]/.test(text)) return null;
  const pre = PREFIX.exec(text.trim());
  const body = pre ? text.trim().slice(pre[0].length) : text.trim();
  if (/\s\+\s/.test(body)) {
    const parts = body.split(/\s\+\s/);
    const outs = parts.map((part) => adaptLine(part, c));
    if (outs.every((o) => o === null)) return null;
    return `${pre ? pre[0] : ''}${parts.map((part, i) => outs[i] ?? part.trim()).join(' + ')}`;
  }
  const p = parse(text);
  if (!p.qty && p.rest.split(/\s+/).length > 6) return null;
  if (/[a-z]{3,}\.\s+[A-Z][a-z]/.test(p.rest)) return null;
  if (!p.rest || /^(rest|score|cap|for time|amrap|emom|then|in teams|i go|every|\()/i.test(p.rest.trim())) return null;
  const head = p.rest.split('>')[0]!;
  for (const r of RULES) {
    if (!r.test.test(head)) continue;
    const out = r.out({ ...p, rest: head }, c);
    if (out === null) return null;
    const clean = out.replace(/\s+/g, ' ').trim();
    return clean && clean !== text.trim() ? clean : null;
  }
  return null;
}

// ---------------------------------------------------------------- strength parts ------------------------------
const BARBELL_KEYS = /squat|deadlift|clean|snatch|jerk|press|thruster/i;
function liftFamily(title: string, lines: string[]): 'squat' | 'hinge' | 'olympic' | 'press' | null {
  const hay = `${title} ${lines.join(' ')}`.toLowerCase();
  if (/snatch|clean|jerk/.test(hay)) return 'olympic';
  if (/squat/.test(hay)) return 'squat';
  if (/deadlift|rdl|good morning|hip thrust/.test(hay)) return 'hinge';
  if (/press|bench/.test(hay)) return 'press';
  return null;
}
function strengthAway(s: DiarySection, c: Ctx): string[] | null {
  if (s.type !== 'strength' || c.has('barbell')) return null;
  const barbell = BARBELL_KEYS.test(s.title) || s.lines.some((l) => BARBELL_KEYS.test(l));
  if (!barbell) return null;
  const fam = liftFamily(s.title, s.lines);
  const w = c.weights ? DB(c) : null;
  return fam === 'squat'
    ? w
      ? [`5 x 8 ${w} Front Squats (Goblet) — heavy, perfect positions`, '3 x 10 Jump Squats, rest 1:00']
      : ['5 x 6/side Bulgarian Split Squats, 3 sec lowering', '3 x 10 Jump Squats, rest 1:00']
    : fam === 'hinge'
      ? w
        ? [`5 x 10 ${w} Romanian Deadlifts, 3 sec lowering`, '3 x 12 Glute Bridges, 2 sec squeeze']
        : ['5 x 8/side Single-leg RDL, slow', '3 x 15 Glute Bridges, 2 sec squeeze']
      : fam === 'olympic'
        ? w
          ? [`6 x 5/side ${w} Hang Power Snatches, fast and crisp`, `4 x 6 ${w} Hang Power Cleans`]
          : ['6 x 5 Broad Jumps, max effort', '6 x 3 Tuck Jumps, full rest']
        : fam === 'press'
          ? w
            ? [`5 x 8 ${w} Push Press`, `3 x 10 ${w} Strict Press, slow lowering`]
            : ['5 x max Pike Push-ups (stop 2 reps before failure)', '3 x 10 Push-ups, 3 sec lowering']
          : w
            ? [`5 x 8 ${w} Thrusters`, '3 x 10 Jump Squats']
            : ['5 x 10 Air Squats, 3 sec lowering', '5 x 10 Push-ups'];
}

// ---------------------------------------------------------------- time scaling --------------------------------
// Volume (reps/distances) actually shortened to fit the time — for fixed-work
// formats (for time / rounds). Time-based formats (AMRAP / EMOM / intervals)
// instead have their DURATION shortened (below), never their reps.
function scaleVolumeLine(text: string, f: number): { text: string; changed: boolean } {
  if (f >= 1) return { text, changed: false };
  const p = parse(text);
  if (!p.qty || /x/i.test(p.qty) || p.unit === 'sec' || p.unit === 'min' || /^max$/i.test(p.qty)) {
    return { text, changed: false };
  }
  const scaled = p.unit === 'm' ? String(round50((firstNum(p.qty) ?? 0) * f)) : scale(p.qty, f);
  if (!scaled || scaled === p.qty) return { text, changed: false };
  return { text: withQty(p.prefix, scaled, p.unit, p.rest), changed: true };
}

// shorten a "Cap N min" / "N min cap" reference in a line or title
function scaleCapText(text: string, f: number): string {
  if (f >= 1) return text;
  return text
    .replace(/\bcap\s*(\d+)\s*min/gi, (_m, n) => `Cap ${Math.max(1, Math.round(+n * f))} min`)
    .replace(/(\d+)\s*min\s*cap/gi, (_m, n) => `${Math.max(1, Math.round(+n * f))} min cap`);
}

const collapsePrimary = (l: string) => (l.includes('>') ? l.split('>')[0]!.trim() : l);

// ---- interval / time-based structure --------------------------------------------------------
const IV = /(\d+)\s*[x×]\s*(\d+):(\d{2})/i; // "4 x 7:00"
const AMRAP_N = /\b(amrap|emom)\b[^0-9]*(\d+)/i; // "AMRAP 12", "EMOM 20"
const secToClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

interface Intervals {
  rounds: number;
  workSec: number;
  restSec: number;
}
function detectIntervals(title: string, lines: string[]): Intervals | null {
  const m = IV.exec(title) || lines.map((l) => IV.exec(l)).find(Boolean);
  if (!m) return null;
  const rounds = +m[1]!;
  const workSec = +m[2]! * 60 + +m[3]!;
  let restSec = 0;
  for (const l of lines) {
    const r = /rest\s*(\d+):(\d{2})/i.exec(l) || /(\d+):(\d{2})\s*rest/i.exec(l);
    if (r) {
      restSec = +r[1]! * 60 + +r[2]!;
      break;
    }
  }
  return { rounds, workSec, restSec };
}
function totalSec(iv: Intervals): number {
  return iv.rounds * iv.workSec + Math.max(0, iv.rounds - 1) * iv.restSec;
}
// shrink an interval block to fit targetSec. KEEP the round count fixed (it must
// equal the number of listed AMRAP/round blocks) and shorten each round's work +
// rest instead; only when the blocks don't fit even at a 1:30 floor do we reduce.
function scaleIntervals(iv: Intervals, targetSec: number): Intervals | null {
  if (totalSec(iv) <= targetSec) return null;
  const ratio = targetSec / totalSec(iv);
  const r = iv.restSec ? Math.max(30, Math.round((iv.restSec * ratio) / 15) * 15) : 0;
  let n = iv.rounds;
  // most workouts fit all rounds; floor work to 30s so we don't exceed the budget
  let w = Math.floor((targetSec - Math.max(0, n - 1) * r) / n / 30) * 30;
  while (n > 1 && w < 90) {
    n--;
    w = Math.floor((targetSec - Math.max(0, n - 1) * r) / n / 30) * 30;
  }
  w = Math.max(60, w);
  const out = { rounds: n, workSec: w, restSec: r };
  return out.rounds === iv.rounds && out.workSec === iv.workSec && out.restSec === iv.restSec ? null : out;
}
interface TimeRewrite {
  title: string;
  lines: string[];
  rewrite: (t: string) => string; // apply the same shortening to another title (e.g. the main one)
  droppedRounds: number; // how many trailing blocks to remove from a listed set
}
// rewrite a time-based section's title + structure lines to the new, shorter timing
function adaptTimeStructure(title: string, lines: string[], targetSec: number): TimeRewrite | null {
  const iv = detectIntervals(title, lines);
  if (iv) {
    const ni = scaleIntervals(iv, targetSec);
    if (!ni) return null;
    const rep = `${ni.rounds} x ${secToClock(ni.workSec)}`;
    const rewrite = (t: string) =>
      t
        .replace(IV, rep)
        .replace(/rest\s*\d+:\d{2}/i, `Rest ${secToClock(ni.restSec)}`)
        .replace(/\d+:\d{2}\s*rest/i, `${secToClock(ni.restSec)} rest`);
    return { title: rewrite(title), lines: lines.map(rewrite), rewrite, droppedRounds: iv.rounds - ni.rounds };
  }
  // single AMRAP/EMOM duration → just shorten the minutes
  const src = AMRAP_N.exec(title) || lines.map((l) => AMRAP_N.exec(l)).find(Boolean);
  if (src) {
    const curSec = +src[2]! * 60;
    if (curSec <= targetSec) return null;
    const nd = Math.max(1, Math.round(targetSec / 60));
    if (nd === +src[2]!) return null;
    const rewrite = (t: string) => t.replace(AMRAP_N, (_m, p) => `${String(p).toUpperCase()} ${nd}`);
    return { title: rewrite(title), lines: lines.map(rewrite), rewrite, droppedRounds: 0 };
  }
  return null;
}

// strip partner/team phrasing from a title for a lone athlete
function cleanPartnerTitle(t: string): string {
  const out = t
    .replace(/\b(?:in teams of\s*\d+|in pairs|with a partner|partners?|teams?)\b/gi, '')
    .replace(/\s*[·—–|]\s*[·—–|]\s*/g, ' · ')
    .replace(/^[\s·—–|:,\-]+/, '')
    .replace(/[\s·—–|:,\-]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return out;
}

// when a round was dropped, remove that many trailing listed blocks so the block
// count stays equal to the round count
const BLOCK_HEADER = /\b(?:amrap|emom|block|round|part|station)\s*#?\d+\b/i;
function dropTrailingBlocks(lines: string[], n: number): string[] {
  if (n <= 0) return lines;
  const idx = lines.map((l, i) => (BLOCK_HEADER.test(l) ? i : -1)).filter((i) => i >= 0);
  const remove = new Set(idx.slice(-n));
  return lines.filter((_, i) => !remove.has(i));
}

// ---- partner / team wod → solo athlete ------------------------------------------------------
const PARTNER = /\bpartners?\b|\bpairs?\b|\bteams?\b|\bsync(?:hro)?\b|i go,?\s*you go|you go,?\s*i go/i;
const PARTNER_ORG =
  /i go.*you go|you go.*i go|pairs?\s+start|teams?\s+start|partners?\s+start|score\s*=\s*total|each (?:partner|pair|team)|partner (?:does|holds|runs|rows|bikes|carries)|alternate (?:full )?rounds?|split (?:the )?(?:reps|work|rounds)|synchro|one partner (?:works|does|holds)|while (?:one|your) partner|you work\/i rest|share the/i;

const FORMAT_BADGE: Record<string, string> = {
  sets: 'כוח',
  for_time: 'על זמן',
  amrap: 'AMRAP',
  emom: 'EMOM',
  intervals: 'אינטרוולים',
  rounds: 'סבבים',
  free: '',
};
const TIME_FORMATS = new Set(['amrap', 'emom', 'intervals']);
// fixed-work formats whose reps/distances may be scaled by the time ratio
const VOLUME_FORMATS = new Set(['for_time', 'rounds', 'free', '']);

// real minutes a section costs (intervals computed from their structure)
function sectionMinutes(s: DiarySection): number {
  if (TIME_FORMATS.has(s.format) || IV.test(s.title) || s.lines.some((l) => IV.test(l))) {
    const iv = detectIntervals(s.title, s.lines);
    if (iv && totalSec(iv) > 0) return totalSec(iv) / 60;
  }
  return s.durationMin ?? s.capMin ?? 0;
}

// ---------------------------------------------------------------- public --------------------------------------
export function adaptWod(wod: DiaryWod, equipment: Equipment[], timeMin: number): AdaptedWod {
  const has = buildHas(equipment);
  const c: Ctx = { has, weights: has('dumbbells') || has('kettlebell') };

  const mins = wod.sections.map(sectionMinutes);
  const origMinutes = Math.round(mins.reduce((a, b) => a + b, 0));
  const strengthMin = wod.sections.reduce((a, s, i) => a + (s.type === 'strength' ? mins[i]! : 0), 0);
  const hasMetcon = wod.sections.some((s) => s.type !== 'strength' && s.type !== 'warmup');
  const isPartner = wod.sections.some((s) => PARTNER.test(s.title) || s.lines.some((l) => PARTNER.test(l)));

  // --- time budget ---
  // Prefer to KEEP the strength and trim the metcon a little; only DROP the
  // strength when keeping it would crush the metcon below ~70% of its work.
  // After deciding, the work (metcon) gets whatever minutes are left, and the
  // scale ratio is recomputed on THAT — never on the full original time.
  const workMin = Math.max(0, origMinutes - strengthMin);
  const fits = !origMinutes || timeMin >= origMinutes;
  const keepMetconFactor = workMin > 0 ? (timeMin - strengthMin) / workMin : 1;
  const dropStrength = !fits && strengthMin > 0 && hasMetcon && keepMetconFactor < 0.7;
  const keptStrength = strengthMin > 0 && !dropStrength && !fits;
  // minutes available to the metcon/work after the kept strength (or all of it, if dropped)
  const workTarget = fits ? workMin : dropStrength ? timeMin : strengthMin > 0 ? timeMin - strengthMin : timeMin;
  const factor = fits || workMin === 0 ? 1 : Math.max(0.4, Math.min(1, workTarget / workMin));
  const needCut = factor < 1;

  const out: AdaptedSection[] = [];
  let strengthDropped = false;
  let didVolume = false;
  let didTime = false;
  let soloNoteAdded = false;
  let mainRewrite: ((t: string) => string) | null = null; // to shorten the main title the same way

  for (let i = 0; i < wod.sections.length; i++) {
    const s = wod.sections[i]!;
    if (s.type === 'strength' && dropStrength) {
      strengthDropped = true;
      continue;
    }
    const badge = FORMAT_BADGE[s.format] ?? '';
    const isStrength = s.type === 'strength';
    const isTimeFormat =
      TIME_FORMATS.has(s.format) || detectIntervals(s.title, s.lines) !== null;

    // drop the partner-organisation lines for a solo athlete
    let rawLines = isPartner ? s.lines.filter((l) => !PARTNER_ORG.test(l)) : s.lines;
    let title = s.title;

    // time-based formats: shorten the DURATION (not the reps) to the share of time this section gets
    if (isTimeFormat && needCut) {
      const target = workMin ? workTarget * 60 * (mins[i]! / workMin) : timeMin * 60;
      const rew = adaptTimeStructure(title, rawLines, target);
      if (rew) {
        title = rew.title;
        rawLines = dropTrailingBlocks(rew.lines, rew.droppedRounds);
        if (!mainRewrite) mainRewrite = rew.rewrite;
        didTime = true;
      }
    }

    const scaleVol = !isStrength && !isTimeFormat && VOLUME_FORMATS.has(s.format) && factor < 1;

    // strength with no barbell → a clear bodyweight/DB scheme (not "@85%")
    const swap = strengthAway({ ...s, lines: rawLines }, c);
    let lines: AdaptedLine[];
    if (swap) {
      lines = swap.map((text) => ({ text, swapped: true }));
    } else {
      lines = rawLines.map((raw) => {
        const r = adaptLine(raw, c);
        let text = r ?? collapsePrimary(raw);
        let swapped = r !== null;
        if (scaleVol) {
          const capped = scaleCapText(text, factor);
          if (capped !== text) {
            text = capped;
            swapped = true;
          }
          const t = scaleVolumeLine(text, factor);
          if (t.changed) {
            text = t.text;
            swapped = true;
            didVolume = true;
          }
        }
        return { text, swapped };
      });
    }
    if (scaleVol) title = scaleCapText(title, factor);
    if (isPartner) title = cleanPartnerTitle(title) || badge || 'אימון';

    // one plain-Hebrew note for a lone athlete, on the first work block
    if (isPartner && !isStrength && !soloNoteAdded) {
      lines.unshift({ text: '👤 לבד — עושים כל סבב מלא בעצמכם', swapped: false });
      soloNoteAdded = true;
    }

    out.push({ type: s.type, title, titleSwapped: false, badge, lines });
  }

  let timeNote: string;
  if (!origMinutes) {
    timeNote = `יש לכם ${timeMin} דקות — בצעו את האימון בקצב שמנצל אותן.`;
  } else if (strengthDropped && !didVolume && !didTime) {
    timeNote = `דילגנו על חלק הכוח כדי להספיק את המטקון — הוא נשאר מלא ונכנס ב-${timeMin} דק׳.`;
  } else if (strengthDropped) {
    timeNote = `דילגנו על חלק הכוח וקיצרנו את המטקון כדי להיכנס ל-${timeMin} דק׳. אותו מבנה, אותה עצימות.`;
  } else if (keptStrength && (didVolume || didTime)) {
    timeNote = `שמרנו על חלק הכוח וקיצרנו מעט את המטקון כדי להיכנס ל-${timeMin} דק׳.`;
  } else if (didVolume && didTime) {
    timeNote = `קיצרנו את האימון (חזרות, מרחקים ומשך) כדי להיכנס ל-${timeMin} דק׳.`;
  } else if (didTime) {
    timeNote = `קיצרנו את משך האימון כדי להיכנס ל-${timeMin} דק׳. אותו מבנה.`;
  } else if (didVolume) {
    timeNote = `קיצרנו חזרות ומרחקים כדי להיכנס ל-${timeMin} דק׳. אותו מבנה, אותה עצימות.`;
  } else if (timeMin > origMinutes * 1.15) {
    timeNote = `יש לכם ${timeMin} דק׳ מול ${origMinutes} במקור — בצעו כמו שהוא, ואם נשאר זמן הוסיפו סבב או חימום/שחרור.`;
  } else {
    timeNote = `הזמן מתאים (${timeMin} דק׳) — בצעו את האימון כפי שהוא.`;
  }

  // the main workout title: shorten its timing the same way, and drop partner words
  let mainTitle = wod.title;
  if (mainRewrite) mainTitle = mainRewrite(mainTitle);
  if (isPartner) mainTitle = cleanPartnerTitle(mainTitle) || wod.title;

  return { title: mainTitle, date: wod.date, sections: out, timeNote, origMinutes, timeMin };
}

// WhatsApp-friendly plain text of the adapted workout.
export function adaptedShareText(a: AdaptedWod): string {
  const out: string[] = ['🦌 BUX WOD — האימון של היום, מותאם אליי', ''];
  for (const s of a.sections) {
    out.push(`${s.title}${s.badge ? ` (${s.badge})` : ''}:`);
    s.lines.forEach((l) => out.push(`• ${l.text}`));
    out.push('');
  }
  out.push(`⏱ ${a.timeNote}`, '', 'Let’s Go BUX 🦌');
  return out.join('\n');
}
