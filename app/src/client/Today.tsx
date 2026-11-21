import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, CloudCheck, Copy, Droplets, Flame, Loader2, MessageSquareText, Minus, Plus, Trash2 } from 'lucide-react';
import { getLogs } from '../lib/data';
import { lastDays, pretty, shift, today, weekdayLetter } from '../lib/dates';
import { entriesMacros, itemMacros, itemsMacros, n0, n1, planTarget, SLOTS, slotForNow, slotOf, isFood, unitOf } from '../lib/nutrition';
import type { Food, LogEntry, LogItem, MealLog, PublishedPlan } from '../lib/types';
import { MacroBar, Ring } from '../ui/Charts';
import { Button, Card, IconButton } from '../ui/kit';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { AddFood, PortionStep } from './AddFood';
import { useDay } from './useDay';
import { planGroups } from './PlanView';
import { ActivityCard, findActivity } from './Activity';
import { Tips } from './Tips';

export function planFoodsOf(plan: PublishedPlan): Food[] {
  const out: Food[] = [];
  const seen = new Set<string>();
  for (const g of planGroups(plan))
    for (const o of g.options || [])
      for (const it of o.items || [])
        for (const x of [it, ...(it.choices || []), ...(it.alternatives || [])])
          if (x?.name && !seen.has(x.name) && isFinite(+x.kcal)) {
            seen.add(x.name);
            out.push({ name: x.name, kcal: +x.kcal, c: +x.c || 0, p: +x.p || 0, f: +x.f || 0, portion: +x.grams || 100, portionLabel: 'según tu plan', source: 'Tu plan' });
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

  return (
    <div className="px-4 pt-5">
      {/* Cabecera */}
      <header className="flex items-start justify-between px-1">
        <div>
          <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight">
            {hello}
            {name ? <>, {name}</> : ''}
          </h1>
          <p className="mt-0.5 text-sm text-muted">{pretty(day) === 'Hoy' ? new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : pretty(day)}</p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-fat/12 px-3 py-1.5 text-sm font-bold text-fat-ink" title="Días seguidos registrando">
              <Flame className="size-4" />
              {streak}
            </span>
          )}
          <span className="grid size-9 place-items-center text-faint" aria-live="polite" title={d.saving ? 'Guardando…' : 'Guardado'}>
            {d.saving ? <Loader2 className="size-4.5 animate-spin" /> : <CloudCheck className="size-4.5" />}
          </span>
        </div>
      </header>

      {/* Selector de día */}
      <div className="mt-4 flex items-center gap-1">
        <IconButton onClick={() => setDay(shift(day, -1))} aria-label="Día anterior">
          <ChevronLeft className="size-5" />
        </IconButton>
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
                className={`flex flex-col items-center rounded-2xl py-2 transition disabled:opacity-30 ${on ? 'bg-ink text-bg' : 'hover:bg-surface-2'}`}
              >
                <span className={`text-[11px] font-bold ${on ? 'text-bg/80' : 'text-faint'}`}>{weekdayLetter(s)}</span>
                <span className="font-display text-base font-bold tnum">{+s.slice(8)}</span>
                <span className={`mt-0.5 size-1.5 rounded-full ${has ? (on ? 'bg-lime' : 'bg-brand') : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
        <IconButton onClick={() => setDay(shift(day, 1))} disabled={day >= today()} aria-label="Día siguiente">
          <ChevronRight className="size-5" />
        </IconButton>
      </div>
      {day !== today() && (
        <button onClick={() => setDay(today())} className="mx-auto mt-1 block text-xs font-bold text-brand">
          {pretty(day)} · Volver a hoy
        </button>
      )}

      {/* Resumen */}
      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col items-center">
          <Ring value={tot.kcal} goal={goal.kcal}>
            {goal.kcal > 0 ? (
              <>
                <span className="font-display text-[46px] font-extrabold leading-none tracking-tight tnum">{n0(Math.abs(left))}</span>
                <span className="mt-1 text-[13px] font-semibold text-muted">{left >= 0 ? 'kcal restantes' : 'kcal de más'}</span>
                <span className="mt-2 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-muted tnum">
                  {n0(tot.kcal)} / {n0(goal.kcal)}
                </span>
              </>
            ) : (
              <>
                <span className="font-display text-[46px] font-extrabold leading-none tracking-tight tnum">{n0(tot.kcal)}</span>
                <span className="mt-1 text-[13px] font-semibold text-muted">kcal hoy</span>
              </>
            )}
          </Ring>
        </div>
        <div className="mt-5 flex gap-4">
          <MacroBar label="Hidratos" value={tot.c} goal={goal.c} color="var(--c-carb)" />
          <MacroBar label="Proteínas" value={tot.p} goal={goal.p} color="var(--c-prot)" />
          <MacroBar label="Grasas" value={tot.f} goal={goal.f} color="var(--c-fat)" />
        </div>
      </Card>

      <Tips hasPlan={planFoods.length > 0} />

      {d.loading && !d.entries.length ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-brand" />
        </div>
      ) : (
        <>
          {/* Comidas */}
          <div className="mt-4 space-y-3">
            {slots.map((slot) => {
              const list = food.map((e, i) => ({ e, i })).filter(({ e }) => slotOf(e) === slot);
              const st = list.reduce((t, { e }) => t + itemsMacros(e.items).kcal, 0);
              const hasYesterday = (yesterday?.entries || []).some((e) => isFood(e) && slotOf(e) === slot);
              if (!list.length && (slot === 'Recena' || slot === 'Media mañana'))
                return (
                  <button key={slot} onClick={() => setAdding(slot)} className="flex w-full items-center justify-between rounded-[22px] border border-dashed border-line px-5 py-3.5 text-sm font-semibold text-muted hover:bg-surface">
                    {slot}
                    <Plus className="size-4.5" />
                  </button>
                );
              return (
                <Card key={slot} className="!p-0">
                  <div className="flex items-center justify-between px-5 pb-1 pt-4">
                    <div>
                      <h2 className="font-display text-[17px] font-bold">{slot}</h2>
                      {list.length > 0 && <p className="text-xs font-semibold text-muted tnum">{n0(st)} kcal</p>}
                    </div>
                    <button onClick={() => setAdding(slot)} className="grid size-10 place-items-center rounded-full bg-brand text-on-brand shadow-card active:scale-90" aria-label={'Añadir a ' + slot}>
                      <Plus className="size-5" strokeWidth={2.6} />
                    </button>
                  </div>
                  {list.length ? (
                    <ul className="px-2 pb-2">
                      <AnimatePresence initial={false}>
                        {list.flatMap(({ e, i }) =>
                          (e.items || []).map((it, ix) =>
                            +it.grams > 0 ? (
                              <motion.li key={(e.id || e.meal) + ':' + ix} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                <button onClick={() => setEditing({ entry: i, item: ix })} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-surface-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-[15px] font-semibold">{it.name}</div>
                                    <div className="text-xs text-muted tnum">
                                      {n1(it.grams)} {unitOf(it.name)}
                                      {!e.freeEntry && e.letter ? ` · Plan ${e.letter}` : ''}
                                    </div>
                                  </div>
                                  <span className="text-sm font-bold tnum">{n0(itemMacros(it).kcal)}</span>
                                </button>
                              </motion.li>
                            ) : null,
                          ),
                        )}
                      </AnimatePresence>
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 px-5 pb-4 pt-1">
                      <p className="flex-1 text-sm text-faint">Sin anotar</p>
                      {hasYesterday && (
                        <button onClick={() => copyFromYesterday(slot)} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold text-muted hover:text-ink">
                          <Copy className="size-3.5" /> Repetir ayer
                        </button>
                      )}
                      {planFoods.length > 0 && (
                        <button onClick={goPlan} className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand">
                          Ver mi plan
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

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
        className="fixed bottom-24 right-[max(16px,calc(50%-276px))] z-30 grid size-15 place-items-center rounded-[22px] bg-lime text-[#0f241d] shadow-pop transition-transform active:scale-95"
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
          <span className="grid size-10 place-items-center rounded-2xl bg-water/15 text-water">
            <Droplets className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-[17px] font-bold">Agua</h2>
            <p className="text-xs font-semibold text-muted tnum">
              {(ml / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} L de {(glasses * 0.25).toLocaleString('es-ES')} L
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => set(Math.max(0, ml - 250))} disabled={ml <= 0} className="h-9 rounded-xl bg-surface-2 px-3 text-sm font-bold disabled:opacity-40" aria-label="Quitar 250 ml">
            <Minus className="mx-auto size-4" />
          </button>
          <button onClick={() => set(ml + 250)} className="h-9 rounded-xl bg-water-strong px-3 text-sm font-bold text-white" aria-label="Añadir 250 ml">
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
        <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
          <MessageSquareText className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-[17px] font-bold">Nota para tu coach</h2>
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
