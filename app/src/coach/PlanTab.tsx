import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Pencil, Send, X } from 'lucide-react';
import { getDraft, publishPlan } from '../lib/data';
import { errText } from '../lib/supabase';
import { itemsMacros, n0, planTarget } from '../lib/nutrition';
import type { LogItem, Macros, PlanContent, PlanGroup } from '../lib/types';
import { Button, Card, Empty, Label, SectionTitle } from '../ui/kit';
import { planGroups } from '../client/PlanView';
import type { Row } from './CoachApp';
import type { Toast } from './ClientDetail';

type Draft = { title: string; groups: PlanGroup[]; target: Macros; source: 'pdf' | 'edit'; report?: string };

const valid = (i: { kcal: unknown; c: unknown; p: unknown; f: unknown; grams: unknown }) => ['kcal', 'c', 'p', 'f', 'grams'].every((k) => Number.isFinite(Number((i as Record<string, unknown>)[k])) && Number((i as Record<string, unknown>)[k]) >= 0);

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
        const st = await menu.fillMacros(r.groups as never, refs, (q) => foods.searchCatalog(q));
        fillNote = ` Valores: ${st.fromPlans} de tus planes o la biblioteca, ${st.fromTotals} calculados con el total del PDF${st.fromCatalog ? `, ${st.fromCatalog} del catálogo (revísalos)` : ''}${st.missing ? `, ${st.missing} por completar` : ''}.`;
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
            items: o.items.map((i) => ({ name: i.name, grams: +i.grams, kcal: +i.kcal, c: +i.c, p: +i.p, f: +i.f, ...(i.unit ? { unit: i.unit } : {}), ...(i.portion ? { portion: i.portion } : {}) })),
          })),
        })),
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
      setDraft({ title: String(d?.title || 'Plan de ' + row.c.name), groups: JSON.parse(JSON.stringify(g)), target, source: 'edit' });
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
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
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
                  <h3 className="font-display text-lg font-bold">{g.name}</h3>
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
  const bad = draft.groups.reduce((n, g) => n + g.options.reduce((a, o) => a + o.items.filter((i) => !valid(i)).length, 0), 0);
  const upd = (gi: number, oi: number, ii: number, k: string, v: string) => {
    const g = JSON.parse(JSON.stringify(draft.groups)) as PlanGroup[];
    const it = g[gi].options[oi].items[ii] as Record<string, unknown>;
    it[k] = k === 'name' ? v : Number(v.replace(',', '.'));
    setDraft({ ...draft, groups: g });
  };
  const removeItem = (gi: number, oi: number, ii: number) => {
    const g = JSON.parse(JSON.stringify(draft.groups)) as PlanGroup[];
    g[gi].options[oi].items.splice(ii, 1);
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
          .map((g) => ({ name: g.name, share: g.share, options: g.options.map((o) => ({ letter: o.letter, title: o.title, notes: o.notes, items: o.items.map((i) => ({ ...i, name: i.name, grams: +i.grams, kcal: +i.kcal, c: +i.c, p: +i.p, f: +i.f })) })) })),
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
      <div className={`mt-3 flex items-start gap-2 rounded-2xl p-3 text-sm ${bad ? 'bg-carb/12 text-carb-ink' : 'bg-brand-soft text-brand'}`}>
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
              const m = itemsMacros(o.items as LogItem[]);
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
                        {o.items.map((it, ii) => (
                          <tr key={ii} className={valid(it) ? '' : 'bg-carb/10'}>
                            <td className="px-1 py-0.5">
                              <input className="w-full rounded-lg bg-transparent px-1 py-1 outline-none focus:bg-surface-2" value={it.name} onChange={(e) => upd(gi, oi, ii, 'name', e.target.value)} />
                            </td>
                            {(['grams', 'kcal', 'c', 'p', 'f'] as const).map((k) => (
                              <td key={k} className="px-1">
                                <input
                                  className={`w-full rounded-lg px-1 py-1 text-right outline-none tnum focus:bg-surface-2 ${Number.isFinite(+it[k]) ? 'bg-transparent' : 'bg-carb/20'}`}
                                  inputMode="decimal"
                                  value={Number.isFinite(+it[k]) ? String(it[k]) : ''}
                                  onChange={(e) => upd(gi, oi, ii, k, e.target.value)}
                                />
                              </td>
                            ))}
                            <td>
                              <button onClick={() => removeItem(gi, oi, ii)} className="grid size-7 place-items-center rounded-full text-faint hover:text-danger" aria-label="Quitar">
                                <X className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {o.notes && <p className="mt-2 text-xs text-muted">{o.notes}</p>}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
      <p className="mt-4 px-1 text-xs text-muted">kcal, HC, P y G son valores por 100 g del alimento.</p>
      <div className="sticky bottom-0 -mx-4 mt-4 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-4 pt-6 safe-b">
        <Button size="lg" className="w-full" loading={busy} onClick={publish} icon={<Send className="size-4.5" />}>
          Publicar para {row.c.name.split(' ')[0]}
        </Button>
      </div>
    </div>
  );
}
