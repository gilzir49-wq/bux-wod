// ===== "יומן באקס" (buxdiary) incoming link =====
// The club diary app opens the generator with today's workout preloaded, via
//   ?from=buxdiary&eq=dumbbells,box&wod=<base64url JSON>
// This module decodes and VALIDATES that input defensively (never trust it):
// any malformed field is dropped, and on any error we return an inactive result
// so the generator just behaves normally. Content is only ever rendered as text.

import { Equipment } from './types';

export interface DiarySection {
  type: string; // warmup | strength | metcon | skill | accessory | …
  title: string;
  format: string; // sets | for_time | amrap | emom | intervals | rounds | free | …
  durationMin: number | null;
  capMin: number | null;
  lines: string[]; // free text, coach's own wording
}

export interface DiaryWod {
  date: string;
  title: string;
  sections: DiarySection[];
}

export interface DiaryParams {
  active: boolean; // true only when from=buxdiary AND a valid wod decoded
  equipment: Equipment[]; // pre-selected gear (always valid, never empty)
  wod: DiaryWod | null;
}

const VALID_EQUIPMENT: Equipment[] = [
  'none', 'pullup_bar', 'dumbbells', 'kettlebell', 'barbell', 'bands',
  'jump_rope', 'box', 'rings', 'rower', 'bike', 'skierg', 'full_gym', 'park',
];
const VALID_SET = new Set(VALID_EQUIPMENT);

function parseEquipment(raw: string | null): Equipment[] {
  if (!raw) return ['none'];
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Equipment => VALID_SET.has(s as Equipment));
  const real = ids.filter((e) => e !== 'none');
  return real.length ? real : ['none'];
}

// base64url (no padding, UTF-8) → string
function fromB64Url(s: string): string {
  let b = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  const bin = atob(b);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.slice(0, max) : '';
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && isFinite(v) ? v : null;

function parseWod(raw: string | null): DiaryWod | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(fromB64Url(raw));
    if (!json || !Array.isArray(json.sections)) return null;
    const sections: DiarySection[] = json.sections
      .slice(0, 12)
      .map((s: any) => ({
        type: str(s?.type, 20) || 'metcon',
        title: str(s?.title, 140),
        format: str(s?.format, 20) || 'free',
        durationMin: numOrNull(s?.durationMin),
        capMin: numOrNull(s?.capMin),
        lines: Array.isArray(s?.lines)
          ? s.lines.slice(0, 30).map((l: unknown) => str(l, 100)).filter(Boolean)
          : [],
      }))
      .filter((s: DiarySection) => s.lines.length || s.title);
    if (!sections.length) return null;
    return { date: str(json.date, 20), title: str(json.title, 160), sections };
  } catch {
    return null;
  }
}

export function parseDiaryParams(search: string): DiaryParams {
  try {
    const q = new URLSearchParams(search);
    const from = q.get('from');
    const wod = parseWod(q.get('wod'));
    const equipment = parseEquipment(q.get('eq'));
    return { active: from === 'buxdiary' && !!wod, equipment, wod };
  } catch {
    return { active: false, equipment: ['none'], wod: null };
  }
}
