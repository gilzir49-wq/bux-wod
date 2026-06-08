import { randomCaption } from './captions';
import { GOAL_LABEL, LEVEL_LABEL } from './options';
import { Workout, WorkoutSection, MainPiece } from './types';

function sectionToText(s: WorkoutSection): string {
  const lines = s.movements.map((m) => `• ${m.name} — ${m.detail}`);
  return `${s.title} (${s.durationLabel}):\n${lines.join('\n')}`;
}

function mainToText(m: MainPiece): string {
  const lines = m.movements.map((mv) => `• ${mv.name} — ${mv.detail}`);
  return `האימון — ${m.formatLine}:\n${lines.join('\n')}`;
}

// Plain-text, WhatsApp/Instagram-friendly summary with a branded caption.
export function buildShareText(w: Workout): string {
  const caption = randomCaption();
  const header = `🦌 BUX WOD — ${w.title}`;
  const meta = `רמה: ${LEVEL_LABEL[w.level]} · מטרה: ${GOAL_LABEL[w.goal]} · ${w.time} דקות`;

  return [
    header,
    meta,
    '',
    sectionToText(w.warmup),
    '',
    mainToText(w.main),
    w.main.goalLine ? `🎯 ${w.main.goalLine}` : '',
    '',
    sectionToText(w.cooldown),
    '',
    '— — —',
    caption,
    'Let’s Go BUX 🦌',
  ]
    .filter((l) => l !== undefined)
    .join('\n');
}
