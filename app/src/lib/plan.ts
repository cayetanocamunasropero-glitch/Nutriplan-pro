// Opciones que se arman eligiendo (wraps, pizzas con queso a elegir) e intercambios de alimentos.
import type { PlanKit, PlanOption, PlanOptionItem } from './types';

export type KitSel = Record<string, string>;

export const kitDefault = (k: PlanKit): KitSel => Object.fromEntries(k.slots.map((s) => [s.id, s.choices[0]?.id || '']));

const choiceOf = (k: PlanKit, sel: KitSel, slotId: string) => {
  const s = k.slots.find((x) => x.id === slotId);
  return s ? s.choices.find((c) => c.id === sel[s.id]) || s.choices[0] : undefined;
};

/** Alimentos de la combinación elegida, en el orden del plato. */
export function kitItems(k: PlanKit, sel: KitSel): PlanOptionItem[] {
  const out = [...k.base];
  const tail: PlanOptionItem[] = [];
  // Las casillas con posición se insertan de atrás hacia delante para no mover los índices.
  const placed = k.slots.map((s, i) => ({ s, i })).sort((a, b) => (b.s.at ?? -1) - (a.s.at ?? -1));
  const bySlot = new Map<string, PlanOptionItem[]>();
  for (const s of k.slots) {
    const ch = choiceOf(k, sel, s.id);
    if (!ch) continue;
    const dep = s.dependsOn ? sel[s.dependsOn] || choiceOf(k, sel, s.dependsOn)?.id : undefined;
    bySlot.set(s.id, (dep && ch.by?.[dep]) || ch.items || ch.by?.default || []);
  }
  for (const { s } of placed) {
    const items = bySlot.get(s.id) || [];
    if (s.at != null) out.splice(Math.min(s.at, out.length), 0, ...items);
  }
  for (const s of k.slots) if (s.at == null) tail.push(...(bySlot.get(s.id) || []));
  return [...out, ...tail];
}

export const kitLabel = (k: PlanKit, sel: KitSel) =>
  k.slots
    .map((s) => choiceOf(k, sel, s.id)?.label)
    .filter(Boolean)
    .join(' · ');

/** Todas las combinaciones posibles (para resúmenes y comprobaciones). */
export function kitCombos(k: PlanKit): KitSel[] {
  let out: KitSel[] = [{}];
  for (const s of k.slots) out = out.flatMap((sel) => s.choices.map((c) => ({ ...sel, [s.id]: c.id })));
  return out;
}

/** Alimentos que puede mostrar una opción: los de la combinación o los fijos. */
export const optionItems = (o: PlanOption, sel?: KitSel) => (o.kit ? kitItems(o.kit, sel || kitDefault(o.kit)) : o.items);

/** Cada alimento con sus intercambios (el original primero). */
export const swapList = (it: PlanOptionItem): PlanOptionItem[] => {
  const orig = (it.__orig as PlanOptionItem | undefined) || it;
  return [orig, ...(orig.choices || []), ...(orig.alternatives || [])].filter((x, i, a) => x?.name && a.findIndex((y) => y.name === x.name && y.grams === x.grams) === i);
};

/** Aplica los intercambios elegidos (por nombre del alimento original). */
export function applySwaps(items: PlanOptionItem[], swaps: Record<string, string>): PlanOptionItem[] {
  return items.map((it) => {
    const want = swaps[it.name];
    if (!want) return it;
    const alt = swapList(it).find((x) => x.name === want);
    return alt && alt !== it ? { ...alt, __orig: it } : it;
  });
}

/** Recorre todos los alimentos de una opción (fijos, intercambios y combinaciones). */
export function eachItem(o: PlanOption, fn: (it: PlanOptionItem) => void) {
  const visit = (it: PlanOptionItem) => {
    fn(it);
    (it.choices || []).forEach(fn);
  };
  o.items.forEach(visit);
  if (o.kit) {
    o.kit.base.forEach(visit);
    for (const s of o.kit.slots) for (const c of s.choices) [...(c.items || []), ...Object.values(c.by || {}).flat()].forEach(visit);
  }
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Formato de la versión clásica: `choices` empieza por el propio alimento (así se puede volver a él). Se rehace al publicar. */
export function withOriginalFirst(it: PlanOptionItem): PlanOptionItem {
  const alts = (it.choices || []).filter((c) => !same(c.name, it.name));
  const { choices: _c, alternativesText: _t, ...self } = it;
  void _c;
  void _t;
  if (!alts.length) return self;
  return { ...self, choices: [{ ...self }, ...alts], alternativesText: alts.map((c) => `${c.name} ${c.grams} ${c.unit || 'g'}`).join(' / ') };
}

/** Aplica `withOriginalFirst` a todos los alimentos de una opción (también a los de sus combinaciones). */
export function normalizeOption(o: PlanOption): PlanOption {
  const fix = (xs?: PlanOptionItem[]) => xs?.map(withOriginalFirst);
  const kit = o.kit && {
    base: fix(o.kit.base)!,
    slots: o.kit.slots.map((s) => ({ ...s, choices: s.choices.map((c) => ({ ...c, ...(c.items ? { items: fix(c.items) } : {}), ...(c.by ? { by: Object.fromEntries(Object.entries(c.by).map(([k, v]) => [k, fix(v)!])) } : {}) })) })),
  };
  return { ...o, ...(kit ? { kit, items: kitItems(kit, {}) } : { items: fix(o.items)! }) };
}
