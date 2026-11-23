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

import type { CoachNote, Food, KitChoice, Macros, PlanGroup, PlanKit, PlanOption, PlanOptionItem } from '../types';
import { eachItem, kitItems } from '../plan.ts';

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
  const extras = parseExtras(
    pages.map((p) => toLines(p)),
    out,
  );
  return {
    groups: out,
    target,
    coachNotes: extras.coachNotes,
    notes: extras.report,
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
  const every = all.flatMap((o) => {
    const xs: MenuItem[] = [];
    eachItem(o, (it) => xs.push(it as MenuItem));
    return xs;
  });

  for (const it of every) {
      if (ok(it)) continue;
      let best: Food | null = null,
        score = 0;
      for (const r of refs) {
        const sc = nameScore(it.name, r.name);
        if (sc > score) [best, score] = [r, sc];
      }
      if (best && score >= 0.75) {
        Object.assign(it, { kcal: +best.kcal, c: +best.c, p: +best.p, f: +best.f, source: best.source || 'Planes anteriores', reviewed: norm(it.name).trim() === norm(best.name).trim() });
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
    const pending = every.filter((i) => !ok(i)).slice(0, 40);
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

  st.missing = every.filter((i) => !ok(i)).length;
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

// ---------------- Apuntes del PDF: wraps, intercambios, variantes, reglas ----------------
// Formato de las páginas finales del PDF de NutriPlan (guía, reglas, día de ejemplo, intercambios de hidratos)
// y de la tabla «Relleno y complemento | Salsa | kcal | HC | P | G» de la opción de wraps.

type WrapRow = { relleno: string; salsa: string; kcal: number; c: number; p: number; f: number };
type IsoCarb = { carbs: number; cap: number };
type Kitted = PlanOption & { __wrapRows?: WrapRow[]; __cheese?: { sin: Record<string, number>; eggsSin: number; eggsWith: number } };
const BRANDS = new Set(['hacendado', 'mercadona', 'carrefour', 'helios', 'milbona', 'lidl', 'dia', 'eroski', 'alcampo', 'auchan', 'consum', 'alteza']);
const CARBS = /\b(pasta|tagliatel|espaguet|spaghett|macarr|fideo|gnocchi|arroz|patata|boniato|pan|base pizza|tortilla|cereal|corn flakes|avena|muesli|quinoa|cuscus)/;
const ADJ = /^(integral|blanc[oa]|light|natural|desnatad[oa]|semidesnatad[oa]|entero|entera|0\s?%)$/i;
const cap1 = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const words = (x: string) => norm(x).replace(/[^a-z0-9% ]/g, ' ').split(/\s+/).filter((t) => t.length > 1 || /\d/.test(t));
const sig = (x: string) => words(x).filter((t) => !STOP.has(t) || BRANDS.has(t));
const sameWord = (a: string, b: string) => {
  if (a === b) return true;
  let cp = 0;
  while (cp < a.length && cp < b.length && a[cp] === b[cp]) cp++;
  return cp >= 4 && Math.abs(a.length - b.length) <= 2 && cp >= Math.min(a.length, b.length) - 1; // plural o género: fresco/fresca, natilla/natillas
};
const r5 = (x: number) => Math.round(x / 5) * 5;
const qty = (x: string) => {
  const m = x.match(/(\d{1,4}(?:[.,]\d+)?)\s*(g|ml)\b/i);
  return m ? { grams: num(m[1]), unit: m[2].toLowerCase() } : null;
};

/** ¿La etiqueta corta («Pechuga», «natilla», «Helios (Carrefour)») nombra este alimento? 0–1 */
function labelScore(label: string, name: string) {
  const a = sig(label).filter((t) => !/^\d/.test(t) && t !== 'g' && t !== 'ml'),
    b = sig(name);
  if (!a.length) return 0;
  const hit = a.filter((t) => b.some((u) => sameWord(t, u))).length;
  return hit / a.length;
}

function planItems(groups: PlanGroup[]) {
  const out: { it: PlanOptionItem; o: PlanOption }[] = [];
  for (const g of groups) for (const o of g.options) eachItem(o, (it) => out.push({ it, o }));
  return out;
}

/** Busca el alimento al que se refiere una etiqueta, primero en la opción y luego en todo el plan. */
function findItem(label: string, groups: PlanGroup[], o?: PlanOption, min = 0.99) {
  let best: PlanOptionItem | null = null,
    score = 0;
  const pool = [...(o ? o.items.map((it) => ({ it, o })) : []), ...planItems(groups)];
  for (const { it, o: oo } of pool) {
    const cover = sig(label).length / Math.max(1, sig(it.name).length);
    const sc = labelScore(label, it.name) + (oo === o ? 0.01 : 0) + 0.001 * Math.min(1, cover);
    if (sc > score) [best, score] = [it, sc];
  }
  return score >= min ? best : null;
}

const blank = (name: string, grams: number, unit = 'g'): PlanOptionItem => ({ name, grams, unit, kcal: NaN, c: NaN, p: NaN, f: NaN });
const copyOf = (it: PlanOptionItem, grams?: number): PlanOptionItem => {
  const { choices: _c, alternatives: _a, alternativesText: _t, ...rest } = it;
  void _c;
  void _a;
  void _t;
  return { ...rest, ...(grams != null ? { grams } : {}) };
};

/** Nombre del alimento sustituto: «pan blanco → integral» = «Pan integral», «Corn Flakes → muesli» = «Muesli sin azúcar añadido». */
function swapName(item: string, label: string, repl: string) {
  const r = repl.trim().replace(/^(un[oa]?|\d+)\s+/i, '');
  if (r.split(/\s+/).length > 1 && !ADJ.test(r)) return cap1(r);
  const iw = item.split(/\s+/),
    lw = sig(label).filter((t) => !/^\d/.test(t));
  const idx = lw.map((t) => iw.findIndex((w) => sameWord(norm(w).replace(/[^a-z0-9%]/g, ''), t)));
  const hit = idx.filter((v) => v >= 0);
  const prefix = hit.length > 0 && hit.every((v, k) => v === k);
  let out: string[];
  if (ADJ.test(r)) {
    const last = idx.filter((v) => v >= 0).pop();
    out = last == null ? [...iw, r] : iw.map((w, k) => (k === last ? r : w));
  } else if (prefix) out = [r, ...iw.slice(hit.length)];
  else {
    const last = idx.filter((v) => v >= 0).pop();
    out = last == null ? [r] : iw.map((w, k) => (k === last ? r : w));
  }
  return cap1(
    out
      .join(' ')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim(),
  );
}

function addChoice(it: PlanOptionItem, ch: PlanOptionItem) {
  const list = (it.choices ||= []);
  const k = norm(ch.name).split(' ')[0];
  if (norm(ch.name) === norm(it.name) && ch.grams === it.grams) return;
  if (list.some((x) => norm(x.name).split(' ')[0] === k && Math.abs(x.grams - ch.grams) < 1)) return;
  list.push(ch);
}

/** Une las líneas de texto partidas por el ancho de la página. */
function paragraphs(lines: Line[]) {
  const out: Line[] = [];
  for (const L of lines) {
    const s = L.text.replace(/\s+/g, ' ').trim();
    const prev = out[out.length - 1];
    const single = L.cells.length === 1 && L.cells[0].x < 60;
    const pSingle = prev && prev.cells.length === 1 && prev.cells[0].x < 60;
    const starts = /^(\d+\.|•|[-–])/.test(s);
    if (prev && single && pSingle && !starts && (/^[a-záéíóúñ(]/.test(s) || (prev.text.length > 60 && !/[.:;)]$/.test(prev.text)))) {
      prev.text += ' ' + s;
      prev.cells[0].t = prev.text;
      continue;
    }
    out.push({ cells: L.cells.map((c) => ({ ...c })), text: s });
  }
  return out;
}

export function parseExtras(pages: Line[][], groups: PlanGroup[]) {
  const report: string[] = [];
  const notes: CoachNote[] = [];
  const lines = paragraphs(pages.flat().filter((L) => !NOISE.test(L.text.replace(/\s+/g, ' ').trim())));
  const options = groups.flatMap((g) => g.options) as Kitted[];

  // 1) Tabla de wraps
  const hi = lines.findIndex((L) => /^relleno/i.test(L.text) && /salsa/i.test(L.text) && /kcal/i.test(L.text));
  if (hi >= 0) {
    const rows: WrapRow[] = [];
    let i = hi + 1;
    for (; i < lines.length && lines[i].cells.length === 6; i++) {
      const c = lines[i].cells.map((x) => x.t);
      rows.push({ relleno: c[0], salsa: c[1], kcal: num(c[2]), c: num(c[3]), p: num(c[4]), f: num(c[5]) });
    }
    const head = lines.slice(Math.max(0, hi - 6), hi).map((L) => L.text);
    const letter = head.map((t) => t.match(/^opci[óo]n\s+([A-Z])\b/i)?.[1]).find(Boolean);
    const o = options.find((x) => /wrap/i.test(x.title || '')) || options.find((x) => x.letter === letter);
    if (o && rows.length) {
      o.__wrapRows = rows;
      const after: string[] = [];
      for (let k = i; k < lines.length && lines[k].cells.length === 1 && !/^opci[óo]n\s+[A-Z]\b|%\s*del\s*d[íi]a/i.test(lines[k].text); k++) after.push(lines[k].text);
      const intro = head.filter((t) => /^base de todos/i.test(t));
      const cheeseLine = after.find((t) => /^otros quesos/i.test(t));
      const sinLine = after.find((t) => /^sin queso/i.test(t)) || '';
      if (cheeseLine) {
        const sinPart = sinLine.match(/^sin queso:\s*(.+?)\.\s*con\s/i)?.[1] || '';
        const sinG: Record<string, number> = {};
        for (const m of sinPart.matchAll(/([a-záéíóúñ]+)\s+(\d+)\s*g/gi)) sinG[norm(m[1])] = +m[2];
        const eggs = (t: string) => (/dos huevos/i.test(t) ? 2 : /un huevo/i.test(t) ? 1 : 0);
        o.__cheese = { sin: sinG, eggsSin: eggs(sinPart), eggsWith: eggs(sinLine.replace(/^.*?con\s+[^:]+:/i, '')) };
      }
      buildWrapKit(o, rows, cheeseLine, groups);
      notes.push({ title: `Wraps · opción ${o.letter}`, lines: [...intro, ...after] });
      report.push(`${rows.length} combinaciones de wraps`);
    }
  }

  // 2) Guía, reglas y día de ejemplo
  const take = (start: number, test: (t: string) => boolean) => {
    const out: string[] = [];
    for (let k = start + 1; k < lines.length; k++) {
      const t = lines[k].text;
      if (!test(t)) break;
      out.push(t.replace(/^(\d+\.\s+|•\s*)/, ''));
    }
    return out;
  };
  const gIdx = lines.findIndex((L) => /^c[óo]mo (comprobar|usar|seguir)/i.test(L.text));
  if (gIdx >= 0) notes.push({ title: lines[gIdx].text, lines: take(gIdx, (t) => /^\d+\./.test(t)) });
  const rIdx = lines.findIndex((L) => /^reglas/i.test(L.text) && L.text.length < 40);
  if (rIdx >= 0) notes.push({ title: lines[rIdx].text, lines: take(rIdx, (t) => /^•/.test(t)) });
  const eIdx = lines.findIndex((L) => /^ejemplo de d[íi]a/i.test(L.text));
  if (eIdx >= 0) {
    const body = take(eIdx, (t) => !/^(intercambios|valores nutricionales|elige la fuente)/i.test(t));
    const disc = lines.find((L) => /^valores nutricionales aproximados/i.test(L.text));
    notes.push({ title: lines[eIdx].text.replace(/\s*:\s*/, ': '), lines: [...body.slice(0, 3), ...(disc ? [disc.text] : [])] });
  }

  // 3) Intercambios de hidratos
  const xIdx = lines.findIndex((L) => /^intercambios de hidratos/i.test(L.text));
  if (xIdx >= 0) {
    const intro: string[] = [];
    const tail: string[] = [];
    const blocks: { label: string; rows: { name: string; grams: number }[] }[] = [];
    for (let k = xIdx + 1; k < lines.length; k++) {
      const L = lines[k];
      if (/^(opci[óo]n\s+[A-Z]\b|\d+\s*%\s*del)/i.test(L.text)) break;
      if (L.cells.length === 2 && QTY.test(L.cells[1].t) && blocks.length) {
        blocks[blocks.length - 1].rows.push({ name: L.cells[0].t, grams: qty(L.cells[1].t)!.grams });
        continue;
      }
      if (L.cells.length === 1 && /\d+\s*g\b/.test(L.text) && L.text.length < 60 && k + 1 < lines.length && lines[k + 1].cells.length === 2) {
        blocks.push({ label: L.text, rows: [] });
        continue;
      }
      if (L.cells.length === 1) (blocks.length ? tail : intro).push(L.text);
    }
    const noteLines: string[] = [...intro];
    const xRefs: { line: number; shown: string; ref?: PlanOptionItem; names: string[] }[] = [];
    for (const b of blocks) {
      const base = qty(b.label);
      if (!base) continue;
      const letter = b.label.match(/\b([A-Z])\b(?!\s*\))/)?.[1];
      const words0 = sig(b.label.replace(/\(.*?\)|\d+\s*g/g, '')).filter((t) => t.length > 2 && !/^[a-z]$/.test(t));
      // candidatos: alimentos con la misma raíz; desempate por hidratos
      let bestScore = 0;
      const scored: { it: PlanOptionItem; o: PlanOption; sc: number }[] = [];
      for (const { it, o } of planItems(groups)) {
        if (letter && o.letter !== letter) continue;
        const nameHit = words0.filter((t) => sig(it.name).some((u) => sameWord(t, u))).length;
        const titleHit = words0.filter((t) => sig(o.title || '').some((u) => sameWord(t, u))).length;
        if (!nameHit) continue;
        const carb = CARBS.test(norm(it.name)) ? 8 : 0;
        const sc = nameHit * 10 + titleHit * 3 + carb + (Math.abs(it.grams - base.grams) < 1 ? 5 : 0);
        scored.push({ it, o, sc });
        bestScore = Math.max(bestScore, sc);
      }
      const top = scored.find((x) => x.sc === bestScore)?.it;
      // el mejor y los mismos alimentos en otras opciones (p. ej. el arroz de la comida B y el de los wraps)
      const targets = scored.filter((x) => !x.it.__isChoice && x.sc > 0 && (x.sc >= bestScore - 0.5 || (top && norm(x.it.name) === norm(top.name) && Math.abs(x.it.grams - top.grams) < 1)));
      targets.sort((a, b) => b.sc - a.sc);
      const ref = targets[0]?.it;
      const cap = Math.max(...b.rows.map((r) => r.grams));
      if (ref && Math.abs(ref.grams - base.grams) >= 1)
        report.push(`Intercambios de «${b.label.replace(/\s*\(.*\)/, '')}»: el PDF los calcula para ${base.grams} g y la opción lleva ${ref.grams} g → recalculados con los mismos hidratos`);
      for (const { it } of targets) {
        for (const r of b.rows) {
          const scale = it.grams / base.grams;
          const ch: PlanOptionItem = { ...blank(r.name, Math.abs(scale - 1) < 0.01 ? r.grams : Math.min(cap, r5(r.grams * scale))), __isChoice: true };
          if (Math.abs(scale - 1) >= 0.01) ch.__iso = { carbs: NaN, cap } satisfies IsoCarb;
          addChoice(it, ch);
        }
      }
      const shown = ref && Math.abs(ref.grams - base.grams) >= 1 ? b.label.replace(String(base.grams), String(ref.grams)) : b.label;
      // la línea se escribe al final (finishExtras), con los gramos ya recalculados
      noteLines.push(`${shown}: ` + b.rows.map((x) => `${x.name} ${x.grams} g`).join(' · '));
      xRefs.push({ line: noteLines.length - 1, shown, ref, names: b.rows.map((r) => r.name) });
    }
    const xn: CoachNote & { __x?: typeof xRefs } = { title: 'Intercambios de hidratos', lines: [...noteLines, ...tail], __x: xRefs };
    notes.push(xn);
    if (blocks.length) report.push(`${blocks.reduce((n, b) => n + b.rows.length, 0)} intercambios de hidratos`);
  }

  // 4) Variantes en texto: «A -> B 65 g», «Helios 90 g o Hacendado 80 g», «alternativa: …»
  let nVar = 0;
  for (const o of options) {
    const txt = (o.notes || '').replace(/^\s*variantes?\s*:\s*/i, '');
    if (!txt) continue;
    const segs = txt.split(/;|\.\s+|\.$/).map((x) => x.trim()).filter(Boolean);
    let subject: PlanOptionItem | null = null;
    for (const seg0 of segs) {
      const seg = seg0.replace(/^[A-Za-zÁÉÍÓÚáéíóúñ ]{2,20}:\s*(?=\d|[a-z])/u, (m) => (/^alternativa/i.test(m) ? m : ''));
      const arrow = seg.match(/^(.+?)\s*->\s*(.+?)$/);
      if (arrow) {
        const it = findItem(arrow[1].replace(/\d+\s*(g|ml)\b/gi, ''), groups, o);
        if (it && o.items.includes(it)) {
          const q = qty(arrow[2]);
          const name = swapName(it.name, arrow[1], arrow[2].replace(/\d+(?:[.,]\d+)?\s*(g|ml)\b/i, '').trim());
          addChoice(it, { ...blank(name, q?.grams ?? it.grams, q?.unit ?? String(it.unit || 'g')), __isChoice: true });
          nVar++;
        }
        subject = it;
        continue;
      }
      const alt = seg.match(/^alternativa\s*:\s*(.+)$/i);
      if (alt) {
        const subj = subject || [...o.items].sort((a, b) => b.grams - a.grams)[0];
        for (const part of alt[1].split(/\s+o\s+|,\s*/)) {
          const q = qty(part);
          if (!q || !subj) continue;
          const label = part.replace(/\(?\d+(?:[.,]\d+)?\s*(g|ml)\)?/i, '').replace(/^\s*\d+\s+/, '').trim();
          const known = findItem(label, groups, undefined, 0.7);
          addChoice(subj, { ...(known ? copyOf(known, q.grams) : blank(cap1(label), q.grams, q.unit)), __isChoice: true });
          nVar++;
        }
        continue;
      }
      const or = seg.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|ml)\s+o\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|ml)$/i);
      if (or) {
        const lab = or[1].replace(/^\s*\d+\s+/, '');
        const it = findItem(lab, groups, o, 0.6);
        if (it && o.items.includes(it)) {
          const repl = or[4];
          const onlyBrand = sig(repl).every((t) => BRANDS.has(t));
          let name = onlyBrand ? it.name.replace(/\b(helios|hacendado|mercadona|carrefour)\b.*$/i, '').trim() + ' ' + repl.trim() : swapName(it.name, lab, repl);
          name = name.replace(/\s+/g, ' ');
          addChoice(it, { ...blank(cap1(name), num(or[5]), or[6].toLowerCase()), __isChoice: true });
          nVar++;
        }
        subject = it;
        continue;
      }
      const first = sig(seg)[0];
      subject = (first && o.items.find((it) => sig(it.name).some((u) => sameWord(first, u)))) || null;
    }
  }
  // Nombres cortos («Mousse») → el nombre completo que ya aparece en el plan («Mousse +Proteínas Hacendado»)
  const allNames = planItems(groups).map((x) => x.it.name);
  for (const { it } of planItems(groups))
    if (it.name.split(/\s+/).length === 1) {
      const long = allNames.find((n) => n.split(/\s+/).length > 1 && norm(n).startsWith(norm(it.name)));
      if (long) it.name = long;
    }
  if (nVar) report.push(`${nVar} variantes con su alimento`);
  return { coachNotes: notes.filter((n) => n.lines.length), report };
}

