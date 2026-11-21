import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';
import { ORIGIN, errText, supabase } from './lib/supabase';
import { Button, Label, Segmented } from './ui/kit';
import { Logo } from './ui/Logo';

export function Login() {
  const invited = (() => {
    try {
      return sessionStorage.getItem('np-invite');
    } catch {
      return null;
    }
  })();
  const [mode, setMode] = useState<'in' | 'up'>(invited ? 'up' : 'in');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email.trim() || pass.length < (mode === 'up' ? 8 : 1)) {
      setMsg({ t: mode === 'up' ? 'Escribe tu correo y una contraseña de al menos 8 caracteres.' : 'Escribe tu correo y contraseña.', bad: true });
      return;
    }
    setBusy(true);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pass, options: { emailRedirectTo: ORIGIN } });
        if (error) throw error;
        if (!data.session) setMsg({ t: 'Te hemos enviado un correo. Confírmalo y vuelve aquí para iniciar sesión.' });
      }
    } catch (err) {
      setMsg({ t: errText(err), bad: true });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!email.trim()) return setMsg({ t: 'Escribe tu correo arriba y vuelve a pulsar.', bad: true });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: ORIGIN });
    setMsg(error ? { t: errText(error), bad: true } : { t: 'Si el correo existe, recibirás un enlace para cambiar la contraseña.' });
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-brand text-white dark:bg-[#0d2a20]">
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-lime/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-[#5cc492]/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-8 pt-14">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <div className="font-display text-xl font-bold leading-none">NutriPlan</div>
            <div className="mt-1 text-xs text-white/60">Cayetano Camuñas Coach · CYC Fitnes Lab</div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-14 font-display text-[44px] font-extrabold leading-[0.98] tracking-tight"
        >
          Tu plan.
          <br />
          Tu ritmo.
          <br />
          <span className="text-lime">Tus resultados.</span>
        </motion.h1>
        <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/70">Registra lo que comes en segundos y mantén a tu coach al día sin mensajes ni capturas.</p>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-auto rounded-[30px] bg-surface p-5 text-ink shadow-pop"
        >
          {invited && (
            <div className="mb-4 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand">
              Tienes una invitación de tu coach. <b>Crea tu cuenta</b> y se activará automáticamente.
            </div>
          )}
          <Segmented
            value={mode}
            onChange={(v) => {
              setMode(v);
              setMsg(null);
            }}
            options={[
              { value: 'in', label: 'Iniciar sesión' },
              { value: 'up', label: 'Crear cuenta' },
            ]}
          />
          <label className="mt-4 block">
            <Label>Correo electrónico</Label>
            <input className="field" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </label>
          <label className="mt-3 block">
            <Label>Contraseña</Label>
            <div className="relative">
              <input
                className="field pr-12"
                type={show ? 'text' : 'password'}
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder={mode === 'up' ? 'Mínimo 8 caracteres' : '••••••••'}
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-muted" aria-label="Mostrar contraseña">
                {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
              </button>
            </div>
          </label>
          {msg && <p className={`mt-3 px-1 text-sm ${msg.bad ? 'text-danger' : 'text-ok'}`}>{msg.t}</p>}
          <Button type="submit" size="lg" loading={busy} className="mt-4 w-full" icon={!busy && <ArrowRight className="size-5" />}>
            {mode === 'in' ? 'Entrar' : 'Crear mi cuenta'}
          </Button>
          {mode === 'in' && (
            <button type="button" onClick={reset} className="mx-auto mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
              <Mail className="size-3.5" /> He olvidado mi contraseña
            </button>
          )}
        </motion.form>
      </div>
    </div>
  );
}
