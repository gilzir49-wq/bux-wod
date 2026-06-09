'use client';

import { useEffect, useState } from 'react';
import BuxLogo from '@/components/BuxLogo';
import WorkoutView from '@/components/WorkoutView';
import StarRating from '@/components/StarRating';
import { generateWorkout } from '@/lib/engine';
import {
  EQUIPMENT_OPTIONS,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  TIME_OPTIONS,
  LEVEL_LABEL,
} from '@/lib/options';
import { Equipment, Goal, Level, TimeOption, Workout } from '@/lib/types';
import {
  LevelIcon,
  OptionIcon,
  SaveIcon,
  SavedIcon,
  ShareIcon,
  RefreshIcon,
  FolderIcon,
  PlusIcon,
  BackIcon,
  TrashIcon,
} from '@/components/Icons';
import { buildShareText, buildAppShareText } from '@/lib/share';
import { deleteWorkout, getSavedWorkouts, rateWorkout, saveWorkout } from '@/lib/storage';

type Screen = 'home' | 'generating' | 'result' | 'saved';

const BUILD_MS = 1500;

export default function GenerateTab() {
  const [screen, setScreen] = useState<Screen>('home');

  // selections
  const [time, setTime] = useState<TimeOption>(30);
  const [level, setLevel] = useState<Level>('intermediate');
  const [goal, setGoal] = useState<Goal>('general');
  const [equipment, setEquipment] = useState<Equipment[]>(['none']);

  // current workout
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [saved, setSavedFlag] = useState(false);

  const [savedList, setSavedList] = useState<Workout[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setSavedList(getSavedWorkouts());
  }, [screen]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1900);
  }

  function toggleEquipment(e: Equipment) {
    // Multi-select for real gear, but "bodyweight only" (none) is exclusive:
    //  - tapping bodyweight clears everything else (you have nothing else)
    //  - tapping any real item auto-removes bodyweight, so the workout actually
    //    centers on the gear you said you have (members complained that leaving
    //    bodyweight on diluted their equipment out of the workout)
    //  - if you clear the last real item, bodyweight comes back automatically
    setEquipment((prev) => {
      if (e === 'none') return ['none'];
      const has = prev.includes(e);
      const next = has
        ? prev.filter((x) => x !== e)
        : [...prev.filter((x) => x !== 'none'), e];
      const realLeft = next.filter((x) => x !== 'none');
      return realLeft.length ? realLeft : ['none'];
    });
  }

  // Build with a short, branded "assembling your workout" beat so the result
  // doesn't snap in instantly — it feels like the coach is writing the WOD.
  function buildAndShow(input: {
    time: TimeOption;
    level: Level;
    goal: Goal;
    equipment: Equipment[];
  }) {
    setScreen('generating');
    window.scrollTo({ top: 0 });
    window.setTimeout(() => {
      const w = generateWorkout(input);
      setWorkout(w);
      setSavedFlag(false);
      setScreen('result');
      window.scrollTo({ top: 0 });
    }, BUILD_MS);
  }

  function handleGenerate() {
    buildAndShow({ time, level, goal, equipment });
  }

  function handleRegenerate() {
    if (!workout) return;
    buildAndShow({
      time: workout.time,
      level: workout.level,
      goal: workout.goal,
      equipment: workout.equipment,
    });
  }

  function handleSave() {
    if (!workout) return;
    saveWorkout(workout);
    setSavedFlag(true);
    setSavedList(getSavedWorkouts());
    flash('האימון נשמר! 🦌');
  }

  function handleRate(n: number) {
    if (!workout) return;
    const updated = { ...workout, rating: n };
    setWorkout(updated);
    // persist a rating: ensure it's saved.
    saveWorkout(updated);
    setSavedFlag(true);
    rateWorkout(updated.id, n);
    setSavedList(getSavedWorkouts());
  }

  async function handleShare() {
    if (!workout) return;
    const text = buildShareText(workout);
    const shareData = { title: 'BUX WOD 🦌', text };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(text);
      flash('הועתק! הדביקו בוואטסאפ/אינסטגרם 🦌');
    } catch {
      flash('לא ניתן לשתף במכשיר הזה');
    }
  }

  async function handleShareApp() {
    const text = buildAppShareText();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BUX WOD 🦌', text });
        return;
      }
    } catch {
      // cancelled — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(text);
      flash('הלינק הועתק! שלחו לחברים 🦌');
    } catch {
      flash('לא ניתן לשתף במכשיר הזה');
    }
  }

  function openSaved(w: Workout) {
    setWorkout(w);
    setSavedFlag(true);
    setScreen('result');
    window.scrollTo({ top: 0 });
  }

  function removeSaved(id: string) {
    const next = deleteWorkout(id);
    setSavedList(next);
    flash('נמחק');
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-5 min-h-[100dvh]">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => setScreen('home')} className="press">
          <BuxLogo size={48} />
        </button>
        <button
          onClick={() => setScreen(screen === 'saved' ? 'home' : 'saved')}
          className="press flex items-center gap-1.5 rounded-full bg-bux-green px-3.5 py-2 text-sm font-bold text-white shadow-card"
        >
          {screen === 'saved' ? (
            <>
              <PlusIcon size={17} /> אימון חדש
            </>
          ) : (
            <>
              <FolderIcon size={17} /> האימונים שלי
            </>
          )}
        </button>
      </div>

      {screen === 'home' && (
        <HomeScreen
          time={time}
          setTime={setTime}
          level={level}
          setLevel={setLevel}
          goal={goal}
          setGoal={setGoal}
          equipment={equipment}
          toggleEquipment={toggleEquipment}
          onGenerate={handleGenerate}
          onShareApp={handleShareApp}
        />
      )}

      {screen === 'generating' && <Generating />}

      {screen === 'result' && workout && (
        <div className="mt-5">
          <WorkoutView workout={workout} />

          {/* rating */}
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-card">
            <span className="text-sm font-bold text-bux-green">איך היה האימון?</span>
            <StarRating value={workout.rating} onChange={handleRate} />
          </div>

          {/* actions */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ActionBtn onClick={handleSave} variant="green">
              {saved ? <SavedIcon size={19} /> : <SaveIcon size={19} />}
              {saved ? 'נשמר' : 'שמירה'}
            </ActionBtn>
            <ActionBtn onClick={handleShare} variant="green">
              <ShareIcon size={19} />
              שיתוף
            </ActionBtn>
            <ActionBtn onClick={handleRegenerate} variant="yellow" full>
              <RefreshIcon size={19} />
              צרו אימון נוסף
            </ActionBtn>
          </div>
          <button
            onClick={() => setScreen('home')}
            className="press mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-3 text-sm font-bold text-bux-green-light"
          >
            <BackIcon size={16} /> שינוי הגדרות
          </button>
        </div>
      )}

      {screen === 'saved' && (
        <SavedScreen list={savedList} onOpen={openSaved} onRemove={removeSaved} />
      )}

      {/* toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="animate-pop rounded-full bg-bux-green px-5 py-3 text-sm font-bold text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}

// ---------- Generating ("building your workout") screen ----------
function Generating() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const phrases = ['מחמם שרירים…', 'בוחר תרגילים…', 'מכוון עומסים…', 'מסדר את הסבבים…'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((p) => (p + 1) % phrases.length), 420);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center animate-fade-up">
      <div className="relative h-32 w-32">
        <div className="absolute inset-0 rounded-full border-4 border-bux-green/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-bux-yellow" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${basePath}/brand/logo-icon.png`}
          alt=""
          className="absolute inset-0 m-auto h-20 w-auto animate-pulse"
          draggable={false}
        />
      </div>
      <h2 className="mt-7 text-2xl font-black text-bux-green">בונה לך אימון BUX</h2>
      <p className="display mt-1 h-5 text-sm font-bold tracking-wide text-bux-green-light">
        {phrases[i]}
      </p>
      <div className="mt-5 h-2 w-52 overflow-hidden rounded-full bg-bux-green/10">
        <div className="h-full origin-right rounded-full bg-bux-yellow animate-grow" />
      </div>
      <p className="display mt-6 text-[11px] font-bold uppercase tracking-[0.3em] text-bux-green-light">
        Let’s Go BUX 🦌
      </p>
    </div>
  );
}

// ---------- Home screen ----------
function HomeScreen(props: {
  time: TimeOption;
  setTime: (t: TimeOption) => void;
  level: Level;
  setLevel: (l: Level) => void;
  goal: Goal;
  setGoal: (g: Goal) => void;
  equipment: Equipment[];
  toggleEquipment: (e: Equipment) => void;
  onGenerate: () => void;
  onShareApp: () => void;
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return (
    <div className="mt-4 space-y-7 animate-fade-up">
      {/* Hero */}
      <div className="relative text-center pt-2">
        <div className="pointer-events-none absolute inset-x-0 -top-2 mx-auto h-40 w-40 rounded-full bg-bux-yellow/25 blur-2xl" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${basePath}/brand/logo-icon.png`}
          alt="CrossFit Bux"
          className="relative mx-auto mb-3 h-24 w-auto select-none drop-shadow-[0_8px_16px_rgba(20,54,32,0.18)]"
          draggable={false}
        />
        <div className="display text-[11px] font-bold uppercase tracking-[0.32em] text-bux-green-light">
          WOD Generator
        </div>
        <h1 className="mt-1 text-[2rem] font-black leading-[1.1] text-bux-green text-balance">
          אימון BUX בכל מקום
        </h1>
        <p className="mx-auto mt-2 max-w-[19rem] text-sm font-semibold leading-relaxed text-bux-green-light">
          מילואים, חופשה, פארק או חצר — תגידו כמה זמן יש לכם, ונבנה לכם אימון אמיתי.
        </p>
      </div>

      {/* Time */}
      <Field step={1} label="כמה זמן יש לכם?">
        <div className="grid grid-cols-3 gap-2.5">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => props.setTime(t)}
              className={`press flex flex-col items-center justify-center rounded-2xl border-2 py-3 ${
                props.time === t
                  ? 'border-bux-green bg-bux-green text-white shadow-card'
                  : 'border-bux-green/12 bg-white text-bux-green hairline'
              }`}
            >
              <span className="display text-2xl font-bold leading-none">{t}</span>
              <span className="mt-0.5 text-[11px] font-bold opacity-70">דקות</span>
            </button>
          ))}
        </div>
      </Field>

      {/* Level */}
      <Field step={2} label="מה הרמה שלכם?">
        <div className="grid grid-cols-3 gap-2.5">
          {LEVEL_OPTIONS.map((l, i) => (
            <Chip
              key={l.value}
              active={props.level === l.value}
              onClick={() => props.setLevel(l.value)}
              stack
              icon={<LevelIcon level={(i + 1) as 1 | 2 | 3} size={26} />}
            >
              {l.label}
            </Chip>
          ))}
        </div>
      </Field>

      {/* Goal */}
      <Field step={3} label="מה המטרה היום?">
        <div className="grid grid-cols-2 gap-2.5">
          {GOAL_OPTIONS.map((g) => (
            <Chip
              key={g.value}
              active={props.goal === g.value}
              onClick={() => props.setGoal(g.value)}
              icon={<OptionIcon name={g.value} size={22} />}
            >
              {g.label}
            </Chip>
          ))}
        </div>
      </Field>

      {/* Equipment */}
      <Field step={4} label="איזה ציוד יש בסביבה?" hint="אפשר לבחור כמה">
        <div className="grid grid-cols-2 gap-2.5">
          {EQUIPMENT_OPTIONS.map((e) => (
            <Chip
              key={e.value}
              active={props.equipment.includes(e.value)}
              onClick={() => props.toggleEquipment(e.value)}
              icon={<OptionIcon name={e.value} size={21} />}
              multi
              small
            >
              {e.label}
            </Chip>
          ))}
        </div>
      </Field>

      <button
        onClick={props.onGenerate}
        className="press group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-bux-yellow py-5 text-xl font-black text-bux-green shadow-btn active:shadow-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${basePath}/brand/logo-icon.png`} alt="" className="h-7 w-auto" draggable={false} />
        בנו לי אימון
      </button>
      <p className="display text-center text-xs font-bold uppercase tracking-[0.3em] text-bux-green-light">
        Let’s Go BUX
      </p>

      <button
        onClick={props.onShareApp}
        className="press mx-auto flex items-center gap-2 rounded-full bg-bux-green/8 px-4 py-2.5 text-sm font-bold text-bux-green"
      >
        <ShareIcon size={17} /> שתפו את BUX WOD לחברים
      </button>
    </div>
  );
}

