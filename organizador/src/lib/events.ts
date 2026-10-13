import * as Calendar from 'expo-calendar';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  deleteEvent as deleteLocalEvent,
  eventsBetween as localEventsBetween,
  getEvent as getLocalEvent,
  getSetting,
  saveEvent as saveLocalEvent,
  setSetting,
  type CalendarEvent,
  type EventInput,
} from '../db/repo';
import {
  compareEvents,
  deviceIdOf,
  fromDevice,
  isDeviceId,
  toDeviceDates,
  type AgendaEvent,
} from './calendarMapping';
import { addDays, fromISODate } from './dates';

export type { AgendaEvent } from './calendarMapping';

// Con el calendario activado, la fuente de verdad de los eventos es el calendario del teléfono
// (Google, Xiaomi…): Organizador lee y escribe ahí directamente, sin copias que sincronizar.

export type CalendarSettings = {
  enabled: boolean;
  visibleIds: string[]; // calendarios que se muestran
  targetId: string | null; // dónde se crean los eventos nuevos
};

const SETTINGS_KEY = 'calendar';
const DEFAULT_SETTINGS: CalendarSettings = { enabled: false, visibleIds: [], targetId: null };

export function getCalendarSettings(db: SQLiteDatabase) {
  return getSetting<CalendarSettings>(db, SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function setCalendarSettings(db: SQLiteDatabase, s: CalendarSettings) {
  return setSetting(db, SETTINGS_KEY, s);
}

export async function hasCalendarPermission(): Promise<boolean> {
  try {
    return (await Calendar.getCalendarPermissions()).granted;
  } catch {
    return false; // web / Expo Go sin el módulo
  }
}

export async function requestCalendarPermission(): Promise<boolean> {
  return (await Calendar.requestCalendarPermissions()).granted;
}

export type DeviceCalendar = {
  id: string;
  title: string;
  color?: string;
  account: string;
  writable: boolean;
  isPrimary: boolean;
};

export async function listDeviceCalendars(): Promise<DeviceCalendar[]> {
  const cals = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  return cals
    .map((c) => ({
      id: c.id,
      title: c.title || c.name || 'Calendario',
      color: c.color,
      account: c.source?.name ?? c.ownerAccount ?? '',
      writable: c.allowsModifications,
      isPrimary: !!c.isPrimary,
    }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.title.localeCompare(b.title));
}

/** Calendario sugerido para guardar: el principal de una cuenta (Google), si no cualquiera editable. */
export function suggestTarget(cals: DeviceCalendar[]): string | null {
  const writable = cals.filter((c) => c.writable);
  return (writable.find((c) => c.isPrimary) ?? writable[0])?.id ?? null;
}

/** Calendario activo y con permiso; si no, se trabaja con los eventos locales. */
async function activeSettings(db: SQLiteDatabase): Promise<CalendarSettings | null> {
  const s = await getCalendarSettings(db);
  if (!s.enabled || !(await hasCalendarPermission())) return null;
  return s;
}

function fromLocal(e: CalendarEvent): AgendaEvent {
  return {
    id: e.id,
    source: 'local',
    title: e.title,
    date: e.date,
    end_date: e.date,
    start_time: e.start_time,
    end_time: e.end_time,
    location: e.location,
    notes: e.notes,
    readOnly: false,
  };
}

export async function listAgendaEvents(db: SQLiteDatabase, from: string, to: string): Promise<AgendaEvent[]> {
  const s = await activeSettings(db);
  if (!s) return (await localEventsBetween(db, from, to)).map(fromLocal);
  if (s.visibleIds.length === 0) return [];

  const [cals, events] = await Promise.all([
    Calendar.getCalendars(Calendar.EntityTypes.EVENT),
    Calendar.listEvents(s.visibleIds, fromISODate(from), fromISODate(addDays(to, 1))),
  ]);
  const byId = new Map(cals.map((c) => [c.id, c]));
  return events
    .map((ev) => {
      const cal = byId.get(ev.calendarId);
      return fromDevice(ev, { title: cal?.title, color: cal?.color, allowsModifications: cal?.allowsModifications });
    })
    // El rango pedido al proveedor es amplio (los "todo el día" están en UTC): se recorta acá.
    .filter((e) => e.end_date >= from && e.date <= to)
    .sort(compareEvents);
}

export async function getAgendaEvent(db: SQLiteDatabase, id: string): Promise<AgendaEvent | null> {
  if (!isDeviceId(id)) {
    const e = await getLocalEvent(db, id);
    return e ? fromLocal(e) : null;
  }
  try {
    const ev = await Calendar.ExpoCalendarEvent.get(deviceIdOf(id));
    const cal = await Calendar.ExpoCalendar.get(ev.calendarId).catch(() => null);
    return fromDevice(ev, { title: cal?.title, color: cal?.color, allowsModifications: cal?.allowsModifications });
  } catch {
    return null;
  }
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Crea o actualiza. Devuelve el id (en el calendario del teléfono si está activado). */
export async function saveAgendaEvent(db: SQLiteDatabase, id: string | null, input: EventInput): Promise<string> {
  if (id && !isDeviceId(id)) return saveLocalEvent(db, id, input);

  const s = id ? await getCalendarSettings(db) : await activeSettings(db);
  if (!id && !s) return saveLocalEvent(db, null, input);

  const fields = {
    title: input.title,
    location: input.location,
    notes: input.notes,
    ...toDeviceDates(input, deviceTimeZone()),
  };
  if (id) {
    const ev = await Calendar.ExpoCalendarEvent.get(deviceIdOf(id));
    await ev.update(fields);
    return id;
  }
  if (!s?.targetId) throw new Error('Elegí en Ajustes en qué calendario guardar los eventos nuevos.');
  const cal = await Calendar.ExpoCalendar.get(s.targetId);
  const created = await cal.createEvent(fields);
  return 'd-' + created.id;
}

export async function deleteAgendaEvent(db: SQLiteDatabase, id: string): Promise<void> {
  if (!isDeviceId(id)) return deleteLocalEvent(db, id);
  const ev = await Calendar.ExpoCalendarEvent.get(deviceIdOf(id));
  await ev.delete();
}

export async function countLocalEvents(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM events');
  return row?.n ?? 0;
}

/** Al activar el calendario: pasa los eventos de Organizador al calendario elegido y los borra de acá. */
export async function moveLocalEventsToDevice(db: SQLiteDatabase, targetId: string): Promise<number> {
  const cal = await Calendar.ExpoCalendar.get(targetId);
  const rows = await db.getAllAsync<CalendarEvent>('SELECT * FROM events ORDER BY date');
  const tz = deviceTimeZone();
  let moved = 0;
  for (const e of rows) {
    await cal.createEvent({ title: e.title, location: e.location, notes: e.notes, ...toDeviceDates(e, tz) });
    // Se borra de a uno: si algo falla a mitad de camino, no quedan duplicados de lo ya movido.
    await deleteLocalEvent(db, e.id);
    moved++;
  }
  return moved;
}
