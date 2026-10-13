// Conversión entre eventos del calendario del teléfono y el modelo de Organizador.
// Sin dependencias nativas, para poder testearlo en Node.

import { addDays, toISODate } from './dates';

export type AgendaEvent = {
  id: string; // local: id de SQLite · teléfono: "d-<id del proveedor>"
  source: 'local' | 'device';
  title: string;
  date: string; // primer día (YYYY-MM-DD)
  end_date: string; // último día, inclusive
  start_time: string | null; // HH:MM; null = todo el día
  end_time: string | null;
  location: string;
  notes: string;
  calendarTitle?: string;
  color?: string;
  readOnly: boolean;
};

export type DeviceEventLike = {
  id: string;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  recurrenceRule?: unknown;
};

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const utcDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export const DEVICE_PREFIX = 'd-';
export const isDeviceId = (id: string) => id.startsWith(DEVICE_PREFIX);
export const deviceIdOf = (id: string) => id.slice(DEVICE_PREFIX.length);

export function fromDevice(
  ev: DeviceEventLike,
  cal: { title?: string; color?: string; allowsModifications?: boolean } = {},
): AgendaEvent {
  const start = new Date(ev.startDate);
  const end = new Date(ev.endDate);
  let date: string;
  let endDate: string;
  let startTime: string | null = null;
  let endTime: string | null = null;
  if (ev.allDay) {
    // Android guarda los eventos de todo el día a medianoche UTC y con fin exclusivo:
    // leerlos en hora local (UTC−3) los correría al día anterior.
    date = utcDate(start);
    endDate = end > start ? addDays(utcDate(end), -1) : date;
    if (endDate < date) endDate = date;
  } else {
    date = toISODate(start);
    startTime = hhmm(start);
    const endsAtMidnight = end.getHours() === 0 && end.getMinutes() === 0 && end > start;
    endDate = endsAtMidnight ? addDays(toISODate(end), -1) : toISODate(end);
    if (endDate < date) endDate = date;
    endTime = end > start ? (endsAtMidnight ? '23:59' : hhmm(end)) : null;
  }
  return {
    id: DEVICE_PREFIX + ev.id,
    source: 'device',
    title: ev.title || '(Sin título)',
    date,
    end_date: endDate,
    start_time: startTime,
    end_time: endTime,
    location: ev.location ?? '',
    notes: ev.notes ?? '',
    calendarTitle: cal.title,
    color: cal.color,
    // Las series repetidas se editan en la app de calendario: editarlas acá cambiaría toda la serie.
    readOnly: cal.allowsModifications === false || !!ev.recurrenceRule,
  };
}

export type EventFields = {
  date: string;
  start_time: string | null;
  end_time: string | null;
};

/** Fechas para crear/actualizar un evento del teléfono a partir de los campos del editor. */
export function toDeviceDates(f: EventFields, timeZone: string) {
  const [y, m, d] = f.date.split('-').map(Number);
  if (!f.start_time) {
    return {
      allDay: true,
      startDate: new Date(Date.UTC(y, m - 1, d)),
      endDate: new Date(Date.UTC(y, m - 1, d + 1)),
      timeZone: 'UTC',
    };
  }
  const [sh, sm] = f.start_time.split(':').map(Number);
  const start = new Date(y, m - 1, d, sh, sm);
  let end: Date;
  if (f.end_time) {
    const [eh, em] = f.end_time.split(':').map(Number);
    end = new Date(y, m - 1, d, eh, em);
  } else {
    end = new Date(start.getTime() + 60 * 60 * 1000); // Android exige un fin: 1 h por defecto
  }
  return { allDay: false, startDate: start, endDate: end, timeZone };
}

export function occursOn(ev: AgendaEvent, day: string): boolean {
  return ev.date <= day && day <= ev.end_date;
}

/** Orden de agenda: primero los de todo el día, después por hora. */
export function compareEvents(a: AgendaEvent, b: AgendaEvent): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (!a.start_time !== !b.start_time) return a.start_time ? 1 : -1;
  return (a.start_time ?? '').localeCompare(b.start_time ?? '');
}