function uniqueByBrand(label: string, groups: PlanGroup[]) {
  const hits = planItems(groups)
    .map((x) => x.it)
    .filter((it) => labelScore(label, it.name) >= 0.99);
  return new Set(hits.map((h) => norm(h.name))).size === 1 ? hits[0] : null;
}

function buildWrapKit(o: Kitted, rows: WrapRow[], cheeseLine: string | undefined, groups: PlanGroup[]) {
  const split = (t: string) =>
    t
      .split('+')
      .map((x) => x.trim())
      .filter(Boolean);
  const resolve = (part: string): PlanOptionItem => {
    const q = qty(part);
    const egg = /^huevo\b/i.test(part) && !q;
    const label = part.replace(/\d+(?:[.,]\d+)?\s*(g|ml)\b/i, '').trim();
    let it: PlanOptionItem | null = null;
    if (sig(label).every((t) => BRANDS.has(t))) {
      // Solo la marca: vale si nombra un único alimento («Helios»); si no («Hacendado 80 g» en la columna de salsas)
      // es la misma salsa que la otra marca de la columna.
      it = uniqueByBrand(label, groups);
      if (!it) {
        const sib = rows.map((r) => r.salsa).find((x) => x !== part && sig(x.replace(/\d+\s*g/, '')).every((t) => BRANDS.has(t)) && uniqueByBrand(x.replace(/\d+\s*g/, ''), groups));
        const sibItem = sib ? uniqueByBrand(sib.replace(/\d+\s*g/, ''), groups) : null;
        if (sibItem) return blank(sibItem.name.replace(/\s*\b(helios|hacendado|carrefour|mercadona)\b.*$/i, '') + ' ' + label.replace(/\s*\(.*?\)/, ''), q?.grams ?? 0);
      }
    } else it = findItem(label, groups, o);
    if (!it) return blank(/^(bbq|sweet|barbacoa|bolo)/i.test(label) ? 'Salsa ' + label.toLowerCase() : cap1(label), q?.grams ?? 0);
    return copyOf(it, q?.grams ?? (egg ? it.grams : it.grams));
  };
  const rellenos = [...new Set(rows.map((r) => r.relleno))];
  const salsas = [...new Set(rows.map((r) => r.salsa))];
  // Queso: la parte de los rellenos que se repite en todos (p. ej. «QuesPro 75 g»)
  const common = split(rellenos[0]).filter((p) => rellenos.every((r) => split(r).includes(p)));
  const cheesePart = cheeseLine ? common.find((p) => /ques|mozz|burrat|untar/i.test(p)) : undefined;
  const variable = new Set<string>();
  for (const r of rows) for (const p of [...split(r.relleno), r.salsa]) variable.add(norm(resolve(p).name));
  const base = o.items.filter((it) => !variable.has(norm(it.name))).map((it) => it);
  const id = (t: string) => norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const rellenoChoices: KitChoice[] = rellenos.map((r) => {
    const parts = split(r).filter((p) => p !== cheesePart);
    return { id: id(parts[0].replace(/\d+\s*g/, '')), label: cap1(parts[0].replace(/\d+(?:[.,]\d+)?\s*g\b/, '').trim()), items: parts.map(resolve) };
  });
  const salsaChoices: KitChoice[] = salsas.map((x) => {
    const it = resolve(x);
    const brandOnly = sig(x.replace(/\d+\s*g/, '')).every((t) => BRANDS.has(t));
    const label = brandOnly ? cap1(it.name.replace(/^salsa\s+/i, '').replace(/\s*\(.*?\)/g, '')) + ' ' + (qty(x)?.grams ?? '') + ' g' : x.replace(/\s*\(.*?\)/, '');
    return { id: id(label.replace(/\d+\s*g/, '')), label, items: [it] };
  });
  const slots: PlanKit['slots'] = [];
  if (cheesePart) {
    const cheeses: KitChoice[] = [{ id: id(cheesePart.replace(/\d+\s*g/, '')), label: cheesePart, items: [resolve(cheesePart)] }];
    const list = cheeseLine!.replace(/^[^:]*:\s*/, '').replace(/\.\s.*$/, '').replace(/\.$/, '');
    for (const part of list.split(/,\s*|\s+o\s+/)) {
      const t = part.replace(/\(.*?\)/g, '').trim();
      if (!t) continue;
      if (/^sin queso/i.test(t)) cheeses.push({ id: 'sin-queso', label: 'Sin queso', items: [] });
      else {
        const q = qty(t);
        const name = cap1(t.replace(/\d+(?:[.,]\d+)?\s*g\b/, '').trim());
        cheeses.push({ id: id(name), label: q ? `${name} ${q.grams} g` : name, items: [blank(name, q?.grams ?? 0)] });
      }
    }
    slots.push({ id: 'relleno', label: 'Relleno', dependsOn: 'queso', choices: rellenoChoices.map((c) => ({ id: c.id, label: c.label, by: { [cheeses[0].id]: c.items! } })) });
    slots.push({ id: 'queso', label: 'Queso', choices: cheeses });
  } else slots.push({ id: 'relleno', label: 'Relleno', choices: rellenoChoices });
  slots.push({ id: 'salsa', label: 'Salsa', choices: salsaChoices });
  o.kit = { base, slots };
}

