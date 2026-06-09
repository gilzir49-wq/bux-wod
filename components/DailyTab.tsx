'use client';

import { useMemo, useState } from 'react';
import { useApp } from './AppContext';
import {
  Section,
  addDays,
  bestOf,
  cmpResults,
  fmtDate,
  isoToDate,
  todayISO,
  weekOf,
} from '@/lib/cloud';

const HE_L = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function ytId(u: string) {
  const m = (u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : '';
}
const SEC_ICONS: [RegExp, string][] = [
  [/warm|חימום/i, '🔥'],
  [/gymnast|ג'ימנס|handstand|עמידת ידיים/i, '🤸'],
  [/endurance|סיבולת/i, '🏃'],
  [/partner|זוג/i, '🤝'],
  [/cash ?out|finisher|סיום/i, '🧊'],
  [/strength|כוח|weightlift|משקול/i, '🏋️'],
  [/metcon|wod|crossfit|מטקון/i, '⚡'],
];
const secIcon = (t: string) => SEC_ICONS.find(([re]) => re.test(t || ''))?.[1] || '📋';
const heb = (s: string) => /[֐-׿]/.test(s);

function BodyText({ body }: { body: string }) {
  return (
    <div className="space-y-0.5 text-[15px] leading-relaxed text-bux-green">
      {body.split('\n').map((l, i) =>
        l.trim() === '' ? (
          <div key={i} className="h-2" />
        ) : (
          <div key={i} dir={heb(l) ? 'rtl' : 'ltr'} className={heb(l) ? 'text-right' : 'text-left'}>
            {l}
          </div>
        ),
      )}
    </div>
  );
}

function VideoCard({ label, url }: { label: string; url: string }) {
  const id = ytId(url);
  const [open, setOpen] = useState(false);
  if (id && open) {
    return (
      <div className="relative h-[150px] w-[260px] shrink-0 overflow-hidden rounded-xl bg-black">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${id}?autoplay=1`}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
    );
  }
  const inner = (
    <>
      {id ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
          alt=""
          className="h-[90px] w-full object-cover opacity-90"
        />
      ) : (
        <div className="absolute right-2 top-1.5 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-extrabold text-red-400">
          YouTube
        </div>
      )}
      <div className="absolute inset-0 grid place-items-center text-3xl text-white drop-shadow">▶</div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-3.5 text-xs font-bold text-white">
        {label}
      </div>
    </>
  );
  const cls =
    'relative h-[90px] w-[150px] shrink-0 overflow-hidden rounded-xl border border-bux-green/15';
  if (id)
    return (
      <button onClick={() => setOpen(true)} className={`${cls} bg-black press`}>
        {inner}
      </button>
    );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} press block`}
      style={{ background: 'linear-gradient(135deg,#3a0f12,#1a0709)' }}
    >
      {inner}
    </a>
  );
}

function MetricRow({ sectionId, label, unit }: { sectionId: string; label: string; unit?: string }) {
  const { findMyResult, upsertResult, results, user } = useApp();
  const ex = findMyResult(sectionId, label);
  const [val, setVal] = useState(ex?.value || '');
  const [showHist, setShowHist] = useState(false);

  const hist = useMemo(
    () =>
      results
        .filter((r) => r.uid === user?.uid && r.metricLabel === label)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [results, user, label],
  );
  const best = bestOf(hist.map((h) => h.value));
  const prev = hist.filter((h) => h.value && h.date !== ex?.date).slice(-1)[0];

  return (
    <div className="mt-2.5 rounded-2xl border border-bux-green/12 bg-bux-cream/70 p-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 text-sm font-bold text-bux-green">
          {label} {unit ? <span className="font-medium text-bux-green/50">({unit})</span> : null}
        </div>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => upsertResult(sectionId, label, val.trim(), unit || '')}
          placeholder="תוצאה"
          className="w-[104px] rounded-xl border border-bux-green/15 bg-white px-3 py-2 text-center text-base outline-none focus:border-bux-green"
        />
        <button
          onClick={() => setShowHist((s) => !s)}
          className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-bux-green/15 bg-white text-base"
        >
          📈
        </button>
      </div>
      {(prev || best) && (
        <div className="mt-1.5 text-[11.5px] text-bux-green/60">
          {prev ? `קודם: ${prev.value} ${unit || ''}` : ''}
          {best ? `${prev ? ' · ' : ''}שיא: ` : ''}
          {best ? <b className="text-bux-green">{best.display}</b> : ''}
        </div>
      )}
      {showHist && (
        <div className="mt-2 border-t border-dashed border-bux-green/15 pt-2">
          {hist.length === 0 ? (
            <div className="text-xs text-bux-green/50">אין עדיין תוצאות.</div>
          ) : (
            hist
              .slice()
              .reverse()
              .map((h) => {
                const isBest = !!best && (Number(h.value.replace(':', '.')) || parseFloat(h.value)) >= 0 && h.value === best.display;
                return (
                  <div key={h.id} className="flex justify-between py-1 text-[13px]">
                    <span className="text-bux-green/70">{fmtDate(h.date)}</span>
                    <span className={isBest ? 'font-extrabold text-bux-green' : ''}>
                      {h.value} {unit || ''} {isBest ? '🏆' : ''}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}

function Leaderboard({ section }: { section: Section }) {
  const { results, selDate, user } = useApp();
  const m = section.metrics?.[0];
  if (!m) return null;
  const rows = results
    .filter(
      (r) =>
        r.date === selDate &&
        r.sectionId === section.id &&
        r.metricLabel === m.label &&
        r.value !== '',
    )
    .sort(cmpResults);
  return (
    <div className="mt-3 border-t border-dashed border-bux-green/15 pt-2.5">
      <div className="mb-1.5 text-xs font-extrabold text-bux-yellow-dark">🏆 לוח תוצאות — {m.label}</div>
      {rows.length === 0 ? (
        <div className="text-[13px] text-bux-green/50">עדיין אין תוצאות להיום</div>
      ) : (
        rows.map((r, i) => (
          <div
            key={r.id}
            className={`flex justify-between border-b border-bux-green/5 py-1 text-[13.5px] ${
              user && r.uid === user.uid ? 'font-extrabold text-bux-yellow-dark' : ''
            }`}
          >
            <span>
              <span className="ml-1.5 text-bux-green/40">{i + 1}.</span>
              {r.member}
            </span>
            <span>
              {r.value} {m.unit || ''}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export default function DailyTab() {
  const {
    user,
    logout,
    selDate,
    setSelDate,
    program,
    loadingProgram,
    programDates,
    attendedOn,
    toggleAttend,
  } = useApp();

  const wk = weekOf(selDate);
  const attended = attendedOn(selDate);

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-5 min-h-[100dvh]">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-extrabold text-bux-green">האימון היומי 🦌</div>
          <div className="text-xs text-bux-green/60">CrossFit BUX · יהוד</div>
        </div>
        <button onClick={logout} className="press text-left text-xs text-bux-green/70">
          {user?.name}
          <div className="underline">התנתקות</div>
        </button>
      </div>

      {/* week strip */}
      <div className="mt-4 flex items-center gap-1 rounded-2xl border border-bux-green/12 bg-white p-2 shadow-card">
        <button onClick={() => setSelDate(addDays(selDate, 7))} className="press h-12 w-8 rounded-lg bg-bux-cream text-lg">
          ›
        </button>
        <div className="flex flex-1 gap-1">
          {wk.map((d) => {
            const dt = isoToDate(d);
            const sel = d === selDate;
            const att = attendedOn(d);
            const hasProg = !!programDates[d];
            return (
              <button
                key={d}
                onClick={() => setSelDate(d)}
                className={`flex-1 rounded-xl px-0.5 py-1.5 ${
                  sel ? 'bg-bux-green text-white' : ''
                }`}
              >
                <div className={`text-[11px] font-bold ${sel ? 'text-white/80' : 'text-bux-green/50'}`}>
                  {HE_L[dt.getDay()]}
                </div>
                <div className="text-base font-extrabold">{dt.getDate()}</div>
                <div className="h-3 text-[10px] leading-none">
                  {att ? <span className={sel ? 'text-bux-yellow' : 'text-bux-green-light'}>✓</span> : hasProg ? <span className="text-bux-yellow-dark">●</span> : ''}
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={() => setSelDate(addDays(selDate, -7))} className="press h-12 w-8 rounded-lg bg-bux-cream text-lg">
          ‹
        </button>
      </div>

      {loadingProgram ? (
        <div className="py-16 text-center text-bux-green/50">טוען…</div>
      ) : !program || !program.sections?.length ? (
        <div className="py-12 text-center text-bux-green/60">
          <div className="text-base">אין אימון מתוכנן ליום הזה 🌙</div>
          <div className="mt-1 text-sm">בחרו יום אחר מהלוח למעלה.</div>
        </div>
      ) : (
        <>
          <div className="mt-5 text-center">
            <div className="display text-2xl font-extrabold text-bux-green">{program.title || 'אימון היום'}</div>
            <div className="text-sm text-bux-green/60">{fmtDate(selDate)}</div>
          </div>

          <button
            onClick={toggleAttend}
            className={`press mt-4 w-full rounded-2xl py-3.5 text-base font-extrabold ${
              attended ? 'bg-bux-green text-white shadow-btn-green' : 'border border-bux-green/20 bg-white text-bux-green'
            }`}
          >
            {attended ? '✓ סימנת שהתאמנת היום' : 'הייתי באימון הזה 💪'}
          </button>

          {program.sections.map((s) => {
            const vids = (s.videos || []).filter((v) => v.url || v.label);
            const mets = (s.metrics || []).filter((m) => m.label);
            return (
              <div key={s.id} className="mt-3.5 overflow-hidden rounded-3xl border border-bux-green/12 bg-white shadow-card">
                <div className="flex items-center gap-2.5 border-b border-bux-green/10 bg-bux-cream px-4 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-bux-green text-base">{secIcon(s.title)}</span>
                  <span className="display text-base font-extrabold text-bux-green">{s.title || 'מקטע'}</span>
                </div>
                <div className="p-4">
                  {s.leaderboard && (
                    <div className="mb-2 inline-block rounded-full border border-bux-yellow-dark/40 bg-bux-yellow/15 px-2.5 py-0.5 text-[11px] font-extrabold text-bux-yellow-dark">
                      🏆 לוח תוצאות יומי
                    </div>
                  )}
                  {s.body && <BodyText body={s.body} />}
                  {vids.length > 0 && (
                    <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
                      {vids.map((v, i) => (
                        <VideoCard key={i} label={v.label} url={v.url} />
                      ))}
                    </div>
                  )}
                  {mets.map((m, i) => (
                    <MetricRow key={i} sectionId={s.id} label={m.label} unit={m.unit} />
                  ))}
                  {s.leaderboard && <Leaderboard section={s} />}
                </div>
              </div>
            );
          })}
        </>
      )}
    </main>
  );
}
