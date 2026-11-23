import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Barcode, Clock, Globe, Heart, Loader2, Minus, PenLine, Plus, Search, Star } from 'lucide-react';
import { favorites, isFav, lookupBarcode, recents, remember, searchCatalog, searchLibrary, toggleFav } from '../lib/foods';
import { itemMacros, n0, n1, SLOTS, unitOf } from '../lib/nutrition';
import type { Food, LogItem } from '../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button, Chip, Label, MacroDots } from '../ui/kit';
import { useToast } from '../ui/Toast';
import { Scanner } from './Scanner';
import { NutriScore } from '../ui/Board';

type Step = { k: 'search' } | { k: 'scan' } | { k: 'manual' } | { k: 'portion'; food: Food; grams?: number };

export function AddFood({
  open,
  onClose,
  slot: initialSlot,
  onAdd,
  planFoods,
}: {
  open: boolean;
  onClose: () => void;
  slot: string;
  onAdd: (item: LogItem, slot: string) => void;
  planFoods: Food[];
}) {
  const [step, setStep] = useState<Step>({ k: 'search' });
  const [slot, setSlot] = useState(initialSlot);
  const [added, setAdded] = useState(0);

  useEffect(() => {
    if (open) {
      setStep({ k: 'search' });
      setSlot(initialSlot);
      setAdded(0);
    }
  }, [open, initialSlot]);

  const title =
    step.k === 'search' ? (
      <span>
        Añadir a <span className="text-brand">{slot.toLowerCase()}</span>
      </span>
    ) : step.k === 'scan' ? (
      'Escanear producto'
    ) : step.k === 'manual' ? (
      'Alimento personalizado'
    ) : (
      'Cantidad'
    );

  return (
    <Sheet open={open} onClose={onClose} title={title} full>
      <div className="no-scrollbar -mx-5 mb-3 flex gap-1.5 overflow-x-auto px-5">
        {SLOTS.map((s) => (
          <Chip key={s} active={slot === s} onClick={() => setSlot(s)}>
            {s}
          </Chip>
        ))}
      </div>
      {step.k !== 'search' && (
        <button onClick={() => setStep({ k: 'search' })} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
          <ArrowLeft className="size-4" /> Volver a buscar
        </button>
      )}
      {step.k === 'search' && <SearchStep planFoods={planFoods} pick={(food) => setStep({ k: 'portion', food })} scan={() => setStep({ k: 'scan' })} manual={() => setStep({ k: 'manual' })} added={added} done={onClose} />}
      {step.k === 'scan' && <ScanStep found={(food) => setStep({ k: 'portion', food })} />}
      {step.k === 'manual' && <ManualStep done={(food) => setStep({ k: 'portion', food, grams: 100 })} />}
      {step.k === 'portion' && (
        <PortionStep
          food={step.food}
          initial={step.grams}
          add={(item) => {
            onAdd(item, slot);
            remember(step.food);
            setAdded((n) => n + 1);
            setStep({ k: 'search' });
          }}
        />
      )}
    </Sheet>
  );
}

