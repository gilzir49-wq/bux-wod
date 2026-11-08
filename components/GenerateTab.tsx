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
  STRUCTURE_OPTIONS,
  LEVEL_LABEL,
} from '@/lib/options';
import { Equipment, Goal, Level, TimeOption, Workout, WorkoutStructure } from '@/lib/types';
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
import {
  bumpVisit,
  fetchVisits,
  fetchReviews,
  addReview,
  pickSpotlight,
  Review,
} from '@/lib/community';
import { parseDiaryParams, DiaryParams, DiaryWod } from '@/lib/diary';
import { adaptWod, adaptedShareText, AdaptedWod } from '@/lib/adapt';

type Screen = 'home' | 'generating' | 'result' | 'saved' | 'adapted';

const BUILD_MS = 1500;

// Count one visit per app open (survives StrictMode's double-mount in dev).
let visitCounted = false;

export default function GenerateTab() {
  const [screen, setScreen] = useState<Screen>('home');

  // selections
  const [time, setTime] = useState<TimeOption>(30);
  const [level, setLevel] = useState<Level>('intermediate');
  const [goal, setGoal] = useState<Goal>('general');
  const [equipment, setEquipment] = useState<Equipment[]>(['none']);
  const [structure, setStructure] = useState<WorkoutStructure>('full');
  const [includeWarmup, setIncludeWarmup] = useState(true);
  const [includeCooldown, setIncludeCooldown] = useState(true);

  // current workout
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [saved, setSavedFlag] = useState(false);

  const [savedList, setSavedList] = useState<Workout[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // "יומן באקס" incoming today's-workout link (null = normal generator)
  const [diary, setDiary] = useState<DiaryParams | null>(null);
  const [adapted, setAdapted] = useState<AdaptedWod | null>(null);

  // community: visit counter + rotating member review
  const [visits, setVisits] = useState(0);
  const [spotlight, setSpotlight] = useState<Review | null>(null);
  // review form (on the result screen)
  const [rvName, setRvName] = useState('');
  const [rvText, setRvText] = useState('');
  const [rvSent, setRvSent] = useState(false);

  useEffect(() => {
    setSavedList(getSavedWorkouts());
  }, [screen]);

  // count this open, load the running total + a random happy review to show
  useEffect(() => {
    (async () => {
      if (!visitCounted) {
        visitCounted = true;
        await bumpVisit();
      }
      setVisits(await fetchVisits());
      setSpotlight(pickSpotlight(await fetchReviews()));
    })();
  }, []);

  // if opened from "יומן באקס" with today's workout, load it + preselect gear
  useEffect(() => {
    const d = parseDiaryParams(window.location.search);
    if (d.active) {
      setDiary(d);
      setEquipment(d.equipment);
    }
  }, []);

  function handleBuildAdapted() {
    if (!diary?.active || !diary.wod) return;
    const wod = diary.wod;
    setScreen('generating');
    window.scrollTo({ top: 0 });
    window.setTimeout(() => {
      setAdapted(adaptWod(wod, equipment, time));
      setScreen('adapted');
      window.scrollTo({ top: 0 });
    }, BUILD_MS);
  }

  async function handleShareAdapted() {
    if (!adapted) return;
    const text = adaptedShareText(adapted);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BUX WOD 🦌', text });
        return;
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(text);
      flash('הועתק! 🦌');
    } catch {
      flash('לא ניתן לשתף במכשיר הזה');
    }
  }

  async function handlePublishReview() {
    if (!workout) return;
    if (rvText.trim().length < 2) {
      flash('כתבו מילה טובה על האימון 🙏');
      return;
    }
    await addReview({ name: rvName, text: rvText, rating: workout.rating || 5 });
    setRvSent(true);
    setRvName('');
    setRvText('');
    flash('תודה! התגובה שלך תופיע למתאמנים 🦌');
    setSpotlight(pickSpotlight(await fetchReviews()));
  }

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
    structure: WorkoutStructure;
    includeWarmup: boolean;
    includeCooldown: boolean;
  }) {
    setScreen('generating');
    window.scrollTo({ top: 0 });
    window.setTimeout(() => {
      const w = generateWorkout(input);
      setWorkout(w);
      setSavedFlag(false);
      setRvSent(false);
      setScreen('result');
      window.scrollTo({ top: 0 });
    }, BUILD_MS);
  }

  function handleGenerate() {
    buildAndShow({ time, level, goal, equipment, structure, includeWarmup, includeCooldown });
  }

  function handleRegenerate() {
    if (!workout) return;
    buildAndShow({
      time: workout.time,
      level: workout.level,
      goal: workout.goal,
      equipment: workout.equipment,
      structure: workout.structure ?? 'full',
      includeWarmup: workout.includeWarmup ?? true,
      includeCooldown: workout.includeCooldown ?? true,
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

      {screen === 'home' && diary?.active && diary.wod && (
        <DiaryHome
          wod={diary.wod}
          equipment={equipment}
          toggleEquipment={toggleEquipment}
          time={time}
          setTime={setTime}
          onBuild={handleBuildAdapted}
        />
      )}

      {screen === 'home' && !diary?.active && (
        <HomeScreen
          time={time}
          setTime={setTime}
          level={level}
          setLevel={setLevel}
          goal={goal}
          setGoal={setGoal}
          equipment={equipment}
          toggleEquipment={toggleEquipment}
          structure={structure}
          setStructure={setStructure}
          includeWarmup={includeWarmup}
          setIncludeWarmup={setIncludeWarmup}
          includeCooldown={includeCooldown}
          setIncludeCooldown={setIncludeCooldown}
          onGenerate={handleGenerate}
          onShareApp={handleShareApp}
          visits={visits}
          spotlight={spotlight}
        />
      )}

      {screen === 'generating' && <Generating />}

      {screen === 'adapted' && adapted && (
        <div className="mt-5">
          <AdaptedView adapted={adapted} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ActionBtn onClick={handleShareAdapted} variant="green">
              <ShareIcon size={19} /> שיתוף
            </ActionBtn>
            <ActionBtn
              onClick={() => {
                setScreen('home');
                window.scrollTo({ top: 0 });
              }}
              variant="yellow"
            >
              <RefreshIcon size={19} /> שנה זמן/ציוד
            </ActionBtn>
          </div>
        </div>
      )}

      {screen === 'result' && workout && (
        <div className="mt-5">
          <WorkoutView workout={workout} />

          {/* rating + share a review (everyone sees these, rotating) */}
          <div className="mt-6 rounded-2xl bg-white p-4 shadow-card space-y-3">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-bold text-bux-green">איך היה האימון?</span>
              <StarRating value={workout.rating} onChange={handleRate} />
            </div>
            {rvSent ? (
              <p className="text-center text-sm font-bold text-bux-green">
                תודה ששיתפת! 🦌 התגובה שלך תעודד אחרים.
              </p>
            ) : (
              <>
                <input
                  value={rvName}
                  onChange={(e) => setRvName(e.target.value)}
                  placeholder="השם שלך (לא חובה)"
                  maxLength={24}
                  className="w-full rounded-xl border-2 border-bux-green/12 bg-bux-cream/40 px-3 py-2.5 text-sm font-semibold text-bux-green outline-none focus:border-bux-green"
                />
                <textarea
                  value={rvText}
                  onChange={(e) => setRvText(e.target.value)}
                  placeholder="ספרו איך היה — מילה טובה שתעודד את הבאים 💬"
                  maxLength={240}
                  rows={2}
                  className="w-full resize-none rounded-xl border-2 border-bux-green/12 bg-bux-cream/40 px-3 py-2.5 text-sm font-semibold text-bux-green outline-none focus:border-bux-green"
                />
                <button
                  onClick={handlePublishReview}
                  className="press w-full rounded-xl bg-bux-green py-3 text-sm font-black text-white shadow-btn-green active:shadow-none"
                >
                  💬 פרסמו תגובה
                </button>
              </>
            )}
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
  structure: WorkoutStructure;
  setStructure: (s: WorkoutStructure) => void;
  includeWarmup: boolean;
  setIncludeWarmup: (v: boolean) => void;
  includeCooldown: boolean;
  setIncludeCooldown: (v: boolean) => void;
  onGenerate: () => void;
  onShareApp: () => void;
  visits: number;
  spotlight: Review | null;
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const { visits, spotlight } = props;
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

        {/* live visit counter */}
        {visits > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-bux-green px-3.5 py-1.5 text-white shadow-card">
            <span className="text-sm">👀</span>
            <span className="display text-sm font-bold text-bux-yellow tabular-nums">
              {visits.toLocaleString('he-IL')}
            </span>
            <span className="text-xs font-bold text-white/90">נכנסו להתאמן</span>
          </div>
        )}
      </div>

      {/* rotating member review — different one each visit */}
      {spotlight && (
        <div className="rounded-2xl border-2 border-bux-yellow/40 bg-white p-4 shadow-card animate-pop">
          <div className="text-bux-yellow" dir="ltr">
            {'★'.repeat(Math.max(1, Math.min(5, spotlight.rating)))}
          </div>
          <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-bux-green">
            “{spotlight.text}”
          </p>
          <div className="mt-1.5 text-xs font-bold text-bux-green-light">
            — {spotlight.name || 'מתאמן/ת BUX'} 🦌
          </div>
        </div>
      )}

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

      {/* Structure */}
      <Field step={5} label="מבנה האימון?">
        <div className="grid grid-cols-3 gap-2.5">
          {STRUCTURE_OPTIONS.map((s) => (
            <Chip
              key={s.value}
              active={props.structure === s.value}
              onClick={() => props.setStructure(s.value)}
              stack
              icon={<OptionIcon name={s.value} size={24} />}
            >
              {s.label}
            </Chip>
          ))}
        </div>
      </Field>

      {/* Warm-up / cool-down toggles */}
      <Field step={6} label="חימום והתאוששות?">
        <div className="grid grid-cols-2 gap-2.5">
          <ToggleChip
            label="חימום"
            on={props.includeWarmup}
            onToggle={() => props.setIncludeWarmup(!props.includeWarmup)}
          />
          <ToggleChip
            label="שחרור / התאוששות"
            on={props.includeCooldown}
            onToggle={() => props.setIncludeCooldown(!props.includeCooldown)}
          />
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

// ---------- "יומן באקס" home: today's workout → adapt to gear + time ----------
function DiaryHome(props: {
  wod: DiaryWod;
  equipment: Equipment[];
  toggleEquipment: (e: Equipment) => void;
  time: TimeOption;
  setTime: (t: TimeOption) => void;
  onBuild: () => void;
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const { wod } = props;
  return (
    <div className="mt-4 space-y-6 animate-fade-up">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${basePath}/brand/logo-icon.png`} alt="" className="mx-auto mb-2 h-16 w-auto" draggable={false} />
        <div className="display text-[11px] font-bold uppercase tracking-[0.3em] text-bux-green-light">
          האימון של היום
        </div>
        <h1 className="mt-1 text-2xl font-black text-bux-green">מקרוספיט באקס</h1>
        <p className="mx-auto mt-1.5 max-w-[20rem] text-sm font-semibold text-bux-green-light">
          נתאים לך את האימון של היום לפי הזמן והציוד שיש לך עכשיו.
        </p>
      </div>

      {/* today's workout, as the coach wrote it (reference) */}
      <section className="rounded-3xl bg-white p-4 shadow-card hairline">
        {wod.date && <div className="display text-[11px] font-bold text-bux-green-light">{wod.date}</div>}
        <h2 className="font-black text-bux-green leading-tight" dir="auto">{wod.title}</h2>
        {wod.sections.map((s, i) => (
          <div key={i} className="mt-3 border-t border-bux-green/10 pt-2.5 first:border-0 first:pt-0">
            <div className="text-sm font-extrabold text-bux-green" dir="auto">{s.title}</div>
            {s.lines.map((l, j) => (
              <div key={j} className="display mt-0.5 text-[13px] text-bux-green-light" dir="auto">{l}</div>
            ))}
          </div>
        ))}
      </section>

      <Field step={1} label="מה יש לך מסביב?" hint="כבר סימנו — אפשר לשנות">
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

      <Field step={2} label="כמה זמן יש לך?">
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

      <button
        onClick={props.onBuild}
        className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-bux-yellow py-5 text-xl font-black text-bux-green shadow-btn active:shadow-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${basePath}/brand/logo-icon.png`} alt="" className="h-7 w-auto" draggable={false} />
        בנו לי גרסה מותאמת
      </button>
      <p className="display text-center text-xs font-bold uppercase tracking-[0.3em] text-bux-green-light">
        Let’s Go BUX
      </p>
    </div>
  );
}

function AdaptedView({ adapted }: { adapted: AdaptedWod }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="display text-[11px] font-bold uppercase tracking-[0.3em] text-bux-green-light">
          מותאם אליך
        </div>
        <h2 className="mt-1 text-2xl font-black text-bux-green">האימון של היום</h2>
        {adapted.title && (
          <p className="mt-1 text-xs font-semibold text-bux-green-light" dir="auto">{adapted.title}</p>
        )}
      </div>

      <div className="flex gap-2 rounded-2xl border-2 border-bux-yellow/40 bg-white p-3.5 text-sm font-semibold leading-relaxed text-bux-green shadow-card">
        <span>⏱</span>
        <span>{adapted.timeNote}</span>
      </div>

      {adapted.sections.map((s, i) => (
        <section
          key={i}
          className="board relative overflow-hidden rounded-3xl shadow-[0_12px_30px_-8px_rgba(20,54,32,0.5)] animate-fade-up"
        >
          <div className="h-1.5 w-full bg-bux-yellow" />
          <div className="px-5 pt-4 pb-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-black text-white" dir="auto">
                {s.title}
                {s.titleSwapped && <span className="text-bux-yellow"> 🔁</span>}
              </span>
              {s.badge && (
                <span className="display shrink-0 rounded-lg bg-bux-yellow px-3 py-1 text-sm font-bold text-bux-green">
                  {s.badge}
                </span>
              )}
            </div>
            <div className="mt-3">
              {s.lines.map((l, j) => (
                <div
                  key={j}
                  className="flex items-start gap-2.5 border-b border-white/10 py-2.5 last:border-0"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-bux-yellow" />
                  <span className="display flex-1 text-[17px] font-bold leading-snug text-white" dir="auto">
                    {l.text}
                  </span>
                  {l.swapped && (
                    <span className="mt-0.5 shrink-0 text-[11px] font-bold text-bux-yellow">🔁</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <p className="text-center text-xs font-semibold text-bux-green-light">
        🔁 = הותאם לציוד שלך (אותו מבנה ואותה מטרה)
      </p>
    </div>
  );
}

// on/off pill for the warm-up / cool-down toggles
function ToggleChip({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`press flex items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-3 text-[15px] font-bold ${
        on
          ? 'border-bux-green bg-bux-green text-white shadow-card'
          : 'border-bux-green/12 bg-white text-bux-green/55 hairline'
      }`}
    >
      <span className="text-right leading-tight">{label}</span>
      <span
        className={`display shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
          on ? 'bg-bux-yellow text-bux-green' : 'bg-bux-green/10 text-bux-green/55'
        }`}
      >
        {on ? 'כן' : 'לא'}
      </span>
    </button>
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
                  {formatDate(w.createdAt)} · {w.main ? w.main.format : w.strength ? 'כוח' : '—'} ·{' '}
                  {LEVEL_LABEL[w.level]}
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
