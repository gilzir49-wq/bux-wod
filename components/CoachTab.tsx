'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApp } from './AppContext';
import {
  Program,
  ResultEntry,
  Section,
  addDays,
  bestOf,
  cmpResults,
  deleteProgram,
  fetchProgram,
  fmtDate,
  genId,
  putProgram,
} from '@/lib/cloud';

const blankSection = (): Section => ({
  id: genId(),
  title: '',
  body: '',
  videos: [],
  metrics: [],
  leaderboard: false,
});

/* ---------------- PIN gate ---------------- */
function CoachLock() {
  const { unlockCoach } = useApp();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-16 min-h-[100dvh] text-center">
      <div className="text-5xl">🔒</div>
      <h1 className="mt-3 text-xl font-extrabold text-bux-green">אזור מאמן</h1>
      <p className="mt-1.5 text-sm text-bux-green/70">כתיבת תוכניות ומעקב אחרי המתאמנים. הזן את הקוד.</p>
      <input
        value={pin}
        onChange={(e) => {
          setPin(e.target.value);
          setErr(false);
        }}
        onKeyDown={(e) => e.key === 'Enter' && !unlockCoach(pin) && setErr(true)}
        type="password"
        placeholder="קוד מאמן"
        className="mt-5 w-full rounded-2xl border border-bux-green/15 bg-white px-4 py-3 text-center text-base outline-none focus:border-bux-green"
      />
      <button
        onClick={() => !unlockCoach(pin) && setErr(true)}
        className="press mt-3 w-full rounded-2xl bg-bux-green py-3.5 font-extrabold text-white shadow-btn-green"
      >
        🔓 כניסה
      </button>
      {err && <div className="mt-2 text-sm font-bold text-red-500">קוד שגוי 🔒</div>}
    </main>
  );
}

