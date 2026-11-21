import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ChevronRight, History, LogOut, Moon, Plus, RefreshCw, Search, Sun, Users } from 'lucide-react';
import { listPublished, loadStore, recentLogsAll, updateStore } from '../lib/data';
import { daysAgo, lastDays, relative, shift, today } from '../lib/dates';
import { entriesMacros, isFood, n0, planTarget } from '../lib/nutrition';
import { ORIGIN, errText } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import type { CoachClient, CoachStore, MealLog, PublishedPlan } from '../lib/types';
import { Button, Empty, IconButton, Label, Spinner } from '../ui/kit';
import { Logo } from '../ui/Logo';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { pushBack } from '../ui/back';
import { signOut } from '../App';
import { ClientDetail } from './ClientDetail';

export type LogLite = Pick<MealLog, 'client_id' | 'log_date' | 'entries' | 'water_ml' | 'day_notes' | 'updated_at'>;

export type Row = {
  c: CoachClient;
  pub?: PublishedPlan;
  logs: LogLite[];
  last?: string;
  week: number;
  avgPct: number | null;
  status: 'linked' | 'pending' | 'none';
  alert: boolean;
};

export function CoachApp({ session }: { session: Session }) {
  const toast = useToast();
  const [theme, setTheme] = useTheme();
  const [store, setStore] = useState<CoachStore | null>(null);
  const [pubs, setPubs] = useState<PublishedPlan[]>([]);
  const [logs, setLogs] = useState<LogLite[]>([]);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'alert' | 'active'>('all');
  const [sel, setSel] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, p, l] = await Promise.all([loadStore(), listPublished(), recentLogsAll(shift(today(), -29))]);
      setStore(s);
      setPubs(p);
      setLogs(l);
      setErr('');
    } catch (e) {
      setErr(errText(e));
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!sel || window.innerWidth >= 1024) return;
    return pushBack(() => setSel(null));
  }, [sel]);

  const rows: Row[] = useMemo(() => {
    if (!store) return [];
    const week = lastDays(today(), 7);
    return store.clients.map((c) => {
      const pub = pubs.find((p) => p.client_id === c.id);
      const mine = logs.filter((l) => l.client_id === c.id && (l.entries || []).some(isFood));
      const last = mine[0]?.log_date;
      const goal = planTarget(pub?.content).kcal;
      const w = mine.filter((l) => week.includes(l.log_date));
      const avg = w.length ? w.reduce((t, l) => t + entriesMacros(l.entries).kcal, 0) / w.length : 0;
      const status: Row['status'] = pub?.client_uid ? 'linked' : pub ? 'pending' : 'none';
      return {
        c,
        pub,
        logs: logs.filter((l) => l.client_id === c.id),
        last,
        week: w.length,
        avgPct: goal && avg ? avg / goal : null,
        status,
        alert: status === 'linked' && (!last || daysAgo(last) >= 3),
      };
    });
  }, [store, pubs, logs]);

  const shown = rows
    .filter((r) => (r.c.name || '').toLowerCase().includes(q.toLowerCase()))
    .filter((r) => (filter === 'alert' ? r.alert : filter === 'active' ? r.week > 0 : true))
    .sort((a, b) => Number(b.alert) - Number(a.alert) || (b.last || '').localeCompare(a.last || '') || (a.c.name || '').localeCompare(b.c.name || ''));
  const current = rows.find((r) => r.c.id === sel);
  const linked = rows.filter((r) => r.status === 'linked').length;
  const active = rows.filter((r) => r.week > 0).length;
  const alerts = rows.filter((r) => r.alert).length;
  const todayCount = rows.filter((r) => r.last === today()).length;

  const saveClient = useCallback(
    async (c: CoachClient) => {
      const s = await updateStore((st) => {
        const i = st.clients.findIndex((x) => x.id === c.id);
        if (i >= 0) st.clients[i] = { ...st.clients[i], ...c };
        else st.clients.push(c);
      });
      setStore(s);
    },
    [],
  );

  if (!store)
    return (
      <div className="grid min-h-dvh place-items-center">
        {err ? <Empty icon={<AlertTriangle className="size-6" />} title="No se pudieron cargar los datos" text={err} action={<Button onClick={load}>Reintentar</Button>} /> : <Spinner label="Cargando tus clientes…" />}
      </div>
    );

  return (
    <div className="lg:flex lg:h-dvh">
      {/* Lista */}
      <aside className={`${sel ? 'hidden lg:flex' : 'flex'} min-h-dvh flex-col border-line lg:h-dvh lg:min-h-0 lg:w-[400px] lg:shrink-0 lg:border-r`}>
        <h1 className="sr-only">Panel del coach</h1>
        <div className="px-4 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <Logo size={38} />
            <div className="min-w-0 flex-1">
              <p className="whitespace-nowrap font-display text-lg font-bold leading-none">NutriPlan Coach</p>
              <p className="mt-1 truncate text-xs text-muted">{session.user.email}</p>
            </div>
            <IconButton onClick={load} aria-label="Actualizar">
              <RefreshCw className={`size-4.5 ${refreshing ? 'animate-spin' : ''}`} />
            </IconButton>
            <IconButton onClick={() => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')} aria-label="Cambiar tema">
              {theme === 'dark' || (theme === 'system' && document.documentElement.dataset.theme === 'dark') ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </IconButton>
            <IconButton onClick={() => window.open(ORIGIN + '/clasica', '_blank', 'noopener')} aria-label="Versión clásica (editor avanzado)" title="Versión clásica (editor avanzado y generador)">
              <History className="size-4.5" />
            </IconButton>
            <IconButton onClick={signOut} aria-label="Cerrar sesión">
              <LogOut className="size-4.5" />
            </IconButton>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Kpi value={String(rows.length)} label="clientes" sub={`${linked} con app`} onClick={() => setFilter('all')} on={filter === 'all'} />
            <Kpi value={String(active)} label="activos 7 d" sub={`${todayCount} hoy`} onClick={() => setFilter('active')} on={filter === 'active'} />
            <Kpi value={String(alerts)} label="sin registrar" sub="≥ 3 días" onClick={() => setFilter('alert')} on={filter === 'alert'} warn={alerts > 0} />
          </div>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-faint" />
              <input className="field h-11 pl-10" placeholder="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button onClick={() => setNewOpen(true)} icon={<Plus className="size-4.5" />}>
              Nuevo
            </Button>
          </div>
        </div>

        <ul className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-8">
          {shown.length === 0 && <Empty icon={<Users className="size-6" />} title={rows.length ? 'Nadie con ese filtro' : 'Aún no tienes clientes'} text={rows.length ? '' : 'Crea tu primer cliente con «Nuevo».'} />}
          {shown.map((r) => (
            <li key={r.c.id}>
              <ClientRow r={r} on={r.c.id === sel} onClick={() => setSel(r.c.id)} />
            </li>
          ))}
        </ul>
      </aside>

      {/* Detalle */}
      <section className={`${sel ? 'block' : 'hidden lg:block'} min-h-dvh flex-1 overflow-y-auto lg:h-dvh lg:min-h-0`}>
        <AnimatePresence initial={false}>
          {current ? (
            <motion.div key={current.c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}>
              <ClientDetail row={current} back={() => setSel(null)} saveClient={saveClient} reload={load} toast={toast} />
            </motion.div>
          ) : (
            <div className="hidden h-full place-items-center lg:grid">
              <Empty icon={<Users className="size-6" />} title="Elige un cliente" text="Verás su evolución, su diario, su plan y su acceso a la app." />
            </div>
          )}
        </AnimatePresence>
      </section>

      <NewClient
        open={newOpen}
        onClose={() => setNewOpen(false)}
        create={async (name) => {
          const c: CoachClient = { id: crypto.randomUUID(), name, age: 30, sex: 'male', weight: 70, height: 175, activity: '1.55', goal: '0', formula: 'revised', carbPct: 50, proteinPct: 25, fatPct: 25, targetKcal: '' };
          // La app clásica espera también un borrador de comidas vacío para cada cliente.
          const s = await updateStore((st) => {
            st.clients.push(c);
            st.plans[c.id] = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena', 'Recena'].map((n, i) => ({ id: crypto.randomUUID(), name: n, share: [20, 10, 40, 15, 15, 0][i], auto: true, items: [] }));
          });
          setStore(s);
          setNewOpen(false);
          setSel(c.id);
          toast('Cliente creado');
        }}
      />
    </div>
  );
}

function Kpi({ value, label, sub, onClick, on, warn }: { value: string; label: string; sub: string; onClick: () => void; on: boolean; warn?: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-[20px] p-3 text-left transition ${on ? 'bg-ink text-bg' : 'bg-surface shadow-card'}`}>
      <div className={`font-display text-2xl font-extrabold leading-none tnum ${warn && !on ? 'text-fat-ink' : ''}`}>{value}</div>
      <div className={`mt-1 text-[11px] font-bold ${on ? 'text-bg/80' : 'text-ink'}`}>{label}</div>
      <div className={`text-[11px] ${on ? 'text-bg/80' : 'text-muted'}`}>{sub}</div>
    </button>
  );
}

function ClientRow({ r, on, onClick }: { r: Row; on: boolean; onClick: () => void }) {
  const days = lastDays(today(), 7);
  const logged = new Set(r.logs.filter((l) => (l.entries || []).some(isFood)).map((l) => l.log_date));
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-[22px] p-3 text-left transition ${on ? 'bg-brand-soft' : 'hover:bg-surface'}`}>
      <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 font-display text-lg font-bold">
        {(r.c.name || '?').trim().charAt(0).toUpperCase()}
        <span className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-bg ${r.status === 'linked' ? 'bg-ok' : r.status === 'pending' ? 'bg-carb' : 'bg-faint'}`} title={r.status === 'linked' ? 'Usa la app' : r.status === 'pending' ? 'Invitación pendiente' : 'Sin acceso'} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{r.c.name || 'Sin nombre'}</span>
          {r.alert && <AlertTriangle className="size-3.5 shrink-0 text-fat-ink" aria-label="Sin registrar" />}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex gap-[3px]" aria-label={`${r.week} de 7 días registrados`}>
            {days.map((d) => (
              <i key={d} className={`h-2.5 w-1.5 rounded-full ${logged.has(d) ? 'bg-brand' : 'bg-surface-3'}`} />
            ))}
          </span>
          <span className="truncate text-xs text-muted">
            {r.status === 'none' ? 'Sin acceso a la app' : r.status === 'pending' ? 'Invitación pendiente' : relative(r.last)}
            {r.avgPct ? ` · ${n0(r.avgPct * 100)} % obj.` : ''}
          </span>
        </div>
      </div>
      <ChevronRight className="size-4.5 shrink-0 text-faint" />
    </button>
  );
}

function NewClient({ open, onClose, create }: { open: boolean; onClose: () => void; create: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setName('');
  }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Nuevo cliente">
      <label className="block">
        <Label>Nombre y apellidos</Label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ej. Laura Martín" />
      </label>
      <p className="mt-2 px-1 text-xs text-muted">Después completas su ficha y le envías el acceso por WhatsApp.</p>
      <Button
        size="lg"
        className="mt-4 w-full"
        loading={busy}
        disabled={!name.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            await create(name.trim());
          } finally {
            setBusy(false);
          }
        }}
      >
        Crear
      </Button>
    </Sheet>
  );
}
