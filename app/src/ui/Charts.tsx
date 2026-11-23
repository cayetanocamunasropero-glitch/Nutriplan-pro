import { motion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';

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
                  style={{ height: h, background: ok ? 'var(--go)' : d.value > goal * 1.1 && goal > 0 ? 'var(--c-fat)' : 'var(--c-carb)', opacity: hover === null || hover === i ? 1 : 0.45 }}
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
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-go" />En objetivo (±10 %)</span>
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
            <stop offset="0%" stopColor="var(--go)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--go)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#wG)" />
        <path d={path} fill="none" stroke="var(--go)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {h && <line x1={X(h.day)} x2={X(h.day)} y1={0} y2={H} stroke="var(--faint)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />}
      </svg>
      {h && (
        <>
          <span
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-go"
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
