// Tests de la capa de datos contra SQLite real (node:sqlite). Correr: npm run test:db
// El adapter imita la API async de expo-sqlite que usa la app.
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { migrate, SCHEMA_VERSION } from '../src/db/schema';
import * as R from '../src/db/repo';
import { buildBackup, parseBackup, restoreBackup } from '../src/db/backup';
import { addDays, today, startOfWeek, weekdayIndex, isValidISODate } from '../src/lib/dates';
import { parseCsv, parseCashewCsv, importCashew, getImportRanges, mergeRanges, isCovered, clearCashew } from '../src/db/cashew';
import { fromDevice, toDeviceDates, occursOn } from '../src/lib/calendarMapping';
import { buildDays, summarize, findInsights } from '../src/lib/insights';
import { mainCurrency } from '../src/lib/money';

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
// ---------- v2: ajustes y ánimo ----------
assert.equal(SCHEMA_VERSION, 2);
assert.deepEqual(await R.getSetting(db, 'x', { a: 1 }), { a: 1 });
await R.setSetting(db, 'x', { a: 2 });
await R.setSetting(db, 'x', { a: 3 }); // upsert
assert.deepEqual(await R.getSetting(db, 'x', null), { a: 3 });
await R.setMood(db, t, 4);
await R.setMood(db, t, 5);
assert.equal((await R.getCheckin(db, t))!.mood, 5);
await R.setMood(db, t, null);
assert.equal(await R.getCheckin(db, t), null);
await assert.rejects(db.runAsync('INSERT INTO checkins (date, mood, updated_at) VALUES (?, 9, ?)', t, t), /CHECK/);

// Migración desde una base v1 con datos: los conserva y llega a v2
const old = adapter(new DatabaseSync(':memory:'));
await old.execAsync(
  "CREATE TABLE tasks (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, created_at TEXT, updated_at TEXT);" +
    "INSERT INTO tasks (id, title) VALUES ('t1', 'vieja'); PRAGMA user_version = 1;",
);
await migrate(old);
assert.equal((await old.getFirstAsync('PRAGMA user_version')).user_version, 2);
assert.equal((await old.getFirstAsync('SELECT title FROM tasks')).title, 'vieja');

// ---------- Cashew: CSV con el formato de ListToCsvConverter (CRLF, comillas) ----------
assert.deepEqual(parseCsv('a,b\r\n"x, y","di ""hola"""\r\n"multi\nlinea",2'), [
  ['a', 'b'],
  ['x, y', 'di "hola"'],
  ['multi\nlinea', '2'],
]);
const H = 'account,amount,currency,title,note,date,income,type,category name,subcategory name,color,icon,emoji,budget,objective';
const row = (amount: string, date: string, income: string, type: string, cat: string, title = 'x', cur = 'ars') =>
  `Banco,${amount},${cur},"${title}",,${date},${income},${type},${cat},,,,,,`;
const d1 = addDays(t, -3), d2 = addDays(t, -2), d3 = addDays(t, -1);
const csv = [
  H,
  row('-1500.5', `${d1} 13:45:00.000`, 'false', 'null', 'Comida', 'Almuerzo, con amigos'),
  row('-500', `${d1} 23:59:59.999`, 'false', 'null', 'Transporte'),
  row('20000', `${d2} 09:00:00.000`, 'true', 'null', 'Sueldo'),
  row('-3000', `${d2} 10:00:00.000`, 'false', 'null', 'Corrección de saldo'),
  row('-800', `${d3} 10:00:00.000`, 'false', 'TransactionSpecialType.credit', 'Préstamos'),
  row('-100', 'fecha rota', 'false', 'null', 'Comida'),
  row('-50', `${d3} 08:00:00.000`, 'false', 'null', 'Comida', 'café', 'usd'),
].join('\r\n');
const cash = parseCashewCsv('﻿' + csv);
assert.equal(cash.rows.length, 4);
assert.deepEqual(cash.skipped, { transfers: 1, loans: 1, invalid: 1 });
assert.equal(cash.rows[0].title, 'Almuerzo, con amigos');
assert.equal(cash.rows[0].amount, 1500.5);
assert.equal(cash.rows[1].date, d1, '23:59 local sigue siendo el mismo día');
assert.equal(cash.rows[2].isIncome, true);
assert.equal(cash.rows[3].currency, 'USD');
assert.equal(cash.from, d1);
assert.equal(cash.to, d3);
assert.throws(() => parseCashewCsv('foo,bar\n1,2'), /No parece un CSV de Cashew/);

