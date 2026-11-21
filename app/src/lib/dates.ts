export function iso(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export const today = () => iso(new Date());
export function shift(day: string, n: number) {
  const d = new Date(day + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function pretty(day: string) {
  const t = today();
  if (day === t) return 'Hoy';
  if (day === shift(t, -1)) return 'Ayer';
  const s = new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function short(day: string) {
  return new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
export function weekdayLetter(day: string) {
  return new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase();
}
/** Últimos n días terminando en `end` (incluido), de más antiguo a más reciente. */
export function lastDays(end: string, n: number) {
  return Array.from({ length: n }, (_, i) => shift(end, i - n + 1));
}
export function daysAgo(day: string) {
  const a = new Date(day + 'T12:00:00').getTime(),
    b = new Date(today() + 'T12:00:00').getTime();
  return Math.round((b - a) / 86400000);
}
export function relative(day: string | null | undefined) {
  if (!day) return 'Sin registros';
  const d = daysAgo(day);
  if (d <= 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  if (d < 7) return 'Hace ' + d + ' días';
  return short(day);
}