const sum = (items: PlanOptionItem[]) =>
  items.reduce((t, i) => ({ kcal: t.kcal + (i.kcal * i.grams) / 100, c: t.c + (i.c * i.grams) / 100, p: t.p + (i.p * i.grams) / 100, f: t.f + (i.f * i.grams) / 100 }), { kcal: 0, c: 0, p: 0, f: 0 });

/** Despeja los alimentos de los wraps que faltan con los totales de la tabla del PDF (promedio de todas las filas). */
export function solveKits(groups: PlanGroup[]) {
  const out: string[] = [];
  for (const o of groups.flatMap((g) => g.options) as Kitted[]) {
    const rows = o.__wrapRows;
    if (!o.kit || !rows) continue;
    const k = o.kit;
    const rel = k.slots.find((s) => s.id === 'relleno')!;
    const sal = k.slots.find((s) => s.id === 'salsa')!;
    const ques = k.slots.find((s) => s.id === 'queso');
    const comboItems = (r: WrapRow) => {
      const ri = [...new Set(rows.map((x) => x.relleno))].indexOf(r.relleno);
      const si = [...new Set(rows.map((x) => x.salsa))].indexOf(r.salsa);
      return kitItems(k, { relleno: rel.choices[ri].id, salsa: sal.choices[si].id, ...(ques ? { queso: ques.choices[0].id } : {}) });
    };
    const trusted = (i: PlanOptionItem) => ok(i) && (i.reviewed === true || i.source === 'Calculado con los totales del PDF');
    for (let pass = 0; pass < 4; pass++) {
      const est = new Map<string, { it: PlanOptionItem[]; v: Macros[] }>();
      for (const r of rows) {
        const items = comboItems(r);
        const unknown = items.filter((i) => !trusted(i));
        const names = [...new Set(unknown.map((i) => norm(i.name)))];
        if (names.length !== 1) continue;
        const u = unknown.filter((i) => norm(i.name) === names[0]);
        const grams = u.reduce((n, i) => n + i.grams, 0);
        if (!(grams > 0)) continue;
        const known = sum(items.filter((i) => trusted(i)));
        const per = { kcal: ((r.kcal - known.kcal) * 100) / grams, c: ((r.c - known.c) * 100) / grams, p: ((r.p - known.p) * 100) / grams, f: ((r.f - known.f) * 100) / grams };
        const e = est.get(names[0]) || { it: [], v: [] };
        e.it.push(...u);
        e.v.push(per);
        est.set(names[0], e);
      }
      if (!est.size) break;
      for (const [, e] of est) {
        const avg = (key: keyof Macros) => Math.max(0, Math.round((e.v.reduce((n, v) => n + v[key], 0) / e.v.length) * 10) / 10);
        const v = { kcal: avg('kcal'), c: avg('c'), p: avg('p'), f: avg('f'), source: 'Calculado con los totales del PDF', reviewed: true };
        // el mismo alimento en todas las casillas de la combinación
        for (const s of k.slots) for (const c of s.choices) for (const it of [...(c.items || []), ...Object.values(c.by || {}).flat()]) if (e.it.some((x) => norm(x.name) === norm(it.name))) Object.assign(it, v);
      }
    }
    let good = 0;
    for (const r of rows) {
      const t = sum(comboItems(r));
      if (Math.abs(t.kcal - r.kcal) <= 3) good++;
    }
    out.push(`wraps: ${good}/${rows.length} combinaciones cuadran con el PDF`);
  }
  return out;
}

