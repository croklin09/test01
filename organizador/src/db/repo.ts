import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays, newId, nowISO, today, weekdayIndex } from '../lib/dates';

// ---------- Tipos ----------

export type Priority = 1 | 2 | 3;

export type Task = {
  id: string;
  title: string;
  notes: string;
  list: string;
  priority: Priority;
  due_date: string | null;
  done: number;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: number;
  created_at: string;
  updated_at: string;
};

export type Habit = {
  id: string;
  name: string;
  days_mask: number;
  archived: number;
  created_at: string;
  updated_at: string;
};

export type HabitLog = { habit_id: string; date: string };

export type HabitWithStatus = Habit & { doneToday: boolean; streak: number; dueToday: boolean };

// ---------- Tareas ----------

export type TaskFilter = 'pendientes' | 'hoy' | 'proximas' | 'hechas';

export function listTasks(db: SQLiteDatabase, filter: TaskFilter): Promise<Task[]> {
  const t = today();
  switch (filter) {
    case 'hoy':
      // Vencidas + hoy.
      return db.getAllAsync<Task>(
        'SELECT * FROM tasks WHERE done = 0 AND due_date IS NOT NULL AND due_date <= ? ORDER BY due_date, priority, created_at',
        t,
      );
    case 'proximas':
      return db.getAllAsync<Task>(
        'SELECT * FROM tasks WHERE done = 0 AND due_date > ? ORDER BY due_date, priority',
        t,
      );
    case 'hechas':
      return db.getAllAsync<Task>('SELECT * FROM tasks WHERE done = 1 ORDER BY done_at DESC LIMIT 200');
    case 'pendientes':
    default:
      // Sin fecha al final; dentro de cada grupo, por prioridad.
      return db.getAllAsync<Task>(
        'SELECT * FROM tasks WHERE done = 0 ORDER BY due_date IS NULL, due_date, priority, created_at',
      );
  }
}

export function tasksDueOn(db: SQLiteDatabase, date: string): Promise<Task[]> {
  return db.getAllAsync<Task>('SELECT * FROM tasks WHERE due_date = ? ORDER BY done, priority', date);
}

export function getTask(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id = ?', id);
}

export type TaskInput = Pick<Task, 'title' | 'notes' | 'list' | 'priority' | 'due_date'>;

export async function saveTask(db: SQLiteDatabase, id: string | null, input: TaskInput): Promise<string> {
  const now = nowISO();
  if (id) {
    await db.runAsync(
      'UPDATE tasks SET title = ?, notes = ?, list = ?, priority = ?, due_date = ?, updated_at = ? WHERE id = ?',
      input.title, input.notes, input.list, input.priority, input.due_date, now, id,
    );
    return id;
  }
  const newTaskId = newId();
  await db.runAsync(
    'INSERT INTO tasks (id, title, notes, list, priority, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    newTaskId, input.title, input.notes, input.list, input.priority, input.due_date, now, now,
  );
  return newTaskId;
}

export async function toggleTask(db: SQLiteDatabase, task: Task): Promise<void> {
  const now = nowISO();
  await db.runAsync(
    'UPDATE tasks SET done = ?, done_at = ?, updated_at = ? WHERE id = ?',
    task.done ? 0 : 1, task.done ? null : now, now, task.id,
  );
}

export async function deleteTask(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}

export async function taskLists(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ list: string }>('SELECT DISTINCT list FROM tasks ORDER BY list');
  return rows.map((r) => r.list);
}

// ---------- Agenda ----------

export function eventsBetween(db: SQLiteDatabase, from: string, to: string): Promise<CalendarEvent[]> {
  return db.getAllAsync<CalendarEvent>(
    'SELECT * FROM events WHERE date BETWEEN ? AND ? ORDER BY date, start_time IS NOT NULL, start_time',
    from, to,
  );
}

export function getEvent(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<CalendarEvent>('SELECT * FROM events WHERE id = ?', id);
}

export type EventInput = Pick<CalendarEvent, 'title' | 'date' | 'start_time' | 'end_time' | 'location' | 'notes'>;

