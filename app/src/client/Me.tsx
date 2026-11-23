import type { Session } from '@supabase/supabase-js';
import { useState, type ReactNode } from 'react';
import { ClipboardList, LogOut, Monitor, Moon, ShieldCheck, Sun } from 'lucide-react';
import { PrivacySheet } from './Privacy';
import { useTheme, type Theme } from '../lib/theme';
import { n0, planTarget } from '../lib/nutrition';
import type { PublishedPlan } from '../lib/types';
import { Card, SectionTitle, Segmented } from '../ui/kit';
import { signOut } from '../App';
import { BoardHeader } from '../ui/Board';

export function Me({ session, plan, form, editSurvey }: { session: Session; plan: PublishedPlan; form: Record<string, string>; editSurvey: () => void }) {
  const [theme, setTheme] = useTheme();
  const [privacy, setPrivacy] = useState(false);
  const goal = planTarget(plan.content);
  const full = [form.firstName, form.lastName].filter(Boolean).join(' ') || plan.client_name || 'Tu perfil';
  return (
    <div className="px-4">
      <BoardHeader
        title={full}
        subtitle={session.user.email}
        right={<span className="caps grid size-12 place-items-center rounded-full bg-accent text-[24px] text-on-accent">{full.trim().charAt(0).toUpperCase()}</span>}
      />

      {goal.kcal > 0 && (
        <section className="mt-4 rounded-[8px] border-[3px] border-rule bg-surface px-4 py-3" aria-labelledby="goal-title">
          <h2 id="goal-title" className="caps text-[22px] leading-none">
            Tu objetivo diario
          </h2>
          <div className="mt-2 h-2 bg-rule" aria-hidden />
          <p className="mt-2 font-display text-[44px] font-extrabold leading-none tnum">{n0(goal.kcal)} kcal</p>
          <div className="mt-2 h-[3px] bg-rule" aria-hidden />
          {(
            [
              ['Hidratos', goal.c],
              ['Proteínas', goal.p],
              ['Grasas', goal.f],
            ] as const
          ).map(([l, v], i) => (
            <div key={l} className={`flex justify-between py-1.5 text-[15px] tnum ${i ? 'border-t border-rule' : ''}`}>
              <b className="font-semibold">{l}</b>
              <span>{n0(v)} g</span>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted">Lo ajusta tu coach según tu evolución.</p>
        </section>
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
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-3.5 text-left text-[15px] font-semibold hover:bg-surface-2 ${danger ? 'text-danger' : ''}`}>
      <span className={danger ? '' : 'text-brand'}>{icon}</span>
      {label}
    </button>
  );
}
