import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Info, Repeat, SlidersHorizontal, Undo2 } from 'lucide-react';
import { pretty } from '../lib/dates';
import { itemMacros, itemsMacros, n0, n1, planTarget, unitOf } from '../lib/nutrition';
import type { CoachNote, LogEntry, LogItem, PlanGroup, PlanOption, PlanOptionItem, PublishedPlan } from '../lib/types';
import { applySwaps, kitDefault, kitLabel, optionItems, swapList, type KitSel } from '../lib/plan';
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
  const [adjust, setAdjust] = useState<{ g: PlanGroup; o: PlanOption; items: PlanOptionItem[]; combo?: string } | null>(null);
  const notes = (plan.content?.coachNotes || []) as CoachNote[];
  // Opción elegida en cada comida (y su combinación/intercambios): sirve para el total del día
  const [state, setState] = useState<Record<string, GroupState>>({});
  const stateOf = (g: PlanGroup): GroupState => {
    if (state[g.name]) return state[g.name];
    const lg = d.entries.find((e) => !e.freeEntry && e.kind !== 'activity' && e.meal === g.name);
    return { sel: Math.max(0, g.options.findIndex((o) => o.letter === lg?.letter)), picks: {} };
  };

  if (!groups.length)
    return (
      <div className="px-4 pt-8">
        <Empty icon={<Info className="size-6" />} title="Aún no hay menú publicado" text="Tu coach todavía no ha publicado opciones de comida. Mientras tanto, anota libremente en «Hoy»." />
      </div>
    );

  function log(g: PlanGroup, o: PlanOption, items: LogItem[], combo?: string) {
    const entry: LogEntry = { meal: g.name, letter: o.letter, status: 'completed', items, ...(combo ? { combo } : {}), updatedAt: new Date().toISOString() };
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
          <GroupCard
            key={g.name}
            g={g}
            value={stateOf(g)}
            onChange={(v) => setState((s) => ({ ...s, [g.name]: v }))}
            logged={d.entries.find((e) => !e.freeEntry && e.kind !== 'activity' && e.meal === g.name)}
            onLog={(o, items, combo) => log(g, o, items.map(toLog), combo)}
            onAdjust={(o, items, combo) => setAdjust({ g, o, items, combo })}
            onUndo={() => unlog(g)}
          />
        ))}
      </div>
      {goal.kcal > 0 && <DayTotal groups={groups} stateOf={stateOf} goal={goal} />}
      {notes.length > 0 && <CoachNotes notes={notes} />}
      <Adjust key={adjust ? adjust.g.name + adjust.o.letter : 'x'} target={adjust} onClose={() => setAdjust(null)} onLog={(items) => { log(adjust!.g, adjust!.o, items, adjust!.combo); setAdjust(null); }} />
    </div>
  );
}

type Pick = { sel?: KitSel; swaps: Record<string, string> };
type GroupState = { sel: number; picks: Record<string, Pick> };

/** Alimentos de la opción elegida, con su combinación e intercambios. */
function resolved(g: PlanGroup, v: GroupState) {
  const o = g.options[v.sel] || g.options[0];
  if (!o) return null;
  const pick = v.picks[o.letter] || { swaps: {} };
  const kitSel = o.kit ? { ...kitDefault(o.kit), ...pick.sel } : undefined;
  return { o, pick, kitSel, items: applySwaps(optionItems(o, kitSel), pick.swaps), combo: o.kit && kitSel ? kitLabel(o.kit, kitSel) : undefined };
}