export async function saveEvent(db: SQLiteDatabase, id: string | null, input: EventInput): Promise<string> {
  const now = nowISO();
  if (id) {
    await db.runAsync(
      'UPDATE events SET title = ?, date = ?, start_time = ?, end_time = ?, location = ?, notes = ?, updated_at = ? WHERE id = ?',
      input.title, input.date, input.start_time, input.end_time, input.location, input.notes, now, id,
    );
    return id;
  }
  const eventId = newId();
  await db.runAsync(
    'INSERT INTO events (id, title, date, start_time, end_time, location, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    eventId, input.title, input.date, input.start_time, input.end_time, input.location, input.notes, now, now,
  );
  return eventId;
}

export async function deleteEvent(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM events WHERE id = ?', id);
}

// ---------- Notas ----------

export function listNotes(db: SQLiteDatabase, search: string): Promise<Note[]> {
  const q = `%${search.trim()}%`;
  return db.getAllAsync<Note>(
    'SELECT * FROM notes WHERE title LIKE ? OR body LIKE ? ORDER BY pinned DESC, updated_at DESC',
    q, q,
  );
}

export function getNote(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<Note>('SELECT * FROM notes WHERE id = ?', id);
}

export type NoteInput = Pick<Note, 'title' | 'body' | 'pinned'>;

export async function saveNote(db: SQLiteDatabase, id: string | null, input: NoteInput): Promise<string> {
  const now = nowISO();
  if (id) {
    await db.runAsync(
      'UPDATE notes SET title = ?, body = ?, pinned = ?, updated_at = ? WHERE id = ?',
      input.title, input.body, input.pinned, now, id,
    );
    return id;
  }
  const noteId = newId();
  await db.runAsync(
    'INSERT INTO notes (id, title, body, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    noteId, input.title, input.body, input.pinned, now, now,
  );
  return noteId;
}

export async function deleteNote(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', id);
}

// ---------- Hábitos ----------

export const ALL_DAYS = 0b1111111;

export function isScheduled(mask: number, date: string): boolean {
  return (mask & (1 << weekdayIndex(date))) !== 0;
}

/**
 * Racha: días programados consecutivos cumplidos, contando hacia atrás desde hoy.
 * Si hoy está programado y todavía no se marcó, no corta la racha (el día no terminó).
 */
export function computeStreak(mask: number, doneDates: Set<string>, from: string = today()): number {
  if (mask === 0) return 0;
  let streak = 0;
  let d = from;
  if (isScheduled(mask, d) && !doneDates.has(d)) d = addDays(d, -1);
  for (let i = 0; i < 366 * 2; i++) {
    if (isScheduled(mask, d)) {
      if (!doneDates.has(d)) break;
      streak++;
    }
    d = addDays(d, -1);
  }
  return streak;
}

export async function listHabits(db: SQLiteDatabase, date: string = today()): Promise<HabitWithStatus[]> {
  const habits = await db.getAllAsync<Habit>('SELECT * FROM habits WHERE archived = 0 ORDER BY created_at');
  if (habits.length === 0) return [];
  const since = addDays(date, -366 * 2);
  const logs = await db.getAllAsync<HabitLog>(
    'SELECT habit_id, date FROM habit_logs WHERE date BETWEEN ? AND ?',
    since, date,
  );
  const byHabit = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!byHabit.has(l.habit_id)) byHabit.set(l.habit_id, new Set());
    byHabit.get(l.habit_id)!.add(l.date);
  }
  return habits.map((h) => {
    const done = byHabit.get(h.id) ?? new Set<string>();
    return {
      ...h,
      doneToday: done.has(date),
      dueToday: isScheduled(h.days_mask, date),
      streak: computeStreak(h.days_mask, done, date),
    };
  });
}

export async function habitLogsBetween(db: SQLiteDatabase, habitId: string, from: string, to: string) {
  const rows = await db.getAllAsync<HabitLog>(
    'SELECT habit_id, date FROM habit_logs WHERE habit_id = ? AND date BETWEEN ? AND ?',
    habitId, from, to,
  );
  return new Set(rows.map((r) => r.date));
}

