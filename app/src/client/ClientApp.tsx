import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'motion/react';
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
      <AnimatePresence initial={false}>
        <motion.main key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}>
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
  const items: { id: Tab; label: string }[] = [
    { id: 'today', label: 'Hoy' },
    ...(hasPlan ? [{ id: 'plan' as Tab, label: 'Mi plan' }] : []),
    { id: 'progress', label: 'Progreso' },
    { id: 'me', label: 'Yo' },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 safe-b" aria-label="Secciones">
      <div className="mx-auto mb-2 flex max-w-md items-center gap-1 rounded-full bg-board p-1.5 shadow-pop">
        {items.map(({ id, label }) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} className="relative flex-1 rounded-full py-2.5" aria-current={on ? 'page' : undefined}>
              {on && <motion.span layoutId="tabpill" className="absolute inset-0 rounded-full bg-chalk" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
              <span className={`caps relative text-[15px] transition-colors ${on ? 'text-board' : 'text-chalk-dim'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
