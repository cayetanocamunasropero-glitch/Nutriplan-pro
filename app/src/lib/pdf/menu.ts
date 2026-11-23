// Lector de dietas en formato «menú con opciones» (el formato actual de los PDF de NutriPlan):
//   20 % DEL DÍA · OBJETIVO APROX. 580 KCAL / CLIENTE
//   Desayunos
//   Opción A | Tostadas, fruta y queso batido | 589 kcal
//   Pan blanco | 90 g                 ← nombre y cantidad en la misma línea
//   Zumo de naranja natural           ← o nombre…
//   250 ml                            ← …y cantidad en la línea siguiente
//   1 vaso (~250 ml)                  ← nota de ración
//   HC 118,2 g · P 23,4 g · G 4,4 g   ← totales de la opción (cierra la opción)
//   Variantes: …
// El PDF no trae macros por alimento: se completan después con fillMacros().

import type { Food, Macros, PlanGroup, PlanOption, PlanOptionItem } from '../types';

const norm = (s: unknown) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

type Cell = { t: string; x: number };
type Line = { cells: Cell[]; text: string };

export type MenuOption = PlanOption & { pdfKcal?: number; pdfMacros?: { c: number; p: number; f: number } };
export type MenuItem = PlanOptionItem & { portion?: string; source?: string; reviewed?: boolean };

const num = (s: string) => Number(String(s).replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
const QTY = /^(\d{1,4}(?:[.,]\d+)?)\s*(g|ml)$/i;
const GROUPS: [RegExp, string, number][] = [
  [/^desayunos?\b/i, 'Desayuno', 20],
  [/^(medias?\s+ma[ñn]anas?|almuerzos?\s+de\s+media)/i, 'Media mañana', 10],
  [/^almuerzos?\b/i, 'Almuerzo', 10],
  [/^comidas?\b/i, 'Comida', 40],
  [/^meriendas?\b/i, 'Merienda', 15],
  [/^pre-?\s?entrenos?\b/i, 'Pre-entreno', 10],
  [/^post-?\s?entrenos?\b/i, 'Post-entreno', 10],
  [/^cenas?\b/i, 'Cena', 25],
  [/^recenas?\b/i, 'Recena', 5],
];
const ORDER = ['Desayuno', 'Media mañana', 'Almuerzo', 'Comida', 'Merienda', 'Pre-entreno', 'Post-entreno', 'Cena', 'Recena'];
const NOISE = /(cayetano cama|cayetano camu|nutriplan ·|cantidades calculadas|^p[áa]g\.|plan personal|men[úu] con opciones|elige una opci[óo]n|^energ[íi]a\s*\|)/i;

function toLines(items: { str: string; x: number; y: number }[]): Line[] {
  const rows: { y: number; cells: Cell[] }[] = [];
  for (const it of items) {
    const t = (it.str || '').trim();
    if (!t) continue;
    let r = rows.find((l) => Math.abs(l.y - it.y) < 2.6);
    if (!r) rows.push((r = { y: it.y, cells: [] }));
    r.cells.push({ t, x: it.x });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) => {
      const cells = r.cells.sort((a, b) => a.x - b.x);
      return { cells, text: cells.map((c) => c.t).join(' | ') };
    });
}

/** ¿Este PDF usa el formato «Opción X | título | kcal»? */
export function looksLikeMenu(pages: { str: string; x: number; y: number }[][]) {
  return pages.some((p) => toLines(p).some((l) => /^Opci[óo]n\s+[A-Z]\b.*\d\s*kcal/i.test(l.text)));
}