/** Último paso tras completar macros: queso sin tabla, intercambios con los mismos hidratos y texto para la versión clásica. */
export function finishExtras(groups: PlanGroup[], coachNotes?: CoachNote[]) {
  const out: string[] = [];
  const all = planItems(groups).map((x) => x.it);
  // mismo nombre → mismos valores (prioridad: calculado con el PDF > planes)
  for (const it of all) {
    if (it.source === 'Calculado con los totales del PDF') continue;
    const twin = all.find((x) => x !== it && norm(x.name) === norm(it.name) && x.source === 'Calculado con los totales del PDF');
    if (twin) Object.assign(it, { kcal: twin.kcal, c: twin.c, p: twin.p, f: twin.f, source: twin.source, reviewed: true });
  }
  for (const o of groups.flatMap((g) => g.options) as Kitted[]) {
    // Quesos alternativos de los wraps: la carne se ajusta según la proteína del queso, entre «con QuesPro» y «sin queso»
    const k = o.kit;
    const ques = k?.slots.find((s) => s.id === 'queso');
    const rel = k?.slots.find((s) => s.id === 'relleno');
    if (k && ques && rel && o.__cheese) {
      const ref = ques.choices[0].items?.[0];
      const refP = ref && ok(ref) ? (ref.p * ref.grams) / 100 : NaN;
      for (const c of rel.choices) {
        const withItems = c.by![ques.choices[0].id];
        for (const q of ques.choices.slice(1)) {
          const qi = q.items?.[0];
          const qP = qi ? (ok(qi) ? (qi.p * qi.grams) / 100 : NaN) : 0;
          const t = Number.isFinite(refP) && Number.isFinite(qP) && refP > 0 ? Math.min(1, Math.max(0, qP / refP)) : NaN; // 0 = sin queso, 1 = como el de referencia
          c.by![q.id] = withItems.map((it) => {
            const key = Object.keys(o.__cheese!.sin).find((w) => sig(it.name).some((u) => sameWord(w, u)) || (w === 'pollo' && /pechuga/i.test(it.name)));
            if (key) {
              const sinG = o.__cheese!.sin[key];
              return { ...it, grams: Number.isFinite(t) && Math.abs(it.grams - sinG) >= 1 ? r5(sinG + (it.grams - sinG) * t) : it.grams };
            }
            if (/^huevo/i.test(it.name) && o.__cheese!.eggsSin > o.__cheese!.eggsWith) {
              const n = Number.isFinite(t) ? Math.round(o.__cheese!.eggsSin + (o.__cheese!.eggsWith - o.__cheese!.eggsSin) * t) : o.__cheese!.eggsWith;
              return { ...it, grams: (it.grams / Math.max(1, o.__cheese!.eggsWith)) * n };
            }
            return it;
          });
        }
      }
      out.push(`wraps: ${rel.choices.length} rellenos × ${ques.choices.length} quesos × ${k.slots.find((s) => s.id === 'salsa')?.choices.length || 1} salsas`);
    }
    delete o.__wrapRows;
    delete o.__cheese;
  }
  // Intercambios reescalados: mismos hidratos que el alimento del plan (con tope práctico)
  for (const it of all)
    for (const ch of it.choices || []) {
      const iso = ch.__iso as IsoCarb | undefined;
      if (iso && ok(it) && ok(ch) && ch.c > 0) ch.grams = Math.min(iso.cap, r5((it.c * it.grams) / ch.c));
      delete ch.__iso;
      delete ch.__isChoice;
    }
  // (al publicar, `withOriginalFirst` añade el propio alimento al principio de `choices`, como la versión clásica)
  for (const it of all) delete it.__isChoice;
  // Notas de intercambios con los gramos definitivos
  for (const n of (coachNotes || []) as (CoachNote & { __x?: { line: number; shown: string; ref?: PlanOptionItem; names: string[] }[] })[]) {
    for (const x of n.__x || []) {
      const list = (x.ref?.choices || []).filter((c) => x.names.includes(c.name));
      if (list.length) n.lines[x.line] = `${x.shown}: ` + list.map((c) => `${c.name} ${c.grams} g`).join(' · ');
    }
    delete n.__x;
  }
  return out;
}
