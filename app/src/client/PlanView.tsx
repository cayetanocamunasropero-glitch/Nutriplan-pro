import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Info, SlidersHorizontal, Undo2 } from 'lucide-react';
import { pretty } from '../lib/dates';
import { itemMacros, itemsMacros, n0, n1, planTarget, unitOf } from '../lib/nutrition';
import type { LogEntry, LogItem, PlanGroup, PlanOption, PlanOptionItem, PublishedPlan } from '../lib/types';
import { Button, Card, Empty } from '../ui/kit';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { useDay } from './useDay';

/** Normaliza los dos formatos de plan (PDF/alternativas y editor clásico) a grupos con opciones. */
export function planGroups(plan: PublishedPlan): PlanGroup[] {
  const c = plan.content || {};
  if (Array.isArray(c.groups) && c.groups.length) return c.groups;
  if (Array.isArray(c.meals))
    return c.meals
      .filter((m) => m.items?.length)
      .map((m) => ({
        name: m.name,
        share: m.share,
        options: [
          {
            letter: 'Plan',
            title: m.name,
            items: m.items.map((i) => {
              const g = +i.grams || 0;
              const k = (v: number) => (g > 0 ? (v * 100) / g : 0);
              return { name: i.name, grams: g, kcal: k(+i.kcal), c: k(+i.c), p: k(+i.p), f: k(+i.f) };
            }),
          },
        ],
      }));
  return [];
}

const toLog = (it: PlanOptionItem): LogItem => ({ name: it.name, grams: +it.grams || 0, kcal: +it.kcal || 0, c: +it.c || 0, p: +it.p || 0, f: +it.f || 0, source: 'Tu plan' });

export function PlanView({ plan, uid, day, onError, goToday }: { plan: PublishedPlan; uid: string; day: string; onError: (m: string) => void; goToday: () => void }) {
  const toast = useToast();
  const groups = useMemo(() => planGroups(plan), [plan]);
  const d = useDay(plan, uid, day, onError);
  const goal = planTarget(plan.content);
  const [adjust, setAdjust] = useState<{ g: PlanGroup; o: PlanOption } | null>(null);

  if (!groups.length)
    return (
      <div className="px-4 pt-8">
        <Empty icon={<Info className="size-6" />} title="Aún no hay menú publicado" text="Tu coach todavía no ha publicado opciones de comida. Mientras tanto, anota libremente en «Hoy»." />
      </div>
    );

  function log(g: PlanGroup, o: PlanOption, items: LogItem[]) {
    const entry: LogEntry = { meal: g.name, letter: o.letter, status: 'completed', items, updatedAt: new Date().toISOString() };
    d.update((s) => {
      const rest = s.entries.filter((e) => e.freeEntry || e.kind === 'activity' || e.meal !== g.name);
      return { ...s, entries: [...rest, entry] };
    });
    toast(`${g.name}: opción ${o.letter} registrada`, { action: { label: 'Ver día', run: goToday } });
  }

  function unlog(g: PlanGroup) {
    d.update((s) => ({ ...s, entries: s.entries.filter((e) => e.freeEntry || e.kind === 'activity' || e.meal !== g.name) }));
  }

  return (
    <div className="px-4 pt-6">
      <header className="px-1">
        <p className="text-sm font-semibold text-muted">{plan.content?.title || 'Plan de ' + (plan.client_name || '')}</p>
        <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">Mi plan</h1>
        {goal.kcal > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-ink px-3 py-1.5 text-bg tnum">{n0(goal.kcal)} kcal/día</span>
            <span className="rounded-full bg-surface px-3 py-1.5 text-muted shadow-card tnum">HC {n0(goal.c)} g</span>
            <span className="rounded-full bg-surface px-3 py-1.5 text-muted shadow-card tnum">P {n0(goal.p)} g</span>
            <span className="rounded-full bg-surface px-3 py-1.5 text-muted shadow-card tnum">G {n0(goal.f)} g</span>
          </div>
        )}
        <p className="mt-3 text-sm text-muted">
          Elige la opción que vas a comer y pulsa <b className="text-ink">Registrar</b>. Se anotará en <b className="text-ink">{pretty(day).toLowerCase()}</b>.
        </p>
      </header>
      <div className="mt-5 space-y-4">
        {groups.map((g) => (
          <GroupCard key={g.name} g={g} logged={d.entries.find((e) => !e.freeEntry && e.kind !== 'activity' && e.meal === g.name)} onLog={(o) => log(g, o, o.items.map(toLog))} onAdjust={(o) => setAdjust({ g, o })} onUndo={() => unlog(g)} />
        ))}
      </div>
      <Adjust key={adjust ? adjust.g.name + adjust.o.letter : 'x'} target={adjust} onClose={() => setAdjust(null)} onLog={(items) => { log(adjust!.g, adjust!.o, items); setAdjust(null); }} />
    </div>
  );
}