function SearchStep({ planFoods, pick, scan, manual, added, done }: { planFoods: Food[]; pick: (f: Food) => void; scan: () => void; manual: () => void; added: number; done: () => void }) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'recent' | 'fav' | 'plan'>(planFoods.length ? 'plan' : 'recent');
  const [remote, setRemote] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [remoteErr, setRemoteErr] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const local = useMemo(() => searchLibrary(q, [...favorites(), ...recents(), ...planFoods]), [q, planFoods]);

  useEffect(() => {
    setTimeout(() => input.current?.focus(), 250);
  }, []);

  useEffect(() => {
    setRemote([]);
    setRemoteErr(false);
    if (q.trim().length < 3) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setRemote(await searchCatalog(q.trim(), ctl.signal));
      } catch {
        if (!ctl.signal.aborted) setRemoteErr(true);
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctl.abort();
      setLoading(false);
    };
  }, [q]);

  const lists = { recent: recents(), fav: favorites(), plan: planFoods };

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-10 -mx-5 bg-surface px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-faint" />
          <input ref={input} className="field h-13 pl-12 pr-24 text-[16px]" placeholder="Busca: pollo, avena, yogur…" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
          <button onClick={scan} className="absolute right-1.5 top-1/2 caps flex h-10 -translate-y-1/2 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[15px] text-on-brand" aria-label="Escanear código de barras">
            <Barcode className="size-4.5" /> Escanear
          </button>
        </div>
      </div>

      {!q.trim() ? (
        <>
          <div className="flex gap-1.5">
            {planFoods.length > 0 && (
              <Chip active={tab === 'plan'} onClick={() => setTab('plan')}>
                <Star className="-mt-0.5 mr-1 inline size-3.5" />
                De mi plan
              </Chip>
            )}
            <Chip active={tab === 'recent'} onClick={() => setTab('recent')}>
              <Clock className="-mt-0.5 mr-1 inline size-3.5" />
              Recientes
            </Chip>
            <Chip active={tab === 'fav'} onClick={() => setTab('fav')}>
              <Heart className="-mt-0.5 mr-1 inline size-3.5" />
              Favoritos
            </Chip>
          </div>
          <FoodList foods={lists[tab]} pick={pick} empty={tab === 'fav' ? 'Marca con ♥ los alimentos que más uses.' : tab === 'recent' ? 'Aquí aparecerá lo que vayas añadiendo.' : ''} />
          <button onClick={manual} className="mt-4 flex w-full items-center gap-3 rounded-[12px] border border-dashed border-line p-4 text-left text-sm text-muted hover:bg-surface-2">
            <PenLine className="size-5 text-brand" />
            <span>
              <b className="block text-ink">Crear alimento personalizado</b>
              Escribe tú las kcal y macros por 100 g
            </span>
          </button>
        </>
      ) : (
        <>
          <FoodList foods={local} pick={pick} empty="" />
          <div className="mt-5 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-faint">
            <Globe className="size-3.5" /> Productos de supermercado
            {loading && <Loader2 className="size-3.5 animate-spin" />}
          </div>
          {remoteErr ? (
            <p className="px-1 py-3 text-sm text-muted">El catálogo externo no responde ahora mismo. Usa la biblioteca o escanea el producto.</p>
          ) : q.trim().length < 3 ? (
            <p className="px-1 py-3 text-sm text-muted">Escribe al menos 3 letras.</p>
          ) : (
            <FoodList foods={remote} pick={pick} empty={loading ? '' : 'Sin resultados en el catálogo.'} />
          )}
          {!local.length && !remote.length && !loading && (
            <Button variant="soft" className="mt-3 w-full" onClick={manual} icon={<PenLine className="size-4" />}>
              Crear «{q.trim()}»
            </Button>
          )}
        </>
      )}

      <AnimatePresence>
        {added > 0 && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg bg-gradient-to-t from-surface via-surface to-transparent px-5 pb-5 pt-6 safe-b">
            <Button size="lg" className="w-full" onClick={done}>
              Listo · {added} {added === 1 ? 'alimento añadido' : 'alimentos añadidos'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FoodList({ foods, pick, empty }: { foods: Food[]; pick: (f: Food) => void; empty: string }) {
  if (!foods.length) return empty ? <p className="px-1 py-6 text-center text-sm text-muted">{empty}</p> : null;
  return (
    <ul className="mt-2 divide-y divide-line">
      {foods.map((f, i) => (
        <li key={(f.id || f.name) + i}>
          <button onClick={() => pick(f)} className="flex w-full items-center gap-3 py-3 text-left">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold">
                {f.name}
                <NutriScore grade={f.nutriscore} />
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                {f.brand && <span className="truncate">{f.brand} ·</span>}
                <span className="tnum">{n0(f.kcal)} kcal/100</span>
                <MacroDots c={f.c} p={f.p} f={f.f} />
              </div>
            </div>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <Plus className="size-4.5" />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ScanStep({ found }: { found: (f: Food) => void }) {
  const [state, setState] = useState<'scan' | 'loading' | 'none'>('scan');
  const [code, setCode] = useState('');
  const toast = useToast();
  const onCode = useCallback(
    async (c: string) => {
      setCode(c);
      setState('loading');
      try {
        const f = await lookupBarcode(c);
        if (f) found(f);
        else setState('none');
      } catch {
        toast('No se pudo consultar el código', { bad: true });
        setState('scan');
      }
    },
    [found, toast],
  );
  if (state === 'loading') return <div className="flex flex-col items-center gap-3 py-16 text-muted"><Loader2 className="size-6 animate-spin text-brand" />Buscando {code}…</div>;
  if (state === 'none')
    return (
      <div className="py-8 text-center">
        <p className="font-semibold">No encontramos el código {code}</p>
        <p className="mt-1 text-sm text-muted">Puedes buscarlo por nombre o crearlo con los datos de la etiqueta.</p>
        <Button variant="soft" className="mt-4" onClick={() => setState('scan')}>
          Probar otra vez
        </Button>
      </div>
    );
  return <Scanner onCode={onCode} />;
}

function ManualStep({ done }: { done: (f: Food) => void }) {
  const [v, setV] = useState({ name: '', kcal: '', c: '', p: '', f: '' });
  const num = (s: string) => Number(String(s).replace(',', '.'));
  const ok = v.name.trim() && ['c', 'p', 'f'].every((k) => num(v[k as 'c']) >= 0 && num(v[k as 'c']) <= 100 && v[k as 'c'] !== '');
  const kcal = v.kcal !== '' ? num(v.kcal) : 4 * (num(v.c) + num(v.p)) + 9 * num(v.f);
  const F = (k: keyof typeof v, label: string, ph: string) => (
    <label>
      <Label>{label}</Label>
      <input className="field tnum" inputMode="decimal" placeholder={ph} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="space-y-3">
      <label className="block">
        <Label>Nombre</Label>
        <input className="field" placeholder="Ej. Tortilla de mi madre" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </label>
      <p className="px-1 text-xs text-muted">Valores por 100 g (míralos en la etiqueta).</p>
      <div className="grid grid-cols-2 gap-3">
        {F('c', 'Hidratos (g)', '0')}
        {F('p', 'Proteínas (g)', '0')}
        {F('f', 'Grasas (g)', '0')}
        {F('kcal', 'Kcal', isFinite(kcal) ? String(Math.round(kcal)) : 'auto')}
      </div>
      <Button size="lg" className="mt-2 w-full" disabled={!ok} onClick={() => done({ name: v.name.trim(), kcal: Math.round(kcal * 10) / 10, c: num(v.c), p: num(v.p), f: num(v.f), source: 'Personalizado' })}>
        Continuar
      </Button>
    </div>
  );
}

export function PortionStep({ food, initial, add, cta = 'Añadir' }: { food: Food; initial?: number; add: (i: LogItem) => void; cta?: string }) {
  const unit = unitOf(food.name);
  const [g, setG] = useState(String(initial ?? (food.portion && food.portion !== 100 ? food.portion : 100)));
  const [fav, setFav] = useState(isFav(food));
  const grams = Math.max(0, Math.min(2500, Number(String(g).replace(',', '.')) || 0));
  const m = itemMacros({ grams, kcal: food.kcal, c: food.c, p: food.p, f: food.f });
  const chips = Array.from(new Set([food.portion && food.portion !== 100 ? food.portion : null, 50, 100, 150, 200].filter(Boolean) as number[]));
  const step = grams >= 100 ? 10 : 5;
  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="caps text-2xl leading-tight">{food.name}</h3>
          <p className="mt-1 text-xs text-muted">
            {food.brand ? food.brand + ' · ' : ''}
            {food.source || 'Biblioteca'} · {n0(food.kcal)} kcal/100 {unit}
          </p>
        </div>
        <button onClick={() => setFav(toggleFav(food))} className={`grid size-10 shrink-0 place-items-center rounded-full ${fav ? 'bg-fat/15 text-fat-ink' : 'bg-surface-2 text-faint'}`} aria-label="Favorito" aria-pressed={fav}>
          <Heart className={`size-5 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button onClick={() => setG(String(Math.max(0, grams - step)))} className="grid size-14 place-items-center rounded-full bg-surface-2 transition-transform active:scale-95" aria-label="Menos">
          <Minus className="size-6" />
        </button>
        <div className="flex items-baseline gap-1">
          <input
            className="w-32 bg-transparent text-center font-display text-6xl font-extrabold tracking-tight outline-none tnum"
            inputMode="decimal"
            value={g}
            onChange={(e) => setG(e.target.value.replace(/[^\d.,]/g, ''))}
            onFocus={(e) => e.target.select()}
            aria-label={'Cantidad en ' + unit}
          />
          <span className="text-xl font-bold text-muted">{unit}</span>
        </div>
        <button onClick={() => setG(String(grams + step))} className="grid size-14 place-items-center rounded-full bg-surface-2 transition-transform active:scale-95" aria-label="Más">
          <Plus className="size-6" />
        </button>
      </div>
      {food.portionLabel && <p className="mt-1 text-center text-xs text-muted">Ración habitual: {food.portion} {unit} ({food.portionLabel})</p>}
      <div className="mt-4 flex justify-center gap-2">
        {chips.map((c) => (
          <Chip key={c} active={grams === c} onClick={() => setG(String(c))}>
            {c} {unit}
          </Chip>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2 rounded-[16px] bg-surface-2 p-4 text-center">
        <div>
          <div className="font-display text-2xl font-bold tnum">{n0(m.kcal)}</div>
          <div className="text-[11px] font-semibold text-muted">kcal</div>
        </div>
        {(
          [
            ['c', 'Hidratos', 'bg-carb'],
            ['p', 'Proteínas', 'bg-prot'],
            ['f', 'Grasas', 'bg-fat'],
          ] as const
        ).map(([k, l, bg]) => (
          <div key={k}>
            <div className="font-display text-2xl font-bold tnum">{n1(m[k])}</div>
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted">
              <i className={`size-1.5 rounded-full ${bg}`} />
              {l}
            </div>
          </div>
        ))}
      </div>

      <Button
        size="lg"
        className="mt-5 w-full"
        disabled={!(grams > 0)}
        onClick={() =>
          add({ name: food.name, grams, kcal: +food.kcal || 0, c: +food.c || 0, p: +food.p || 0, f: +food.f || 0, brand: food.brand || '', source: food.source || '', portion: food.portion, portionLabel: food.portionLabel || '', ...(food.nutriscore ? { nutriscore: food.nutriscore } : {}) })
        }
      >
        {cta}
      </Button>
    </div>
  );
}
