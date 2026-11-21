import { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList, Droplets, HeartPulse, MessageSquareText } from 'lucide-react';
import { coachOnboarding, getPhotos, getWeights } from '../lib/data';
import { lastDays, pretty, short, today, weekdayLetter } from '../lib/dates';
import { entriesMacros, isFood, n0, planTarget } from '../lib/nutrition';
import type { CoachClient, ProgressPhoto, WeightEntry } from '../lib/types';
import { DayBars, WeightLine } from '../ui/Charts';
import { Card, Chip, IconButton, SectionTitle } from '../ui/kit';
import { Photo } from '../client/Progress';
import { SURVEY } from '../client/survey';
import type { Row } from './CoachApp';
import { DiaryTab } from './DiaryTab';
import { PlanTab } from './PlanTab';
import { ProfileTab } from './ProfileTab';
import { AccessTab } from './AccessTab';

type Tab = 'summary' | 'diary' | 'plan' | 'profile' | 'access';
export type Toast = (t: string, o?: { bad?: boolean }) => void;

export function ClientDetail({ row, back, saveClient, reload, toast }: { row: Row; back: () => void; saveClient: (c: CoachClient) => Promise<void>; reload: () => void; toast: Toast }) {
  const [tab, setTab] = useState<Tab>('summary');
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const tabs: { id: Tab; label: string }[] = [
    { id: 'summary', label: 'Resumen' },
    { id: 'diary', label: 'Diario' },
    { id: 'plan', label: 'Plan' },
    { id: 'profile', label: 'Ficha' },
    { id: 'access', label: 'Acceso' },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 lg:px-8">
      <div className="flex items-center gap-2">
        <IconButton onClick={back} className="lg:hidden" aria-label="Volver">
          <ArrowLeft className="size-5" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[28px] font-extrabold leading-tight tracking-tight">{row.c.name}</h1>
          <p className="text-sm text-muted">
            {row.status === 'linked' ? 'Usa la app' : row.status === 'pending' ? 'Invitación pendiente de activar' : 'Todavía sin acceso a la app'}
            {row.pub?.content?.title ? ' · ' + row.pub.content.title : ''}
          </p>
        </div>
      </div>
      <div className="no-scrollbar sticky top-0 z-20 -mx-4 mt-4 flex gap-1.5 overflow-x-auto bg-bg/90 px-4 py-2 backdrop-blur lg:-mx-8 lg:px-8">
        {tabs.map((t) => (
          <Chip key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>
      <div className="mt-2">
        {tab === 'summary' && (
          <Summary
            row={row}
            pick={(d) => {
              setFocusDay(d);
              setTab('diary');
            }}
          />
        )}
        {tab === 'diary' && <DiaryTab row={row} focus={focusDay} />}
        {tab === 'plan' && <PlanTab row={row} reload={reload} toast={toast} />}
        {tab === 'profile' && <ProfileTab row={row} save={saveClient} reload={reload} toast={toast} />}
        {tab === 'access' && <AccessTab row={row} reload={reload} toast={toast} />}
      </div>
    </div>
  );
}

function Summary({ row, pick }: { row: Row; pick: (d: string) => void }) {
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [ob, setOb] = useState<Awaited<ReturnType<typeof coachOnboarding>> | null>(null);
  useEffect(() => {
    getWeights(row.c.id).then(setWeights).catch(() => {});
    getPhotos(row.c.id, 24).then(setPhotos).catch(() => {});
    if (row.pub?.client_uid) coachOnboarding(row.pub.client_uid).then(setOb).catch(() => {});
  }, [row.c.id, row.pub?.client_uid]);

  const goal = planTarget(row.pub?.content);
  const days = lastDays(today(), 14);
  const by = new Map(row.logs.map((l) => [l.log_date, l]));
  const bars = days.map((d) => ({ key: d, label: weekdayLetter(d), value: entriesMacros(by.get(d)?.entries).kcal, sub: short(d) }));
  const logged = row.logs.filter((l) => (l.entries || []).some(isFood));
  const l14 = logged.filter((l) => days.includes(l.log_date));
  const avg = l14.length ? l14.reduce((t, l) => t + entriesMacros(l.entries).kcal, 0) / l14.length : 0;
  const avgP = l14.length ? l14.reduce((t, l) => t + entriesMacros(l.entries).p, 0) / l14.length : 0;
  const water = l14.length ? l14.reduce((t, l) => t + (Number(l.water_ml) || 0), 0) / l14.length : 0;
  const shared = weights.filter((w) => w.shared_with_coach !== false);
  const delta = shared.length > 1 ? +shared[0].weight_kg - +shared[shared.length - 1].weight_kg : 0;
  const notes = row.logs.filter((l) => l.day_notes?.trim()).slice(0, 6);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat value={`${l14.length}/14`} label="días registrados" />
        <Stat value={avg ? n0(avg) : '—'} label={goal.kcal ? `kcal media · obj. ${n0(goal.kcal)}` : 'kcal media'} tone={goal.kcal && avg ? (Math.abs(avg / goal.kcal - 1) <= 0.1 ? 'ok' : 'warn') : undefined} />
        <Stat value={avgP ? n0(avgP) + ' g' : '—'} label={goal.p ? `proteína · obj. ${n0(goal.p)} g` : 'proteína media'} />
        <Stat value={shared.length ? `${delta > 0 ? '+' : ''}${delta.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg` : '—'} label={shared.length ? `peso · ${(+shared[0].weight_kg).toLocaleString('es-ES')} kg` : 'sin peso compartido'} />
      </div>

      <SectionTitle>Calorías · 14 días</SectionTitle>
      <Card>
        <DayBars data={bars} goal={goal.kcal} onPick={pick} />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Droplets className="size-3.5 text-water" /> Agua media {(water / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} L · Toca una barra para abrir ese día.
        </p>
      </Card>

      {shared.length > 1 && (
        <>
          <SectionTitle>Peso</SectionTitle>
          <Card>
            <WeightLine points={shared.map((w) => ({ day: w.recorded_on, kg: +w.weight_kg }))} />
          </Card>
        </>
      )}

      {notes.length > 0 && (
        <>
          <SectionTitle>Notas del cliente</SectionTitle>
          <div className="space-y-2">
            {notes.map((n) => (
              <Card key={n.log_date} className="!py-4" onClick={() => pick(n.log_date)}>
                <div className="flex items-center gap-2 text-xs font-bold text-muted">
                  <MessageSquareText className="size-3.5 text-brand" /> {pretty(n.log_date)}
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm">{n.day_notes}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {photos.length > 0 && (
        <>
          <SectionTitle>Fotos compartidas</SectionTitle>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <Photo key={p.id} p={p} />
            ))}
          </div>
        </>
      )}

      {ob?.form && (
        <>
          <SectionTitle>Cuestionario inicial</SectionTitle>
          <Card>
            {SURVEY.filter((s) => !s.health).map((s) => (
              <details key={s.title} className="border-b border-line py-2 last:border-0" open={s === SURVEY[0]}>
                <summary className="flex cursor-pointer items-center gap-2 py-1 font-semibold">
                  <ClipboardList className="size-4 text-brand" /> {s.title}
                </summary>
                <dl className="mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                  {s.fields
                    .filter((f) => String(ob.form![f.key] || '').trim())
                    .map((f) => (
                      <div key={f.key}>
                        <dt className="text-xs text-muted">{f.label}</dt>
                        <dd className="whitespace-pre-line">{ob.form![f.key]}</dd>
                      </div>
                    ))}
                </dl>
              </details>
            ))}
            {ob.health && (
              <details className="py-2">
                <summary className="flex cursor-pointer items-center gap-2 py-1 font-semibold">
                  <HeartPulse className="size-4 text-fat" /> Salud (compartido por el cliente)
                </summary>
                <dl className="mt-2 grid gap-2 text-sm">
                  {SURVEY[3].fields
                    .filter((f) => String(ob.health![f.key] || '').trim())
                    .map((f) => (
                      <div key={f.key}>
                        <dt className="text-xs text-muted">{f.label}</dt>
                        <dd>{ob.health![f.key]}</dd>
                      </div>
                    ))}
                </dl>
              </details>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="rounded-[22px] bg-surface p-4 shadow-card">
      <div className={`font-display text-[26px] font-extrabold leading-none tracking-tight tnum ${tone === 'ok' ? 'text-brand' : tone === 'warn' ? 'text-carb' : ''}`}>{value}</div>
      <div className="mt-1.5 text-xs font-semibold leading-tight text-muted">{label}</div>
    </div>
  );
}
