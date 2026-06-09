'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  COACH_PIN,
  Program,
  ResultEntry,
  UserRec,
  addDays,
  deleteResult,
  fetchProgram,
  fetchProgramDates,
  fetchResults,
  fetchUsers,
  genId,
  putResult,
  putUser,
  sha,
  todayISO,
} from '@/lib/cloud';

export type Tab = 'daily' | 'generate' | 'profile' | 'coach';
export interface SessionUser {
  uid: string;
  name: string;
}

interface AppCtx {
  tab: Tab;
  setTab: (t: Tab) => void;
  user: SessionUser | null;
  coachOn: boolean;
  results: ResultEntry[];
  users: UserRec[];
  programDates: Record<string, boolean>;
  selDate: string;
  setSelDate: (d: string) => void;
  program: Program | null;
  loadingProgram: boolean;
  // actions
  auth: (name: string, code: string) => Promise<string | null>; // returns error msg or null
  logout: () => void;
  unlockCoach: (pin: string) => boolean;
  lockCoach: () => void;
  refresh: () => Promise<void>;
  reloadProgram: () => Promise<void>;
  upsertResult: (
    sectionId: string,
    metricLabel: string,
    value: string,
    unit: string,
  ) => Promise<void>;
  toggleAttend: () => Promise<void>;
  attendedOn: (date: string) => boolean;
  findMyResult: (sectionId: string, metricLabel: string) => ResultEntry | undefined;
}

const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>('daily');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [coachOn, setCoachOn] = useState(false);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [users, setUsers] = useState<UserRec[]>([]);
  const [programDates, setProgramDates] = useState<Record<string, boolean>>({});
  const [selDate, setSelDate] = useState<string>(todayISO());
  const [program, setProgram] = useState<Program | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(true);

  // restore session
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('bux_user') || 'null');
      if (u && u.uid) setUser(u);
      if (sessionStorage.getItem('bux_coach') === '1') setCoachOn(true);
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    const [res, us, pd] = await Promise.all([
      fetchResults(),
      fetchUsers(),
      fetchProgramDates(),
    ]);
    setResults(res);
    setUsers(us);
    setProgramDates(pd);
  }, []);

  const reloadProgram = useCallback(async () => {
    setLoadingProgram(true);
    const p = await fetchProgram(selDate);
    setProgram(p);
    setLoadingProgram(false);
  }, [selDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    reloadProgram();
  }, [reloadProgram]);

  // poll results every 25s (skip while typing / in coach editor)
  const tabRef = useRef(tab);
  tabRef.current = tab;
  useEffect(() => {
    const id = window.setInterval(async () => {
      const el = document.activeElement as HTMLElement | null;
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
      if (tabRef.current === 'coach') return;
      const [res, pd] = await Promise.all([fetchResults(), fetchProgramDates()]);
      setResults(res);
      setProgramDates(pd);
    }, 25000);
    return () => window.clearInterval(id);
  }, []);

  const auth = useCallback(
    async (name: string, code: string): Promise<string | null> => {
      name = name.trim();
      if (name.length < 2) return 'נא להזין שם.';
      if (code.length < 3) return 'בחר קוד של 3 תווים לפחות.';
      const all = await fetchUsers();
      const norm = (s: string) => s.trim().toLowerCase();
      const ex = all.find((u) => norm(u.name) === norm(name));
      const h = await sha(code);
      let session: SessionUser;
      if (ex) {
        if (ex.codeHash !== h) return 'הקוד לא תואם לשם הזה 🔒';
        session = { uid: ex.uid, name: ex.name };
      } else {
        const uid = genId();
        await putUser(uid, { name, codeHash: h, createdAt: Date.now() });
        session = { uid, name };
      }
      try {
        localStorage.setItem('bux_user', JSON.stringify(session));
      } catch {}
      setUser(session);
      await refresh();
      return null;
    },
    [refresh],
  );

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('bux_user');
    } catch {}
    setUser(null);
  }, []);

  const unlockCoach = useCallback((pin: string) => {
    if (pin === COACH_PIN) {
      setCoachOn(true);
      try {
        sessionStorage.setItem('bux_coach', '1');
      } catch {}
      return true;
    }
    return false;
  }, []);
  const lockCoach = useCallback(() => {
    setCoachOn(false);
    try {
      sessionStorage.removeItem('bux_coach');
    } catch {}
  }, []);

  const findMyResult = useCallback(
    (sectionId: string, metricLabel: string) =>
      results.find(
        (r) =>
          r.date === selDate &&
          r.uid === user?.uid &&
          r.sectionId === sectionId &&
          r.metricLabel === metricLabel,
      ),
    [results, selDate, user],
  );

  const upsertResult = useCallback(
    async (sectionId: string, metricLabel: string, value: string, unit: string) => {
      if (!user) return;
      const ex = results.find(
        (r) =>
          r.date === selDate &&
          r.uid === user.uid &&
          r.sectionId === sectionId &&
          r.metricLabel === metricLabel,
      );
      if (!value) {
        if (ex) {
          await deleteResult(ex.id);
          setResults((p) => p.filter((r) => r.id !== ex.id));
        }
        return;
      }
      if (ex) {
        const upd = { ...ex, value, unit };
        await putResult(upd);
        setResults((p) => p.map((r) => (r.id === ex.id ? upd : r)));
      } else {
        const e: ResultEntry = {
          id: genId(),
          date: selDate,
          uid: user.uid,
          member: user.name,
          sectionId,
          metricLabel,
          value,
          unit,
          createdAt: Date.now(),
        };
        await putResult(e);
        setResults((p) => [...p, e]);
      }
    },
    [results, selDate, user],
  );

  const attendedOn = useCallback(
    (date: string) =>
      !!user &&
      results.some(
        (r) => r.uid === user.uid && r.date === date && r.metricLabel === '__att__',
      ),
    [results, user],
  );

  const toggleAttend = useCallback(async () => {
    if (!user) return;
    const ex = results.find(
      (r) =>
        r.date === selDate &&
        r.uid === user.uid &&
        r.metricLabel === '__att__',
    );
    if (ex) {
      await deleteResult(ex.id);
      setResults((p) => p.filter((r) => r.id !== ex.id));
    } else {
      const e: ResultEntry = {
        id: genId(),
        date: selDate,
        uid: user.uid,
        member: user.name,
        sectionId: '__day__',
        metricLabel: '__att__',
        value: '1',
        unit: '',
        createdAt: Date.now(),
      };
      await putResult(e);
      setResults((p) => [...p, e]);
    }
  }, [results, selDate, user]);

  const value: AppCtx = {
    tab,
    setTab,
    user,
    coachOn,
    results,
    users,
    programDates,
    selDate,
    setSelDate,
    program,
    loadingProgram,
    auth,
    logout,
    unlockCoach,
    lockCoach,
    refresh,
    reloadProgram,
    upsertResult,
    toggleAttend,
    attendedOn,
    findMyResult,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
