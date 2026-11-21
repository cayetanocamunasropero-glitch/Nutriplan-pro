import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react';
import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { pushBack } from './back';

const DRAWER = [0.32, 0.72, 0, 1] as const;

/** Hoja inferior en móvil (se cierra arrastrando hacia abajo), diálogo centrado en escritorio. */
export function Sheet({ open, onClose, title, children, full }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; full?: boolean }) {
  const drag = useDragControls();
  const titleId = useId();

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

  // Cerrar por distancia o por velocidad (un gesto rápido corto también cierra).
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 140 || info.velocity.y > 500) onClose();
  };

  const startDrag = (e: React.PointerEvent) => drag.start(e);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby={title !== undefined ? titleId : undefined}>
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: DRAWER }}
            onClick={onClose}
          />
          <motion.div
            className={`relative flex w-full flex-col overflow-hidden rounded-t-[30px] bg-surface shadow-pop sm:max-w-lg sm:rounded-[30px] ${full ? 'h-[92dvh] sm:h-[86dvh]' : 'max-h-[92dvh]'}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.42, ease: DRAWER }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            <div className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing sm:hidden" onPointerDown={startDrag} aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-surface-3" />
            </div>
            {title !== undefined && (
              <div className="flex shrink-0 touch-none items-center justify-between gap-3 px-5 pb-2 pt-2 sm:pt-4" onPointerDown={startDrag}>
                <h2 id={titleId} className="font-display text-xl font-bold tracking-tight">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted transition-colors hover:text-ink"
                  aria-label="Cerrar"
                >
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