function GroupCard({ g, value, onChange, logged, onLog, onAdjust, onUndo }: { g: PlanGroup; value: GroupState; onChange: (v: GroupState) => void; logged?: LogEntry; onLog: (o: PlanOption, items: PlanOptionItem[], combo?: string) => void; onAdjust: (o: PlanOption, items: PlanOptionItem[], combo?: string) => void; onUndo: () => void }) {
  const opts = g.options || [];
  const sel = value.sel;
  const setSel = (i: number) => onChange({ ...value, sel: i });
  const [swapFor, setSwapFor] = useState<PlanOptionItem | null>(null);
  const r = resolved(g, value);
  if (!r) return null;
  const { o, pick, kitSel, items, combo } = r;
  const setPick = (p: Partial<Pick>) => onChange({ ...value, picks: { ...value.picks, [o.letter]: { ...pick, ...p } } });
  const m = itemsMacros(items as LogItem[]);
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
        {o.kit && kitSel && (
          <div className="mb-2 space-y-2.5 border-b-2 border-dotted border-line pb-3 pt-1">
            {o.kit.slots.map((s) => (
              <div key={s.id}>
                <div className="caps text-[14px] text-muted" id={o.letter + s.id}>
                  {s.label}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby={o.letter + s.id}>
                  {s.choices.map((c) => {
                    const on = kitSel[s.id] === c.id;
                    return (
                      <button
                        key={c.id}
                        role="radio"
                        aria-checked={on}
                        onClick={() => setPick({ sel: { ...kitSel, [s.id]: c.id }, swaps: {} })}
                        className={`h-9 shrink-0 rounded-full border-2 px-3 text-[15px] font-semibold transition-colors ${on ? 'border-rule bg-brand text-on-brand' : 'border-line bg-surface text-ink hover:border-rule'}`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <ul>
          {items.map((it, i) => {
            const alts = swapList(it).length - 1;
            const orig = it.__orig as PlanOptionItem | undefined;
            return (
              <li key={i} className="flex items-baseline gap-2 py-1.5 text-[16px]">
                <span className="min-w-0 shrink">
                  {it.name}
                  {typeof it.portion === 'string' && it.portion && <span className="block text-[13px] text-muted">{it.portion}</span>}
                  {orig && <span className="block text-[13px] text-muted">en lugar de {orig.name.toLowerCase()}</span>}
                  {alts > 0 && (
                    <button onClick={() => setSwapFor(it)} className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-go hover:underline" aria-label={`Cambiar ${it.name} (${alts} ${alts === 1 ? 'opción' : 'opciones'})`}>
                      <Repeat className="size-3.5" /> Cambiar
                    </button>
                  )}
                </span>
                <span className="leader" aria-hidden />
                <span className="shrink-0 font-display text-[19px] font-bold tnum">
                  {n1(it.grams)} {it.unit || unitOf(it.name)}
                </span>
              </li>
            );
          })}
        </ul>
        {o.notes && <p className="mt-3 rounded-[10px] bg-surface-2 p-3 text-[13px] leading-relaxed text-muted">{o.notes.trim()}</p>}
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
              <button onClick={() => onAdjust(o, items, combo)} className="grid size-10 place-items-center rounded-full border-2 border-line text-muted hover:border-rule hover:text-ink" aria-label="Ajustar cantidades">
                <SlidersHorizontal className="size-4.5" />
              </button>
              <Button size="md" onClick={() => onLog(o, items, combo)} icon={<Check className="size-4.5" />}>
                Registrar
              </Button>
            </>
          )}
        </div>
      </div>
      <SwapSheet
        item={swapFor}
        onClose={() => setSwapFor(null)}
        onPick={(orig, name) => {
          setPick({ swaps: { ...pick.swaps, [orig.name]: name === orig.name ? '' : name } });
          setSwapFor(null);
        }}
      />
    </Card>
  );
}

function SwapSheet({ item, onClose, onPick }: { item: PlanOptionItem | null; onClose: () => void; onPick: (orig: PlanOptionItem, name: string) => void }) {
  const list = item ? swapList(item) : [];
  const orig = list[0];
  const base = orig ? itemMacros(toLog(orig)).kcal : 0;
  return (
    <Sheet open={!!item} onClose={onClose} title="Cambiar alimento">
      <p className="mb-3 text-sm text-muted">Elige con qué lo sustituyes. Las cantidades ya están calculadas por tu coach.</p>
      <ul className="space-y-2" role="radiogroup" aria-label="Alimentos intercambiables">
        {list.map((x, i) => {
          const on = item ? x.name === item.name && x.grams === item.grams : false;
          const k = itemMacros(toLog(x)).kcal;
          const diff = Math.round(k - base);
          return (
            <li key={x.name + i}>
              <button
                role="radio"
                aria-checked={on}
                onClick={() => orig && onPick(orig, x.name)}
                className={`flex w-full items-center gap-3 rounded-[12px] border-2 p-3 text-left transition-colors ${on ? 'border-rule bg-brand-soft' : 'border-line hover:border-rule'}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{x.name}</span>
                  <span className="block text-[13px] text-muted tnum">
                    {i === 0 ? 'Original del plan' : diff === 0 ? 'Mismas kcal' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} kcal`} · HC {n0((x.c * x.grams) / 100)} g
                  </span>
                </span>
                <span className="shrink-0 font-display text-[19px] font-bold tnum">
                  {n1(x.grams)} {x.unit || unitOf(x.name)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/** Total del día con la opción elegida en cada comida, frente al objetivo. */
function DayTotal({ groups, stateOf, goal }: { groups: PlanGroup[]; stateOf: (g: PlanGroup) => GroupState; goal: { kcal: number; c: number; p: number; f: number } }) {
  const parts = groups.map((g) => ({ g, r: resolved(g, stateOf(g)) })).filter((x) => x.r);
  const all = parts.flatMap((x) => x.r!.items) as LogItem[];
  const m = itemsMacros(all);
  const diff = Math.round(m.kcal - goal.kcal);
  const row = (label: string, v: number, t: number) => (
    <div className="flex items-baseline justify-between border-t border-rule py-1.5 text-[15px] tnum">
      <span>{label}</span>
      <span>
        <b>{n0(v)} g</b> <span className="text-muted">/ {n0(t)} g</span>
      </span>
    </div>
  );
  return (
    <section className="mt-6" aria-labelledby="day-total">
      <Card className="!py-4">
        <h2 id="day-total" className="caps text-[22px] leading-none">
          Tu día con estas opciones
        </h2>
        <p className="mt-1 text-[13px] text-muted">{parts.map((x) => `${x.g.name} ${x.r!.o.letter}`).join(' · ')}</p>
        <div className="mt-3 flex items-end justify-between gap-3 border-t-[8px] border-rule pt-2">
          <span className="font-display text-[40px] font-extrabold leading-none tnum">{n0(m.kcal)}</span>
          <span className="pb-1 text-right text-[13px] leading-tight text-muted tnum">
            kcal de {n0(goal.kcal)}
            <br />
            <b className={Math.abs(diff) <= Math.max(60, goal.kcal * 0.03) ? 'text-go' : 'text-carb-ink'}>{diff === 0 ? 'justo' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} kcal`}</b>
          </span>
        </div>
        <div className="mt-2 border-b-[3px] border-rule">
          {row('Hidratos', m.c, goal.c)}
          {row('Proteína', m.p, goal.p)}
          {row('Grasas', m.f, goal.f)}
        </div>
        <p className="mt-2 text-[13px] text-muted">Cambia de opción o de alimento arriba y el total se recalcula. Registrar cada comida se hace aparte, con su botón.</p>
      </Card>
    </section>
  );
}

/** Reglas, guía y apuntes del PDF del coach. */
function CoachNotes({ notes }: { notes: CoachNote[] }) {
  return (
    <section className="mt-6" aria-labelledby="coach-notes">
      <div className="flex items-center gap-3">
        <h2 id="coach-notes" className="caps text-[24px] leading-none">
          Notas de tu coach
        </h2>
        <span className="h-[3px] flex-1 bg-rule" aria-hidden />
      </div>
      <div className="mt-3 space-y-3">
        {notes.map((n) => (
          <Card key={n.title} className="!py-4">
            <h3 className="caps text-[19px] leading-tight">{n.title}</h3>
            <ul className="mt-2 space-y-1.5 text-[15px] leading-relaxed">
              {n.lines.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Adjust({ target, onClose, onLog }: { target: { g: PlanGroup; o: PlanOption; items: PlanOptionItem[] } | null; onClose: () => void; onLog: (items: LogItem[]) => void }) {
  const [items, setItems] = useState<LogItem[]>(() => (target?.items || []).map(toLog));
  const choices = (i: number) => {
    const it = target?.items[i];
    return it ? swapList(it) : [];
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
