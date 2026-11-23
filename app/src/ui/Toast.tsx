import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck } from 'lucide-react';

type T = { id: number; text: string; bad?: boolean; action?: { label: string; run: () => void } };
const Ctx = createContext<(text: string, opts?: { bad?: boolean; action?: T['action'] }) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<T[]>([]);
  const seq = useRef(0);
  const show = useCallback((text: string, opts?: { bad?: boolean; action?: T['action'] }) => {
    const id = ++seq.current;
    setList((l) => [...l.slice(-2), { id, text, ...opts }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), opts?.action ? 5000 : 2800);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3">
          <AnimatePresence>
            {list.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ y: -30, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-[12px] bg-ink px-4 py-3 text-sm font-medium text-bg shadow-pop"
                role="status"
              >
                {t.bad ? <CircleAlert className="size-4.5 shrink-0 text-fat" /> : <CircleCheck className="size-4.5 shrink-0 text-accent" />}
                <span>{t.text}</span>
                {t.action && (
                  <button
                    className="ml-1 rounded-lg px-2 py-1 font-bold text-accent"
                    onClick={() => {
                      t.action!.run();
                      setList((l) => l.filter((x) => x.id !== t.id));
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