/* ---------------- Editor ---------------- */
function Editor() {
  const { selDate, setSelDate, program, reloadProgram, refresh, lockCoach } = useApp();
  const [draft, setDraft] = useState<Program>({ title: '', sections: [blankSection()] });
  const [status, setStatus] = useState('');

  // sync draft from loaded program whenever the day changes
  useEffect(() => {
    if (program && program.sections?.length) {
      setDraft(JSON.parse(JSON.stringify(program)));
    } else {
      setDraft({ title: '', sections: [blankSection()] });
    }
  }, [program, selDate]);

  const upd = (fn: (d: Program) => void) =>
    setDraft((prev) => {
      const d = JSON.parse(JSON.stringify(prev)) as Program;
      fn(d);
      return d;
    });

  async function save() {
    setStatus('שומר…');
    const clean: Program = {
      title: draft.title,
      sections: draft.sections.filter(
        (s) => s.title || s.body || s.metrics?.length || s.videos?.length,
      ),
    };
    await putProgram(selDate, clean);
    await refresh();
    await reloadProgram();
    setStatus('✓ פורסם לכל המתאמנים!');
    setTimeout(() => setStatus(''), 1600);
  }
  async function del() {
    if (!confirm('למחוק את כל התוכנית של היום?')) return;
    await deleteProgram(selDate);
    await refresh();
    await reloadProgram();
  }
  async function copyYesterday() {
    const yp = await fetchProgram(addDays(selDate, -1));
    if (!yp) {
      alert('אין תוכנית באתמול לשכפל ממנה.');
      return;
    }
    setDraft({
      title: yp.title,
      sections: (yp.sections || []).map((s) => ({
        ...s,
        id: genId(),
        videos: s.videos || [],
        metrics: s.metrics || [],
      })),
    });
  }

  const inputCls =
    'mt-1 w-full rounded-xl border border-bux-green/15 bg-bux-cream px-3 py-2.5 text-[15px] outline-none focus:border-bux-green';

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-3 min-h-[100dvh]">
      {/* day picker */}
      <div className="flex items-center justify-between rounded-2xl border border-bux-green/12 bg-white px-3 py-2 shadow-card">
        <button onClick={() => setSelDate(addDays(selDate, 1))} className="press px-3 text-lg">›</button>
        <div className="text-sm font-extrabold text-bux-green">תוכנית · {fmtDate(selDate)}</div>
        <button onClick={() => setSelDate(addDays(selDate, -1))} className="press px-3 text-lg">‹</button>
      </div>

      <label className="mt-4 block text-xs font-extrabold text-bux-green/70">שם התוכנית</label>
      <input
        className={inputCls}
        value={draft.title}
        onChange={(e) => upd((d) => (d.title = e.target.value))}
        placeholder="למשל: WOD · אימון קבוצתי"
      />

      {draft.sections.map((s, si) => (
        <div key={s.id} className="mt-3 rounded-2xl border border-bux-green/12 bg-white p-3 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-bux-yellow-dark">מקטע {si + 1}</span>
            <button
              onClick={() => upd((d) => { d.sections.splice(si, 1); if (!d.sections.length) d.sections.push(blankSection()); })}
              className="press rounded-lg border border-red-300 px-2.5 py-1 text-xs font-bold text-red-500"
            >
              🗑 הסר
            </button>
          </div>
          <label className="mt-2 block text-xs font-bold text-bux-green/60">כותרת (Strength / Metcon / Gymnastics…)</label>
          <input className={inputCls} value={s.title} onChange={(e) => upd((d) => (d.sections[si].title = e.target.value))} placeholder="כותרת המקטע" />
          <label className="mt-2 block text-xs font-bold text-bux-green/60">תוכן האימון</label>
          <textarea
            className={`${inputCls} min-h-[90px]`}
            value={s.body}
            onChange={(e) => upd((d) => (d.sections[si].body = e.target.value))}
            placeholder="פירוט התרגילים, סבבים, אחוזים, הערות…"
          />

          <div className="mt-2.5 text-xs font-extrabold text-bux-green/70">🎬 סרטוני יוטיוב</div>
          {(s.videos || []).map((v, vi) => (
            <div key={vi} className="mt-1.5 flex gap-1.5">
              <input className="flex-1 rounded-lg border border-bux-green/15 bg-bux-cream px-2.5 py-2 text-sm" value={v.label} onChange={(e) => upd((d) => (d.sections[si].videos![vi].label = e.target.value))} placeholder="שם התרגיל" />
              <input className="flex-[1.4] rounded-lg border border-bux-green/15 bg-bux-cream px-2.5 py-2 text-sm" value={v.url} onChange={(e) => upd((d) => (d.sections[si].videos![vi].url = e.target.value))} placeholder="קישור יוטיוב" />
              <button onClick={() => upd((d) => d.sections[si].videos!.splice(vi, 1))} className="press rounded-lg border border-red-300 px-2 text-red-500">✕</button>
            </div>
          ))}
          <button onClick={() => upd((d) => (d.sections[si].videos = [...(d.sections[si].videos || []), { label: '', url: '' }]))} className="press mt-1.5 w-full rounded-lg border border-bux-green/15 bg-bux-cream py-2 text-xs font-bold text-bux-green">+ הוספת סרטון</button>

          <div className="mt-2.5 text-xs font-extrabold text-bux-green/70">📊 מדדים להזנת תוצאה</div>
          {(s.metrics || []).map((m, mi) => (
            <div key={mi} className="mt-1.5 flex gap-1.5">
              <input className="flex-[1.6] rounded-lg border border-bux-green/15 bg-bux-cream px-2.5 py-2 text-sm" value={m.label} onChange={(e) => upd((d) => (d.sections[si].metrics![mi].label = e.target.value))} placeholder="שם המדד (8RM Push Press)" />
              <input className="flex-[0.7] rounded-lg border border-bux-green/15 bg-bux-cream px-2.5 py-2 text-sm" value={m.unit || ''} onChange={(e) => upd((d) => (d.sections[si].metrics![mi].unit = e.target.value))} placeholder="kg" />
              <button onClick={() => upd((d) => d.sections[si].metrics!.splice(mi, 1))} className="press rounded-lg border border-red-300 px-2 text-red-500">✕</button>
            </div>
          ))}
          <button onClick={() => upd((d) => (d.sections[si].metrics = [...(d.sections[si].metrics || []), { label: '', unit: '' }]))} className="press mt-1.5 w-full rounded-lg border border-bux-green/15 bg-bux-cream py-2 text-xs font-bold text-bux-green">+ הוספת מדד</button>

          <label className="mt-2.5 flex items-center gap-2 text-sm font-bold text-bux-green">
            <input type="checkbox" checked={!!s.leaderboard} onChange={(e) => upd((d) => (d.sections[si].leaderboard = e.target.checked))} />
            הצג לוח תוצאות יומי 🏆
          </label>
        </div>
      ))}

      <button onClick={() => upd((d) => d.sections.push(blankSection()))} className="press mt-3 w-full rounded-2xl border border-bux-green/20 bg-white py-3 text-sm font-extrabold text-bux-green">
        ＋ הוספת מקטע
      </button>
      <button onClick={save} className="press mt-3 w-full rounded-2xl bg-bux-green py-3.5 font-extrabold text-white shadow-btn-green">
        💾 שמירה ופרסום לכל המתאמנים
      </button>
      {status && <div className="mt-2 text-center text-sm font-bold text-bux-green-light">{status}</div>}
      <div className="mt-3 flex gap-2">
        <button onClick={copyYesterday} className="press flex-1 rounded-xl border border-bux-green/15 bg-white py-2.5 text-xs font-bold text-bux-green">📋 שכפול מאתמול</button>
        {program && <button onClick={del} className="press flex-1 rounded-xl border border-red-300 py-2.5 text-xs font-bold text-red-500">🗑 מחיקת היום</button>}
      </div>
      <button onClick={lockCoach} className="press mt-4 w-full text-center text-xs text-bux-green/50 underline">יציאה מאזור מאמן</button>
    </main>
  );
}

