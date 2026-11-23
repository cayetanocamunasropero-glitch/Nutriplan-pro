import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Pencil, Plus, Send, X } from 'lucide-react';
import { getDraft, publishPlan } from '../lib/data';
import { errText } from '../lib/supabase';
import { itemsMacros, n0, planTarget } from '../lib/nutrition';
import type { CoachNote, LogItem, Macros, PlanContent, PlanGroup, PlanOption, PlanOptionItem } from '../lib/types';
import { eachItem, kitCombos, kitItems, normalizeOption } from '../lib/plan';
import { Button, Card, Empty, Label, SectionTitle } from '../ui/kit';
import { planGroups } from '../client/PlanView';
import type { Row } from './CoachApp';
import type { Toast } from './ClientDetail';

type Draft = { title: string; groups: PlanGroup[]; target: Macros; source: 'pdf' | 'edit'; report?: string; coachNotes?: CoachNote[] };

/** Alimentos distintos de una combinación (wraps, pizzas), para revisar sus macros una sola vez. */
function kitFoods(o: PlanOption) {
  const seen = new Map<string, PlanOptionItem>();
  if (o.kit) for (const s of o.kit.slots) for (const c of s.choices) for (const it of [...(c.items || []), ...Object.values(c.by || {}).flat()]) if (!seen.has(it.name)) seen.set(it.name, it);
  return [...seen.values()];
}

// Un valor vacío (NaN, o null tras copiar el borrador) es «falta», no 0
const isNum = (v: unknown) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;
const valid = (i: { kcal: unknown; c: unknown; p: unknown; f: unknown; grams: unknown }) => ['kcal', 'c', 'p', 'f', 'grams'].every((k) => isNum((i as Record<string, unknown>)[k]));
const toNum = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')));
const countBad = (groups: PlanGroup[]) => {
  let n = 0;
  for (const g of groups) for (const o of g.options) eachItem(o, (it) => (n += valid(it) ? 0 : 1));
  return n;
};

