// Cohesive line-icon set for BUX WOD — replaces emojis for a premium,
// on-brand feel. All icons are 24×24, stroke = currentColor, so they invert
// automatically between selected (white) and idle (green) chip states.
import React from 'react';

type P = { className?: string; size?: number };

const S = ({
  children,
  size = 24,
  className,
  fill = 'none',
}: P & { children: React.ReactNode; fill?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

// ---- Level: intensity bars (1–3 filled) ----
export function LevelIcon({ level, size = 24, className }: P & { level: 1 | 2 | 3 }) {
  const bars = [
    { x: 4, h: 6 },
    { x: 10, h: 11 },
    { x: 16, h: 16 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={20 - b.h}
          width={4}
          height={b.h}
          rx={1.5}
          fill="currentColor"
          opacity={i < level ? 1 : 0.22}
        />
      ))}
    </svg>
  );
}

// ---- Goal icons ----
export const StrengthIcon = (p: P) => (
  <S {...p}>
    <path d="M3 9v6M6 7v10M18 7v10M21 9v6" />
    <path d="M6 12h12" />
  </S>
);

export const CardioIcon = (p: P) => (
  <S {...p}>
    <path d="M3 12h4l2-5 3 10 2-7 1.5 2H21" />
  </S>
);

export const GeneralIcon = (p: P) => (
  <S {...p}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </S>
);

export const GymnasticsIcon = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v5m0 0l-4 6m4-6l4 6M6 10c2 2 4 3 6 3s4-1 6-3" />
  </S>
);

// ---- Equipment icons ----
export const BodyweightIcon = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="4.5" r="2" />
    <path d="M12 6.5v7m0 0l-4 6m4-6l4 6M6 9l6 2 6-2" />
  </S>
);

export const PullupBarIcon = (p: P) => (
  <S {...p}>
    <path d="M3 5h18M6 5v4M18 5v4M9 5v2M15 5v2" />
    <path d="M9 7c0 4 0 7 0 7M15 7c0 4 0 7 0 7" />
    <path d="M9 14h6" />
  </S>
);

export const DumbbellIcon = (p: P) => (
  <S {...p}>
    <path d="M3 9v6M5.5 7v10M18.5 7v10M21 9v6M5.5 12h13" />
  </S>
);

export const KettlebellIcon = (p: P) => (
  <S {...p}>
    <path d="M9 7a3 3 0 0 1 6 0c0 1-.5 1.6-1 2 2 1 3.5 3 3.5 5.5A3.5 3.5 0 0 1 14 18h-4a3.5 3.5 0 0 1-3.5-3.5C6.5 12 8 10 10 9c-.5-.4-1-1-1-2Z" />
  </S>
);

export const BarbellIcon = (p: P) => (
  <S {...p}>
    <path d="M2 10v4M4.5 8v8M7 10v4M17 10v4M19.5 8v8M22 10v4M7 12h10" />
  </S>
);

export const BandsIcon = (p: P) => (
  <S {...p}>
    <path d="M4 6c3 0 3 12 6 12M14 6c3 0 3 12 6 12" />
    <circle cx="4" cy="6" r="1.4" />
    <circle cx="14" cy="6" r="1.4" />
  </S>
);

export const JumpRopeIcon = (p: P) => (
  <S {...p}>
    <path d="M6 4v3a6 7 0 0 0 12 0V4" />
    <path d="M6 7c-2 0-2.5 9-2.5 13M18 7c2 0 2.5 9 2.5 13" />
  </S>
);

export const BoxIcon = (p: P) => (
  <S {...p}>
    <path d="M4 9l8-4 8 4-8 4-8-4Z" />
    <path d="M4 9v7l8 4 8-4V9" />
    <path d="M12 13v7" />
  </S>
);

export const RingsIcon = (p: P) => (
  <S {...p}>
    <path d="M8 3v4M16 3v4" />
    <circle cx="8" cy="14" r="4" />
    <circle cx="16" cy="14" r="4" />
  </S>
);

