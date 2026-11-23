import { useEffect, useState } from 'react';
import { Droplets, Footprints, Loader2, MessageSquareText } from 'lucide-react';
import { getLogs } from '../lib/data';
import { pretty, shift, today } from '../lib/dates';
import { entriesMacros, isFood, itemMacros, itemsMacros, n0, n1, planTarget, SLOTS, slotOf, unitOf } from '../lib/nutrition';
import type { MealLog } from '../lib/types';
import { findActivity } from '../client/Activity';
import { Card, Empty } from '../ui/kit';
import type { Row } from './CoachApp';

export function DiaryTab({ row, focus }: { row: Row; focus: string | null }) {
  const [logs, setLogs] = useState<MealLog[] | null>(null);
  const [open, setOpen] = useState<string | null>(focus);
  const goal = planTarget(row.pub?.content);
  useEffect(() => {
    getLogs(row.c.id, shift(today(), -90), today())
      .then((l) => {
        setLogs(l);
        if (!focus && l[0]) setOpen(l[0].log_date);
      })
      .catch(() => setLogs([]));
  }, [row.c.id, focus]);
  useEffect(() => {
    if (focus) setTimeout(() => document.getElementById('day-' + focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  }, [focus, logs]);

  if (!logs) return <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-brand" /></div>;
  if (!logs.length) return <Empty title="Sin registros todavía" text="Cuando el cliente anote comidas, aparecerán aquí por días." />;

  return (
    <div className="space-y-2.5">
      {logs.map((l) => {
        const t = entriesMacros(l.entries);
        const food = (l.entries || []).filter(isFood);
        const pct = goal.kcal ? t.kcal / goal.kcal : 0;
        const isOpen = open === l.log_date;
        const slots = [...SLOTS] as string[];
        food.forEach((e) => !slots.includes(slotOf(e)) && slots.push(slotOf(e)));
        return (
          <Card key={l.log_date} className="!p-0 scroll-mt-16">
            <h2 className="m-0">
              <button
                id={'day-' + l.log_date}
                onClick={() => setOpen(isOpen ? null : l.log_date)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-5 py-4 text-left"
              >
                <span className="block min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {pretty(l.log_date)}
                    {l.day_notes ? <MessageSquareText className="size-3.5 text-brand" aria-label="Con nota" /> : null}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal text-muted tnum">
                    HC {n0(t.c)} · P {n0(t.p)} · G {n0(t.f)} g{l.water_ml ? ` · ${n0(l.water_ml)} ml agua` : ''}
                  </span>
                </span>
                <span className="block text-right">
                  <span className="block font-display text-lg font-bold tnum">{n0(t.kcal)}</span>
                  {goal.kcal > 0 && <span className={`block text-[11px] font-bold tnum ${Math.abs(pct - 1) <= 0.1 ? 'text-brand' : pct > 1.1 ? 'text-fat-ink' : 'text-carb-ink'}`}>{n0(pct * 100)} %</span>}
                </span>
              </button>
            </h2>
            {isOpen && (
              <div className="border-t border-line px-5 pb-4 pt-3">
                {slots.map((s) => {
                  const list = food.filter((e) => slotOf(e) === s);
                  if (!list.length) return null;
                  return (
                    <div key={s} className="mb-3">
                      <div className="mb-1 flex items-baseline justify-between">
                        <h3 className="text-sm font-bold">{s}</h3>
                        <span className="text-xs font-semibold text-muted tnum">{n0(list.reduce((a, e) => a + itemsMacros(e.items).kcal, 0))} kcal</span>
                      </div>
                      {list.map((e, k) => (
                        <div key={k}>
                          {!e.freeEntry && e.letter && <div className="text-[11px] font-bold text-brand">Opción {e.letter} del plan{typeof e.combo === 'string' && e.combo ? ` · ${e.combo}` : ''}{e.status === 'partial' ? ' · parcial' : ''}</div>}
                          {(e.items || []).map((it, j) => (
                            <div key={j} className="flex justify-between gap-3 py-0.5 text-sm">
                              <span className="min-w-0 truncate">
                                {it.name} <span className="text-muted tnum">· {n1(it.grams)} {unitOf(it.name)}</span>
                              </span>
                              <span className="shrink-0 text-muted tnum">{n0(itemMacros(it).kcal)}</span>
                            </div>
                          ))}
                          {e.comment && <p className="mt-1 text-xs italic text-muted">{e.comment}</p>}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {(() => {
                  const a = findActivity(l.entries || []);
                  if (!a) return null;
                  return (
                    <div className="mb-2 flex gap-1.5 text-sm text-muted">
                      <Footprints className="mt-0.5 size-4 shrink-0 text-brand" />
                      <span>
                        {a.steps != null && <b className="text-ink tnum">{n0(a.steps)} pasos</b>}
                        {(a.activities || []).map((x, k) => (
                          <span key={k} className="block">
                            {x.type} · {x.minutes} min · {x.intensity}
                            {x.note ? ' · ' + x.note : ''}
                          </span>
                        ))}
                      </span>
                    </div>
                  );
                })()}
                {l.water_ml ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <Droplets className="size-4 text-water" /> {n0(l.water_ml)} ml
                  </p>
                ) : null}
                {l.day_notes && (
                  <p className="mt-2 flex gap-2 rounded-[12px] bg-surface-2 p-3 text-sm">
                    <MessageSquareText className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span className="whitespace-pre-line">{l.day_notes}</span>
                  </p>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
