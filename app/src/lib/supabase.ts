import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://dmztwsrfsydouuiviutc.supabase.co';
// Clave publicable (pública por diseño; la seguridad la dan las políticas RLS).
export const SUPABASE_KEY = 'sb_publishable_9mtwiHxW3aqEUTac9yY8Kg_fMx_QG1a';
/** UUID del coach (Cayetano). Cualquier otra cuenta es cliente. */
export const OWNER = '9b3479bd-128a-464b-844f-bb49892affec';
export const PHOTO_BUCKET = 'nutriplan-client-progress-private';

declare global {
  interface Window {
    NP_ORIGIN?: string;
    NP_APP?: string;
    npBack?: () => boolean | void;
    AndroidBridge?: { saveFile?: (...a: unknown[]) => void; share?: (...a: unknown[]) => void; print?: () => void };
  }
}

/** Origen público de la web (en la APK, location.origin es file://). */
export const ORIGIN = window.NP_ORIGIN || (location.protocol.startsWith('http') ? location.origin : 'https://nutriplan-asesoria.vercel.app');

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'np2-auth' },
});

/** Reutiliza la sesión de la app clásica (clave 'np-session') para no pedir login otra vez. */
export async function adoptLegacySession() {
  try {
    const raw = localStorage.getItem('np-session') || sessionStorage.getItem('np-session');
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s?.refresh_token) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) await supabase.auth.refreshSession({ refresh_token: s.refresh_token });
    }
  } catch {
    /* sin sesión previa */
  }
}

export function errText(e: unknown): string {
  if (!e) return 'Error desconocido';
  if (typeof e === 'string') return e;
  const o = e as { message?: string; error_description?: string; msg?: string };
  const m = o.message || o.error_description || o.msg || 'Error de servidor';
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo antes de iniciar sesión (revisa tu bandeja de entrada).';
  if (/User already registered/i.test(m)) return 'Ya existe una cuenta con este correo. Inicia sesión.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Comprueba internet y vuelve a intentarlo.';
  return m;
}