export async function toggleHabit(db: SQLiteDatabase, habitId: string, date: string, done: boolean) {
  if (done) {
    await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?', habitId, date);
  } else {
    await db.runAsync('INSERT OR IGNORE INTO habit_logs (habit_id, date) VALUES (?, ?)', habitId, date);
  }
}

export function getHabit(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<Habit>('SELECT * FROM habits WHERE id = ?', id);
}

export type HabitInput = Pick<Habit, 'name' | 'days_mask'>;

export async function saveHabit(db: SQLiteDatabase, id: string | null, input: HabitInput): Promise<string> {
  const now = nowISO();
  if (id) {
    await db.runAsync(
      'UPDATE habits SET name = ?, days_mask = ?, updated_at = ? WHERE id = ?',
      input.name, input.days_mask, now, id,
    );
    return id;
  }
  const habitId = newId();
  await db.runAsync(
    'INSERT INTO habits (id, name, days_mask, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    habitId, input.name, input.days_mask, now, now,
  );
  return habitId;
}

export async function archiveHabit(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE habits SET archived = 1, updated_at = ? WHERE id = ?', nowISO(), id);
}

export async function deleteHabit(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM habits WHERE id = ?', id);
}

// ---------- Ajustes (clave/valor, por dispositivo) ----------

export async function getSetting<T>(db: SQLiteDatabase, key: string, fallback: T): Promise<T> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(db: SQLiteDatabase, key: string, value: unknown): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, JSON.stringify(value),
  );
}

// ---------- Ánimo diario ----------

export type Mood = 1 | 2 | 3 | 4 | 5;
export type Checkin = { date: string; mood: Mood; note: string; updated_at: string };

export function getCheckin(db: SQLiteDatabase, date: string) {
  return db.getFirstAsync<Checkin>('SELECT * FROM checkins WHERE date = ?', date);
}

export function checkinsBetween(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<Checkin>('SELECT * FROM checkins WHERE date BETWEEN ? AND ? ORDER BY date', from, to);
}

export async function setMood(db: SQLiteDatabase, date: string, mood: Mood | null): Promise<void> {
  if (mood === null) {
    await db.runAsync('DELETE FROM checkins WHERE date = ?', date);
    return;
  }
  await db.runAsync(
    `INSERT INTO checkins (date, mood, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET mood = excluded.mood, updated_at = excluded.updated_at`,
    date, mood, nowISO(),
  );
}

// ---------- Gastos (importados) ----------

export type Expense = {
  id: number;
  date: string;
  occurred_at: string;
  amount: number;
  is_income: number;
  currency: string;
  title: string;
  category: string;
  account: string;
  source: string;
  imported_at: string;
};

export function expensesOn(db: SQLiteDatabase, date: string) {
  return db.getAllAsync<Expense>(
    'SELECT * FROM expenses WHERE date = ? ORDER BY is_income, amount DESC',
    date,
  );
}

export function expensesBetween(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<Expense>('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date', from, to);
}

/** Rango de días cubierto por las importaciones: fuera de él no sabemos si hubo gastos. */
export type ExpenseCoverage = { from: string; to: string; count: number; importedAt: string } | null;

export async function expenseCoverage(db: SQLiteDatabase): Promise<ExpenseCoverage> {
  const row = await db.getFirstAsync<{ from: string | null; to: string | null; count: number; importedAt: string | null }>(
    'SELECT MIN(date) AS "from", MAX(date) AS "to", COUNT(*) AS count, MAX(imported_at) AS importedAt FROM expenses',
  );
  if (!row || !row.from || !row.to) return null;
  return { from: row.from, to: row.to, count: row.count, importedAt: row.importedAt ?? '' };
}

export function habitLogsAllBetween(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<HabitLog>('SELECT habit_id, date FROM habit_logs WHERE date BETWEEN ? AND ?', from, to);
}

export function activeHabits(db: SQLiteDatabase) {
  return db.getAllAsync<Habit>('SELECT * FROM habits WHERE archived = 0 ORDER BY created_at');
}
