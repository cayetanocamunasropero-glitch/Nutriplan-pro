import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Info, SlidersHorizontal, Undo2 } from 'lucide-react';
import { pretty } from '../lib/dates';
import { itemMacros, itemsMacros, n0, n1, planTarget, unitOf } from '../lib/nutrition';
import type { LogEntry, LogItem, PlanGroup, PlanOption, PlanOptionItem, PublishedPlan } from '../lib/types';
import { Button, Card, Empty } from '../ui/kit';
import { BoardHeader } from '../ui/Board';
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
    <div className="px-4">
      <BoardHeader title="Mi plan" subtitle={(plan.content?.title || 'Plan de ' + (plan.client_name || '')) + (goal.kcal > 0 ? ` · ${n0(goal.kcal)} kcal/día` : '')}>
        {goal.kcal > 0 && (
          <p className="mt-3 text-sm text-chalk-dim tnum">
            Objetivo: HC {n0(goal.c)} g · P {n0(goal.p)} g · G {n0(goal.f)} g
          </p>
        )}
      </BoardHeader>
      <p className="mt-4 px-1 text-sm text-muted">
        Elige una opción de cada comida y pulsa <b className="text-ink">Registrar</b>. Se anotará en <b className="text-ink">{pretty(day).toLowerCase()}</b>.
      </p>
      <div className="mt-3 space-y-3">
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
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="caps text-[24px] leading-none">{g.name}</h2>
        {logged && (
          <span className="caps inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[15px] text-go">
            <Check className="size-4" /> Opción {logged.letter}
          </span>
        )}
      </div>
      {opts.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5" role="tablist" aria-label={'Opciones de ' + g.name}>
          {opts.map((x, i) => (
            <button
              key={x.letter + i}
              role="tab"
              aria-selected={i === sel}
              onClick={() => setSel(i)}
              className={`caps relative grid h-10 min-w-10 shrink-0 place-items-center rounded-[10px] border-2 border-rule px-3 text-[19px] transition-colors ${i === sel ? 'text-on-brand' : 'text-ink'}`}
            >
              {i === sel && <motion.span layoutId={'opt' + g.name} className="absolute -inset-0.5 rounded-[10px] bg-brand" transition={{ type: 'spring', duration: 0.3, bounce: 0 }} />}
              <span className="relative">{x.letter}</span>
            </button>
          ))}
        </div>
      )}
      <div className="px-5 pb-4 pt-3">
        {o.title && o.title !== g.name && <p className="mb-1 text-[15px] font-semibold">{o.title}</p>}
        <ul>
          {o.items.map((it, i) => (
            <li key={i} className="flex items-baseline gap-2 py-1.5 text-[16px]">
              <span className="min-w-0 shrink">
                {it.name}
                {it.choices?.length || it.alternatives?.length ? <span className="text-[13px] font-semibold text-go"> · intercambiable</span> : null}
                {typeof it.portion === 'string' && it.portion && <span className="block text-[13px] text-muted">{it.portion}</span>}
              </span>
              <span className="leader" aria-hidden />
              <span className="shrink-0 font-display text-[19px] font-bold tnum">
                {n1(it.grams)} {it.unit || unitOf(it.name)}
              </span>
            </li>
          ))}
        </ul>
        {o.notes && <p className="mt-3 rounded-[10px] bg-surface-2 p-3 text-[13px] leading-relaxed text-muted">{o.notes}</p>}
        <div className="mt-3 flex items-center justify-between gap-3 border-t-[3px] border-rule pt-2.5">
          <span className="text-[13px] text-muted tnum">
            HC {n0(m.c)} · P {n0(m.p)} · G {n0(m.f)} g
          </span>
          <span className="font-display text-[24px] font-extrabold leading-none tnum">{n0(m.kcal)} kcal</span>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          {isLogged ? (
            <Button variant="soft" size="sm" onClick={onUndo} icon={<Undo2 className="size-4" />}>
              Quitar
            </Button>
          ) : (
            <>
              <button onClick={() => onAdjust(o)} className="grid size-10 place-items-center rounded-full border-2 border-line text-muted hover:border-rule hover:text-ink" aria-label="Ajustar cantidades">
                <SlidersHorizontal className="size-4.5" />
              </button>
              <Button size="md" onClick={() => onLog(o)} icon={<Check className="size-4.5" />}>
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
            <li key={i} className="flex items-center gap-2 rounded-[12px] bg-surface-2 p-2 pl-3">
              <div className="min-w-0 flex-1">
                {ch.length > 1 ? (
                  <select
                    className="w-full truncate bg-transparent text-[16px] font-semibold outline-none"
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
                className="h-10 w-20 rounded-[10px] border-2 border-line bg-surface text-center text-[16px] font-bold outline-none tnum focus:border-rule"
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
      <div className="mt-4 flex items-center justify-between rounded-[12px] bg-ink px-4 py-3 text-bg">
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
