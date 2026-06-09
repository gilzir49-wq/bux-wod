'use client';

import { Tab, useApp } from './AppContext';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'daily', label: 'האימון', emoji: '🗓️' },
  { id: 'generate', label: 'מחולל', emoji: '🎲' },
  { id: 'profile', label: 'הפרופיל', emoji: '🏅' },
  { id: 'coach', label: 'מאמן', emoji: '🧠' },
];

export default function TabBar() {
  const { tab, setTab } = useApp();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 border-t border-bux-green/15 bg-bux-cream/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                window.scrollTo({ top: 0 });
              }}
              className="press flex flex-1 flex-col items-center gap-0.5 py-2.5"
            >
              <span
                className={`text-[22px] leading-none transition-transform ${
                  on ? 'scale-110' : 'opacity-55'
                }`}
              >
                {t.emoji}
              </span>
              <span
                className={`text-[11px] font-bold ${
                  on ? 'text-bux-green' : 'text-bux-green/50'
                }`}
              >
                {t.label}
              </span>
              <span
                className={`h-0.5 w-6 rounded-full ${on ? 'bg-bux-yellow' : 'bg-transparent'}`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
