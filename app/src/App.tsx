import { lazy, Suspense, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { adoptLegacySession, OWNER, supabase } from './lib/supabase';
import { ToastProvider } from './ui/Toast';
import { Spinner } from './ui/kit';
import { Login } from './Login';
import { ClientApp } from './client/ClientApp';
const CoachApp = lazy(() => import('./coach/CoachApp').then((m) => ({ default: m.CoachApp })));

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    adoptLegacySession().finally(async () => {
      const { data } = await supabase.auth.getSession();
      if (alive) setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <ToastProvider>
      {session === undefined ? (
        <div className="grid min-h-dvh place-items-center">
          <Spinner />
        </div>
      ) : !session ? (
        <Login />
      ) : session.user.id === OWNER ? (
        <Suspense fallback={<div className="grid min-h-dvh place-items-center"><Spinner /></div>}>
          <CoachApp session={session} />
        </Suspense>
      ) : (
        <ClientApp session={session} />
      )}
    </ToastProvider>
  );
}

export async function signOut() {
  try {
    localStorage.removeItem('np-session');
    sessionStorage.removeItem('np-session');
  } catch {
    /* */
  }
  await supabase.auth.signOut();
}
