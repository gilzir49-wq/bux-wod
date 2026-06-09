'use client';

import { useMemo } from 'react';
import { useApp } from './AppContext';
import { bestOf, fmtDate } from '@/lib/cloud';
import { getSavedWorkouts } from '@/lib/storage';

export default function ProfileTab() {
  const { user, results } = useApp();

  const mine = useMemo(
    () => results.filter((r) => r.uid === user?.uid && r.metricLabel !== '__att__'),
    [results, user],
  );
  const attCount = useMemo(
    () => results.filter((r) => r.uid === user?.uid && r.metricLabel === '__att__').length,
    [results, user],
  );
  const byLabel = useMemo(() => {
    const g: Record<string, typeof mine> = {};
    mine.forEach((r) => (g[r.metricLabel] = [...(g[r.metricLabel] || []), r]));
    return g;
  }, [mine]);
  const keys = Object.keys(byLabel).sort();
  const saved = typeof window !== 'undefined' ? getSavedWorkouts() : [];

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6 min-h-[100dvh]">
      <div className="rounded-3xl bg-bux-green p-5 text-white shadow-card">
        <div className="text-2xl font-extrabold">🏅 {user?.name}</div>
        <div className="mt-1 text-sm text-white/80">
          ✅ {attCount} אימונים · {keys.length} תרגילים נמדדו · {saved.length} אימונים שמורים
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-extrabold text-bux-yellow-dark">📈 השיאים שלי</h2>
      {keys.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center text-sm text-bux-green/60 shadow-card">
          עדיין אין שיאים שמורים.
          <br />
          הזן תוצאות באימון היומי והם יופיעו כאן 💪
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-2 shadow-card">
          {keys.map((lbl) => {
            const arr = byLabel[lbl].slice().sort((a, b) => (a.date < b.date ? -1 : 1));
            const last = arr[arr.length - 1];
            const best = bestOf(arr.map((x) => x.value));
            return (
              <div key={lbl} className="flex items-center justify-between border-b border-bux-green/5 px-2 py-2.5 last:border-0">
                <div>
                  <div className="text-sm font-bold text-bux-green">{lbl}</div>
                  <div className="text-[11px] text-bux-green/50">
                    {arr.length} פעמים · אחרון {fmtDate(last.date)}
                  </div>
                </div>
                <div className="text-sm font-extrabold text-bux-yellow-dark">
                  {best ? `שיא ${best.display} ${last.unit || ''}` : `${last.value} ${last.unit || ''}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {saved.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 text-sm font-extrabold text-bux-yellow-dark">🎲 אימונים שמורים מהמחולל</h2>
          <div className="space-y-2">
            {saved.map((w) => (
              <div key={w.id} className="rounded-2xl bg-white p-3.5 shadow-card">
                <div className="text-sm font-bold text-bux-green">{w.title}</div>
                <div className="text-[11px] text-bux-green/50">
                  {fmtDate(new Date(w.createdAt).toISOString().slice(0, 10))}
                  {w.rating ? ` · ${'★'.repeat(w.rating)}` : ''}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-bux-green/45">
            פותחים וצופים באימונים שמורים בלשונית 🎲 מחולל.
          </p>
        </>
      )}
    </main>
  );
}
