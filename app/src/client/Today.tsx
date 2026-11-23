import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, CloudCheck, Copy, Droplets, Flame, Loader2, MessageSquareText, Minus, Plus, Trash2 } from 'lucide-react';
import { getLogs } from '../lib/data';
import { lastDays, pretty, shift, today, weekdayLetter } from '../lib/dates';
import { entriesMacros, itemMacros, itemsMacros, n0, n1, planTarget, SLOTS, slotForNow, slotOf, isFood, unitOf } from '../lib/nutrition';
import type { Food, LogEntry, LogItem, MealLog, PlanGroup, PlanOption, PublishedPlan } from '../lib/types';
import { eachItem, kitDefault, kitLabel, optionItems } from '../lib/plan';
import { BoardHeader, NutriScore } from '../ui/Board';
import { Button, Card } from '../ui/kit';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { AddFood, PortionStep } from './AddFood';
import { useDay } from './useDay';
import { planGroups, toLog } from './PlanView';
import { ActivityCard, findActivity } from './Activity';
import { Tips } from './Tips';

export function planFoodsOf(plan: PublishedPlan): Food[] {
  const out: Food[] = [];
  const seen = new Set<string>();
  const add = (x: { name: string; kcal: number; c: number; p: number; f: number; grams: number }) => {
    if (x?.name && !seen.has(x.name) && isFinite(+x.kcal)) {
      seen.add(x.name);
      out.push({ name: x.name, kcal: +x.kcal, c: +x.c || 0, p: +x.p || 0, f: +x.f || 0, portion: +x.grams || 100, portionLabel: 'según tu plan', source: 'Tu plan' });
    }
  };
  for (const g of planGroups(plan))
    for (const o of g.options || []) {
      for (const it of o.items || []) [it, ...(it.alternatives || [])].forEach(add);
      eachItem(o, add); // intercambios y alimentos de las combinaciones (wraps, pizzas)
    }
  return out;
}