export function parseMenuPdf(pages: { str: string; x: number; y: number }[][]) {
  const groups: (PlanGroup & { options: MenuOption[] })[] = [];
  let target: Partial<Macros> | null = null;
  let group: (typeof groups)[number] | null = null;
  let option: MenuOption | null = null;
  let open = false; // la opción admite alimentos hasta su línea de HC/P/G
  let pendingShare: number | null = null;
  let notesFor: MenuOption | null = null;

  for (const page of pages) {
    const lines = toLines(page);
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      const s = L.text.replace(/\s+/g, ' ').trim();
      if (NOISE.test(s)) continue;

      const tg = s.match(/^([\d.]+)\s*kcal\s*\|\s*([\d.,]+)\s*g\s*\|\s*([\d.,]+)\s*g\s*\|\s*([\d.,]+)\s*g/i);
      if (tg && !target) {
        target = { kcal: num(tg[1]), c: num(tg[2]), p: num(tg[3]), f: num(tg[4]) };
        continue;
      }
      const sh = s.match(/^(\d{1,3})\s*%\s*del\s*d[íi]a/i);
      if (sh) {
        pendingShare = +sh[1];
        notesFor = null;
        continue;
      }
      const gh = GROUPS.find(([re]) => re.test(s));
      if (gh && L.cells.length === 1 && s.length < 60) {
        group = groups.find((g) => g.name === gh[1]) || null;
        if (!group) groups.push((group = { name: gh[1], share: pendingShare ?? gh[2], options: [] }));
        else if (pendingShare != null) group.share = pendingShare;
        pendingShare = null;
        option = null;
        open = false;
        notesFor = null;
        continue;
      }
      const op = s.match(/^Opci[óo]n\s+([A-Z])\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*kcal/i);
      if (op) {
        if (!group) groups.push((group = { name: 'Comida', share: pendingShare ?? 40, options: [] }));
        option = { letter: op[1].toUpperCase(), title: op[2], items: [], pdfKcal: num(op[3]) };
        group.options.push(option);
        open = true;
        notesFor = null;
        continue;
      }
      const mc = s.match(/^HC\s*([\d.,]+)\s*g\s*·\s*P\s*([\d.,]+)\s*g\s*·\s*G\s*([\d.,]+)\s*g/i);
      if (mc && option && open) {
        option.pdfMacros = { c: num(mc[1]), p: num(mc[2]), f: num(mc[3]) };
        open = false;
        notesFor = option;
        continue;
      }
      if (/^variantes?\s*:/i.test(s) && notesFor) {
        notesFor.notes = s;
        continue;
      }
      if (!open && notesFor?.notes && L.cells.length === 1 && L.cells[0].x < 100 && /^[a-záéíóúñ(]/.test(s)) {
        notesFor.notes += ' ' + s; // continuación de «Variantes»
        continue;
      }
      if (!open || !option) {
        notesFor = null;
        continue;
      }

      // Alimentos dentro de la opción abierta
      const right = L.cells.filter((c) => c.x > 300);
      const left = L.cells.filter((c) => c.x <= 300);
      const qtyCell = right.map((c) => c.t.match(QTY)).find(Boolean);
      const items = option.items as MenuItem[];
      if (left.length && qtyCell) {
        items.push({ name: left.map((c) => c.t).join(' '), grams: num(qtyCell[1]), unit: qtyCell[2].toLowerCase(), kcal: NaN, c: NaN, p: NaN, f: NaN });
        continue;
      }
      if (!left.length && qtyCell) {
        // cantidad sola: completa el último alimento que esperaba cantidad
        const last = items[items.length - 1];
        if (last && Number.isNaN(last.grams)) {
          last.grams = num(qtyCell[1]);
          last.unit = qtyCell[2].toLowerCase();
        }
        continue;
      }
      if (left.length) {
        const next = lines[i + 1];
        const nextIsQty = next && next.cells.every((c) => c.x > 300) && next.cells.some((c) => QTY.test(c.t));
        if (nextIsQty) items.push({ name: s, grams: NaN, kcal: NaN, c: NaN, p: NaN, f: NaN });
        else {
          const last = items[items.length - 1];
          if (last && !last.portion) last.portion = s; // «1 vaso (~250 ml)», «pesar antes de cocer»…
        }
      }
    }
  }

  const out = groups
    .map((g) => ({ ...g, options: g.options.filter((o) => o.items.length) }))
    .filter((g) => g.options.length)
    .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
  return {
    groups: out,
    target,
    report: { groups: out.length, options: out.reduce((n, g) => n + g.options.length, 0), ingredients: out.reduce((n, g) => n + g.options.reduce((t, o) => t + o.items.length, 0), 0) },
  };
}

// ---------------- Completar macros por alimento ----------------

// Palabras que no distinguen un alimento (artículos y marcas de supermercado)
const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'al', 'a', 'y', 'en', 'para', 'por', 'un', 'una', 'g', 'ml', 'hacendado', 'mercadona', 'carrefour', 'milbona', 'lidl', 'dia', 'eroski', 'alcampo', 'helios', 'auchan', 'consum']);
const tokens = (s: string) => new Set(norm(s).replace(/[^a-z0-9% ]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t)));

/** Parecido entre nombres de alimento (0–1). */
export function nameScore(a: string, b: string) {
  const na = norm(a).replace(/\s+/g, ' ').trim(),
    nb = norm(b).replace(/\s+/g, ' ').trim();
  if (na === nb) return 1;
  const x = tokens(a),
    y = tokens(b);
  if (!x.size || !y.size) return 0;
  const inter = [...x].filter((t) => y.has(t)).length;
  const lo = Math.min(x.size, y.size),
    hi = Math.max(x.size, y.size);
  // Un nombre contenido en el otro («Pan blanco» ⊂ «Pan blanco de barra») cuenta como parecido si comparten ≥ 2 palabras
  if (inter === lo && lo >= 2) return 0.75 + 0.25 * (lo / hi);
  return inter / hi;
}

