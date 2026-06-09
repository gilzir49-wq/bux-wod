'use client';

import { useState } from 'react';
import BuxLogo from './BuxLogo';
import { useApp } from './AppContext';

export default function AuthGate() {
  const { auth } = useApp();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    setMsg('בודק…');
    const err = await auth(name, code);
    if (err) {
      setMsg(err);
      setBusy(false);
    }
    // on success the provider sets user → this gate unmounts
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-8 min-h-[100dvh]">
      <div className="flex flex-col items-center text-center">
        <BuxLogo size={84} />
        <h1 className="mt-4 text-2xl font-extrabold text-bux-green">כניסת מתאמנים</h1>
        <p className="mt-1.5 text-sm text-bux-green/70 text-balance">
          התחבר כדי לראות את האימון היומי, להזין תוצאות ולעקוב אחרי השיאים שלך.
          הכניסה עובדת מכל מכשיר.
        </p>
      </div>

      <div className="mt-6 rounded-3xl bg-white p-5 shadow-card">
        <label className="block text-sm font-bold text-bux-green">שם</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="השם שלך"
          autoComplete="off"
          className="mt-1.5 w-full rounded-2xl border border-bux-green/15 bg-bux-cream px-4 py-3 text-base outline-none focus:border-bux-green"
        />
        <label className="mt-3 block text-sm font-bold text-bux-green">קוד אישי</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
          type="password"
          placeholder="קוד סודי משלך"
          autoComplete="off"
          className="mt-1.5 w-full rounded-2xl border border-bux-green/15 bg-bux-cream px-4 py-3 text-base outline-none focus:border-bux-green"
        />
        <button
          onClick={go}
          disabled={busy}
          className="press mt-5 w-full rounded-2xl bg-bux-green py-3.5 text-base font-extrabold text-white shadow-btn-green disabled:opacity-60"
        >
          כניסה / הרשמה
        </button>
        {msg && (
          <div className="mt-3 text-center text-sm font-bold text-red-500">{msg}</div>
        )}
        <p className="mt-3 text-center text-xs text-bux-green/60">
          פעם ראשונה? פשוט בחר שם וקוד — וניצור לך חשבון. בכניסות הבאות תתחבר עם אותם פרטים.
        </p>
      </div>
    </main>
  );
}
