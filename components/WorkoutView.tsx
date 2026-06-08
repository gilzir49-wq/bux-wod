'use client';

import { MainPiece, PrescribedMovement, Workout, WorkoutSection } from '@/lib/types';
import { GOAL_LABEL, LEVEL_LABEL } from '@/lib/options';

// ---- small inline section glyphs (cohesive with the icon set) ----
function WarmupGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}
function MainGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}
function CooldownGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3c0 5-4 6-4 10a4 4 0 0 0 8 0c0-4-4-5-4-10Z" />
      <path d="M12 21v-6" />
    </svg>
  );
}

function WatchLink({ href, dark }: { href: string; dark?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`press shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
        dark
          ? 'bg-bux-yellow/15 text-bux-yellow hover:bg-bux-yellow/25'
          : 'bg-bux-green/8 text-bux-green hover:bg-bux-green/15'
      }`}
    >
      <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
        <path d="M1 0l8 5-8 5z" />
      </svg>
      צפו
    </a>
  );
}

// ---- light section row (warm-up / cool-down) ----
function MovementRow({ m }: { m: PrescribedMovement }) {
  return (
    <div className="py-2.5 border-b border-bux-green/10 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="display text-[17px] font-bold text-bux-green" dir="ltr" style={{ textAlign: 'right' }}>
            {m.name}
          </div>
          <div className="display text-sm font-medium text-bux-green-light mt-0.5">{m.detail}</div>
        </div>
        <WatchLink href={m.youtube} />
      </div>
      {m.scaling && (
        <div className="mt-2 flex gap-1.5 text-xs leading-relaxed text-amber-900 bg-bux-yellow/15 rounded-lg px-2.5 py-1.5">
          <span>🔧</span>
          <span>{m.scaling}</span>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  section,
  glyph,
  tone,
}: {
  section: WorkoutSection;
  glyph: React.ReactNode;
  tone: 'warm' | 'cool';
}) {
  const headerBg = tone === 'warm' ? 'bg-bux-green-light' : 'bg-[#5B7C66]';
  return (
    <section className="rounded-3xl bg-white shadow-card overflow-hidden hairline animate-fade-up">
      <header className={`flex items-center justify-between px-4 py-3 text-white ${headerBg}`}>
        <h3 className="flex items-center gap-2 text-lg font-black">
          <span className="text-white/90">{glyph}</span>
          {section.title}
        </h3>
        <span className="display rounded-full bg-black/15 px-2.5 py-1 text-xs font-bold tracking-wide">
          {section.durationLabel}
        </span>
      </header>
      <div className="px-4 py-2">
        {section.movements.map((m, i) => (
          <MovementRow key={i} m={m} />
        ))}
      </div>
      {section.note && (
        <p className="px-4 pb-4 pt-1 text-[13px] text-bux-green-light leading-relaxed">{section.note}</p>
      )}
    </section>
  );
}

// ---- the WOD board (main piece) ----
function BoardRow({ m }: { m: PrescribedMovement }) {
  return (
    <div className="border-b border-white/10 last:border-0">
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0 flex items-baseline gap-2.5" dir="ltr">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-bux-yellow" />
          <div className="min-w-0">
            <div className="display text-[19px] font-bold leading-tight text-white">{m.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="display whitespace-nowrap text-[15px] font-bold text-bux-yellow">{m.detail}</span>
          <WatchLink href={m.youtube} dark />
        </div>
      </div>
      {m.scaling && (
        <div className="mb-2.5 -mt-0.5 flex gap-1.5 rounded-lg bg-white/8 px-2.5 py-1.5 text-[11px] leading-relaxed text-bux-yellow/90">
          <span>🔧</span>
          <span>{m.scaling}</span>
        </div>
      )}
    </div>
  );
}

function MainBoard({ main }: { main: MainPiece }) {
  return (
    <section className="board relative rounded-3xl shadow-[0_12px_30px_-8px_rgba(20,54,32,0.5)] overflow-hidden animate-fade-up">
      {/* top accent line */}
      <div className="h-1.5 w-full bg-bux-yellow" />
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-bux-yellow">
            <MainGlyph />
            <span className="text-lg font-black text-white">האימון</span>
          </div>
          <span className="display rounded-lg bg-bux-yellow px-3 py-1 text-sm font-bold uppercase tracking-wider text-bux-green">
            {main.format}
          </span>
        </div>

        <p className="display mt-2 text-[15px] font-bold text-bux-yellow">{main.formatLine}</p>

        <div className="mt-3">
          {main.movements.map((m, i) => (
            <BoardRow key={i} m={m} />
          ))}
        </div>

        {main.goalLine && (
          <div className="mt-3 flex gap-2 rounded-xl border border-bux-yellow/30 bg-bux-yellow/8 px-3 py-2.5 text-[13px] font-semibold leading-relaxed text-bux-yellow">
            <span className="shrink-0">🎯</span>
            <span>{main.goalLine}</span>
          </div>
        )}
        {main.note && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-white/65">{main.note}</p>
        )}
      </div>
    </section>
  );
}

export default function WorkoutView({ workout }: { workout: Workout }) {
  const pills = [workout.main.format, LEVEL_LABEL[workout.level], `${workout.time} דק׳`, GOAL_LABEL[workout.goal]];
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="display text-[11px] font-bold uppercase tracking-[0.3em] text-bux-green-light">
          Workout of the Day
        </div>
        <h2 className="mt-1 text-2xl font-black text-bux-green">{workout.title}</h2>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {pills.map((p, i) => (
            <span
              key={i}
              className={`display rounded-full px-2.5 py-1 text-xs font-bold ${
                i === 0 ? 'bg-bux-green text-bux-yellow' : 'bg-bux-green/8 text-bux-green'
              }`}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      <SectionCard section={workout.warmup} glyph={<WarmupGlyph />} tone="warm" />
      <MainBoard main={workout.main} />
      <SectionCard section={workout.cooldown} glyph={<CooldownGlyph />} tone="cool" />
    </div>
  );
}
