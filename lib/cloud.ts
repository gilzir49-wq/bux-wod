// ===== Cloud layer — shared with the BUX tracker (same Firebase RTDB node) =====
// Reuses the existing `bux-tracker` data so all accounts, programs and results
// carry over seamlessly into the unified app.

export const DB =
  'https://command-center-gal-default-rtdb.europe-west1.firebasedatabase.app';
export const NODE = 'bux-tracker';
export const COACH_PIN = 'bux2026';

// ---------- domain types ----------
export interface Metric {
  label: string;
  unit?: string;
}
export interface VideoRef {
  label: string;
  url: string;
}
export interface Section {
  id: string;
  title: string;
  body?: string;
  videos?: VideoRef[];
  metrics?: Metric[];
  leaderboard?: boolean;
}
export interface Program {
  title: string;
  sections: Section[];
}
export interface ResultEntry {
  id: string;
  date: string; // YYYY-MM-DD
  uid: string;
  member: string;
  sectionId: string;
  metricLabel: string;
  value: string;
  unit?: string;
  createdAt: number;
}
export interface UserRec {
  uid: string;
  name: string;
  codeHash?: string;
  createdAt?: number;
}

const ep = (path: string) => `${DB}/${NODE}/${path}.json`;

async function getJSON<T>(path: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(ep(path), { cache: 'no-store' });
    if (!r.ok) return fallback;
    const j = await r.json();
    return (j ?? fallback) as T;
  } catch {
    return fallback;
  }
}

// ---------- programs ----------
export async function fetchProgram(date: string): Promise<Program | null> {
  return getJSON<Program | null>(`program/${date}`, null);
}
export async function fetchProgramDates(): Promise<Record<string, boolean>> {
  try {
    const r = await fetch(`${DB}/${NODE}/program.json?shallow=true`);
    if (!r.ok) return {};
    return (await r.json()) || {};
  } catch {
    return {};
  }
}
export async function putProgram(date: string, p: Program): Promise<void> {
  await fetch(ep(`program/${date}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
}
export async function deleteProgram(date: string): Promise<void> {
  await fetch(ep(`program/${date}`), { method: 'DELETE' });
}

// ---------- results ----------
export async function fetchResults(): Promise<ResultEntry[]> {
  const o = await getJSON<Record<string, any>>('results', {});
  return Object.entries(o).map(([id, v]) => ({ id, ...(v as any) }));
}
export async function putResult(e: ResultEntry): Promise<void> {
  await fetch(ep(`results/${e.id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(e),
  });
}
export async function deleteResult(id: string): Promise<void> {
  await fetch(ep(`results/${id}`), { method: 'DELETE' });
}

// ---------- users ----------
export async function fetchUsers(): Promise<UserRec[]> {
  const o = await getJSON<Record<string, any>>('users', {});
  return Object.entries(o).map(([uid, v]) => ({ uid, ...(v as any) }));
}
export async function putUser(uid: string, u: Omit<UserRec, 'uid'>): Promise<void> {
  await fetch(ep(`users/${uid}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(u),
  });
}

// ---------- helpers ----------
export async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(s + '::bux'),
  );
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------- date utils (local) ----------
const pad = (n: number) => String(n).padStart(2, '0');
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function dateToISO(dt: Date): string {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
export function addDays(iso: string, n: number): string {
  const dt = isoToDate(iso);
  dt.setDate(dt.getDate() + n);
  return dateToISO(dt);
}
export function weekOf(iso: string): string[] {
  const dt = isoToDate(iso);
  const start = addDays(iso, -dt.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// ---------- result ranking (time mm:ss → fastest; numbers → highest) ----------
export function toSecs(v: string): number | null {
  const m = String(v).trim().match(/^(\d{1,3}):(\d{2})$/);
  return m ? +m[1] * 60 + +m[2] : null;
}
function fmtSecs(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function isNumStr(v: string): boolean {
  return v !== '' && v != null && !isNaN(parseFloat(v));
}
export function bestOf(vals: string[]): { display: string; n: number } | null {
  const secs = vals.map(toSecs).filter((x): x is number => x != null);
  if (secs.length) {
    const b = Math.min(...secs);
    return { display: fmtSecs(b), n: b };
  }
  const nums = vals.filter(isNumStr).map(parseFloat);
  if (nums.length) {
    const b = Math.max(...nums);
    return { display: String(b), n: b };
  }
  return null;
}
export function cmpResults(a: ResultEntry, b: ResultEntry): number {
  const ta = toSecs(a.value),
    tb = toSecs(b.value);
  if (ta != null || tb != null) {
    if (ta == null) return 1;
    if (tb == null) return -1;
    return ta - tb;
  }
  const na = isNumStr(a.value) ? parseFloat(a.value) : null;
  const nb = isNumStr(b.value) ? parseFloat(b.value) : null;
  if (na == null && nb == null) return 0;
  if (na == null) return 1;
  if (nb == null) return -1;
  return nb - na;
}
