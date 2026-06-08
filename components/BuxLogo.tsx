/* eslint-disable @next/next/no-img-element */
// Official CrossFit Bux mark — the deer roundel, processed to a transparent
// PNG in public/brand/logo-icon.png (see scripts/build-logo-assets.mjs).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function BuxLogo({
  size = 48,
  withWordmark = true,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={`${basePath}/brand/logo-icon.png`}
        alt="CrossFit Bux"
        height={size}
        style={{ height: size, width: 'auto' }}
        className="select-none"
        draggable={false}
      />
      {withWordmark && (
        <div className="leading-none">
          <div className="text-2xl font-black tracking-tight text-bux-green">
            BUX <span className="text-bux-yellow drop-shadow-sm">WOD</span>
          </div>
          <div className="text-[11px] font-bold text-bux-green-light tracking-widest">
            LET’S GO BUX 🦌
          </div>
        </div>
      )}
    </div>
  );
}
