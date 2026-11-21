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
    <section className="relative mt-3 rounded-[26px] bg-brand-soft p-5 pr-12 text-brand" aria-labelledby="tips-title">
      <h2 id="tips-title" className="font-display text-[17px] font-bold">
        Así funciona
      </h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-snug text-ink marker:font-bold marker:text-brand">
        <li>Pulsa el botón verde lima para anotar lo que comes. Busca, escanea el código de barras o usa tus recientes.</li>
        {hasPlan && <li>En «Mi plan» registras una opción completa de tu menú con un solo toque.</li>}
        <li>Toca un alimento anotado para cambiar la cantidad o quitarlo.</li>
        <li>Todo se guarda solo y tu coach lo ve al momento.</li>
      </ol>
      <button onClick={close} className="absolute right-2 top-2 grid size-10 place-items-center rounded-full text-brand hover:bg-brand/10" aria-label="Cerrar la ayuda">
        <X className="size-4.5" />
      </button>
    </section>
  );
}
