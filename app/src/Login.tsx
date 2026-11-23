import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';
import { ORIGIN, errText, supabase } from './lib/supabase';
import { PrivacySheet } from './client/Privacy';
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
  const [consent, setConsent] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email.trim() || pass.length < (mode === 'up' ? 8 : 1)) {
      setMsg({ t: mode === 'up' ? 'Escribe tu correo y una contraseña de al menos 8 caracteres.' : 'Escribe tu correo y contraseña.', bad: true });
      return;
    }
    if (mode === 'up' && !consent) {
      setMsg({ t: 'Para crear la cuenta, acepta la información de privacidad.', bad: true });
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
    <div className="relative min-h-dvh overflow-hidden bg-board text-chalk">
      <MenuBackdrop />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-8" style={{ paddingTop: 'max(48px, calc(env(safe-area-inset-top) + 32px))' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <div className="caps text-[24px] leading-none">NutriPlan</div>
            <div className="mt-1 text-xs text-chalk-dim">Cayetano Camuñas Coach · CYC Fitness Lab</div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="caps mt-12 text-[58px] leading-[0.9]"
        >
          Tu menú.
          <br />
          Tu ritmo.
          <br />
          <span className="text-accent">Tus resultados.</span>
        </motion.h1>
        <p className="mt-6 flex max-w-sm items-baseline gap-2 whitespace-nowrap text-[16px] text-chalk-dim">
          <span>Tú lo anotas</span>
          <span className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted border-chalk-dim/60" aria-hidden />
          <span className="font-semibold text-chalk">tu coach lo ve al momento</span>
        </p>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-auto rounded-[16px] bg-surface p-5 text-ink shadow-pop"
        >
          {invited && (
            <div className="mb-4 rounded-[12px] bg-brand-soft px-4 py-3 text-sm text-brand">
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
          {mode === 'up' && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 px-1 text-[13px] leading-snug text-muted">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                He leído la{' '}
                <button type="button" onClick={() => setPrivacy(true)} className="font-semibold text-brand underline underline-offset-2">
                  información de privacidad
                </button>{' '}
                y doy mi consentimiento para que mi coach trate mis datos, incluidos los de salud que yo registre.
              </span>
            </label>
          )}
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
        <PrivacySheet open={privacy} onClose={() => setPrivacy(false)} />
      </div>
    </div>
  );
}

// Platos de ejemplo (no son datos de ningún cliente) para el fondo animado.
const MENU: [string, string, number][] = [
  ['Desayuno', 'Avena con yogur y plátano', 412],
  ['Desayuno', 'Tostadas con pavo y aceite', 353],
  ['Media mañana', 'Fruta y frutos secos', 186],
  ['Comida', 'Arroz con pollo y verduras', 640],
  ['Comida', 'Pasta con atún y tomate', 702],
  ['Comida', 'Lentejas estofadas', 568],
  ['Merienda', 'Yogur griego con frutos rojos', 214],
  ['Merienda', 'Bocadillo de jamón', 395],
  ['Cena', 'Tortilla y ensalada', 380],
  ['Cena', 'Salmón con patata asada', 610],
  ['Cena', 'Pizza casera con pechuga', 725],
  ['Recena', 'Queso fresco batido', 92],
];

/** Fondo del acceso: un menú del día escrito en tiza que sube despacio. Decorativo y oculto a lectores de pantalla. */
function MenuBackdrop() {
  const rows = [...MENU, ...MENU];
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_62%,transparent_88%)]"
      aria-hidden
    >
      <div className="absolute inset-x-6 top-0 animate-crawl motion-reduce:animate-none">
        {rows.map(([meal, dish, kcal], i) => (
          <div key={i} className="py-3.5">
            <div className="caps text-[13px] tracking-[0.12em] text-chalk/10">{meal}</div>
            <div className="mt-0.5 flex items-baseline gap-2 text-[17px] text-chalk/10">
              <span className="shrink-0">{dish}</span>
              <span className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted border-chalk/8" />
              <span className="caps shrink-0 text-[20px] text-accent/20">{kcal}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