function GroupCard({ g, logged, onLog, onAdjust, onUndo }: { g: PlanGroup; logged?: LogEntry; onLog: (o: PlanOption) => void; onAdjust: (o: PlanOption) => void; onUndo: () => void }) {
  const opts = g.options || [];
  const [sel, setSel] = useState(() => Math.max(0, opts.findIndex((o) => o.letter === logged?.letter)));
  const o = opts[sel] || opts[0];
  if (!o) return null;
  const m = itemsMacros(o.items as LogItem[]);
  const isLogged = logged && logged.letter === o.letter;
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4">
        <h3 className="font-display text-xl font-bold">{g.name}</h3>
        {logged && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand">
            <Check className="size-3.5" /> Opción {logged.letter}
          </span>
        )}
      </div>
      {opts.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto px-5">
          {opts.map((x, i) => (
            <button key={x.letter + i} onClick={() => setSel(i)} className={`relative h-9 min-w-9 shrink-0 rounded-xl px-3 text-sm font-bold transition ${i === sel ? 'text-bg' : 'bg-surface-2 text-muted'}`}>
              {i === sel && <motion.span layoutId={'opt' + g.name} className="absolute inset-0 rounded-xl bg-ink" />}
              <span className="relative">{x.letter}</span>
            </button>
          ))}
        </div>
      )}
      <div className="px-5 pb-4 pt-3">
        {o.title && o.title !== g.name && <p className="mb-2 text-sm font-semibold">{o.title}</p>}
        <ul className="space-y-1.5">
          {o.items.map((it, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0">
                {it.name}
                {(it.choices?.length || it.alternatives?.length) ? <span className="ml-1 text-xs text-brand">· intercambiable</span> : null}
              </span>
              <span className="shrink-0 font-semibold text-muted tnum">
                {n1(it.grams)} {it.unit || unitOf(it.name)}
              </span>
            </li>
          ))}
        </ul>
        {o.notes && <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">{o.notes}</p>}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 text-sm">
            <b className="font-display text-lg tnum">{n0(m.kcal)}</b> <span className="text-muted">kcal</span>
            <div className="text-[11px] text-muted tnum">
              HC {n0(m.c)} · P {n0(m.p)} · G {n0(m.f)}
            </div>
          </div>
          {isLogged ? (
            <Button variant="soft" size="sm" onClick={onUndo} icon={<Undo2 className="size-4" />}>
              Quitar
            </Button>
          ) : (
            <>
              <button onClick={() => onAdjust(o)} className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted" aria-label="Ajustar cantidades">
                <SlidersHorizontal className="size-4.5" />
              </button>
              <Button size="sm" onClick={() => onLog(o)} icon={<Check className="size-4" />}>
                Registrar
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function Adjust({ target, onClose, onLog }: { target: { g: PlanGroup; o: PlanOption } | null; onClose: () => void; onLog: (items: LogItem[]) => void }) {
  const [items, setItems] = useState<LogItem[]>(() => (target?.o.items || []).map(toLog));
  const choices = (i: number) => {
    const it = target?.o.items[i];
    if (!it) return [];
    return [it, ...(it.choices || []), ...(it.alternatives || [])].filter((x, k, arr) => x?.name && arr.findIndex((y) => y.name === x.name) === k);
  };
  const tot = itemsMacros(items);
  return (
    <Sheet open={!!target} onClose={onClose} title={target ? `${target.g.name} · ${target.o.letter}` : ''}>
      <p className="mb-3 text-sm text-muted">Ajusta lo que has comido de verdad. Pon 0 si no tomaste algo.</p>
      <ul className="space-y-2">
        {items.map((it, i) => {
          const ch = choices(i);
          return (
            <li key={i} className="flex items-center gap-2 rounded-2xl bg-surface-2 p-2 pl-3">
              <div className="min-w-0 flex-1">
                {ch.length > 1 ? (
                  <select
                    className="w-full truncate bg-transparent text-sm font-semibold outline-none"
                    value={it.name}
                    onChange={(e) => {
                      const x = ch.find((c) => c.name === e.target.value)!;
                      setItems(items.map((y, k) => (k === i ? toLog(x) : y)));
                    }}
                  >
                    {ch.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="truncate text-sm font-semibold">{it.name}</div>
                )}
                <div className="text-[11px] text-muted tnum">{n0(itemMacros(it).kcal)} kcal</div>
              </div>
              <input
                className="h-10 w-20 rounded-xl bg-surface text-center text-sm font-bold outline-none tnum"
                inputMode="decimal"
                value={it.grams}
                onChange={(e) => setItems(items.map((y, k) => (k === i ? { ...y, grams: Math.max(0, Math.min(2500, Number(e.target.value.replace(',', '.')) || 0)) } : y)))}
                aria-label={'Cantidad de ' + it.name}
              />
              <span className="w-6 text-xs text-muted">{unitOf(it.name)}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-bg">
        <span className="text-sm">Total</span>
        <span className="font-display text-lg font-bold tnum">
          {n0(tot.kcal)} kcal <span className="text-xs font-semibold opacity-70">HC {n0(tot.c)} · P {n0(tot.p)} · G {n0(tot.f)}</span>
        </span>
      </div>
      <Button size="lg" className="mt-4 w-full" onClick={() => onLog(items.filter((x) => x.grams > 0))}>
        Registrar
      </Button>
    </Sheet>
  );
}
