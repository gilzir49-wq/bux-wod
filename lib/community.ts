// ===== Community layer for the standalone BUX WOD generator =====
// A tiny shared backend (Firebase RTDB, REST, no SDK/auth) for two things:
//   1. a global visit counter (how many times the app was opened)
//   2. member reviews ("how was the workout?") that everyone sees, rotating
// Both are public/community data — no personal accounts, no login.

const DB =
  'https://command-center-gal-default-rtdb.europe-west1.firebasedatabase.app';
const NODE = 'bux-tracker'; // reuse the existing project's database
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

// ---------- visit counter (atomic, shared across everyone) ----------
// Server-side `increment` so concurrent opens never clobber each other.
export async function bumpVisit(): Promise<void> {
  try {
    await fetch(ep('stats'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visits: { '.sv': { increment: 1 } }, lastVisit: Date.now() }),
    });
  } catch {
    /* a missed count must never break app load */
  }
}
export async function fetchVisits(): Promise<number> {
  return getJSON<number>('stats/visits', 0);
}

// ---------- member reviews ----------
export interface Review {
  id: string;
  name?: string;
  text: string;
  rating: number; // 1-5
  createdAt: number;
}

export async function addReview(r: Omit<Review, 'id' | 'createdAt'>): Promise<void> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const body: Omit<Review, 'id'> = {
    name: (r.name || '').trim().slice(0, 24) || undefined,
    text: r.text.trim().slice(0, 240),
    rating: Math.max(1, Math.min(5, Math.round(r.rating))),
    createdAt: Date.now(),
  };
  try {
    await fetch(ep(`wod_reviews/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    /* non-fatal */
  }
}

export async function fetchReviews(): Promise<Review[]> {
  const o = await getJSON<Record<string, any>>('wod_reviews', {});
  return Object.entries(o)
    .map(([id, v]) => ({ id, ...(v as any) }) as Review)
    .filter((r) => r && r.text)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// Pick one happy review (4★+) at random — a different one each app open.
export function pickSpotlight(reviews: Review[]): Review | null {
  const happy = reviews.filter((r) => (r.rating ?? 0) >= 4 && r.text.length >= 2);
  if (!happy.length) return null;
  return happy[Math.floor(Math.random() * happy.length)];
}
