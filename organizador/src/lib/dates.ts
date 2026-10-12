// Fechas en hora local, serializadas como 'YYYY-MM-DD' (orden lexicográfico = cronológico).

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(s: string, days: number): string {
  const d = fromISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(fromISODate(s)) === s;
}

export function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** Lunes de la semana que contiene `s`. */
export function startOfWeek(s: string): string {
  const dow = (fromISODate(s).getDay() + 6) % 7; // 0 = lunes
  return addDays(s, -dow);
}

/** Índice de día 0..6 con lunes = 0. */
export function weekdayIndex(s: string): number {
  return (fromISODate(s).getDay() + 6) % 7;
}

export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAYS_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatLong(s: string): string {
  const d = fromISODate(s);
  return `${WEEKDAYS_LONG[weekdayIndex(s)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatRelative(s: string): string {
  const t = today();
  if (s === t) return 'Hoy';
  if (s === addDays(t, 1)) return 'Mañana';
  if (s === addDays(t, -1)) return 'Ayer';
  const d = fromISODate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function nowISO(): string {
  return new Date().toISOString();
}
