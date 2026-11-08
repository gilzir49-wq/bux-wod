// ===== Adapt "יומן באקס" today's workout to the athlete's gear + time =====
// Keeps the coach's workout intact in spirit — same movement patterns, same
// style, same intent — but swaps any movement the athlete can't do (no gear)
// for the closest equivalent they can, and adds a clear time-scaling note.
// The coach's lines are free text, so this is a best-effort keyword swap:
// anything we don't recognise passes through unchanged (safe default).

import { DiaryWod } from './diary';
import { Equipment } from './types';

export interface AdaptedLine {
  text: string;
  swapped: boolean;
}
export interface AdaptedSection {
  type: string;
  title: string;
  titleSwapped: boolean;
  badge: string; // Hebrew format label
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
const H = (e: Set<Equipment>, ...ids: Equipment[]) => ids.some((id) => e.has(id));

// ---- movement swap rules (first-match replacements per line) ----
type Rule = { re: RegExp; sub: (e: Set<Equipment>, m: string) => string };

const RULES: Rule[] = [
  // gymnastics on a bar
  { re: /\btoes[-\s]?to[-\s]?bar\b|\bt2b\b/gi, sub: (e, m) => (H(e, 'pullup_bar') ? m : 'V-Ups') },
  {
    re: /\bchest[-\s]?to[-\s]?bar\b|\bc2b\b|\bbar\s+muscle[-\s]?ups?\b|\bpull[-\s]?ups?\b|\bchin[-\s]?ups?\b/gi,
    sub: (e, m) => (H(e, 'pullup_bar') ? m : H(e, 'rings') ? 'Ring Rows' : H(e, 'bands') ? 'Band Rows' : 'Towel Rows'),
  },
  // rings
  { re: /\bring\s+rows?\b/gi, sub: (e, m) => (H(e, 'rings') ? m : H(e, 'bands') ? 'Band Rows' : 'Towel Rows') },
  { re: /\bring\s+dips?\b|\bring\s+muscle[-\s]?ups?\b|\bmuscle[-\s]?ups?\b/gi, sub: (e, m) => (H(e, 'rings') ? m : H(e, 'box') ? 'Bench Dips' : 'Push-ups') },
  // kettlebell
  { re: /\b(?:american|russian)?\s*(?:kb|kettlebell)\s+swings?(?:\s+[\d/]+\s*(?:kg|lb))?\b/gi, sub: (e, m) => (H(e, 'kettlebell') ? m : H(e, 'dumbbells') ? 'Dumbbell Swings' : 'Broad Jumps') },
  // wall ball
  { re: /\bwall\s*balls?(?:\s+[\d/]+\s*(?:kg|lb))?\b/gi, sub: (e, m) => (H(e, 'full_gym') ? m : H(e, 'dumbbells') ? 'Dumbbell Thrusters' : 'Jump Squats') },
  // thrusters (barbell or DB keep)
  { re: /\bthrusters?\b/gi, sub: (e, m) => (H(e, 'barbell', 'dumbbells') ? m : H(e, 'kettlebell') ? 'Kettlebell Thrusters' : 'Jump Squats') },
  // olympic / barbell lifts
  { re: /\b(?:power\s+|squat\s+|hang\s+)?snatch(?:es)?\b/gi, sub: (e, m) => (H(e, 'barbell') ? m : H(e, 'dumbbells') ? 'Dumbbell Snatches' : H(e, 'kettlebell') ? 'Kettlebell Snatches' : 'Jump Squats') },
  { re: /\b(?:power\s+|squat\s+|hang\s+)?cleans?(?:\s*(?:&|and)\s*jerks?)?\b/gi, sub: (e, m) => (H(e, 'barbell') ? m : H(e, 'dumbbells') ? 'Dumbbell Clean & Jerk' : H(e, 'kettlebell') ? 'Kettlebell Cleans' : 'Jump Squats') },
  { re: /\bdead[-\s]?lifts?\b/gi, sub: (e, m) => (H(e, 'barbell') ? m : H(e, 'dumbbells', 'kettlebell') ? 'Dumbbell Deadlifts' : 'Single-leg Deadlifts') },
  { re: /\b(?:back|front|overhead|zercher|goblet)\s+squats?\b/gi, sub: (e, m) => (H(e, 'barbell') ? m : H(e, 'dumbbells', 'kettlebell') ? 'Goblet Squats' : 'Air Squats') },
  { re: /\b(?:push\s+press|push\s+jerk|shoulder\s+press|strict\s+press|overhead\s+press|military\s+press|shoulder[-\s]?to[-\s]?overhead|s2oh)\b/gi, sub: (e, m) => (H(e, 'barbell') ? m : H(e, 'dumbbells') ? 'Dumbbell Push Press' : H(e, 'kettlebell') ? 'Kettlebell Push Press' : 'Pike Push-ups') },
  { re: /\bbench\s+press\b/gi, sub: (e, m) => (H(e, 'barbell') ? m : H(e, 'dumbbells') ? 'Dumbbell Floor Press' : 'Push-ups') },
  { re: /\b(?:barbell|overhead|front[-\s]?rack|db|dumbbell|kb|kettlebell)\s+lunges?\b/gi, sub: (e, m) => (H(e, 'barbell', 'dumbbells', 'kettlebell') ? m : 'Walking Lunges') },
  // box
  { re: /\bbox\s+jump[-\s]?overs?\b|\bbox\s+jumps?\b|\bbox\s+step[-\s]?ups?\b/gi, sub: (e, m) => (H(e, 'box') ? m : 'Jump Squats') },
  // rope
  { re: /\b(?:double|single)[-\s]?unders?\b/gi, sub: (e, m) => (H(e, 'jump_rope') ? m : 'High Knees') },
  // machines (only when a cal/metre count is adjacent, so "Ring Rows" is safe)
  { re: /(row|bike|ski|skierg)(?=\s+\d+\s*(?:cal|m\b|meters?|calories?))/gi, sub: (e, m) => (H(e, 'rower', 'bike', 'skierg') ? m : H(e, 'jump_rope') ? 'Double Unders' : 'Burpees') },
  { re: /(?<=\d\s*(?:cal|calories?|m|meters?)\s)(row|bike|ski|skierg)\b/gi, sub: (e, m) => (H(e, 'rower', 'bike', 'skierg') ? m : H(e, 'jump_rope') ? 'Double Unders' : 'Burpees') },
];

function applyRules(text: string, eff: Set<Equipment>): { text: string; changed: boolean } {
  let out = text;
  for (const r of RULES) out = out.replace(r.re, (m) => r.sub(eff, m));
  return { text: out, changed: out !== text };
}

const FORMAT_BADGE: Record<string, string> = {
  sets: 'כוח',
  for_time: 'על זמן',
  amrap: 'AMRAP',
  emom: 'EMOM',
  intervals: 'אינטרוולים',
  rounds: 'סבבים',
  free: '',
};

export function adaptWod(wod: DiaryWod, equipment: Equipment[], timeMin: number): AdaptedWod {
  const eff = effOf(equipment);

  const sections: AdaptedSection[] = wod.sections.map((s) => {
    const t = applyRules(s.title, eff);
    return {
      type: s.type,
      title: t.text,
      titleSwapped: t.changed,
      badge: FORMAT_BADGE[s.format] ?? '',
      lines: s.lines.map((l) => {
        // the coach often writes in-gym scaling options as "A > B > C"; our
        // adaptation replaces that role, so collapse to the (adapted) primary.
        const primary = l.includes('>') ? l.split('>')[0].trim() : l;
        const r = applyRules(primary, eff);
        return { text: r.text, swapped: r.changed };
      }),
    };
  });

  const origMinutes = wod.sections.reduce(
    (sum, s) => sum + (s.durationMin ?? s.capMin ?? 0),
    0,
  );

  let timeNote: string;
  if (!origMinutes) {
    timeNote = `יש לכם ${timeMin} דקות — בצעו את האימון בקצב שמנצל אותן במלואן.`;
  } else if (timeMin >= origMinutes + 4) {
    timeNote = `יש לכם ${timeMin} דק׳ מול ${origMinutes} במקור — בצעו כמו שהוא, ואם נשאר זמן הוסיפו סבב או עבודת כוח קלה.`;
  } else if (timeMin >= origMinutes - 2) {
    timeNote = `הזמן מתאים (${timeMin} דק׳) — בצעו את האימון כפי שהוא.`;
  } else {
    const pct = Math.round((timeMin / origMinutes) * 100);
    timeNote = `יש לכם ${timeMin} דק׳ מול ${origMinutes} במקור — קצרו ל-~${pct}%: הורידו סבב או חתכו חזרות בהתאם, אבל שמרו על אותה עצימות.`;
  }

  return { title: wod.title, date: wod.date, sections, timeNote, origMinutes, timeMin };
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
