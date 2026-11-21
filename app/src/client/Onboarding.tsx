import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { saveOnboarding, type Onboarding as OB } from '../lib/data';
import { errText } from '../lib/supabase';
import { Button, Label, Toggle } from '../ui/kit';
import { SURVEY, type Field } from './survey';

export function Onboarding({ uid, initial, editing, onDone }: { uid: string; initial: OB; editing: boolean; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(initial.form || {});
  const [health, setHealth] = useState<Record<string, string>>(initial.health || {});
  const [consent, setConsent] = useState(Object.values(initial.health || {}).some((v) => String(v).trim()));
  const [share, setShare] = useState(initial.healthShare);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const S = SURVEY[step];
  const last = step === SURVEY.length - 1;

  const val = (f: Field) => String((S.health ? health : form)[f.key] ?? '');
  const set = (f: Field, v: string) => (S.health ? setHealth({ ...health, [f.key]: v }) : setForm({ ...form, [f.key]: v }));

  async function next() {
    setMsg('');
    if (step === 0 && (!String(form.firstName || '').trim() || !String(form.lastName || '').trim())) return setMsg('Escribe tu nombre y apellidos para continuar.');
    if (!last) return setStep(step + 1);
    const hasHealth = Object.values(health).some((v) => String(v || '').trim());
    if (hasHealth && !consent) return setMsg('Para guardar tus respuestas de salud, autoriza su almacenamiento privado o déjalas vacías.');
    setBusy(true);
    try {
      await saveOnboarding(uid, form, health, share && consent);
      onDone();
    } catch (e) {
      setMsg('No se pudo guardar: ' + errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-6 pt-6">
      <div className="flex items-center gap-3">
        {step > 0 || editing ? (
          <button onClick={() => (step > 0 ? setStep(step - 1) : onDone())} className="grid size-10 place-items-center rounded-full bg-surface-2" aria-label="Atrás">
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <span className="size-10" />
        )}
        <div className="flex flex-1 gap-1.5">
          {SURVEY.map((_, i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <motion.span className="block h-full origin-left bg-brand" initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ type: 'spring', duration: 0.4, bounce: 0 }} />
            </span>
          ))}
        </div>
        <span className="w-10 text-right text-xs font-bold text-muted tnum">
          {step + 1}/{SURVEY.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex-1">
          <h1 className="mt-8 font-display text-[32px] font-extrabold leading-tight tracking-tight">{S.title}</h1>
          <p className="mt-2 text-[15px] text-muted">{step === 0 && !editing ? 'Bienvenido/a. Antes de empezar, cuéntale a tu coach lo básico de tu rutina. Podrás editarlo cuando quieras.' : S.desc}</p>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4">
            {S.fields.map((fl) => (
              <label key={fl.key} className={fl.type === 'number' ? 'col-span-1' : 'col-span-2'}>
                <Label>
                  {fl.label}
                  {fl.required && <span className="text-danger"> *</span>}
                </Label>
                {fl.type === 'textarea' ? (
                  <textarea className="field min-h-[84px] resize-none" value={val(fl)} placeholder={fl.placeholder} onChange={(e) => set(fl, e.target.value)} />
                ) : fl.type === 'select' ? (
                  <select className="field appearance-none" value={val(fl)} onChange={(e) => set(fl, e.target.value)}>
                    <option value="">Elige una opción</option>
                    {fl.options!.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input className="field" type={fl.type === 'number' ? 'text' : 'text'} inputMode={fl.type === 'number' ? 'decimal' : 'text'} value={val(fl)} placeholder={fl.placeholder} onChange={(e) => set(fl, e.target.value)} />
                )}
              </label>
            ))}
          </div>
          {S.health && (
            <div className="mt-6 space-y-2 rounded-3xl bg-surface p-4 shadow-card">
              <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="size-4.5 text-brand" /> Privacidad
              </div>
              <Toggle checked={consent} onChange={setConsent} label="Autorizo guardar estas respuestas en mi cuenta de forma privada" />
              <Toggle checked={share && consent} onChange={(v) => { setShare(v); if (v) setConsent(true); }} label="Mi coach puede verlas" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {msg && <p className="mt-4 px-1 text-sm text-danger">{msg}</p>}
      <Button size="lg" className="mt-6 w-full" loading={busy} onClick={next} icon={last && !busy ? <Check className="size-5" /> : undefined}>
        {last ? (editing ? 'Guardar cambios' : 'Empezar') : 'Continuar'}
      </Button>
    </div>
  );
}
