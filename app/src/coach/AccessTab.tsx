import { useState } from 'react';
import { CheckCircle2, Copy, KeyRound, MessageCircle, Smartphone } from 'lucide-react';
import { createInvite } from '../lib/data';
import { targetFor } from '../lib/nutrition';
import { ORIGIN, errText } from '../lib/supabase';
import { Button, Card, Label } from '../ui/kit';
import type { Row } from './CoachApp';
import type { Toast } from './ClientDetail';

export function AccessTab({ row, reload, toast }: { row: Row; reload: () => void; toast: Toast }) {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const link = ORIGIN + '/?invite=' + encodeURIComponent(code);
  const first = (row.c.name || '').trim().split(/\s+/)[0];
  const message =
    (first && first !== 'Nuevo' ? `Hola ${first},` : 'Hola,') +
    `\n\nTe envío tu acceso personal a NutriPlan:\n\n*${code}*\n\nEntra desde aquí: ${link}\n\n1. Crea tu cuenta con tu correo y una contraseña (mínimo 8 caracteres).\n2. Confirma el correo si te lo pide.\n3. El código se activa solo al abrir el enlace (o escríbelo en «Activa tu acceso»).\n\nEl código es de un solo uso y caduca en 7 días. No lo compartas.`;

  if (row.status === 'linked')
    return (
      <Card>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-ok" />
          <div>
            <h3 className="caps text-lg">{first || 'El cliente'} ya usa la app</h3>
            <p className="mt-1 text-sm text-muted">Su cuenta está vinculada. Todo lo que publiques le llegará al momento, sin reinstalar nada.</p>
          </div>
        </div>
      </Card>
    );

  return (
    <>
      <Card>
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-brand-soft text-brand">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h3 className="caps text-lg">Invitar por WhatsApp</h3>
            <p className="mt-1 text-sm text-muted">Generamos un código de un solo uso (7 días). No necesitas su correo. Si generas otro, el anterior deja de valer.</p>
          </div>
        </div>
        {!code ? (
          <Button
            className="mt-4 w-full"
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setCode(await createInvite(row.c, targetFor(row.c)));
                reload();
              } catch (e) {
                toast(errText(e), { bad: true });
              } finally {
                setBusy(false);
              }
            }}
          >
            Generar código
          </Button>
        ) : (
          <>
            <div className="mt-4 rounded-[12px] bg-ink p-4 text-center font-mono text-xl font-bold tracking-wider text-accent">{code}</div>
            <label className="mt-4 block">
              <Label hint="opcional">Teléfono con prefijo</Label>
              <input className="field tnum" inputMode="tel" placeholder="34600111222" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                size="lg"
                className="!bg-[#21a85b] !text-white"
                icon={<MessageCircle className="size-5" />}
                onClick={() => {
                  const p = phone.replace(/\D/g, '');
                  window.open((p.length >= 8 ? 'https://wa.me/' + p : 'https://api.whatsapp.com/send') + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
                }}
              >
                Enviar por WhatsApp
              </Button>
              <Button
                size="lg"
                variant="soft"
                icon={<Copy className="size-4.5" />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(message);
                    toast('Mensaje copiado');
                  } catch {
                    toast('No se pudo copiar', { bad: true });
                  }
                }}
              >
                Copiar mensaje
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted">WhatsApp se abre con el mensaje listo; revisa el contacto y envíalo tú.</p>
          </>
        )}
      </Card>
      <Card className="mt-3">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-brand" />
          <p className="text-sm text-muted">
            En Android puede usar la APK de NutriPlan o «Añadir a pantalla de inicio» desde Chrome. En iPhone, Safari → Compartir → «Añadir a pantalla de inicio».
          </p>
        </div>
      </Card>
    </>
  );
}