/* ---------------- Tracking ---------------- */
function Tracking() {
  const { results, users, selDate, setSelDate, program } = useApp();
  const [pick, setPick] = useState('');

  const real = results.filter((r) => r.metricLabel !== '__att__');
  const members = [...new Set([...users.map((u) => u.name), ...results.map((r) => r.member)])]
    .filter(Boolean)
    .sort();
  const att = results.filter((r) => r.date === selDate && r.metricLabel === '__att__').map((r) => r.member).sort();
  const today = real.filter((r) => r.date === selDate);
  const groups: Record<string, ResultEntry[]> = {};
  today.forEach((r) => (groups[r.metricLabel] = [...(groups[r.metricLabel] || []), r]));

  const mine = pick ? real.filter((r) => r.member === pick) : [];
  const attCount = pick ? results.filter((r) => r.member === pick && r.metricLabel === '__att__').length : 0;
  const byLabel: Record<string, ResultEntry[]> = {};
  mine.forEach((r) => (byLabel[r.metricLabel] = [...(byLabel[r.metricLabel] || []), r]));
  const keys = Object.keys(byLabel).sort();

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-3 min-h-[100dvh]">
      <div className="flex items-center justify-between rounded-2xl border border-bux-green/12 bg-white px-3 py-2 shadow-card">
        <button onClick={() => setSelDate(addDays(selDate, 1))} className="press px-3 text-lg">›</button>
        <div className="text-sm font-extrabold text-bux-green">{fmtDate(selDate)}</div>
        <button onClick={() => setSelDate(addDays(selDate, -1))} className="press px-3 text-lg">‹</button>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-card">
        <div className="text-sm font-extrabold text-bux-green">📅 {program?.title || 'אין תוכנית'}</div>
        <div className="mt-1 text-[13px] text-bux-green/60">
          נוכחות: <b className="text-bux-yellow-dark">{att.length}</b> מתאמנים
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {att.length ? (
            att.map((m) => (
              <span key={m} className="rounded-full bg-bux-green px-2.5 py-1 text-xs font-bold text-white">{m}</span>
            ))
          ) : (
            <span className="text-[13px] text-bux-green/45">עדיין אף אחד לא סימן נוכחות היום</span>
          )}
        </div>
        {Object.keys(groups).map((lbl) => (
          <div key={lbl} className="mt-3">
            <div className="text-xs font-extrabold text-bux-yellow-dark">🏆 {lbl}</div>
            {groups[lbl].slice().sort(cmpResults).map((r, i) => (
              <div key={r.id} className="flex justify-between border-b border-bux-green/5 py-1 text-[13.5px]">
                <span>{i + 1}. {r.member}</span>
                <span className="font-bold">{r.value} {r.unit || ''}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-2 text-sm font-extrabold text-bux-green">👤 מעקב אישי לפי מתאמן</div>
        <select
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="w-full rounded-xl border border-bux-green/15 bg-bux-cream px-3 py-2.5 text-[15px]"
        >
          <option value="">בחר מתאמן…</option>
          {members.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {pick && (
          <>
            <div className="mt-2 text-[13px] text-bux-green/60">✅ {attCount} אימונים · {keys.length} תרגילים נמדדו</div>
            {keys.length === 0 ? (
              <div className="mt-1 text-[13px] text-bux-green/45">אין תוצאות שמורות עדיין.</div>
            ) : (
              keys.map((lbl) => {
                const arr = byLabel[lbl].slice().sort((a, b) => (a.date < b.date ? -1 : 1));
                const last = arr[arr.length - 1];
                const best = bestOf(arr.map((x) => x.value));
                return (
                  <div key={lbl} className="flex items-center justify-between border-b border-bux-green/5 py-2">
                    <div>
                      <div className="text-sm font-bold text-bux-green">{lbl}</div>
                      <div className="text-[11px] text-bux-green/50">{arr.length} פעמים · אחרון {fmtDate(last.date)}</div>
                    </div>
                    <div className="text-sm font-bold">
                      {last.value} {last.unit || ''}
                      {best ? <span className="text-bux-yellow-dark"> · שיא {best.display}</span> : null}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function CoachTab() {
  const { coachOn } = useApp();
  const [sub, setSub] = useState<'plan' | 'track'>('plan');
  if (!coachOn) return <CoachLock />;
  return (
    <>
      <div className="mx-auto flex max-w-md gap-2 px-4 pt-4">
        {(['plan', 'track'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`press flex-1 rounded-xl border py-2.5 text-sm font-extrabold ${
              sub === s ? 'border-bux-yellow-dark bg-white text-bux-yellow-dark' : 'border-bux-green/12 bg-white text-bux-green/50'
            }`}
          >
            {s === 'plan' ? '✏️ תכנון האימון' : '📊 מעקב מתאמנים'}
          </button>
        ))}
      </div>
      {sub === 'plan' ? <Editor /> : <Tracking />}
    </>
  );
}