// ---------- Saved screen ----------
function SavedScreen({
  list,
  onOpen,
  onRemove,
}: {
  list: Workout[];
  onOpen: (w: Workout) => void;
  onRemove: (id: string) => void;
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return (
    <div className="mt-5 animate-fade-up">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-2xl font-black text-bux-green">האימונים שלי</h2>
        {list.length > 0 && (
          <span className="display rounded-full bg-bux-green/8 px-2.5 py-1 text-xs font-bold text-bux-green-light">
            {list.length}
          </span>
        )}
      </div>
      {list.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-card hairline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${basePath}/brand/logo-icon.png`} alt="" className="mx-auto mb-3 h-16 w-auto opacity-90" draggable={false} />
          <p className="font-black text-bux-green">עדיין אין אימונים שמורים</p>
          <p className="text-sm text-bux-green-light mt-1">בנו אימון, דרגו אותו ושמרו — הוא יופיע כאן.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((w) => (
            <div key={w.id} className="rounded-2xl bg-white p-4 shadow-card hairline flex items-center gap-3">
              <button onClick={() => onOpen(w)} className="press flex-1 text-right min-w-0">
                <div className="font-black text-bux-green truncate">{w.title}</div>
                <div className="display text-xs font-medium text-bux-green-light mt-0.5">
                  {formatDate(w.createdAt)} · {w.main.format} · {LEVEL_LABEL[w.level]}
                </div>
                {typeof w.rating === 'number' && (
                  <div className="mt-1 text-bux-yellow text-sm" dir="ltr">
                    {'★'.repeat(w.rating)}
                    <span className="text-gray-300">{'★'.repeat(5 - w.rating)}</span>
                  </div>
                )}
              </button>
              <button
                onClick={() => onRemove(w.id)}
                className="press shrink-0 rounded-full bg-red-50 p-2.5 text-red-500"
                aria-label="מחיקה"
              >
                <TrashIcon size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- shared UI atoms ----------
function Field({
  label,
  hint,
  step,
  children,
}: {
  label: string;
  hint?: string;
  step?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {step !== undefined && (
          <span className="display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-bux-green text-xs font-bold text-bux-yellow">
            {step}
          </span>
        )}
        <label className="text-[17px] font-extrabold text-bux-green">{label}</label>
        {hint && (
          <span className="rounded-full bg-bux-green/8 px-2 py-0.5 text-[11px] font-bold text-bux-green-light">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  small,
  icon,
  stack,
  multi,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
  icon?: React.ReactNode;
  stack?: boolean;
  multi?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`press relative flex font-bold ${
        stack
          ? 'flex-col items-center justify-center gap-1.5 px-2 py-3.5 text-center'
          : 'flex-row items-center gap-2.5 px-3 py-3 text-right'
      } rounded-2xl border-2 ${small ? 'text-[13px]' : 'text-[15px]'} ${
        active
          ? 'border-bux-green bg-bux-green text-white shadow-card'
          : 'border-bux-green/12 bg-white text-bux-green hairline'
      }`}
    >
      {icon && (
        <span className={active ? 'text-white' : 'text-bux-green/85'}>{icon}</span>
      )}
      <span className="leading-tight">{children}</span>
      {multi && active && (
        <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-bux-yellow text-[11px] font-black text-bux-green shadow">
          ✓
        </span>
      )}
    </button>
  );
}

function ActionBtn({
  onClick,
  children,
  variant,
  full,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant: 'green' | 'yellow';
  full?: boolean;
}) {
  const base =
    'press flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-black active:shadow-none';
  const styles =
    variant === 'yellow'
      ? 'bg-bux-yellow text-bux-green shadow-btn'
      : 'bg-bux-green text-white shadow-btn-green';
  return (
    <button onClick={onClick} className={`${base} ${styles} ${full ? 'col-span-2' : ''}`}>
      {children}
    </button>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