export function PlanTab({ row, reload, toast }: { row: Row; reload: () => void; toast: Toast }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const content = row.pub?.content;
  const groups = row.pub ? planGroups(row.pub) : [];
  const target = planTarget(content);

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) || f.size > 10_000_000) return setErr('Selecciona un PDF de máximo 10 MB.');
    setErr('');
    setBusy(true);
    try {
      const [{ parseDietPdf }, menu, foods, data] = await Promise.all([import('../lib/pdf/parse'), import('../lib/pdf/menu'), import('../lib/foods'), import('../lib/data')]);
      const r = await parseDietPdf(f);
      let fillNote = '';
      if (r.kind === 'menu') {
        // El formato «menú con opciones» no trae macros por alimento: se completan con tus planes, la biblioteca y el catálogo.
        const pubs = await data.listPublished().catch(() => []);
        const refs = [...menu.refsFromPlans(pubs.map((p) => p.content || {})), ...foods.LIBRARY];
        // 1) tus planes y la biblioteca, 2) lo que falte en los wraps sale de su tabla de totales, 3) catálogo, 4) quesos e intercambios
        await menu.fillMacros(r.groups as never, refs);
        const solved = menu.solveKits(r.groups as never);
        const st = await menu.fillMacros(r.groups as never, refs, (q) => foods.searchCatalog(q));
        const fin = menu.finishExtras(r.groups as never, r.coachNotes);
        const extra = [...(r.notes || []), ...solved, ...fin];
        fillNote = ` Valores: ${st.fromTotals ? `${st.fromTotals} calculados con el total del PDF, ` : ''}${st.fromCatalog ? `${st.fromCatalog} del catálogo (revísalos), ` : ''}${st.missing ? `${st.missing} por completar` : 'completos'}.${extra.length ? ' ' + extra.join(' · ') + '.' : ''}`;
      }
      const t = r.target?.kcal ? r.target : target;
      setDraft({
        title: f.name.replace(/\.pdf$/i, '').replace(/_/g, ' '),
        groups: r.groups.map((g) => ({
          name: g.name,
          share: g.share,
          options: g.options.map((o) => ({
            letter: o.letter,
            title: o.title,
            notes: o.notes,
            ...(o.pdfKcal != null ? { pdfKcal: o.pdfKcal } : {}),
            ...(o.kit ? { kit: o.kit } : {}),
            items: o.items.map((i) => ({ ...i, name: i.name, grams: +i.grams, kcal: +i.kcal, c: +i.c, p: +i.p, f: +i.f })),
          })),
        })),
        coachNotes: r.coachNotes?.length ? r.coachNotes : undefined,
        target: { kcal: +(t.kcal || 0), c: +(t.c || 0), p: +(t.p || 0), f: +(t.f || 0) },
        source: 'pdf',
        report: (r.report ? `${r.report.groups} comidas · ${r.report.options} opciones · ${r.report.ingredients} ingredientes.` : '') + fillNote,
      });
    } catch (e) {
      setErr('No se pudo leer el PDF: ' + errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function editCurrent() {
    setBusy(true);
    try {
      const d = (await getDraft(row.c.id)) || content;
      const g = d && Array.isArray(d.groups) && d.groups.length ? d.groups : groups;
      setDraft({ title: String(d?.title || 'Plan de ' + row.c.name), groups: JSON.parse(JSON.stringify(g)), target, source: 'edit', coachNotes: (d?.coachNotes || content?.coachNotes) as CoachNote[] | undefined });
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  if (draft) return <Editor draft={draft} setDraft={setDraft} row={row} done={() => { setDraft(null); reload(); }} toast={toast} />;

  return (
    <>
      <Card className="border-2 border-dashed border-line !bg-transparent !shadow-none">
        <label className="flex cursor-pointer flex-col items-center gap-2 py-4 text-center">
          <span className="grid size-12 place-items-center rounded-[12px] bg-brand-soft text-brand">
            <FileUp className="size-6" />
          </span>
          <b>{busy ? 'Leyendo el PDF…' : 'Importar dieta en PDF'}</b>
          <span className="max-w-sm text-sm text-muted">Tabla ALIMENTO · CANT. · KCAL · HC · P · G. Revisas el resultado antes de publicar. Para el generador y el editor por gramos usa la versión clásica (icono del reloj arriba).</span>
          <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {err && <p className="pb-2 text-center text-sm text-danger">{err}</p>}
      </Card>

      <SectionTitle
        action={
          groups.length > 0 && (
            <Button size="sm" variant="soft" onClick={editCurrent} loading={busy} icon={<Pencil className="size-4" />}>
              Editar
            </Button>
          )
        }
      >
        Plan publicado
      </SectionTitle>
      {!groups.length ? (
        <Card>
          <Empty title={content?.diaryOnly ? 'Solo diario' : 'Sin plan publicado'} text={content?.diaryOnly ? 'El cliente usa el diario libre con su objetivo de kcal. Importa un PDF para darle opciones de menú.' : 'Importa un PDF para publicar su dieta.'} />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {row.pub?.published_at && <p className="px-1 text-xs text-muted">Publicado el {new Date(row.pub.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
          {groups.map((g) => {
            const goal = target.kcal * (Number(g.share) || 0) / 100;
            return (
              <Card key={g.name} className="!py-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="caps text-lg">{g.name}</h3>
                  {goal > 0 && <span className="text-xs text-muted tnum">{n0(g.share)} % · ≈{n0(goal)} kcal</span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {g.options.map((o) => {
                    const m = itemsMacros(o.items as LogItem[]);
                    const off = goal > 0 && Math.abs(m.kcal - goal) > Math.max(100, goal * 0.2);
                    return (
                      <span key={o.letter} className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold tnum ${off ? 'bg-carb/15 text-carb-ink' : 'bg-surface-2'}`} title={(o.items || []).map((i) => i.name).join(', ')}>
                        {o.letter} · {n0(m.kcal)} kcal
                      </span>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Editor({ draft, setDraft, row, done, toast }: { draft: Draft; setDraft: (d: Draft | null) => void; row: Row; done: () => void; toast: Toast }) {
  const [busy, setBusy] = useState(false);
  const bad = countBad(draft.groups);
  const upd = (gi: number, oi: number, ii: number, k: string, v: string, ci?: number) => {
    const g = JSON.parse(JSON.stringify(draft.groups)) as PlanGroup[];
    const o = g[gi].options[oi];
    const base = (o.kit ? o.kit.base : o.items)[ii];
    const it = (ci == null ? base : base.choices![ci]) as Record<string, unknown>;
    it[k] = k === 'name' ? v : toNum(v);
    setDraft({ ...draft, groups: g });
  };
  // Un alimento de la combinación: se cambia en todas sus apariciones (los gramos de cada elección se respetan)
  const updKit = (gi: number, oi: number, name: string, k: string, v: string) => {
    const g = JSON.parse(JSON.stringify(draft.groups)) as PlanGroup[];
    const o = g[gi].options[oi];
    if (o.kit) for (const s of o.kit.slots) for (const c of s.choices) for (const it of [...(c.items || []), ...Object.values(c.by || {}).flat()]) if (it.name === name) (it as Record<string, unknown>)[k] = toNum(v);
    if (o.kit) o.items = kitItems(o.kit, {});
    setDraft({ ...draft, groups: g });
  };
  const removeItem = (gi: number, oi: number, ii: number) => {
    const g = JSON.parse(JSON.stringify(draft.groups)) as PlanGroup[];
    const o = g[gi].options[oi];
    (o.kit ? o.kit.base : o.items).splice(ii, 1);
    setDraft({ ...draft, groups: g });
  };
  const T = (k: keyof Macros, label: string) => (
    <label>
      <Label>{label}</Label>
      <input className="field tnum" inputMode="decimal" value={draft.target[k] || ''} onChange={(e) => setDraft({ ...draft, target: { ...draft.target, [k]: Number(e.target.value.replace(',', '.')) || 0 } })} />
    </label>
  );

  async function publish() {
    if (bad) return toast(`Faltan valores en ${bad} ingredientes`, { bad: true });
    if (!(draft.target.kcal > 0)) return toast('Indica un objetivo de kcal', { bad: true });
    if (!confirm(`¿Publicar esta dieta para ${row.c.name}? Sustituirá su plan actual.`)) return;
    setBusy(true);
    try {
      const content: PlanContent = {
        title: draft.title,
        clientId: row.c.id,
        clientName: row.c.name,
        groups: draft.groups
          .map((g) => ({ ...g, options: g.options.filter((o) => o.items.length) }))
          .filter((g) => g.options.length)
          .map((g) => ({
            name: g.name,
            share: g.share,
            options: g.options.map((o) => normalizeOption({ letter: o.letter, title: o.title, notes: o.notes, ...(o.kit ? { kit: o.kit } : {}), items: o.items.map((i) => ({ ...i, name: i.name, grams: +i.grams, kcal: +i.kcal, c: +i.c, p: +i.p, f: +i.f })) })),
          })),
        ...(() => {
          const notes = (draft.coachNotes || []).map((n) => ({ title: n.title.trim(), lines: n.lines.map((l) => l.trim()).filter(Boolean) })).filter((n) => n.title && n.lines.length);
          return notes.length ? { coachNotes: notes } : {};
        })(),
        target: draft.target,
        status: 'draft',
        planType: 'alternative-tracker-v1',
      };
      await publishPlan(row.c, content);
      toast('Dieta publicada. El cliente la verá al abrir la app.');
      done();
    } catch (e) {
      toast('No se pudo publicar: ' + errText(e), { bad: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <input className="field flex-1 font-display text-lg font-bold" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Título del plan" />
        <Button variant="soft" onClick={() => setDraft(null)} icon={<X className="size-4" />}>
          Cancelar
        </Button>
      </div>
      <div className={`mt-3 flex items-start gap-2 rounded-[12px] p-3 text-sm ${bad ? 'bg-carb/12 text-carb-ink' : 'bg-brand-soft text-brand'}`}>
        {bad ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
        <span>
          {draft.report ? draft.report.replace(/\.?$/, '. ') : ''}
          {bad ? `${bad} ingredientes sin macros: complétalos abajo (valores por 100 g).` : 'Macros completos. Revisa los totales y publica.'}
        </span>
      </div>

      <SectionTitle>Objetivo diario</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {T('kcal', 'Kcal')}
        {T('c', 'HC g')}
        {T('p', 'Prot. g')}
        {T('f', 'Grasa g')}
      </div>

      {draft.groups.map((g, gi) => (
        <div key={g.name + gi}>
          <SectionTitle>{g.name}</SectionTitle>
          <div className="space-y-2.5">
            {g.options.map((o, oi) => {
              const m = itemsMacros((o.kit ? kitItems(o.kit, {}) : o.items) as LogItem[]);
              return (
                <Card key={o.letter + oi} className="!p-4">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <b className="min-w-0 truncate">
                      Opción {o.letter}
                      {o.title ? ' · ' + o.title : ''}
                    </b>
                    <span className="shrink-0 text-sm font-bold tnum">
                      {n0(m.kcal)} kcal
                      {typeof o.pdfKcal === 'number' && Math.abs(Number(o.pdfKcal) - m.kcal) > 8 && <span className="ml-1 text-xs text-carb-ink">(PDF {n0(o.pdfKcal)})</span>}
                    </span>
                  </div>
                  <div className="-mx-1 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
                          <th className="px-1 py-1 font-bold">Alimento</th>
                          <th className="w-16 px-1 font-bold">g</th>
                          <th className="w-16 px-1 font-bold">kcal</th>
                          <th className="w-14 px-1 font-bold">HC</th>
                          <th className="w-14 px-1 font-bold">P</th>
                          <th className="w-14 px-1 font-bold">G</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {(o.kit ? o.kit.base : o.items).flatMap((it, ii) => [
                          <tr key={ii} className={valid(it) ? '' : 'bg-carb/10'}>
                            <td className="px-1 py-0.5">
                              <input className="w-full rounded-lg bg-transparent px-1 py-1 outline-none focus:bg-surface-2" value={it.name} onChange={(e) => upd(gi, oi, ii, 'name', e.target.value)} />
                            </td>
                            {(['grams', 'kcal', 'c', 'p', 'f'] as const).map((k) => (
                              <td key={k} className="px-1">
                                <input
                                  className={`w-full rounded-lg px-1 py-1 text-right outline-none tnum focus:bg-surface-2 ${isNum(it[k]) ? 'bg-transparent' : 'bg-carb/20'}`}
                                  inputMode="decimal"
                                  value={isNum(it[k]) ? String(it[k]) : ''}
                                  onChange={(e) => upd(gi, oi, ii, k, e.target.value)}
                                />
                              </td>
                            ))}
                            <td>
                              <button onClick={() => removeItem(gi, oi, ii)} className="grid size-7 place-items-center rounded-full text-faint hover:text-danger" aria-label="Quitar">
                                <X className="size-3.5" />
                              </button>
                            </td>
                          </tr>,
                          ...(it.choices || []).map((ch, ci) => (ch.name.trim().toLowerCase() === it.name.trim().toLowerCase() ? null : (
                            <tr key={ii + '-' + ci} className={valid(ch) ? 'text-muted' : 'bg-carb/10 text-muted'}>
                              <td className="px-1 py-0.5">
                                <span className="flex items-center gap-1 pl-3">
                                  <span aria-hidden>↳</span>
                                  <input className="w-full rounded-lg bg-transparent px-1 py-1 outline-none focus:bg-surface-2" value={ch.name} onChange={(e) => upd(gi, oi, ii, 'name', e.target.value, ci)} aria-label={'Intercambio de ' + it.name} />
                                </span>
                              </td>
                              {(['grams', 'kcal', 'c', 'p', 'f'] as const).map((k) => (
                                <td key={k} className="px-1">
                                  <input
                                    className={`w-full rounded-lg px-1 py-1 text-right outline-none tnum focus:bg-surface-2 ${isNum(ch[k]) ? 'bg-transparent' : 'bg-carb/20'}`}
                                    inputMode="decimal"
                                    value={isNum(ch[k]) ? String(ch[k]) : ''}
                                    onChange={(e) => upd(gi, oi, ii, k, e.target.value, ci)}
                                  />
                                </td>
                              ))}
                              <td />
                            </tr>
                          ))),
                        ])}
                        {o.kit &&
                          kitFoods(o).map((it) => (
                            <tr key={'k' + it.name} className={valid(it) ? '' : 'bg-carb/10'}>
                              <td className="px-2 py-1.5">{it.name}</td>
                              <td className="px-1 text-right text-muted tnum">varía</td>
                              {(['kcal', 'c', 'p', 'f'] as const).map((k) => (
                                <td key={k} className="px-1">
                                  <input
                                    className={`w-full rounded-lg px-1 py-1 text-right outline-none tnum focus:bg-surface-2 ${isNum(it[k]) ? 'bg-transparent' : 'bg-carb/20'}`}
                                    inputMode="decimal"
                                    value={isNum(it[k]) ? String(it[k]) : ''}
                                    onChange={(e) => updKit(gi, oi, it.name, k, e.target.value)}
                                    aria-label={`${k} de ${it.name}`}
                                  />
                                </td>
                              ))}
                              <td />
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {o.kit && <KitSummary o={o} />}
                  {o.notes && <p className="mt-2 text-xs text-muted">{o.notes}</p>}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
      <SectionTitle
        action={
          <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={() => setDraft({ ...draft, coachNotes: [...(draft.coachNotes || []), { title: 'Nota', lines: [''] }] })}>
            Añadir nota
          </Button>
        }
      >
        Notas para el cliente
      </SectionTitle>
      {draft.coachNotes?.length ? (
        <div className="space-y-2.5">
          <p className="px-1 text-xs text-muted">Una línea por punto. El cliente lo ve en «Mi plan» → «Notas de tu coach».</p>
          {draft.coachNotes.map((n, ni) => {
            const set = (patch: Partial<CoachNote> | null) =>
              setDraft({ ...draft, coachNotes: patch === null ? draft.coachNotes!.filter((_, k) => k !== ni) : draft.coachNotes!.map((x, k) => (k === ni ? { ...x, ...patch } : x)) });
            return (
              <Card key={ni} className="!p-4">
                <div className="flex items-center gap-2">
                  <input className="field flex-1 font-semibold" value={n.title} onChange={(e) => set({ title: e.target.value })} aria-label="Título de la nota" />
                  <button onClick={() => set(null)} className="grid size-9 shrink-0 place-items-center rounded-full text-faint hover:text-danger" aria-label={'Quitar la nota ' + n.title}>
                    <X className="size-4" />
                  </button>
                </div>
                <textarea
                  className="field mt-2 min-h-28 py-2 text-sm leading-relaxed"
                  value={n.lines.join('\n')}
                  onChange={(e) => set({ lines: e.target.value.split('\n') })}
                  aria-label={'Texto de la nota ' + n.title}
                />
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="px-1 text-sm text-muted">Sin notas. Añade reglas, consejos o el día de ejemplo y el cliente los verá en «Mi plan».</p>
      )}
      <p className="mt-4 px-1 text-xs text-muted">kcal, HC, P y G son valores por 100 g del alimento. «↳» = intercambio que el cliente puede elegir.</p>
      <div className="sticky bottom-0 -mx-4 mt-4 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-4 pt-6 safe-b">
        <Button size="lg" className="w-full" loading={busy} onClick={publish} icon={<Send className="size-4.5" />}>
          Publicar para {row.c.name.split(' ')[0]}
        </Button>
      </div>
    </div>
  );
}

function KitSummary({ o }: { o: PlanOption }) {
  const k = o.kit!;
  const kc = kitCombos(k).map((sel) => itemsMacros(kitItems(k, sel) as LogItem[]).kcal);
  const ok = kc.filter((x) => Number.isFinite(x));
  return (
    <div className="mt-2 rounded-[10px] bg-surface-2 p-3 text-xs">
      <b>Se arma eligiendo</b> · {kc.length} combinaciones{ok.length ? ` · ${n0(Math.min(...ok))}–${n0(Math.max(...ok))} kcal` : ''}
      <ul className="mt-1 space-y-0.5 text-muted">
        {k.slots.map((s) => (
          <li key={s.id}>
            <b className="text-ink">{s.label}:</b> {s.choices.map((c) => c.label).join(' · ')}
          </li>
        ))}
      </ul>
    </div>
  );
}
