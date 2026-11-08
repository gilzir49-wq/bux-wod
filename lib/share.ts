import { randomCaption } from './captions';
import { GOAL_LABEL, LEVEL_LABEL } from './options';
import { Workout, WorkoutSection, MainPiece } from './types';

// The app's own public URL, derived at runtime from wherever it's served —
// so it automatically uses the live domain (github.io now, a custom domain
// later) with zero code changes. Included in every share so it spreads.
export function appUrl(): string {
  const fallback = 'https://gilzir49-wq.github.io/bux-wod/';
  if (typeof window === 'undefined') return fallback;
  const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${window.location.origin}${bp}/`;
}

function sectionToText(s: WorkoutSection): string {
  const lines = s.movements.map((m) => `• ${m.name} — ${m.detail}`);
  return `${s.title} (${s.durationLabel}):\n${lines.join('\n')}`;
}

function mainToText(m: MainPiece, heading: string): string {
  const lines = m.movements.map((mv) => `• ${mv.name} — ${mv.detail}`);
  const goal = m.goalLine ? `\n🎯 ${m.goalLine}` : '';
  return `${heading} — ${m.formatLine}:\n${lines.join('\n')}${goal}`;
}

// Plain-text, WhatsApp/Instagram-friendly summary with a branded caption.
export function buildShareText(w: Workout): string {
  const caption = randomCaption();
  const header = `🦌 BUX WOD — ${w.title}`;
  const meta = `רמה: ${LEVEL_LABEL[w.level]} · מטרה: ${GOAL_LABEL[w.goal]} · ${w.time} דקות`;

  const blocks: string[] = [];
  if (w.warmup) blocks.push(sectionToText(w.warmup), '');
  if (w.strength) blocks.push(mainToText(w.strength, 'כוח'), '');
  if (w.main) blocks.push(mainToText(w.main, 'האימון'), '');
  if (w.cooldown) blocks.push(sectionToText(w.cooldown), '');

  return [
    header,
    meta,
    '',
    ...blocks,
    '— — —',
    caption,
    '',
    '🔗 בנו אימון BUX משלכם, בכל מקום:',
    appUrl(),
    'Let’s Go BUX 🦌',
  ].join('\n');
}

// Short text for sharing the app itself (so members spread it to friends).
export function buildAppShareText(): string {
  return [
    '🦌 BUX WOD — אימון CrossFit בכל מקום',
    'בוחרים זמן, רמה וציוד — ומקבלים אימון BUX מלא עם סרטוני הדגמה לכל תרגיל. מילואים, חופשה, פארק או בית.',
    '',
    appUrl(),
    'Let’s Go BUX 🦌',
  ].join('\n');
}
