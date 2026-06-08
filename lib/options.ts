import { Equipment, Goal, Level, TimeOption } from './types';

export const TIME_OPTIONS: TimeOption[] = [15, 20, 30, 40, 45, 60];

export const LEVEL_OPTIONS: { value: Level; label: string; emoji: string }[] = [
  { value: 'beginner', label: 'מתחיל', emoji: '🌱' },
  { value: 'intermediate', label: 'בינוני', emoji: '🔥' },
  { value: 'advanced', label: 'מתקדם', emoji: '⚡' },
];

export const GOAL_OPTIONS: { value: Goal; label: string; emoji: string }[] = [
  { value: 'strength', label: 'כוח', emoji: '🏋️' },
  { value: 'cardio', label: 'סיבולת', emoji: '🫀' },
  { value: 'general', label: 'כושר כללי', emoji: '💪' },
  { value: 'gymnastics', label: 'גימנסטיקה', emoji: '🤸' },
];

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string; emoji: string }[] = [
  { value: 'none', label: 'משקל גוף בלבד', emoji: '🧍' },
  { value: 'pullup_bar', label: 'מתח', emoji: '🚧' },
  { value: 'dumbbells', label: 'משקולות יד', emoji: '🏋️' },
  { value: 'kettlebell', label: 'קטלבל', emoji: '🔔' },
  { value: 'barbell', label: 'מוט + צלחות', emoji: '🏋️‍♂️' },
  { value: 'bands', label: 'גומיות התנגדות', emoji: '🎗️' },
  { value: 'jump_rope', label: 'חבל קפיצה', emoji: '🪢' },
  { value: 'box', label: 'תיבה / ספסל', emoji: '📦' },
  { value: 'rings', label: 'טבעות', emoji: '⭕' },
  { value: 'cardio_machine', label: 'מכונת קרדיו', emoji: '🚣' },
  { value: 'full_gym', label: 'חדר כושר מלא', emoji: '🏟️' },
  { value: 'park', label: 'פארק פתוח', emoji: '🌳' },
];

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'מתחיל',
  intermediate: 'בינוני',
  advanced: 'מתקדם',
};

export const GOAL_LABEL: Record<Goal, string> = {
  strength: 'כוח',
  cardio: 'סיבולת',
  general: 'כושר כללי',
  gymnastics: 'גימנסטיקה',
};
