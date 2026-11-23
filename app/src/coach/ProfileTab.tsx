import { useEffect, useState } from 'react';
import { Save, Target } from 'lucide-react';
import { setPlanTarget } from '../lib/data';
import { bmr, n0, planTarget, targetFor } from '../lib/nutrition';
import { errText } from '../lib/supabase';
import type { CoachClient } from '../lib/types';
import { Button, Card, Label, SectionTitle, Segmented } from '../ui/kit';
import type { Row } from './CoachApp';
import type { Toast } from './ClientDetail';

const ACT = [
  ['1.2', 'Sedentario'],
  ['1.375', 'Ligera'],
  ['1.55', 'Moderada'],
  ['1.725', 'Alta'],
  ['1.9', 'Muy alta'],
];

export function ProfileTab({ row, save, reload, toast }: { row: Row; save: (c: CoachClient) => Promise<void>; reload: () => void; toast: Toast }) {
  const [c, setC] = useState<CoachClient>(row.c);
  const [busy, setBusy] = useState(false);
  useEffect(() => setC(row.c), [row.c]);
  const set = (k: keyof CoachClient, v: string) => setC({ ...c, [k]: v });
  const b = bmr(c);
  const maint = b * (+(c.activity || 1.55) || 1.55);
  const t = targetFor(c);
  const pctSum = (+(c.carbPct || 0) || 0) + (+(c.proteinPct || 0) || 0) + (+(c.fatPct || 0) || 0);
  const current = planTarget(row.pub?.content);
  const dirty = JSON.stringify(c) !== JSON.stringify(row.c);
  const proteinPerKg = t && +(c.weight || 0) ? t.p / +(c.weight || 1) : 0;

  const F = (k: keyof CoachClient, label: string, suffix?: string) => (
    <label>
      <Label>{label}</Label>
      <div className="relative">
        <input className="field tnum" inputMode="decimal" value={String(c[k] ?? '')} onChange={(e) => set(k, e.target.value)} />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">{suffix}</span>}
      </div>
    </label>
  );

  return (
    <>
      <Card>
        <label className="block">
          <Label>Nombre</Label>
          <input className="field" value={c.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {F('age', 'Edad', 'años')}
          {F('weight', 'Peso', 'kg')}
          {F('height', 'Altura', 'cm')}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Sexo</Label>
            <Segmented value={c.sex === 'female' ? 'female' : 'male'} onChange={(v) => set('sex', v)} options={[{ value: 'male', label: 'Hombre' }, { value: 'female', label: 'Mujer' }]} />
          </div>
          <div>
            <Label>Fórmula</Label>
            <Segmented value={c.formula === 'original' ? 'original' : 'revised'} onChange={(v) => set('formula', v)} options={[{ value: 'revised', label: 'H-B revisada' }, { value: 'original', label: 'H-B original' }]} />
          </div>
        </div>
        <div className="mt-3">
          <Label>Actividad</Label>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {ACT.map(([v, l]) => (
              <button key={v} onClick={() => set('activity', v)} className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${String(c.activity) === v ? 'border-rule bg-brand text-on-brand' : 'border-line bg-surface text-muted hover:border-rule'}`}>
                {l} <span className="opacity-80">×{v}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {F('goal', 'Ajuste calórico', '%')}
          {F('targetKcal', 'Kcal fijas (opcional)', 'kcal')}
        </div>
        <p className="mt-1 px-1 text-xs text-muted">Ajuste negativo para déficit (−15 %), positivo para superávit. Si pones kcal fijas, se ignora el cálculo.</p>
      </Card>

      <SectionTitle>Reparto de macros</SectionTitle>
      <Card>
        <div className="grid grid-cols-3 gap-3">
          {F('carbPct', 'Hidratos', '%')}
          {F('proteinPct', 'Proteínas', '%')}
          {F('fatPct', 'Grasas', '%')}
        </div>
        {Math.abs(pctSum - 100) > 0.01 && <p className="mt-2 text-sm text-danger">Los porcentajes suman {pctSum} %; deben sumar 100 %.</p>}
        <div className="mt-4 flex h-3 overflow-hidden rounded-full">
          <span className="bg-carb" style={{ width: `${+(c.carbPct || 0)}%` }} />
          <span className="ml-0.5 bg-prot" style={{ width: `${+(c.proteinPct || 0)}%` }} />
          <span className="ml-0.5 bg-fat" style={{ width: `${+(c.fatPct || 0)}%` }} />
        </div>
      </Card>

      <SectionTitle>Resultado</SectionTitle>
      <Card tone="ink">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-display text-xl font-bold tnum">{Number.isFinite(b) ? n0(b) : '—'}</div>
            <div className="text-[11px] opacity-80">basal</div>
          </div>
          <div>
            <div className="font-display text-xl font-bold tnum">{Number.isFinite(maint) ? n0(maint) : '—'}</div>
            <div className="text-[11px] opacity-80">mantenimiento</div>
          </div>
          <div>
            <div className="font-display text-3xl font-extrabold text-accent tnum">{t ? n0(t.kcal) : '—'}</div>
            <div className="text-[11px] opacity-80">objetivo kcal</div>
          </div>
        </div>
        {t && (
          <p className="mt-4 text-center text-sm opacity-85 tnum">
            HC {t.c} g · Proteínas {t.p} g{proteinPerKg ? ` (${proteinPerKg.toLocaleString('es-ES', { maximumFractionDigits: 1 })} g/kg)` : ''} · Grasas {t.f} g
          </p>
        )}
        {current.kcal > 0 && <p className="mt-2 text-center text-xs opacity-80 tnum">Objetivo actual en la app del cliente: {n0(current.kcal)} kcal</p>}
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          loading={busy}
          disabled={!dirty || !c.name.trim() || Math.abs(pctSum - 100) > 0.01}
          icon={<Save className="size-4" />}
          onClick={async () => {
            setBusy(true);
            try {
              await save(c);
              toast('Ficha guardada');
            } catch (e) {
              toast(errText(e), { bad: true });
            } finally {
              setBusy(false);
            }
          }}
        >
          Guardar ficha
        </Button>
        <Button
          variant="soft"
          disabled={!t || !row.pub}
          icon={<Target className="size-4" />}
          onClick={async () => {
            if (!t || !row.pub) return;
            if (current.kcal && !confirm(`Su objetivo actual es ${n0(current.kcal)} kcal. ¿Cambiarlo a ${n0(t.kcal)} kcal (HC ${t.c} · P ${t.p} · G ${t.f} g)?`)) return;
            try {
              if (dirty) await save(c);
              await setPlanTarget(row.c.id, row.pub.content || {}, t);
              toast('Objetivo actualizado en la app del cliente');
              reload();
            } catch (e) {
              toast(errText(e), { bad: true });
            }
          }}
        >
          Enviar objetivo a su app
        </Button>
      </div>
      {!row.pub && <p className="mt-2 px-1 text-xs text-muted">Para enviar el objetivo, primero crea su acceso en la pestaña «Acceso».</p>}
    </>
  );
}
