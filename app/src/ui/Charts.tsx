import { motion } from 'motion/react';
import { useMemo, useRef, useState, type ReactNode } from 'react';

/** Anillo de energía del día. */
export function Ring({ value, goal, size = 220, stroke = 18, children }: { value: number; goal: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = goal > 0 ? value / goal : 0;
  const over = goal > 0 && value > goal * 1.05;
  const main = Math.min(1, pct);
  const extra = over ? Math.min(1, pct - 1) : 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--lime)" />
            <stop offset="100%" stopColor="var(--brand)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringG)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - main) }}
          transition={{ type: 'spring', damping: 26, stiffness: 90 }}
        />
        {extra > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--c-fat)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - extra) }}
            transition={{ type: 'spring', damping: 26, stiffness: 90, delay: 0.3 }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const w = goal > 0 ? Math.min(100, (100 * value) / goal) : 0;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-1 text-[12px]">
        <span className="font-semibold text-muted">{label}</span>
      </div>
      <div className="mt-1 font-display text-[17px] font-bold leading-none tnum">
        {Math.round(value)}
        <span className="text-[12px] font-semibold text-faint">{goal > 0 ? ' / ' + Math.round(goal) + ' g' : ' g'}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ background: color }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: w / 100 }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
        />
      </div>
    </div>
  );
}

type BarDatum = { key: string; label: string; value: number; sub?: string };

/** Barras de kcal por día con la línea de objetivo. Tooltip al tocar/pasar. */
export function DayBars({ data, goal, height = 150, onPick }: { data: BarDatum[]; goal: number; height?: number; onPick?: (k: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(goal * 1.2, ...data.map((d) => d.value), 1);
  const y = (v: number) => height - (v / max) * height;
  return (
    <div className="relative select-none">
      <div className="relative" style={{ height }}>
        {goal > 0 && (
          <div className="absolute inset-x-0 border-t border-dashed border-faint/70" style={{ top: y(goal) }}>
            <span className="absolute -top-[18px] right-0 rounded bg-surface px-1 text-[11px] font-semibold text-muted">Objetivo {Math.round(goal)}</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-end gap-[3px]">
          {data.map((d, i) => {
            const h = Math.max(d.value > 0 ? 4 : 0, (d.value / max) * height);
            const ok = goal > 0 && Math.abs(d.value - goal) <= goal * 0.1;
            return (
              <button
                key={d.key}
                type="button"
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onPick?.(d.key)}
                aria-label={`${d.label}: ${Math.round(d.value)} kcal`}
              >
                {d.value <= 0 && <span className="mb-0 h-1 w-full max-w-[22px] rounded-full bg-surface-2" />}
                <motion.span
                  className="w-full max-w-[22px] origin-bottom rounded-t-[4px]"
                  style={{ height: h, background: ok ? 'var(--brand)' : d.value > goal * 1.1 && goal > 0 ? 'var(--c-fat)' : 'var(--c-carb)', opacity: hover === null || hover === i ? 1 : 0.45 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ type: 'spring', duration: 0.5, bounce: 0, delay: Math.min(i * 0.02, 0.2) }}
                />
              </button>
            );
          })}
        </div>
        {hover !== null && data[hover] && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl bg-ink px-2.5 py-1.5 text-center text-[11px] text-bg shadow-pop"
            style={{ left: `${((hover + 0.5) / data.length) * 100}%`, top: Math.max(0, y(data[hover].value) - 46) }}
          >
            <b className="block text-[13px] tnum">{Math.round(data[hover].value)} kcal</b>
            {data[hover].sub || data[hover].label}
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-[3px]">
        {data.map((d, i) => (
          <span key={d.key} className={`flex-1 text-center text-[11px] font-semibold ${hover === i ? 'text-ink' : 'text-faint'}`}>
            {d.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-brand" />En objetivo (±10 %)</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-carb" />Por debajo</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-fat" />Por encima</span>
      </div>
    </div>
  );
}

/** Línea de peso con cruceta + tooltip. */
export function WeightLine({ points, height = 170 }: { points: { day: string; kg: number }[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const data = useMemo(() => [...points].sort((a, b) => a.day.localeCompare(b.day)), [points]);
  if (data.length < 2) return null;
  const W = 600,
    H = height,
    pad = 10;
  const t0 = new Date(data[0].day).getTime(),
    t1 = new Date(data[data.length - 1].day).getTime() || t0 + 1;
  const lo = Math.min(...data.map((d) => d.kg)) - 0.6,
    hi = Math.max(...data.map((d) => d.kg)) + 0.6;
  const X = (d: string) => pad + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - pad * 2);
  const Y = (kg: number) => pad + (1 - (kg - lo) / (hi - lo)) * (H - pad * 2);
  const path = data.map((d, i) => (i ? 'L' : 'M') + X(d.day).toFixed(1) + ' ' + Y(d.kg).toFixed(1)).join(' ');
  const area = path + ` L ${X(data[data.length - 1].day)} ${H} L ${X(data[0].day)} ${H} Z`;
  const move = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    data.forEach((d, i) => {
      if (Math.abs(X(d.day) - x) < Math.abs(X(data[best].day) - x)) best = i;
    });
    setHover(best);
  };
  const h = hover !== null ? data[hover] : null;
  return (
    <div
      ref={ref}
      className="relative touch-pan-y"
      onMouseMove={(e) => move(e.clientX)}
      onMouseLeave={() => setHover(null)}
      onTouchStart={(e) => move(e.touches[0].clientX)}
      onTouchMove={(e) => move(e.touches[0].clientX)}
      onTouchEnd={() => setTimeout(() => setHover(null), 1200)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full" style={{ height }}>
        <defs>
          <linearGradient id="wG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#wG)" />
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {h && <line x1={X(h.day)} x2={X(h.day)} y1={0} y2={H} stroke="var(--faint)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />}
      </svg>
      {h && (
        <>
          <span
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand"
            style={{ left: `${(X(h.day) / W) * 100}%`, top: Y(h.kg) }}
          />
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-xl bg-ink px-2.5 py-1.5 text-center text-[11px] text-bg shadow-pop"
            style={{ left: `${Math.min(88, Math.max(12, (X(h.day) / W) * 100))}%`, top: -8 }}
          >
            <b className="block text-[13px] tnum">{h.kg.toLocaleString('es-ES')} kg</b>
            {new Date(h.day + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </div>
        </>
      )}
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-faint">
        <span>{new Date(data[0].day + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
        <span>{new Date(data[data.length - 1].day + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  );
}
