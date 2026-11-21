import { useState } from 'react';
import { KeyRound, LogOut, MessageCircle } from 'lucide-react';
import { claimInvite } from '../lib/data';
import { errText } from '../lib/supabase';
import { Button } from '../ui/kit';
import { Logo } from '../ui/Logo';
import { signOut } from '../App';

export function Claim({ error, onDone }: { error?: string; onDone: () => void }) {
  const [code, setCode] = useState(() => {
    try {
      return sessionStorage.getItem('np-invite') || '';
    } catch {
      return '';
    }
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(error || '');

  async function go() {
    if (!code.trim()) return setMsg('Escribe el código que te envió tu coach.');
    setBusy(true);
    setMsg('');
    try {
      await claimInvite(code);
      try {
        sessionStorage.removeItem('np-invite');
      } catch {
        /* */
      }
      onDone();
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-8 pt-12">
      <Logo size={48} />
      <h1 className="mt-8 font-display text-4xl font-extrabold leading-tight tracking-tight">Activa tu acceso</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Tu coach te ha enviado por WhatsApp un código personal con el formato <b className="text-ink">NP-XXXX-XXXX-…</b>. Escríbelo aquí para conectar tu cuenta.
      </p>
      <div className="mt-8 rounded-[28px] bg-surface p-5 shadow-card">
        <div className="relative">
          <KeyRound className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-faint" />
          <input
            className="field h-14 pl-12 font-mono text-lg uppercase tracking-wider"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="NP-XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            spellCheck={false}
          />
        </div>
        {msg && <p className="mt-3 px-1 text-sm text-danger">{msg}</p>}
        <Button size="lg" className="mt-4 w-full" loading={busy} onClick={go}>
          Activar
        </Button>
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-brand-soft p-4 text-sm text-brand">
        <MessageCircle className="mt-0.5 size-5 shrink-0" />
        <p>El código solo sirve una vez y caduca a los 7 días. Si no te funciona, pide a tu coach que genere uno nuevo.</p>
      </div>
      <button onClick={signOut} className="mx-auto mt-auto flex items-center gap-2 pt-8 text-sm font-semibold text-muted">
        <LogOut className="size-4" /> Cerrar sesión
      </button>
    </div>
  );
}
