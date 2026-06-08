'use client';

export default function StarRating({
  value,
  onChange,
  size = 32,
  readOnly = false,
}: {
  value?: number;
  onChange?: (n: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1" dir="ltr">
      {stars.map((n) => {
        const filled = (value ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={`press ${readOnly ? '' : 'hover:scale-110'} transition-transform`}
            aria-label={`${n} כוכבים`}
            style={{ lineHeight: 0 }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? '#FFD400' : 'none'}
              stroke={filled ? '#E6BF00' : '#9CA89C'}
              strokeWidth="1.5"
            >
              <path d="M12 2l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.8 6.1 20.2l1.2-6.6L2.5 9l6.6-.9L12 2z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