const r1 = await importCashew(db, cash);
assert.equal(r1.count, 4);
await importCashew(db, cash); // reimportar: reemplaza, no duplica
assert.equal((await db.getAllAsync('SELECT * FROM expenses')).length, 4);
assert.deepEqual((await getImportRanges(db)).map((r) => [r.from, r.to]), [[d1, d3]]);
assert.ok(isCovered(await getImportRanges(db), d2));
assert.ok(!isCovered(await getImportRanges(db), t));
assert.deepEqual(
  mergeRanges([
    { from: '2026-01-05', to: '2026-01-10', importedAt: 'a' },
    { from: '2026-01-01', to: '2026-01-04', importedAt: 'b' },
    { from: '2026-02-01', to: '2026-02-02', importedAt: 'c' },
  ]).map((r) => [r.from, r.to]),
  [['2026-01-01', '2026-01-10'], ['2026-02-01', '2026-02-02']],
);
assert.equal(mainCurrency([{ currency: 'ARS' }, { currency: 'USD' }, { currency: 'ARS' }]), 'ARS');

// Backup v2 incluye gastos; un backup v1 (sin esas tablas) sigue restaurando
const b3 = await buildBackup(db);
assert.equal(b3.data.expenses.length, 4);
const db3 = adapter(new DatabaseSync(':memory:'));
await migrate(db3);
await restoreBackup(db3, parseBackup(JSON.stringify({ ...b1, schemaVersion: 1 })));
// Los rangos no viajan en el backup: la cobertura se deduce de los gastos
await restoreBackup(db3, parseBackup(JSON.stringify(b3)));
assert.deepEqual((await getImportRanges(db3)).map((r) => [r.from, r.to]), [[d1, d3]]);
await clearCashew(db);
assert.equal((await db.getAllAsync('SELECT * FROM expenses')).length, 0);

// ---------- Calendario (corre con TZ=America/Argentina/Buenos_Aires, UTC−3) ----------
assert.equal(new Date(2026, 0, 1).getTimezoneOffset(), 180, 'el test debe correr en UTC−3');
// Todo el día en Android: medianoche UTC y fin exclusivo. En hora local serían las 21:00 del día anterior.
const ev = (o: object) => ({ id: '1', title: 'x', location: null, notes: null, allDay: false, ...o }) as any;
const allDay = fromDevice(ev({ id: '7', startDate: '2026-10-12T00:00:00.000Z', endDate: '2026-10-13T00:00:00.000Z', allDay: true }));
assert.deepEqual([allDay.id, allDay.date, allDay.end_date, allDay.start_time], ['d-7', '2026-10-12', '2026-10-12', null]);
const trip = fromDevice(ev({ startDate: '2026-10-12T00:00:00.000Z', endDate: '2026-10-15T00:00:00.000Z', allDay: true }));
assert.equal(trip.end_date, '2026-10-14');
assert.ok(occursOn(trip, '2026-10-13') && !occursOn(trip, '2026-10-15'));
// 23:30 local = 02:30 UTC del día siguiente; termina a medianoche local → mismo día, hasta 23:59
const late = fromDevice(ev({ startDate: '2026-10-13T02:30:00.000Z', endDate: '2026-10-13T03:00:00.000Z' }));
assert.deepEqual([late.date, late.end_date, late.start_time, late.end_time], ['2026-10-12', '2026-10-12', '23:30', '23:59']);
const recurring = fromDevice(ev({ startDate: '2026-10-12T12:00:00Z', endDate: '2026-10-12T13:00:00Z', recurrenceRule: { frequency: 'weekly' } }), { allowsModifications: true });
assert.equal(recurring.readOnly, true, 'las series se editan en la app de calendario');
assert.equal(fromDevice(ev({ startDate: '2026-10-12T12:00:00Z', endDate: '2026-10-12T13:00:00Z' }), { allowsModifications: false }).readOnly, true);
const dd = toDeviceDates({ date: '2026-10-12', start_time: null, end_time: null }, 'tz');
assert.equal(dd.startDate.toISOString(), '2026-10-12T00:00:00.000Z');
assert.equal(dd.endDate.toISOString(), '2026-10-13T00:00:00.000Z');
const dt = toDeviceDates({ date: '2026-10-12', start_time: '09:30', end_time: null }, 'tz');
assert.equal(dt.startDate.toISOString(), '2026-10-12T12:30:00.000Z');
assert.equal(dt.endDate.getTime() - dt.startDate.getTime(), 3600000, 'fin por defecto: 1 h');
// Ida y vuelta: lo que se guarda en el teléfono se lee igual
for (const f of [
  { date: '2026-10-12', start_time: '09:30', end_time: '10:15' },
  { date: '2026-10-12', start_time: null, end_time: null },
]) {
  const back = fromDevice(ev({ ...toDeviceDates(f, 'tz') }));
  assert.deepEqual([back.date, back.end_date, back.start_time, back.end_time], [f.date, f.date, f.start_time, f.end_time]);
}

