import { useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { getLogs, getOnboarding, getPhotos, getWeights } from '../lib/data';
import { today } from '../lib/dates';
import { errText } from '../lib/supabase';
import type { PublishedPlan } from '../lib/types';
import { Button } from '../ui/kit';
import { Sheet } from '../ui/Sheet';

/** Descarga un archivo de texto (en la APK, mediante AndroidBridge.saveFile). */
export function downloadText(filename: string, text: string, mime = 'application/json') {
  if (window.AndroidBridge?.saveFile) {
    window.AndroidBridge.saveFile(filename, text, mime);
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function PrivacyText() {
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-ink">
      <p>
        NutriPlan es la herramienta de seguimiento nutricional de <b>Cayetano Camuñas Coach (CYC Fitness Lab)</b>, que es quien decide para qué se usan tus datos. Para cualquier
        cuestión sobre ellos, escribe a tu coach por el canal habitual (WhatsApp).
      </p>
      <section>
        <h3 className="caps text-base">Qué datos guardamos</h3>
        <p className="mt-1 text-muted">
          Tu correo y tu contraseña (cifrada), lo que anotas en el diario (comidas, agua, actividad y notas), tu peso, las fotos de progreso, el cuestionario inicial y, solo si tú las
          rellenas, tus respuestas de salud.
        </p>
      </section>
      <section>
        <h3 className="caps text-base">Para qué y con qué base</h3>
        <p className="mt-1 text-muted">
          Solo para que tu coach haga el seguimiento de tu plan. Algunos de estos datos son datos de salud: los tratamos porque tú das tu consentimiento explícito al crear la cuenta y
          puedes retirarlo cuando quieras.
        </p>
      </section>
      <section>
        <h3 className="caps text-base">Quién los ve</h3>
        <p className="mt-1 text-muted">
          Tú y tu coach. El peso, las fotos y las respuestas de salud solo los ve tu coach si marcas «Compartir». Se guardan en servidores de Supabase en la Unión Europea (Irlanda). El
          buscador de alimentos consulta Open Food Facts enviando únicamente el texto o el código de barras que buscas, nunca tus datos.
        </p>
      </section>
      <section>
        <h3 className="caps text-base">Cookies y almacenamiento</h3>
        <p className="mt-1 text-muted">
          No usamos cookies publicitarias ni analítica. El dispositivo solo guarda lo imprescindible para que la app funcione: tu sesión, el tema claro u oscuro y tus alimentos
          recientes y favoritos.
        </p>
      </section>
      <section>
        <h3 className="caps text-base">Tus derechos</h3>
        <p className="mt-1 text-muted">
          Puedes acceder a tus datos, corregirlos, llevártelos (botón «Descargar mis datos»), pedir que se borren u oponerte a su uso escribiendo a tu coach. Si no quedas conforme,
          puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es). Los conservamos mientras uses el servicio.
        </p>
      </section>
      <p className="text-xs text-muted">NutriPlan es una herramienta orientativa y no sustituye el consejo médico.</p>
    </div>
  );
}

export function PrivacySheet({ open, onClose, plan, uid }: { open: boolean; onClose: () => void; plan?: PublishedPlan; uid?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function exportData() {
    if (!plan || !uid) return;
    setBusy(true);
    setMsg('');
    try {
      const [logs, weights, photos, ob] = await Promise.all([getLogs(plan.client_id, '2000-01-01', today()), getWeights(plan.client_id, 5000), getPhotos(plan.client_id, 5000), getOnboarding(uid)]);
      const data = {
        exportado: new Date().toISOString(),
        cuestionario: ob.form,
        salud: ob.health,
        salud_compartida_con_coach: ob.healthShare,
        plan_publicado: plan.content,
        registros_diarios: logs,
        peso: weights,
        fotos: photos.map((p) => ({ fecha: p.recorded_on, nota: p.note, compartida: p.shared_with_coach, archivo: p.storage_path })),
      };
      downloadText(`nutriplan-mis-datos-${today()}.json`, JSON.stringify(data, null, 2));
      setMsg('Descarga preparada.');
    } catch (e) {
      setMsg('No se pudo preparar la descarga: ' + errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={<span className="inline-flex items-center gap-2"><ShieldCheck className="size-5 text-brand" /> Privacidad</span>}>
      <PrivacyText />
      {plan && uid && (
        <div className="mt-6">
          <Button variant="soft" size="lg" className="w-full" loading={busy} onClick={exportData} icon={<Download className="size-4.5" />}>
            Descargar mis datos
          </Button>
          {msg && <p className="mt-2 px-1 text-sm text-muted">{msg}</p>}
        </div>
      )}
    </Sheet>
  );
}
