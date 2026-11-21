import type { Session } from '@supabase/supabase-js';
import { useState, type ReactNode } from 'react';
import { ClipboardList, LogOut, Monitor, Moon, ShieldCheck, Sun } from 'lucide-react';
import { PrivacySheet } from './Privacy';
import { useTheme, type Theme } from '../lib/theme';
import { n0, planTarget } from '../lib/nutrition';
import type { PublishedPlan } from '../lib/types';
import { Card, SectionTitle, Segmented } from '../ui/kit';
import { signOut } from '../App';

export function Me({ session, plan, form, editSurvey }: { session: Session; plan: PublishedPlan; form: Record<string, string>; editSurvey: () => void }) {
  const [theme, setTheme] = useTheme();
  const [privacy, setPrivacy] = useState(false);
  const goal = planTarget(plan.content);
  const full = [form.firstName, form.lastName].filter(Boolean).join(' ') || plan.client_name || 'Tu perfil';
  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-4 px-1">
        <span className="grid size-16 place-items-center rounded-[22px] bg-brand font-display text-2xl font-extrabold text-on-brand">{full.trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-extrabold tracking-tight">{full}</h1>
          <p className="truncate text-sm text-muted">{session.user.email}</p>
        </div>
      </div>

      {goal.kcal > 0 && (
        <Card tone="brand" className="mt-5">
          <p className="text-sm font-semibold opacity-85">Tu objetivo diario</p>
          <p className="mt-1 font-display text-4xl font-extrabold tracking-tight tnum">{n0(goal.kcal)} kcal</p>
          <p className="mt-2 text-sm opacity-80 tnum">
            HC {n0(goal.c)} g · Proteínas {n0(goal.p)} g · Grasas {n0(goal.f)} g
          </p>
          <p className="mt-3 text-xs opacity-80">Lo ajusta tu coach según tu evolución.</p>
        </Card>
      )}

      <SectionTitle>Apariencia</SectionTitle>
      <Segmented<Theme>
        value={theme}
        onChange={setTheme}
        label="Apariencia"
        options={[
          { value: 'light', label: <><Sun className="size-4" /> Claro</> },
          { value: 'dark', label: <><Moon className="size-4" /> Oscuro</> },
          { value: 'system', label: <><Monitor className="size-4" /> Auto</> },
        ]}
      />

      <SectionTitle>Cuenta</SectionTitle>
      <Card className="!p-2">
        <Row icon={<ClipboardList className="size-5" />} label="Editar mi cuestionario" onClick={editSurvey} />
        <Row icon={<ShieldCheck className="size-5" />} label="Privacidad y mis datos" onClick={() => setPrivacy(true)} />
        <Row icon={<LogOut className="size-5" />} label="Cerrar sesión" onClick={signOut} danger />
      </Card>

      <p className="mt-8 px-1 text-center text-xs leading-relaxed text-faint">
        Plan orientativo: sigue siempre las indicaciones individualizadas de tu profesional.
        <br />
        NutriPlan · Cayetano Camuñas Coach
      </p>
      <PrivacySheet open={privacy} onClose={() => setPrivacy(false)} plan={plan} uid={session.user.id} />
    </div>
  );
}

function Row({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-[15px] font-semibold hover:bg-surface-2 ${danger ? 'text-danger' : ''}`}>
      <span className={danger ? '' : 'text-brand'}>{icon}</span>
      {label}
    </button>
  );
}
