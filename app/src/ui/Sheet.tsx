import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { pushBack } from './back';

/** Hoja inferior en móvil, diálogo centrado en escritorio. */
export function Sheet({ open, onClose, title, children, full }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; full?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const off = pushBack(onClose);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      off();
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className={`relative flex w-full flex-col overflow-hidden rounded-t-[30px] bg-surface shadow-pop sm:max-w-lg sm:rounded-[30px] ${full ? 'h-[92dvh] sm:h-[86dvh]' : 'max-h-[92dvh]'}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            dragListener={false}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-surface-3 sm:hidden" />
            {title !== undefined && (
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3">
                <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
                <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink" aria-label="Cerrar">
                  <X className="size-4.5" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 safe-b">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
