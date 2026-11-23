import { useCallback, useEffect, useState } from 'react';
import { Camera, ImagePlus, Lock, Plus, Scale, Share2, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { deletePhoto, deleteWeight, getLogs, getPhotos, getWeights, photoUrl, saveWeight, uploadPhoto } from '../lib/data';
import { lastDays, short, shift, today, weekdayLetter } from '../lib/dates';
import { entriesMacros, isFood, n0, planTarget } from '../lib/nutrition';
import { errText } from '../lib/supabase';
import type { MealLog, ProgressPhoto, PublishedPlan, WeightEntry } from '../lib/types';
import { DayBars, WeightLine } from '../ui/Charts';
import { Button, Card, Label, SectionTitle, Toggle } from '../ui/kit';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { BoardHeader } from '../ui/Board';

export function Progress({ plan, uid, onError }: { plan: PublishedPlan; uid: string; onError: (m: string) => void }) {
  const toast = useToast();
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [kgOpen, setKgOpen] = useState(false);
  const [picOpen, setPicOpen] = useState(false);
  const goal = planTarget(plan.content);

  const load = useCallback(async () => {
    try {
      const [l, w, p] = await Promise.all([getLogs(plan.client_id, shift(today(), -27), today()), getWeights(plan.client_id), getPhotos(plan.client_id)]);
      setLogs(l);
      setWeights(w);
      setPhotos(p);
    } catch (e) {
      onError(errText(e));
    }
  }, [plan.client_id, onError]);
  useEffect(() => {
    load();
  }, [load]);

  const days = lastDays(today(), 14);
  const byDay = new Map(logs.map((l) => [l.log_date, l]));
  const bars = days.map((d) => {
    const l = byDay.get(d);
    return { key: d, label: weekdayLetter(d), value: entriesMacros(l?.entries).kcal, sub: short(d) };
  });
  const loggedDays = logs.filter((l) => (l.entries || []).some(isFood));
  const last7 = loggedDays.filter((l) => l.log_date > shift(today(), -7));
  const avg = last7.length ? last7.reduce((t, l) => t + entriesMacros(l.entries).kcal, 0) / last7.length : 0;
  const inRange = goal.kcal ? loggedDays.filter((l) => Math.abs(entriesMacros(l.entries).kcal - goal.kcal) <= goal.kcal * 0.1).length : 0;
  const water7 = last7.length ? last7.reduce((t, l) => t + (Number(l.water_ml) || 0), 0) / last7.length : 0;

  const current = weights[0];
  const first = weights[weights.length - 1];
  const delta = current && first ? +current.weight_kg - +first.weight_kg : 0;

  return (
    <div className="px-4">
      <BoardHeader title="Progreso" subtitle="Tu constancia, tus calorías y tu peso">
        <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat value={String(last7.length) + '/7'} label="días registrados" />
        <Stat value={avg ? n0(avg) : '—'} label="kcal media 7 d" />
        <Stat value={water7 ? (water7 / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' L' : '—'} label="agua media" />
        </div>
      </BoardHeader>

      <SectionTitle>Calorías · 14 días</SectionTitle>
      <Card>
        <DayBars data={bars} goal={goal.kcal} />
        {goal.kcal > 0 && loggedDays.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            <b className="text-ink">{inRange}</b> de {loggedDays.length} días registrados cerca de tu objetivo (±10 %).
          </p>
        )}
      </Card>

      <SectionTitle
        action={
          <Button size="sm" variant="soft" onClick={() => setKgOpen(true)} icon={<Plus className="size-4" />}>
            Peso
          </Button>
        }
      >
        Peso
      </SectionTitle>
      <Card>
        {current ? (
          <>
            <div className="flex items-end justify-between">
              <div>
                <div className="font-display text-[40px] font-extrabold leading-none tracking-tight tnum">
                  {(+current.weight_kg).toLocaleString('es-ES')}
                  <span className="ml-1 text-lg font-bold text-muted">kg</span>
                </div>
                <p className="mt-1 text-xs text-muted">Último registro · {short(current.recorded_on)}</p>
              </div>
              {weights.length > 1 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold tnum ${delta <= 0 ? 'bg-brand-soft text-brand' : 'bg-carb/15 text-carb-ink'}`}>
                  {delta <= 0 ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
                  {delta > 0 ? '+' : ''}
                  {delta.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg
                </span>
              )}
            </div>
            {weights.length > 1 && (
              <div className="mt-5">
                <WeightLine points={weights.map((w) => ({ day: w.recorded_on, kg: +w.weight_kg }))} />
              </div>
            )}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-muted">Ver todos ({weights.length})</summary>
              <ul className="mt-2 divide-y divide-line">
                {weights.map((w) => (
                  <li key={w.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="flex-1 tnum">{short(w.recorded_on)}</span>
                    <b className="tnum">{(+w.weight_kg).toLocaleString('es-ES')} kg</b>
                    {w.shared_with_coach ? <Share2 className="size-3.5 text-brand" aria-label="Compartido" /> : <Lock className="size-3.5 text-faint" aria-label="Privado" />}
                    <button
                      className="grid size-8 place-items-center rounded-full text-faint hover:text-danger"
                      aria-label="Eliminar"
                      onClick={async () => {
                        if (!confirm('¿Borrar este registro de peso?')) return;
                        try {
                          await deleteWeight(w.id);
                          load();
                        } catch (e) {
                          onError(errText(e));
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <button onClick={() => setKgOpen(true)} className="flex w-full items-center gap-4 text-left">
            <span className="grid size-12 place-items-center rounded-[12px] bg-brand-soft text-brand">
              <Scale className="size-6" />
            </span>
            <span>
              <b className="block">Anota tu primer peso</b>
              <span className="text-sm text-muted">Mejor en ayunas y a la misma hora.</span>
            </span>
          </button>
        )}
      </Card>

      <SectionTitle
        action={
          <Button size="sm" variant="soft" onClick={() => setPicOpen(true)} icon={<Camera className="size-4" />}>
            Foto
          </Button>
        }
      >
        Fotos
      </SectionTitle>
      {photos.length ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <Photo key={p.id} p={p} onDelete={async () => {
              if (!confirm('¿Eliminar esta foto?')) return;
              try {
                await deletePhoto(p);
                load();
              } catch (e) {
                onError(errText(e));
              }
            }} />
          ))}
        </div>
      ) : (
        <Card>
          <button onClick={() => setPicOpen(true)} className="flex w-full items-center gap-4 text-left">
            <span className="grid size-12 place-items-center rounded-[12px] bg-brand-soft text-brand">
              <ImagePlus className="size-6" />
            </span>
            <span>
              <b className="block">Guarda fotos de tu evolución</b>
              <span className="text-sm text-muted">Son privadas salvo que decidas compartirlas.</span>
            </span>
          </button>
        </Card>
      )}

      <WeightSheet open={kgOpen} onClose={() => setKgOpen(false)} last={current ? +current.weight_kg : undefined} save={async (day, kg, share) => {
        await saveWeight(plan, uid, day, kg, share);
        toast('Peso guardado');
        setKgOpen(false);
        load();
      }} />
      <PhotoSheet open={picOpen} onClose={() => setPicOpen(false)} save={async (day, file, note, share) => {
        await uploadPhoto(plan, uid, day, file, note, share);
        toast('Foto guardada');
        setPicOpen(false);
        load();
      }} />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[12px] bg-board-2 p-3">
      <div className="font-display text-[28px] font-extrabold leading-none tnum">{value}</div>
      <div className="mt-1 text-[12px] font-semibold leading-tight text-chalk-dim">{label}</div>
    </div>
  );
}

function Photo({ p, onDelete }: { p: ProgressPhoto; onDelete?: () => void }) {
  const [url, setUrl] = useState('');
  const [big, setBig] = useState(false);
  useEffect(() => {
    photoUrl(p.storage_path).then(setUrl).catch(() => {});
  }, [p.storage_path]);
  return (
    <>
      <button onClick={() => setBig(true)} className="relative aspect-[3/4] overflow-hidden rounded-[12px] bg-surface-2">
        {url && <img src={url} alt={'Foto del ' + p.recorded_on} className="size-full object-cover" loading="lazy" />}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-left text-[11px] font-bold text-white">{short(p.recorded_on)}</span>
      </button>
      <Sheet open={big} onClose={() => setBig(false)} title={short(p.recorded_on)}>
        {url && <img src={url} alt="" className="w-full rounded-[12px]" />}
        {p.note && <p className="mt-3 text-sm">{p.note}</p>}
        <p className="mt-2 text-xs text-muted">{p.shared_with_coach ? 'Compartida con tu coach' : 'Privada'}</p>
        {onDelete && (
          <Button variant="danger" className="mt-3 w-full" onClick={onDelete} icon={<Trash2 className="size-4" />}>
            Eliminar foto
          </Button>
        )}
      </Sheet>
    </>
  );
}
export { Photo };

function WeightSheet({ open, onClose, last, save }: { open: boolean; onClose: () => void; last?: number; save: (d: string, kg: number, share: boolean) => Promise<void> }) {
  const [kg, setKg] = useState('');
  const [day, setDay] = useState(today());
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (open) {
      setKg(last ? String(last).replace('.', ',') : '');
      setDay(today());
      setErr('');
    }
  }, [open, last]);
  const v = Number(kg.replace(',', '.'));
  return (
    <Sheet open={open} onClose={onClose} title="Registrar peso">
      <div className="flex items-baseline justify-center gap-2 py-4">
        <input className="w-40 bg-transparent text-center font-display text-6xl font-extrabold outline-none tnum" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="00,0" autoFocus />
        <span className="text-xl font-bold text-muted">kg</span>
      </div>
      <label className="block">
        <Label>Fecha</Label>
        <input type="date" className="field" value={day} max={today()} onChange={(e) => setDay(e.target.value)} />
      </label>
      <div className="mt-3">
        <Toggle checked={share} onChange={setShare} label="Compartir con mi coach" />
      </div>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      <Button
        size="lg"
        className="mt-4 w-full"
        loading={busy}
        disabled={!(v >= 15 && v <= 400)}
        onClick={async () => {
          setBusy(true);
          try {
            await save(day, v, share);
          } catch (e) {
            setErr(errText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Guardar
      </Button>
    </Sheet>
  );
}

function PhotoSheet({ open, onClose, save }: { open: boolean; onClose: () => void; save: (d: string, f: File, note: string, share: boolean) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [note, setNote] = useState('');
  const [day, setDay] = useState(today());
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreview('');
      setNote('');
      setErr('');
    }
  }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Nueva foto">
      <label className="relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-[16px] border-2 border-dashed border-line bg-surface-2">
        {preview ? <img src={preview} alt="" className="absolute inset-0 size-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-sm font-semibold text-muted"><Camera className="size-7" />Hacer o elegir foto</span>}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            setPreview(f ? URL.createObjectURL(f) : '');
          }}
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label>
          <Label>Fecha</Label>
          <input type="date" className="field" value={day} max={today()} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label>
          <Label>Nota</Label>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </label>
      </div>
      <div className="mt-3">
        <Toggle checked={share} onChange={setShare} label="Compartir con mi coach" />
      </div>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      <Button
        size="lg"
        className="mt-4 w-full"
        loading={busy}
        disabled={!file}
        onClick={async () => {
          setBusy(true);
          try {
            await save(day, file!, note, share);
          } catch (e) {
            setErr(errText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Guardar foto
      </Button>
    </Sheet>
  );
}
