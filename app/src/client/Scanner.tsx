import { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'lucide-react';
import { Button } from '../ui/kit';

type Detector = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** Escáner de código de barras con la cámara (BarcodeDetector) y entrada manual de respaldo. */
export function Scanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState('');
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!supported) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stop || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: new (o: object) => Detector }).BarcodeDetector;
        const det = new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        const tick = async () => {
          if (stop || !video.current) return;
          try {
            const r = await det.detect(video.current);
            if (r[0]?.rawValue) {
              navigator.vibrate?.(40);
              onCode(r[0].rawValue);
              return;
            }
          } catch {
            /* fotograma no válido */
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setErr('No se pudo abrir la cámara. Revisa los permisos o escribe el código.');
      }
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [supported, onCode]);

  return (
    <div>
      {supported && !err ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-black">
          <video ref={video} className="size-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-x-10 top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-lime/90 shadow-[0_0_0_999px_rgba(0,0,0,.35)]" />
          <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-white/85">Apunta al código de barras del envase</p>
        </div>
      ) : (
        <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">{err || 'Este navegador no puede leer códigos con la cámara. Escribe los números del código de barras.'}</p>
      )}
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Keyboard className="absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-faint" />
          <input className="field pl-10 tnum" inputMode="numeric" placeholder="Código (8–14 cifras)" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))} />
        </div>
        <Button disabled={manual.length < 8} onClick={() => onCode(manual)}>
          Buscar
        </Button>
      </div>
    </div>
  );
}
