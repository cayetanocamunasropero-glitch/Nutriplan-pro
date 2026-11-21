import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'lime';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-brand text-on-brand hover:brightness-110 shadow-card',
    lime: 'bg-lime text-[#0f241d] hover:brightness-105',
    soft: 'bg-surface-2 text-ink hover:bg-surface-3',
    ghost: 'bg-transparent text-ink hover:bg-surface-2',
    danger: 'bg-transparent text-danger hover:bg-danger/10',
  }[variant];
  const s = { sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5', md: 'h-11 px-4 text-[15px] rounded-2xl gap-2', lg: 'h-14 px-6 text-base rounded-2xl gap-2' }[size];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition active:scale-[.97] disabled:opacity-50 ${v} ${s} ${className}`}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`grid size-10 place-items-center rounded-full text-ink transition hover:bg-surface-2 active:scale-95 disabled:opacity-30 ${className}`}
    >
      {children}
    </button>
  );
}

const TONES = {
  surface: 'bg-surface text-ink',
  brand: 'bg-brand text-on-brand',
  ink: 'bg-ink text-bg',
} as const;

/** Tarjeta base. `tone` cambia fondo y texto juntos (nunca pasar bg-* por className: lo pisaría bg-surface). */
export function Card({ className = '', children, onClick, tone = 'surface' }: { className?: string; children: ReactNode; onClick?: () => void; tone?: keyof typeof TONES }) {
  const cls = `rounded-[26px] p-5 shadow-card ${TONES[tone]} ${className}`;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={`block w-full text-left transition-transform active:scale-[.99] ${cls}`}>
        {children}
      </button>
    );
  return <div className={cls}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-end justify-between px-1">
      <h2 className="font-display text-[19px] font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Loader2 className="size-6 animate-spin text-brand" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        {icon && <span className="text-brand [&>svg]:size-5">{icon}</span>}
        {title}
      </h2>
      {text && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block px-1 text-[13px] font-semibold text-muted">
      {children}
      {hint && <span className="font-normal text-faint"> · {hint}</span>}
    </span>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label?: string }) {
  return (
    <div className="flex rounded-2xl bg-surface-2 p-1" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${active ? 'bg-ink text-bg' : 'bg-surface-2 text-muted hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-surface-3'}`}
      >
        <span className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}

export function MacroDots({ c, p, f, className = '' }: { c: number; p: number; f: number; className?: string }) {
  const r = (v: number) => (Math.round(v * 10) / 10).toLocaleString('es-ES');
  return (
    <span className={`inline-flex items-center gap-2.5 text-xs text-muted tnum ${className}`}>
      <span className="inline-flex items-center gap-1">
        <i className="size-1.5 rounded-full bg-carb" />
        {r(c)}
      </span>
      <span className="inline-flex items-center gap-1">
        <i className="size-1.5 rounded-full bg-prot" />
        {r(p)}
      </span>
      <span className="inline-flex items-center gap-1">
        <i className="size-1.5 rounded-full bg-fat" />
        {r(f)}
      </span>
    </span>
  );
}
