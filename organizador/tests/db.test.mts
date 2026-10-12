// Tests de la capa de datos contra SQLite real (node:sqlite). Correr: npm run test:db
// El adapter imita la API async de expo-sqlite que usa la app.
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { migrate, SCHEMA_VERSION } from '../src/db/schema';
import * as R from '../src/db/repo';
import { buildBackup, parseBackup, restoreBackup } from '../src/db/backup';
import { addDays, today, startOfWeek, weekdayIndex, isValidISODate } from '../src/lib/dates';

function adapter(raw: DatabaseSync): any {
  const flat = (p: any[]) => (p.length === 1 && Array.isArray(p[0]) ? p[0] : p);
  const db: any = {
    execAsync: async (s: string) => raw.exec(s),
    runAsync: async (s: string, ...p: any[]) => raw.prepare(s).run(...flat(p)),
    getAllAsync: async (s: string, ...p: any[]) => raw.prepare(s).all(...flat(p)),
    getFirstAsync: async (s: string, ...p: any[]) => raw.prepare(s).get(...flat(p)) ?? null,
    withTransactionAsync: async (fn: any) => db.withExclusiveTransactionAsync(() => fn()),
    withExclusiveTransactionAsync: async (fn: any) => { raw.exec('BEGIN'); try { await fn(db); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; } },
  };
  return db;
}
const db = adapter(new DatabaseSync(':memory:'));
await migrate(db); await migrate(db); // idempotente
assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, SCHEMA_VERSION);

const t = today();
const a = await R.saveTask(db, null, { title: 'vencida', notes: '', list: 'General', priority: 1, due_date: addDays(t, -2) });
await R.saveTask(db, null, { title: 'hoy', notes: '', list: 'Casa', priority: 2, due_date: t });
await R.saveTask(db, null, { title: 'futura', notes: '', list: 'General', priority: 3, due_date: addDays(t, 3) });
await R.saveTask(db, null, { title: 'sin fecha', notes: '', list: 'General', priority: 2, due_date: null });
assert.deepEqual((await R.listTasks(db, 'hoy')).map((x) => x.title), ['vencida', 'hoy']);
assert.deepEqual((await R.listTasks(db, 'proximas')).map((x) => x.title), ['futura']);
assert.deepEqual((await R.listTasks(db, 'pendientes')).map((x) => x.title), ['vencida', 'hoy', 'futura', 'sin fecha']);
await R.toggleTask(db, (await R.getTask(db, a))!);
assert.deepEqual((await R.listTasks(db, 'hechas')).map((x) => x.title), ['vencida']);
assert.deepEqual(await R.taskLists(db), ['Casa', 'General']);

await R.saveEvent(db, null, { title: 'b', date: t, start_time: '10:00', end_time: null, location: '', notes: '' });
await R.saveEvent(db, null, { title: 'allday', date: t, start_time: null, end_time: null, location: '', notes: '' });
await R.saveEvent(db, null, { title: 'a', date: t, start_time: '08:30', end_time: '09:00', location: '', notes: '' });
assert.deepEqual((await R.eventsBetween(db, t, t)).map((e) => e.title), ['allday', 'a', 'b']);

await R.saveNote(db, null, { title: 'x', body: 'hola mundo', pinned: 0 });
await R.saveNote(db, null, { title: 'fijada', body: '', pinned: 1 });
assert.equal((await R.listNotes(db, ''))[0].title, 'fijada');
assert.deepEqual((await R.listNotes(db, 'mundo')).map((n) => n.title), ['x']);

// Rachas
const set = (...d: number[]) => new Set(d.map((n) => addDays(t, -n)));
assert.equal(R.computeStreak(R.ALL_DAYS, set(0, 1, 2)), 3);
assert.equal(R.computeStreak(R.ALL_DAYS, set(1, 2)), 2, 'hoy sin marcar no corta');
assert.equal(R.computeStreak(R.ALL_DAYS, set(0, 2)), 1);
assert.equal(R.computeStreak(0, set(0)), 0);
const todayBit = 1 << weekdayIndex(t), prevBit = 1 << weekdayIndex(addDays(t, -7));
assert.equal(R.computeStreak(todayBit, set(0, 7, 14)), 3, 'semanal salta días no programados');
assert.equal(prevBit, todayBit);

const h = await R.saveHabit(db, null, { name: 'Leer', days_mask: R.ALL_DAYS });
await R.toggleHabit(db, h, addDays(t, -1), false);
await R.toggleHabit(db, h, t, false);
await R.toggleHabit(db, h, t, false); // INSERT OR IGNORE
let hs = await R.listHabits(db, t);
assert.equal(hs[0].streak, 2); assert.equal(hs[0].doneToday, true);
await R.toggleHabit(db, h, t, true);
hs = await R.listHabits(db, t);
assert.equal(hs[0].doneToday, false); assert.equal(hs[0].streak, 1);

// Backup ida y vuelta (con FK habit_logs → habits)
const b1 = await buildBackup(db);
const parsed = parseBackup(JSON.stringify(b1));
const db2 = adapter(new DatabaseSync(':memory:'));
await migrate(db2);
await R.saveNote(db2, null, { title: 'se pisa', body: '', pinned: 0 });
const n = await restoreBackup(db2, parsed);
const b2 = await buildBackup(db2);
assert.deepEqual(b2.data, b1.data);
assert.equal(n, Object.values(b1.data).reduce((s, r) => s + r.length, 0));
assert.throws(() => parseBackup('{'), /JSON válido/);
assert.throws(() => parseBackup('{"app":"otra"}'), /no es un backup/);
assert.throws(() => parseBackup(JSON.stringify({ ...b1, schemaVersion: 99 })), /más nueva/);

// Fechas
assert.equal(weekdayIndex(startOfWeek('2026-10-15')), 0);
assert.equal(startOfWeek('2026-10-12'), '2026-10-12');
assert.equal(addDays('2026-12-31', 1), '2027-01-01');
assert.ok(!isValidISODate('2026-02-30'));
assert.equal((await db.getAllAsync('SELECT * FROM habit_logs')).length, 1);
await R.deleteHabit(db, h);
assert.equal((await db.getAllAsync('SELECT * FROM habit_logs')).length, 0, 'FK cascade requiere foreign_keys ON');
console.log('OK');
