import type { CoachClient, LogEntry, LogItem, Macros, PlanContent, PlanOption } from './types';

export const ZERO: Macros = { kcal: 0, c: 0, p: 0, f: 0 };

export const n0 = (v: unknown) => Math.round(Number(v) || 0).toLocaleString('es-ES');
export const n1 = (v: unknown) => (Math.round((Number(v) || 0) * 10) / 10).toLocaleString('es-ES');

export function itemMacros(i: Pick<LogItem, 'grams' | 'kcal' | 'c' | 'p' | 'f'>): Macros {
  const g = Number(i.grams) || 0;
  return { kcal: ((+i.kcal || 0) * g) / 100, c: ((+i.c || 0) * g) / 100, p: ((+i.p || 0) * g) / 100, f: ((+i.f || 0) * g) / 100 };
}

export function add(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, c: a.c + b.c, p: a.p + b.p, f: a.f + b.f };
}

export function itemsMacros(items: LogItem[] | undefined): Macros {
  return (items || []).reduce<Macros>((t, i) => add(t, itemMacros(i)), { ...ZERO });
}

export const isFood = (e: LogEntry) => !!e && e.kind !== 'activity' && e.status !== 'skipped';

export function entriesMacros(entries: LogEntry[] | undefined): Macros {
  return (entries || []).filter(isFood).reduce<Macros>((t, e) => add(t, itemsMacros(e.items)), { ...ZERO });
}

export function optionMacros(o: PlanOption): Macros {
  return itemsMacros(o.items as LogItem[]);
}

export const SLOTS = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena', 'Recena'] as const;

export const norm = (s: unknown) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function slotOf(e: LogEntry): string {
  if (e.freeEntry) return e.mealSlot || 'Otra';
  const m = String(e.meal || '');
  for (const s of SLOTS) if (norm(m).startsWith(norm(s))) return s;
  return m || 'Otra';
}

/** Hora → comida sugerida al abrir "Añadir". */
export function slotForNow(d = new Date()): string {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return 'Desayuno';
  if (h < 12.5) return 'Media mañana';
  if (h < 16.5) return 'Comida';
  if (h < 19.5) return 'Merienda';
  if (h < 22.5) return 'Cena';
  return 'Recena';
}

export function planTarget(c: PlanContent | null | undefined): Macros {
  const t = (c?.target || {}) as Partial<Macros>;
  const kcal = +(t.kcal || c?.targets?.kcal || 0) || 0;
  let cc = +(t.c || 0),
    p = +(t.p || 0),
    f = +(t.f || 0);
  if (!t.c && c?.targets?.carbPercent && kcal) {
    cc = (kcal * c.targets.carbPercent) / 400;
    p = (kcal * (c.targets.proteinPercent || 0)) / 400;
    f = (kcal * (c.targets.fatPercent || 0)) / 900;
  }
  return { kcal, c: cc, p, f };
}

export const unitOf = (name: string) => (/leche|zumo|bebida|cerveza|vino|refresco|batido|k[ée]fir|caldo/i.test(name) ? 'ml' : 'g');

// --- Cálculo de objetivos (Harris-Benedict, igual que la app clásica) ---
export function bmr(c: CoachClient): number {
  const w = +(c.weight || 0),
    h = +(c.height || 0),
    a = +(c.age || 0),
    male = c.sex !== 'female',
    rev = c.formula !== 'original';
  if (!(a >= 18 && a <= 110 && w > 0 && h > 0)) return NaN;
  return rev
    ? male
      ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
      : 447.593 + 9.247 * w + 3.098 * h - 4.33 * a
    : male
      ? 66.473 + 13.7516 * w + 5.0033 * h - 6.755 * a
      : 655.0955 + 9.5634 * w + 1.8496 * h - 4.6756 * a;
}

export function targetFor(c: CoachClient): Macros | null {
  let kcal = Number(c.targetKcal);
  if (!(kcal > 0)) {
    const b = bmr(c);
    kcal = b * (+(c.activity || 1.55) || 1.55) * (1 + (+(c.goal || 0) || 0) / 100);
  }
  if (!(kcal > 0) || !isFinite(kcal)) return null;
  kcal = Math.round(kcal);
  return {
    kcal,
    c: Math.round((kcal * (+(c.carbPct || 0) || 0)) / 400),
    p: Math.round((kcal * (+(c.proteinPct || 0) || 0)) / 400),
    f: Math.round((kcal * (+(c.fatPct || 0) || 0)) / 900),
  };
}

export const MACRO_META = [
  { key: 'c', label: 'Hidratos', short: 'HC', color: 'var(--c-carb)' },
  { key: 'p', label: 'Proteínas', short: 'P', color: 'var(--c-prot)' },
  { key: 'f', label: 'Grasas', short: 'G', color: 'var(--c-fat)' },
] as const;
