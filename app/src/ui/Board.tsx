import type { ReactNode } from 'react';

/** Cabecera de pizarra a todo el ancho: título rotulado, subtítulo y, debajo, lo que haga falta (p. ej. selector de días). */
export function BoardHeader({ title, subtitle, right, children }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; children?: ReactNode }) {
  return (
    <header className="-mx-4 bg-board px-5 pb-4 text-chalk lg:mx-0 lg:rounded-b-[20px]" style={{ paddingTop: 'max(22px, calc(env(safe-area-inset-top) + 12px))' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="caps text-[32px] leading-[0.95] text-balance">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-chalk-dim">{subtitle}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
      {children}
    </header>
  );
}

/** Etiqueta «Nutri-Score» real de un producto de supermercado (dato de Open Food Facts). */
export function NutriScore({ grade }: { grade?: string }) {
  const g = String(grade || '').toLowerCase();
  const colors: Record<string, [string, string]> = { a: ['#038141', '#fff'], b: ['#85bb2f', '#121714'], c: ['#fecb02', '#121714'], d: ['#ee8100', '#121714'], e: ['#e63e11', '#fff'] };
  if (!colors[g]) return null;
  return (
    <span className="ml-1.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded-[4px] px-1 align-[2px] text-[11px] font-extrabold" style={{ background: colors[g][0], color: colors[g][1] }} title={'Nutri-Score ' + g.toUpperCase()} aria-label={'Nutri-Score ' + g.toUpperCase()}>
      {g.toUpperCase()}
    </span>
  );
}