export function Today({ plan, uid, name, day, setDay, onError, goPlan }: { plan: PublishedPlan; uid: string; name: string; day: string; setDay: (d: string) => void; onError: (m: string) => void; goPlan: () => void }) {
  const toast = useToast();
  const d = useDay(plan, uid, day, onError);
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ entry: number; item: number } | null>(null);
  const [week, setWeek] = useState<MealLog[]>([]);
  const goal = planTarget(plan.content);
  const food = d.entries.filter(isFood);
  const tot = entriesMacros(d.entries);
  const left = goal.kcal - tot.kcal;
  const planFoods = useMemo(() => planFoodsOf(plan), [plan]);
  const planBySlot = useMemo(() => new Map(planGroups(plan).map((g) => [slotOf({ meal: g.name }), g])), [plan]);

  // Registrar una opción del plan desde «Hoy», con un toque (las combinaciones se eligen en «Mi plan»)
  function logOption(g: PlanGroup, o: PlanOption) {
    const at = new Date().toISOString();
    const entry: LogEntry = { meal: g.name, letter: o.letter, status: 'completed', items: optionItems(o).map(toLog), ...(o.kit ? { combo: kitLabel(o.kit, kitDefault(o.kit)) } : {}), updatedAt: at };
    d.update((s) => ({ ...s, entries: [...s.entries.filter((e) => e.freeEntry || e.kind === 'activity' || e.meal !== g.name), entry] }));
    toast(`${g.name}: opción ${o.letter} registrada`, {
      action: { label: 'Deshacer', run: () => d.update((s) => ({ ...s, entries: s.entries.filter((e) => !(e.meal === g.name && !e.freeEntry && e.updatedAt === at)) })) },
    });
  }
  const strip = lastDays(day > shift(today(), -3) ? today() : shift(day, 3), 7);

  useEffect(() => {
    getLogs(plan.client_id, shift(day, -7), shift(day, 7))
      .then(setWeek)
      .catch(() => {});
  }, [plan.client_id, day, d.entries]);

  const streak = useMemo(() => {
    const logged = new Set(week.filter((w) => (w.entries || []).some(isFood)).map((w) => w.log_date));
    if (food.length) logged.add(day);
    let n = 0,
      cur = today();
    if (!logged.has(cur)) cur = shift(cur, -1);
    while (logged.has(cur)) {
      n++;
      cur = shift(cur, -1);
    }
    return n;
  }, [week, food.length, day]);

  const slots = [...SLOTS] as string[];
  food.forEach((e) => {
    const s = slotOf(e);
    if (!slots.includes(s)) slots.push(s);
  });

  function addItem(item: LogItem, slot: string) {
    const id = crypto.randomUUID();
    const entry: LogEntry = { id, freeEntry: true, meal: 'Libre:' + id, mealSlot: slot, letter: 'Libre', status: 'completed', items: [item], updatedAt: new Date().toISOString() };
    d.update((s) => ({ ...s, entries: [...s.entries, entry] }));
    toast(`${item.name} · ${n0(itemMacros(item).kcal)} kcal`, {
      action: { label: 'Deshacer', run: () => d.update((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) })) },
    });
  }

  function copyFromYesterday(slot: string) {
    const y = week.find((w) => w.log_date === shift(day, -1));
    const src = (y?.entries || []).filter((e) => isFood(e) && slotOf(e) === slot);
    if (!src.length) return toast('Ayer no anotaste nada en ' + slot.toLowerCase(), { bad: true });
    const copies: LogEntry[] = src.flatMap((e) =>
      (e.items || [])
        .filter((it) => +it.grams > 0)
        .map((it) => {
          const id = crypto.randomUUID();
          return { id, freeEntry: true, meal: 'Libre:' + id, mealSlot: slot, letter: 'Libre', status: 'completed', items: [{ ...it }], updatedAt: new Date().toISOString() };
        }),
    );
    d.update((s) => ({ ...s, entries: [...s.entries, ...copies] }));
    toast(copies.length === 1 ? '1 alimento copiado de ayer' : `${copies.length} alimentos copiados de ayer`);
  }

  const hour = new Date().getHours();
  const hello = hour < 6 ? 'Buenas noches' : hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
  const yesterday = week.find((w) => w.log_date === shift(day, -1));

  const over = goal.kcal > 0 && left < 0;
  const MACROS = [
    ['Hidratos', tot.c, goal.c, 'var(--c-carb)'],
    ['Proteínas', tot.p, goal.p, 'var(--c-prot)'],
    ['Grasas', tot.f, goal.f, 'var(--c-fat)'],
  ] as const;

  return (
    <div className="px-4">
      <BoardHeader
        title={
          <>
            {hello}
            {name ? <>, {name}</> : ''}
          </>
        }
        subtitle={pretty(day) === 'Hoy' ? new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : pretty(day)}
        right={
          <>
            {streak > 0 && (
              <span className="caps inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[15px] text-on-accent" title="Días seguidos registrando">
                <Flame className="size-4" />
                {streak} {streak === 1 ? 'día' : 'días'}
              </span>
            )}
            <span className="grid size-8 place-items-center text-chalk-dim" aria-live="polite" title={d.saving ? 'Guardando…' : 'Guardado'}>
              {d.saving ? <Loader2 className="size-4.5 animate-spin" /> : <CloudCheck className="size-4.5" />}
            </span>
          </>
        }
      >
        {/* Selector de día */}
        <div className="mt-4 flex items-center gap-1">
          <button onClick={() => setDay(shift(day, -1))} aria-label="Día anterior" className="grid size-9 place-items-center rounded-full text-chalk-dim hover:text-chalk">
            <ChevronLeft className="size-5" />
          </button>
          <div className="grid flex-1 grid-cols-7 gap-1">
            {strip.map((s) => {
              const has = s === day ? food.length > 0 : week.some((w) => w.log_date === s && (w.entries || []).some(isFood));
              const on = s === day;
              const future = s > today();
              return (
                <button
                  key={s}
                  disabled={future}
                  onClick={() => setDay(s)}
                  aria-pressed={on}
                  aria-label={pretty(s) + (has ? ', con registros' : '')}
                  className={`flex flex-col items-center rounded-[12px] py-1.5 transition-colors disabled:opacity-30 ${on ? 'bg-chalk text-board' : 'text-chalk hover:bg-board-2'}`}
                >
                  <span className={`text-[11px] font-semibold ${on ? 'text-board/70' : 'text-chalk-dim'}`}>{weekdayLetter(s)}</span>
                  <span className="font-display text-[19px] font-bold leading-tight tnum">{+s.slice(8)}</span>
                  <span className={`size-1.5 rounded-full ${has ? 'bg-accent' : 'bg-transparent'}`} />
                </button>
              );
            })}
          </div>
          <button onClick={() => setDay(shift(day, 1))} disabled={day >= today()} aria-label="Día siguiente" className="grid size-9 place-items-center rounded-full text-chalk-dim hover:text-chalk disabled:opacity-30">
            <ChevronRight className="size-5" />
          </button>
        </div>
        {day !== today() && (
          <button onClick={() => setDay(today())} className="mx-auto mt-2 block text-xs font-bold text-accent">
            Volver a hoy
          </button>
        )}
      </BoardHeader>

      {/* Resumen del día: información nutricional */}
      <section className="mt-4 rounded-[8px] border-[3px] border-rule bg-surface px-4 pb-3 pt-3" aria-labelledby="label-title">
        <h2 id="label-title" className="caps text-[24px] leading-none">
          Información nutricional · {pretty(day) === 'Hoy' ? 'hoy' : pretty(day).toLowerCase()}
        </h2>
        <div className="mt-2 h-2 bg-rule" aria-hidden />
        {goal.kcal > 0 ? (
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className={`text-xs font-bold uppercase tracking-wide ${over ? 'text-fat-ink' : 'text-muted'}`}>{over ? 'Te has pasado' : 'Te quedan'}</p>
              <p className="font-display text-[60px] font-extrabold leading-[0.85] tnum">
                {n0(Math.abs(left))}
                <span className="ml-1 text-[22px] font-bold">kcal</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Llevas</p>
              <p className="font-display text-[26px] font-extrabold leading-none tnum">
                {n0(tot.kcal)} / {n0(goal.kcal)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Llevas</p>
            <p className="font-display text-[60px] font-extrabold leading-[0.85] tnum">
              {n0(tot.kcal)}
              <span className="ml-1 text-[22px] font-bold">kcal</span>
            </p>
          </div>
        )}
        <div className="mt-2 h-[3px] bg-rule" aria-hidden />
        <ul>
          {MACROS.map(([label, v, g, color], i) => {
            const w = g > 0 ? Math.min(100, (100 * v) / g) : 0;
            return (
              <li key={label} className={`flex items-center justify-between gap-3 py-2 text-[15px] ${i ? 'border-t border-rule' : ''}`}>
                <b className="font-semibold">{label}</b>
                <span className="flex items-center gap-3 tnum">
                  <span>
                    {n0(v)}
                    {g > 0 ? ' / ' + n0(g) : ''} g
                  </span>
                  {g > 0 && (
                    <span className="block h-1.5 w-20 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <motion.span className="block h-full origin-left rounded-full" style={{ background: color }} initial={{ scaleX: 0 }} animate={{ scaleX: w / 100 }} transition={{ type: 'spring', duration: 0.6, bounce: 0 }} />
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <Tips hasPlan={planFoods.length > 0} />

      {d.loading && !d.entries.length ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-brand" />
        </div>
      ) : (
        <>
          {/* Comidas del día, como un menú */}
          <div className="mt-2 px-1">
            {slots.map((slot) => {
              const list = food.map((e, i) => ({ e, i })).filter(({ e }) => slotOf(e) === slot);
              const st = list.reduce((t, { e }) => t + itemsMacros(e.items).kcal, 0);
              const hasYesterday = (yesterday?.entries || []).some((e) => isFood(e) && slotOf(e) === slot);
              const minor = !list.length && (slot === 'Recena' || slot === 'Media mañana');
              return (
                <section key={slot} className={minor ? 'mt-4' : 'mt-6'} aria-label={slot}>
                  <div className="flex items-center gap-3">
                    <h2 className={`caps shrink-0 leading-none ${minor ? 'text-[17px] text-muted' : 'text-[23px]'}`}>{slot}</h2>
                    <span className={`flex-1 ${minor ? 'h-px bg-line' : 'h-0.5 bg-rule'}`} aria-hidden />
                    {list.length > 0 && <span className="font-display text-[17px] font-bold tnum">{n0(st)}</span>}
                    <button
                      onClick={() => setAdding(slot)}
                      className={`grid shrink-0 place-items-center rounded-full transition-transform active:scale-95 ${minor ? 'size-8 border-2 border-line text-muted' : 'size-9 bg-brand text-on-brand'}`}
                      aria-label={'Añadir a ' + slot}
                    >
                      <Plus className={minor ? 'size-4' : 'size-5'} strokeWidth={2.6} />
                    </button>
                  </div>
                  {list.length ? (
                    <ul className="mt-1">
                      <AnimatePresence initial={false}>
                        {list.flatMap(({ e, i }) =>
                          (e.items || []).map((it, ix) =>
                            +it.grams > 0 ? (
                              <motion.li key={(e.id || e.meal) + ':' + ix} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <button onClick={() => setEditing({ entry: i, item: ix })} className="-mx-2 flex w-[calc(100%+16px)] items-baseline gap-2 rounded-[10px] px-2 py-2 text-left hover:bg-surface">
                                  <span className="min-w-0 shrink">
                                    <span className="text-[16px]">{it.name}</span>
                                    <NutriScore grade={it.nutriscore as string | undefined} />
                                    <span className="text-[13px] text-muted tnum">
                                      {' · '}
                                      {n1(it.grams)} {unitOf(it.name)}
                                      {!e.freeEntry && e.letter ? ` · opción ${e.letter}` : ''}
                                      {!e.freeEntry && typeof e.combo === 'string' && e.combo && ix === 0 ? ` (${e.combo})` : ''}
                                    </span>
                                  </span>
                                  <span className="leader" aria-hidden />
                                  <span className="shrink-0 font-display text-[19px] font-bold tnum">{n0(itemMacros(it).kcal)}</span>
                                </button>
                              </motion.li>
                            ) : null,
                          ),
                        )}
                      </AnimatePresence>
                    </ul>
                  ) : minor ? null : (
                    <>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="mr-auto text-sm text-faint">Sin anotar</p>
                      {hasYesterday && (
                        <button onClick={() => copyFromYesterday(slot)} className="inline-flex items-center gap-1.5 rounded-full border-2 border-line px-3 py-1 text-[13px] font-semibold text-muted hover:border-rule hover:text-ink">
                          <Copy className="size-3.5" /> Repetir ayer
                        </button>
                      )}
                      {planFoods.length > 0 && (
                        <button onClick={goPlan} className="rounded-full border-2 border-rule px-3 py-1 text-[13px] font-semibold">
                          Ver mi plan
                        </button>
                      )}
                    </div>
                    {(() => {
                      const g = planBySlot.get(slot);
                      if (!g?.options?.length) return null;
                      return (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="mr-0.5 text-[13px] text-muted">Del plan:</span>
                          {g.options.map((o) => {
                            const k = itemsMacros(optionItems(o).map(toLog)).kcal;
                            return o.kit ? (
                              <button key={o.letter} onClick={goPlan} className="h-9 rounded-full border-2 border-line px-3 text-[14px] font-semibold text-muted hover:border-rule hover:text-ink" aria-label={`Elegir la opción ${o.letter} de ${g.name} en «Mi plan»`}>
                                <span className="caps text-[16px] text-ink">{o.letter}</span> · elegir
                              </button>
                            ) : (
                              <button key={o.letter} onClick={() => logOption(g, o)} className="h-9 rounded-full border-2 border-rule px-3 text-[14px] font-semibold tnum transition-transform active:scale-95" aria-label={`Registrar opción ${o.letter} de ${g.name} (${n0(k)} kcal)`}>
                                <span className="caps text-[16px]">{o.letter}</span> · {n0(k)}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                    </>
                  )}
                </section>
              );
            })}
          </div>

          <div className="mt-6" />
          <Water ml={d.water} set={(ml) => d.update((s) => ({ ...s, water: ml }))} />
          <ActivityCard
            entry={findActivity(d.entries)}
            save={(a) => {
              d.update((s) => ({ ...s, entries: [...s.entries.filter((e) => e?.kind !== 'activity'), ...(a ? [a] : [])] }));
              toast(a ? 'Actividad guardada' : 'Actividad borrada');
            }}
          />
          <Notes value={d.notes} save={(t) => d.update((s) => ({ ...s, notes: t })).then(() => toast('Nota guardada'))} />
        </>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setAdding(slotForNow())}
        className="fixed bottom-24 right-[max(16px,calc(50%-276px))] z-30 grid size-15 place-items-center rounded-[22px] bg-accent text-on-accent shadow-pop transition-transform active:scale-95"
        aria-label="Añadir alimento"
      >
        <Plus className="size-7" strokeWidth={2.8} />
      </button>

      <AddFood open={!!adding} onClose={() => setAdding(null)} slot={adding || slotForNow()} onAdd={addItem} planFoods={planFoods} />
      <EditItem
        open={!!editing}
        entry={editing ? food[editing.entry] : undefined}
        itemIndex={editing?.item ?? 0}
        onClose={() => setEditing(null)}
        onSave={(grams) => {
          const e = food[editing!.entry];
          d.update((s) => ({
            ...s,
            entries: s.entries.map((x) => (x === e ? { ...x, updatedAt: new Date().toISOString(), items: (x.items || []).map((it, k) => (k === editing!.item ? { ...it, grams } : it)) } : x)),
          }));
          setEditing(null);
        }}
        onDelete={() => {
          const e = food[editing!.entry];
          const snapshot = d.entries;
          d.update((s) => ({
            ...s,
            entries: s.entries.flatMap((x) => {
              if (x !== e) return [x];
              const items = (x.items || []).filter((_, k) => k !== editing!.item);
              return items.length ? [{ ...x, items, updatedAt: new Date().toISOString() }] : [];
            }),
          }));
          setEditing(null);
          toast('Alimento eliminado', { action: { label: 'Deshacer', run: () => d.update((s) => ({ ...s, entries: snapshot })) } });
        }}
      />
    </div>
  );
}

function EditItem({ open, entry, itemIndex, onClose, onSave, onDelete }: { open: boolean; entry?: LogEntry; itemIndex: number; onClose: () => void; onSave: (g: number) => void; onDelete: () => void }) {
  const it = entry?.items?.[itemIndex];
  return (
    <Sheet open={open && !!it} onClose={onClose} title="Editar">
      {it && (
        <>
          <PortionStep food={{ name: it.name, kcal: +it.kcal, c: +it.c, p: +it.p, f: +it.f, brand: it.brand, source: it.source, portion: it.portion, portionLabel: it.portionLabel }} initial={+it.grams} add={(x) => onSave(x.grams)} cta="Guardar cambios" />
          <Button variant="danger" className="mt-2 w-full" onClick={onDelete} icon={<Trash2 className="size-4" />}>
            Quitar de este día
          </Button>
        </>
      )}
    </Sheet>
  );
}

function Water({ ml, set }: { ml: number; set: (ml: number) => void }) {
  const glasses = 8;
  const full = Math.round(ml / 250);
  return (
    <Card className="mt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[12px] bg-water/15 text-water">
            <Droplets className="size-5" />
          </span>
          <div>
            <h2 className="caps text-[17px]">Agua</h2>
            <p className="text-xs font-semibold text-muted tnum">
              {(ml / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} L de {(glasses * 0.25).toLocaleString('es-ES')} L
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => set(Math.max(0, ml - 250))} disabled={ml <= 0} className="h-9 rounded-full border-2 border-line px-3 text-sm font-bold disabled:opacity-40" aria-label="Quitar 250 ml">
            <Minus className="mx-auto size-4" />
          </button>
          <button onClick={() => set(ml + 250)} className="caps h-9 rounded-full bg-water-strong px-3.5 text-[15px] text-white" aria-label="Añadir 250 ml">
            + 250 ml
          </button>
        </div>
      </div>
      <div className="mt-4 flex gap-1.5">
        {Array.from({ length: Math.max(glasses, full) }, (_, i) => (
          <button key={i} onClick={() => set((i + 1) * 250 === ml ? i * 250 : (i + 1) * 250)} className="h-9 flex-1 overflow-hidden rounded-lg bg-surface-2" aria-label={`${(i + 1) * 250} ml`}>
            <motion.span className="block h-full w-full origin-bottom rounded-lg bg-water" initial={false} animate={{ scaleY: i < full ? 1 : 0 }} transition={{ type: 'spring', duration: 0.35, bounce: 0 }} />
          </button>
        ))}
      </div>
    </Card>
  );
}

function Notes({ value, save }: { value: string; save: (t: string) => void }) {
  const [t, setT] = useState(value);
  useEffect(() => setT(value), [value]);
  return (
    <Card className="mt-3">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[12px] bg-brand-soft text-brand">
          <MessageSquareText className="size-5" />
        </span>
        <div>
          <h2 className="caps text-[17px]">Nota para tu coach</h2>
          <p className="text-xs text-muted">Hambre, sensaciones, entreno, dudas…</p>
        </div>
      </div>
      <textarea className="field min-h-[90px] resize-none" value={t} onChange={(e) => setT(e.target.value)} placeholder="¿Cómo ha ido el día?" maxLength={3000} />
      {t !== value && (
        <Button size="sm" className="mt-2" onClick={() => save(t)}>
          Guardar nota
        </Button>
      )}
    </Card>
  );
}
