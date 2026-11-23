import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
const KEY = 'np-theme'; // misma clave que la app clásica

function resolve(t: Theme) {
  return t === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
}

export function applyTheme(t: Theme) {
  const r = resolve(t);
  document.documentElement.dataset.theme = r;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', r === 'dark' ? '#0a110d' : '#17231d');
}

export function getTheme(): Theme {
  try {
    return (localStorage.getItem(KEY) as Theme) || 'system';
  } catch {
    return 'system';
  }
}

export function useTheme() {
  const [t, setT] = useState<Theme>(getTheme);
  useEffect(() => {
    applyTheme(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* */
    }
    if (t !== 'system') return;
    const m = matchMedia('(prefers-color-scheme: dark)');
    const fn = () => applyTheme('system');
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }, [t]);
  return [t, setT] as const;
}
