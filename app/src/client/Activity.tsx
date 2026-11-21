import { useEffect, useState } from 'react';
import { Footprints, Plus, Trash2 } from 'lucide-react';
import { n0 } from '../lib/nutrition';
import type { LogEntry } from '../lib/types';
import { Button, Card, Chip, Label } from '../ui/kit';
import { Sheet } from '../ui/Sheet';

// Mismo formato que la versión clásica (entrada kind:'activity' dentro de nutriplan_meal_logs.entries).
export type Session = { type: string; minutes: number; intensity: string; note?: string };
export type ActivityEntry = LogEntry & { kind: 'activity'; steps: number | null; activities: Session[] };

export const ACTIVITY_TYPES = [
  'Fuerza / gimnasio',
  'Pádel · Partido',
  'Pádel · Entrenamiento',
  'Pádel · Clase impartida',
  'Caminar',
  'Carrera',
  'Bicicleta',
  'Natación',
  'Fútbol',
  'Movilidad / Pilates',
  'Otra actividad',
];
const INTENSITY = ['Suave', 'Moderada', 'Alta'];

export const findActivity = (entries: LogEntry[]) => entries.find((e) => e?.kind === 'activity') as ActivityEntry | undefined;

export function buildActivity(steps: number | null, activities: Session[]): ActivityEntry | null {
  if (steps === null && !activities.length) return null;
  return { kind: 'activity', meal: '__actividad_y_pasos', letter: 'Actividad', status: 'activity', items: [], steps, activities, updatedAt: new Date().toISOString() };
}

export function ActivityCard({ entry, save }: { entry?: ActivityEntry; save: (a: ActivityEntry | null) => void }) {
  const [open, setOpen] = useState(false);
  const steps = entry?.steps ?? null;
  const acts = entry?.activities || [];
  const minutes = acts.reduce((t, a) => t + (+a.minutes || 0), 0);
  return (
    <Card className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Footprints className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[17px] font-bold">Actividad</h2>
            <p className="truncate text-xs font-semibold text-muted tnum">
              {steps === null && !acts.length ? 'Pasos y entrenamientos del día' : [steps !== null ? `${n0(steps)} pasos` : null, acts.length ? `${acts.length} ${acts.length === 1 ? 'sesión' : 'sesiones'} · ${minutes} min` : null].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <Button size="sm" variant="soft" onClick={() => setOpen(true)}>
          {steps === null && !acts.length ? 'Anotar' : 'Editar'}
        </Button>
      </div>
      {acts.length > 0 && (
        <ul className="mt-3 space-y-1">
          {acts.map((a, i) => (
            <li key={i} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{a.type}</span>
              <span className="shrink-0 text-muted tnum">
                {a.minutes} min · {a.intensity}
              </span>
            </li>
          ))}
        </ul>
      )}
      <ActivitySheet open={open} onClose={() => setOpen(false)} entry={entry} save={(a) => { save(a); setOpen(false); }} />
    </Card>
  );
}

function ActivitySheet({ open, onClose, entry, save }: { open: boolean; onClose: () => void; entry?: ActivityEntry; save: (a: ActivityEntry | null) => void }) {
  const [steps, setSteps] = useState('');
  const [acts, setActs] = useState<Session[]>([]);
  const [draft, setDraft] = useState<Session>({ type: ACTIVITY_TYPES[0], minutes: 60, intensity: 'Moderada', note: '' });
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    setSteps(entry?.steps != null ? String(entry.steps) : '');
    setActs(entry?.activities ? JSON.parse(JSON.stringify(entry.activities)) : []);
    setErr('');
  }, [open, entry]);

  function commit() {
    const raw = steps.trim();
    const n = raw === '' ? null : Math.round(Number(raw.replace(/\D/g, '')));
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 100000)) return setErr('Revisa el número de pasos (0–100.000).');
    save(buildActivity(n, acts));
  }

  return (
    <Sheet open={open} onClose={onClose} title="Actividad del día">
      <label className="block">
        <Label>Pasos</Label>
        <input className="field tnum" inputMode="numeric" placeholder="Ej. 8500" value={steps} onChange={(e) => setSteps(e.target.value.replace(/[^\d.]/g, ''))} />
      </label>

      <h3 className="mt-6 px-1 text-[13px] font-semibold text-muted">Entrenamientos</h3>
      {acts.length > 0 && (
        <ul className="mt-2 space-y-2">
          {acts.map((a, i) => (
            <li key={i} className="flex items-center gap-2 rounded-2xl bg-surface-2 py-2 pl-3 pr-1">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{a.type}</span>
                <span className="block text-xs text-muted tnum">
                  {a.minutes} min · {a.intensity}
                  {a.note ? ' · ' + a.note : ''}
                </span>
              </span>
              <button onClick={() => setActs(acts.filter((_, k) => k !== i))} className="grid size-10 place-items-center rounded-full text-muted hover:text-danger" aria-label={'Quitar ' + a.type}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 rounded-3xl border border-line p-3">
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
          {ACTIVITY_TYPES.map((t) => (
            <Chip key={t} active={draft.type === t} onClick={() => setDraft({ ...draft, type: t })}>
              {t}
            </Chip>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label>
            <Label>Minutos</Label>
            <input className="field tnum" inputMode="numeric" value={draft.minutes || ''} onChange={(e) => setDraft({ ...draft, minutes: Math.min(1440, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
          </label>
          <label>
            <Label>Intensidad</Label>
            <select className="field appearance-none" value={draft.intensity} onChange={(e) => setDraft({ ...draft, intensity: e.target.value })}>
              {INTENSITY.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block">
          <Label hint="opcional">Notas</Label>
          <input className="field" maxLength={300} placeholder="Ej. partido intenso, piernas cargadas" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </label>
        <Button
          variant="soft"
          className="mt-3 w-full"
          disabled={!(draft.minutes >= 1)}
          icon={<Plus className="size-4" />}
          onClick={() => {
            setActs([...acts, { ...draft, note: (draft.note || '').trim().slice(0, 300) }]);
            setDraft({ ...draft, note: '' });
          }}
        >
          Añadir entrenamiento
        </Button>
      </div>
      {err && <p className="mt-3 px-1 text-sm text-danger">{err}</p>}
      <Button size="lg" className="mt-5 w-full" onClick={commit}>
        Guardar actividad
      </Button>
    </Sheet>
  );
}