export const BikeIcon = (p: P) => (
  <S {...p}>
    <circle cx="6.5" cy="16" r="3.2" />
    <circle cx="17.5" cy="16" r="3.2" />
    <path d="M6.5 16l3.5-7h4l3 7M10 9l5 0M14 9l2-3h2" />
  </S>
);

export const RowerIcon = (p: P) => (
  <S {...p}>
    {/* rail + seat + handle on a chain */}
    <path d="M3 18h18" />
    <path d="M5 18l2-5h4l2 4" />
    <circle cx="17" cy="7" r="2" />
    <path d="M15.5 8.5l-4 3" />
    <path d="M11.5 11.5l-1.5 1.5" />
  </S>
);

export const SkiergIcon = (p: P) => (
  <S {...p}>
    {/* upright erg: monitor on a post + two pull straps */}
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M12 7v13" />
    <path d="M10 8c-1 3-1.5 6-3 9M14 8c1 3 1.5 6 3 9" />
  </S>
);

export const FullGymIcon = (p: P) => (
  <S {...p}>
    <path d="M3 20V8l9-4 9 4v12" />
    <path d="M3 20h18M9 20v-5h6v5M8 11h.01M12 11h.01M16 11h.01" />
  </S>
);

export const ParkIcon = (p: P) => (
  <S {...p}>
    <path d="M12 3l5 7h-3l3 5H7l3-5H7l5-7Z" />
    <path d="M12 15v5" />
  </S>
);

// ---- generic resolver used by option lists ----
const MAP: Record<string, (p: P) => React.ReactElement> = {
  strength: StrengthIcon,
  cardio: CardioIcon,
  general: GeneralIcon,
  gymnastics: GymnasticsIcon,
  none: BodyweightIcon,
  pullup_bar: PullupBarIcon,
  dumbbells: DumbbellIcon,
  kettlebell: KettlebellIcon,
  barbell: BarbellIcon,
  bands: BandsIcon,
  jump_rope: JumpRopeIcon,
  box: BoxIcon,
  rings: RingsIcon,
  rower: RowerIcon,
  bike: BikeIcon,
  skierg: SkiergIcon,
  full_gym: FullGymIcon,
  park: ParkIcon,
};

export function OptionIcon({ name, size = 24, className }: P & { name: string }) {
  const Cmp = MAP[name];
  return Cmp ? <Cmp size={size} className={className} /> : null;
}

// ---- UI / action icons ----
export const SaveIcon = (p: P) => (
  <S {...p}>
    <path d="M6 3h9l4 4v14l-7-3.5L5 21V4a1 1 0 0 1 1-1Z" />
  </S>
);
export const SavedIcon = (p: P) => (
  <S {...p} fill="currentColor">
    <path d="M6 3h9l4 4v14l-7-3.5L5 21V4a1 1 0 0 1 1-1Z" stroke="none" />
    <path d="M8.5 9.5l2.2 2.2L15 7.5" stroke="#1e4d2b" strokeWidth="1.8" fill="none" />
  </S>
);
export const ShareIcon = (p: P) => (
  <S {...p}>
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="17" cy="5.5" r="2.4" />
    <circle cx="17" cy="18.5" r="2.4" />
    <path d="M8.1 11l6.8-4M8.1 13l6.8 4" />
  </S>
);
export const RefreshIcon = (p: P) => (
  <S {...p}>
    <path d="M20 11a8 8 0 1 0-.7 4.5" />
    <path d="M20 5v6h-6" />
  </S>
);
export const FolderIcon = (p: P) => (
  <S {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </S>
);
export const PlusIcon = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);
export const BackIcon = (p: P) => (
  <S {...p}>
    <path d="M9 6l6 6-6 6" />
  </S>
);
export const TrashIcon = (p: P) => (
  <S {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </S>
);
