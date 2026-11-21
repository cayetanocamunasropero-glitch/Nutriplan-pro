import raw from '../data/foods.txt?raw';
import { ORIGIN } from './supabase';
import { norm } from './nutrition';
import type { Food } from './types';

/** Biblioteca NutriPlan: 215 alimentos con valores medios por 100 g. */
export const LIBRARY: Food[] = raw
  .split('\n')
  .filter(Boolean)
  .map((l, i) => {
    const x = l.split('|');
    return { id: 'b' + i, name: x[0], kcal: +x[1], c: +x[2], p: +x[3], f: +x[4], portion: +x[5] || 100, portionLabel: x[6] || '', source: 'Biblioteca NutriPlan' };
  });

export function searchLibrary(q: string, extra: Food[] = []): Food[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const pool = [...extra, ...LIBRARY];
  const seen = new Set<string>();
  return pool
    .map((f) => {
      const n = norm(f.name + ' ' + (f.brand || ''));
      if (!words.every((w) => n.includes(w))) return null;
      const score = (n.startsWith(words[0]) ? 0 : 1) + n.length / 100;
      return { f, score };
    })
    .filter((x): x is { f: Food; score: number } => !!x)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.f)
    .filter((f) => {
      const k = norm(f.name);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 30);
}

type OFFProduct = { code?: string; product_name_es?: string; product_name?: string; brands?: string; nutriments?: Record<string, unknown>; serving_size?: string; quantity?: string };

export function fromOFF(p: OFFProduct | null | undefined): Food | null {
  if (!p) return null;
  const z = p.nutriments || {};
  const g = (...keys: string[]) => {
    for (const k of keys) {
      const v = z[k];
      if (v !== null && v !== undefined && v !== '' && isFinite(+v!) && +v! >= 0) return +v!;
    }
    return null;
  };
  let kcal = g('energy-kcal_100g', 'energy-kcal');
  const kj = g('energy_100g', 'energy-kj_100g');
  const c = g('carbohydrates_100g'),
    pr = g('proteins_100g'),
    f = g('fat_100g');
  if (kcal === null && kj !== null) kcal = kj / 4.184;
  if (kcal === null && c !== null && pr !== null && f !== null) kcal = 4 * (c + pr) + 9 * f;
  const name = (p.product_name_es || p.product_name || '').trim();
  if (!name || kcal === null || c === null || pr === null || f === null) return null;
  const serving = parseFloat(String(p.serving_size || '').replace(',', '.'));
  return {
    id: 'off' + (p.code || name),
    name,
    brand: (p.brands || '').split(',')[0].trim(),
    kcal: Math.round(kcal * 10) / 10,
    c,
    p: pr,
    f,
    portion: serving > 0 && serving < 1000 ? serving : 100,
    portionLabel: serving > 0 ? 'ración del envase' : '',
    source: 'Open Food Facts',
  };
}

const OFF_FIELDS = 'code,product_name_es,product_name,brands,stores,nutriments,serving_size,quantity,nutrition_data_per';

/** Primero el proxy propio (/api/foods, en Vercel). Si no existe (p. ej. GitHub Pages), Open Food Facts directo. */
async function offQuery(params: Record<string, string>, signal?: AbortSignal): Promise<{ products?: OFFProduct[]; product?: OFFProduct | null }> {
  try {
    const r = await fetch(ORIGIN + '/api/foods?' + new URLSearchParams(params), { headers: { Accept: 'application/json' }, signal });
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) return await r.json();
  } catch (e) {
    if (signal?.aborted) throw e;
  }
  const url = params.barcode
    ? 'https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(params.barcode) + '?fields=' + OFF_FIELDS
    : 'https://world.openfoodfacts.org/cgi/search.pl?' + new URLSearchParams({ search_terms: params.q, search_simple: '1', action: 'process', json: '1', page_size: '20', fields: OFF_FIELDS });
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  if (!r.ok) throw new Error('Catálogo no disponible');
  const v = await r.json();
  return params.barcode ? { product: v.status === 1 ? v.product : null } : { products: v.products || [] };
}

export async function searchCatalog(q: string, signal?: AbortSignal): Promise<Food[]> {
  const v = await offQuery({ q }, signal);
  return (v.products || []).map(fromOFF).filter((x): x is Food => !!x);
}

export async function lookupBarcode(code: string): Promise<Food | null> {
  const v = await offQuery({ barcode: code });
  return fromOFF(v.product);
}

// --- Recientes y favoritos (por dispositivo) ---
const RK = 'npd-recents'; // misma clave que la app clásica
const FK = 'np2-favs';
const read = (k: string): Food[] => {
  try {
    return JSON.parse(localStorage.getItem(k) || '[]');
  } catch {
    return [];
  }
};
const write = (k: string, v: Food[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* almacenamiento no disponible */
  }
};
export const recents = () => read(RK);
export function remember(f: Food) {
  write(RK, [f, ...recents().filter((x) => x.name !== f.name)].slice(0, 30));
}
export const favorites = () => read(FK);
export const isFav = (f: Food) => favorites().some((x) => x.name === f.name);
export function toggleFav(f: Food) {
  const has = isFav(f);
  write(FK, has ? favorites().filter((x) => x.name !== f.name) : [f, ...favorites()].slice(0, 60));
  return !has;
}
