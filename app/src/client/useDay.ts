import { useCallback, useEffect, useRef, useState } from 'react';
import { getLog, saveLog } from '../lib/data';
import { errText } from '../lib/supabase';
import type { LogEntry, PublishedPlan } from '../lib/types';

type DayState = { entries: LogEntry[]; water: number; notes: string };

/** Registro de un día con guardado optimista y en cola (nunca se pisan dos guardados). */
export function useDay(plan: PublishedPlan, uid: string, date: string, onError: (m: string) => void) {
  const [state, setState] = useState<DayState>({ entries: [], water: 0, notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const latest = useRef(state);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const cache = useRef(new Map<string, DayState>());

  const load = useCallback(async () => {
    const c = cache.current.get(date);
    if (c) {
      latest.current = c;
      setState(c);
      setLoading(false);
    } else setLoading(true);
    try {
      const row = await getLog(plan.client_id, date);
      const s: DayState = { entries: Array.isArray(row?.entries) ? row!.entries : [], water: Number(row?.water_ml) || 0, notes: row?.day_notes || '' };
      cache.current.set(date, s);
      latest.current = s;
      setState(s);
    } catch (e) {
      onError('No se pudo cargar el día: ' + errText(e));
    } finally {
      setLoading(false);
    }
  }, [plan.client_id, date, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    (fn: (s: DayState) => DayState) => {
      const prev = latest.current;
      const next = fn(prev);
      latest.current = next;
      cache.current.set(date, next);
      setState(next);
      setSaving(true);
      queue.current = queue.current.then(async () => {
        try {
          const s = latest.current;
          await saveLog(plan, uid, date, s.entries, s.water, s.notes);
        } catch (e) {
          latest.current = prev;
          cache.current.set(date, prev);
          setState(prev);
          onError('No se guardó: ' + errText(e));
        } finally {
          setSaving(false);
        }
      });
      return queue.current;
    },
    [plan, uid, date, onError],
  );

  return { ...state, loading, saving, update, reload: load };
}