// ---------- Insights ----------
const hab = [{ id: 'walk', name: 'Caminar', days_mask: R.ALL_DAYS, created_at: '2026-01-01T00:00:00.000Z' }];
const F = '2026-09-01';
const exp: any[] = [], logs: any[] = [], moods: any[] = [];
for (let i = 0; i < 20; i++) {
  const d = addDays(F, i);
  const walked = i % 2 === 0;
  if (walked) logs.push({ habit_id: 'walk', date: d });
  if (i !== 5) exp.push({ date: d, amount: walked ? 1000 : 2000, is_income: 0, currency: 'ARS', category: walked ? 'Súper' : 'Delivery' });
  moods.push({ date: d, mood: walked ? 4 : 2 });
}
exp.push({ date: F, amount: 99999, is_income: 1, currency: 'ARS', category: 'Sueldo' }); // ingreso: no es gasto
exp.push({ date: F, amount: 99999, is_income: 0, currency: 'USD', category: 'Viaje' }); // otra moneda: no se mezcla
const days = buildDays({ from: F, to: addDays(F, 19), expenses: exp, currency: 'ARS', ranges: [{ from: F, to: addDays(F, 14) }], checkins: moods, habits: hab, logs });
assert.equal(days[5].spent, 0, 'día cubierto sin gastos = $0');
assert.equal(days[16].spent, null, 'fuera del rango importado = sin datos');
assert.equal(days[0].spent, 1000);
const sum = summarize(days);
assert.equal(sum.coveredDays, 15);
assert.equal(sum.habitRate, 0.5);
assert.equal(sum.avgMood, 3);
const ins = findInsights(days, hab, exp, 'ARS');
// 1000 vs (6×2000 + un día cubierto en $0)/7 = 1714 → 42 % menos
assert.ok(ins.find((x) => x.kind === 'habit-spend' && /gastás 42 % menos/.test(x.title)), JSON.stringify(ins.map((x) => x.title)));
assert.ok(ins.find((x) => x.kind === 'habit-mood' && /mejor/.test(x.title)));
assert.ok(ins.find((x) => x.kind === 'mood-spend' && /más/.test(x.title)));
assert.ok(ins.find((x) => x.kind === 'category'));
// Hábito creado a mitad de período: los días previos no cuentan como "no cumplido"
const mid = buildDays({ from: F, to: addDays(F, 3), expenses: [], currency: 'ARS', ranges: [], checkins: [], habits: [{ ...hab[0], created_at: new Date(2026, 8, 3).toISOString() }], logs: [] });
assert.deepEqual(mid.map((d) => Object.keys(d.habits).length), [0, 0, 1, 1]);
// Muestra insuficiente: sin hallazgos de cruce
assert.equal(findInsights(days.slice(0, 5), hab, [], 'ARS').length, 0);

console.log('OK');