export type FillStats = { fromPlans: number; fromTotals: number; fromCatalog: number; missing: number };

const ok = (i: { kcal: number; c: number; p: number; f: number }) => ['kcal', 'c', 'p', 'f'].every((k) => Number.isFinite(+(i as Record<string, number>)[k]));

/**
 * Rellena kcal/c/p/f por 100 g:
 *  1) planes ya publicados y biblioteca (nombre igual o muy parecido),
 *  2) si en una opción solo falta un alimento, se despeja con los totales del PDF (exacto),
 *  3) catálogo externo (opcional, marcado para revisar).
 */
export async function fillMacros(groups: { options: MenuOption[] }[], refs: Food[], catalog?: (q: string) => Promise<Food[]>): Promise<FillStats> {
  const st: FillStats = { fromPlans: 0, fromTotals: 0, fromCatalog: 0, missing: 0 };
  const all = groups.flatMap((g) => g.options);

  for (const o of all)
    for (const it of o.items as MenuItem[]) {
      let best: Food | null = null,
        score = 0;
      for (const r of refs) {
        const sc = nameScore(it.name, r.name);
        if (sc > score) [best, score] = [r, sc];
      }
      if (best && score >= 0.75) {
        Object.assign(it, { kcal: +best.kcal, c: +best.c, p: +best.p, f: +best.f, source: best.source || 'Planes anteriores', reviewed: score === 1 });
        st.fromPlans++;
      }
    }

  const solveSingles = () => {
    for (const o of all) {
      const miss = (o.items as MenuItem[]).filter((i) => !ok(i));
      if (miss.length !== 1 || !o.pdfMacros || !o.pdfKcal) continue;
      const it = miss[0];
      if (!(it.grams > 0)) continue;
      const known = (o.items as MenuItem[]).filter((i) => i !== it).reduce((t, i) => ({ kcal: t.kcal + (i.kcal * i.grams) / 100, c: t.c + (i.c * i.grams) / 100, p: t.p + (i.p * i.grams) / 100, f: t.f + (i.f * i.grams) / 100 }), { kcal: 0, c: 0, p: 0, f: 0 });
      const per = (tot: number, k: number) => Math.round(((tot - k) * 100 * 10) / it.grams) / 10;
      const v = { kcal: per(o.pdfKcal, known.kcal), c: per(o.pdfMacros.c, known.c), p: per(o.pdfMacros.p, known.p), f: per(o.pdfMacros.f, known.f) };
      if (Object.values(v).every((x) => x >= -0.5) && v.kcal <= 900) {
        Object.assign(it, { kcal: Math.max(0, v.kcal), c: Math.max(0, v.c), p: Math.max(0, v.p), f: Math.max(0, v.f), source: 'Calculado con los totales del PDF', reviewed: true });
        st.fromTotals++;
      }
    }
  };
  solveSingles();

  if (catalog) {
    const pending = all.flatMap((o) => (o.items as MenuItem[]).filter((i) => !ok(i))).slice(0, 30);
    let next = 0;
    const worker = async () => {
      while (next < pending.length) {
        const it = pending[next++];
        try {
          const res = await catalog(it.name);
          let best: Food | null = null,
            score = 0;
          for (const r of res) {
            const sc = nameScore(it.name, r.name);
            if (sc > score) [best, score] = [r, sc];
          }
          const common = best ? [...tokens(it.name)].filter((t) => tokens(best!.name).has(t)).length : 0;
          if (best && score >= 0.6 && common >= 2) {
            Object.assign(it, { kcal: +best.kcal, c: +best.c, p: +best.p, f: +best.f, source: 'Open Food Facts (revisar)', reviewed: false });
            st.fromCatalog++;
          }
        } catch {
          /* sin catálogo: queda para revisar a mano */
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    solveSingles();
  }

  st.missing = all.reduce((n, o) => n + o.items.filter((i) => !ok(i)).length, 0);
  return st;
}

/** Alimentos de referencia a partir de planes publicados (con macros por 100 g). */
export function refsFromPlans(contents: { groups?: PlanGroup[] }[]): Food[] {
  const out: Food[] = [];
  const seen = new Set<string>();
  for (const c of contents)
    for (const g of c.groups || [])
      for (const o of g.options || [])
        for (const it of o.items || [])
          for (const x of [it, ...(it.choices || []), ...(it.alternatives || [])])
            if (x?.name && ok(x) && !seen.has(norm(x.name))) {
              seen.add(norm(x.name));
              out.push({ name: x.name, kcal: +x.kcal, c: +x.c, p: +x.p, f: +x.f, source: 'Planes anteriores' });
            }
  return out;
}
