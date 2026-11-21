import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, House, TrendingUp, UserRound } from 'lucide-react';
import { claimInvite, getMyPlan, getOnboarding, type Onboarding as OB } from '../lib/data';
import { errText } from '../lib/supabase';
import type { PublishedPlan } from '../lib/types';
import { Spinner } from '../ui/kit';
import { useToast } from '../ui/Toast';
import { pushBack } from '../ui/back';
import { Claim } from './Claim';
import { Onboarding } from './Onboarding';
import { Today } from './Today';
import { PlanView } from './PlanView';
import { Progress } from './Progress';
import { Me } from './Me';
import { today } from '../lib/dates';

type Tab = 'today' | 'plan' | 'progress' | 'me';

export function ClientApp({ session }: { session: Session }) {
  const uid = session.user.id;
  const toast = useToast();
  const [plan, setPlan] = useState<PublishedPlan | null | undefined>(undefined);
  const [ob, setOb] = useState<OB | null>(null);
  const [editingOb, setEditingOb] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [day, setDay] = useState(today());
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      let p = await getMyPlan(uid);
      // Código pendiente del enlace de WhatsApp: se canjea automáticamente.
      let pending: string | null = null;
      try {
        pending = sessionStorage.getItem('np-invite');
      } catch {
        /* */
      }
      if (!p && pending) {
        try {
          await claimInvite(pending);
          sessionStorage.removeItem('np-invite');
          p = await getMyPlan(uid);
        } catch {
          /* se mostrará la pantalla de código con el valor precargado */
        }
      }
      if (p) setOb(await getOnboarding(uid));
      setPlan(p);
    } catch (e) {
      setErr(errText(e));
      setPlan(null);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab === 'today') return;
    return pushBack(() => setTab('today'));
  }, [tab]);

  const onError = useCallback((m: string) => toast(m, { bad: true }), [toast]);

  if (plan === undefined) return <div className="grid min-h-dvh place-items-center"><Spinner label="Preparando tu espacio…" /></div>;
  if (!plan) return <Claim error={err} onDone={load} />;
  if (ob && (!ob.complete || editingOb))
    return (
      <Onboarding
        uid={uid}
        initial={ob}
        editing={editingOb}
        onDone={async () => {
          setEditingOb(false);
          setOb(await getOnboarding(uid));
        }}
      />
    );

  const name = String(ob?.form.firstName || plan.client_name || '').trim().split(/\s+/)[0];

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-28">
      <AnimatePresence mode="wait">
        <motion.main key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {tab === 'today' && <Today plan={plan} uid={uid} name={name} day={day} setDay={setDay} onError={onError} goPlan={() => setTab('plan')} />}
          {tab === 'plan' && <PlanView plan={plan} uid={uid} day={day} onError={onError} goToday={() => setTab('today')} />}
          {tab === 'progress' && <Progress plan={plan} uid={uid} onError={onError} />}
          {tab === 'me' && <Me session={session} plan={plan} form={ob?.form || {}} editSurvey={() => setEditingOb(true)} />}
        </motion.main>
      </AnimatePresence>
      <TabBar tab={tab} setTab={setTab} hasPlan={!!plan.content?.groups?.length || !!plan.content?.meals?.length} />
    </div>
  );
}

function TabBar({ tab, setTab, hasPlan }: { tab: Tab; setTab: (t: Tab) => void; hasPlan: boolean }) {
  const items: { id: Tab; label: string; icon: typeof House }[] = [
    { id: 'today', label: 'Hoy', icon: House },
    ...(hasPlan ? [{ id: 'plan' as Tab, label: 'Mi plan', icon: BookOpen }] : []),
    { id: 'progress', label: 'Progreso', icon: TrendingUp },
    { id: 'me', label: 'Yo', icon: UserRound },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 safe-b">
      <div className="mx-auto mb-2 flex max-w-sm items-center justify-around rounded-[26px] border border-line bg-surface/85 px-2 py-1.5 shadow-pop backdrop-blur-xl">
        {items.map(({ id, label, icon: I }) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5" aria-current={on ? 'page' : undefined}>
              {on && <motion.span layoutId="tabpill" className="absolute inset-x-2 inset-y-0 rounded-2xl bg-brand-soft" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
              <I className={`relative size-[22px] transition ${on ? 'text-brand' : 'text-faint'}`} strokeWidth={on ? 2.4 : 2} />
              <span className={`relative text-[11px] font-semibold ${on ? 'text-brand' : 'text-faint'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
