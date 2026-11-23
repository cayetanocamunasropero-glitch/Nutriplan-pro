import { useState } from 'react';
import { X } from 'lucide-react';

const KEY = 'np2-tips-done';

/** Primeros pasos: se muestra hasta que el cliente lo cierra (por dispositivo). */
export function Tips({ hasPlan }: { hasPlan: boolean }) {
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(KEY);
    } catch {
      return false;
    }
  });
  if (!show) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* */
    }
    setShow(false);
  };
  return (
    <section className="relative mt-3 rounded-[16px] border-2 border-dashed border-rule bg-surface p-5 pr-12" aria-labelledby="tips-title">
      <h2 id="tips-title" className="caps text-[20px]">
        Así funciona
      </h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-snug text-ink marker:font-bold marker:text-ink">
        <li>Pulsa el botón amarillo «+» para anotar lo que comes. Busca, escanea el código de barras o usa tus recientes.</li>
        {hasPlan && <li>En «Mi plan» registras una opción completa de tu menú con un solo toque.</li>}
        <li>Toca un alimento anotado para cambiar la cantidad o quitarlo.</li>
        <li>Todo se guarda solo y tu coach lo ve al momento.</li>
      </ol>
      <button onClick={close} className="absolute right-2 top-2 grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Cerrar la ayuda">
        <X className="size-4.5" />
      </button>
    </section>
  );
}
