import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays, nowISO, toISODate } from '../lib/dates';
import { expenseCoverage, getSetting, setSetting } from './repo';

// Importa el CSV que genera Cashew (exportCSV.dart). Columnas:
// account, amount, currency, title, note, date, income, type, category name, subcategory name,
// color, icon, emoji, budget, objective. `date` es DateTime.toString() de Dart en hora local:
// "2026-10-12 13:45:00.000". Cashew solo exporta transacciones pagadas.

/** Nombre de la categoría de sistema de Cashew (pk "0") que usa para ajustes de saldo y transferencias. */
const BALANCE_CORRECTION = new Set(['balance correction', 'corrección de saldo', 'correção de saldo']);

export type ParsedTransaction = {
  date: string;
  occurredAt: string;
  amount: number; // positivo
  isIncome: boolean;
  currency: string;
  title: string;
  category: string;
  account: string;
};

export type ParseResult = {
  rows: ParsedTransaction[];
  skipped: { transfers: number; loans: number; invalid: number };
  from: string | null;
  to: string | null;
};

/** Parser CSV RFC 4180: comillas, comillas escapadas ("") y saltos de línea dentro de campos. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // BOM
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** "2026-10-12 13:45:00.000" (o ISO con T) → fecha local. */
export function parseCashewDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s.trim());
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', se = '0'] = m;
  const date = new Date(+y, +mo - 1, +d, +h, +mi, +se);
  return isNaN(date.getTime()) ? null : date;
}

export function parseCashewCsv(text: string): ParseResult {
  const table = parseCsv(text);
  if (table.length === 0) throw new Error('El archivo está vacío.');
  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idx = {
    amount: col('amount'),
    date: col('date'),
    income: col('income'),
    type: col('type'),
    title: col('title'),
    category: col('category name'),
    currency: col('currency'),
    account: col('account'),
  };
  if (idx.amount < 0 || idx.date < 0) {
    throw new Error('No parece un CSV de Cashew: faltan las columnas "amount" y "date".');
  }

  const result: ParseResult = { rows: [], skipped: { transfers: 0, loans: 0, invalid: 0 }, from: null, to: null };
  for (const r of table.slice(1)) {
    const get = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
    const when = parseCashewDate(get(idx.date));
    const raw = Number(get(idx.amount).replace(',', '.'));
    if (!when || !Number.isFinite(raw)) {
      result.skipped.invalid++;
      continue;
    }
    const category = get(idx.category);
    if (BALANCE_CORRECTION.has(category.toLowerCase())) {
      result.skipped.transfers++;
      continue;
    }
    // Préstamos y deudas no son consumo (Cashew también los saca de sus totales).
    const type = get(idx.type).toLowerCase();
    if (type.endsWith('credit') || type.endsWith('debt')) {
      result.skipped.loans++;
      continue;
    }
    const incomeCol = get(idx.income).toLowerCase();
    const isIncome = incomeCol ? incomeCol === 'true' : raw > 0;
    const date = toISODate(when);
    result.rows.push({
      date,
      occurredAt: get(idx.date),
      amount: Math.abs(raw),
      isIncome,
      currency: get(idx.currency).toUpperCase(),
      title: get(idx.title),
      category,
      account: get(idx.account),
    });
    if (!result.from || date < result.from) result.from = date;
    if (!result.to || date > result.to) result.to = date;
  }
  return result;
}

export type ImportRange = { from: string; to: string; importedAt: string };
const RANGES_KEY = 'cashew.imports';

/**
 * Días con datos de Cashew. Si no hay rangos registrados pero sí gastos (backup restaurado en otro
 * teléfono: los ajustes no viajan en el backup), se toma el rango completo de los gastos.
 */
export async function getImportRanges(db: SQLiteDatabase): Promise<ImportRange[]> {
  const ranges = await getSetting<ImportRange[]>(db, RANGES_KEY, []);
  if (ranges.length) return ranges;
  const cov = await expenseCoverage(db);
  return cov ? [{ from: cov.from, to: cov.to, importedAt: cov.importedAt }] : [];
}

export async function clearCashew(db: SQLiteDatabase): Promise<void> {
  await db.runAsync("DELETE FROM expenses WHERE source = 'cashew'");
  await setSetting(db, RANGES_KEY, []);
}

/**
 * Reemplaza los movimientos de Cashew dentro del rango de fechas del archivo (así reimportar no duplica
 * y refleja ediciones hechas en Cashew) y registra el rango como "cubierto".
 */
export async function importCashew(db: SQLiteDatabase, parsed: ParseResult): Promise<ImportRange & { count: number }> {
  if (!parsed.from || !parsed.to || parsed.rows.length === 0) {
    throw new Error('El archivo no tiene movimientos para importar.');
  }
  const { from, to } = parsed;
  const importedAt = nowISO();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM expenses WHERE source = 'cashew' AND date BETWEEN ? AND ?", from, to);
    for (const r of parsed.rows) {
      await db.runAsync(
        `INSERT INTO expenses (date, occurred_at, amount, is_income, currency, title, category, account, source, imported_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'cashew', ?)`,
        r.date, r.occurredAt, r.amount, r.isIncome ? 1 : 0, r.currency, r.title, r.category, r.account, importedAt,
      );
    }
  });
  const range = { from, to, importedAt };
  const ranges = await getSetting<ImportRange[]>(db, RANGES_KEY, []);
  await setSetting(db, RANGES_KEY, mergeRanges([...ranges, range]));
  return { ...range, count: parsed.rows.length };
}

/** Une rangos que se solapan o tocan, para saber qué días tienen datos. */
export function mergeRanges(ranges: ImportRange[]): ImportRange[] {
  const sorted = [...ranges].sort((a, b) => a.from.localeCompare(b.from));
  const out: ImportRange[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.from <= addDays(last.to, 1)) {
      if (r.to > last.to) last.to = r.to;
      if (r.importedAt > last.importedAt) last.importedAt = r.importedAt;
    } else out.push({ ...r });
  }
  return out;
}

export function isCovered(ranges: ImportRange[], date: string): boolean {
  return ranges.some((r) => date >= r.from && date <= r.to);
}

/** Selector de archivos para el CSV exportado por Cashew; null si se cancela. */
export async function pickCashewCsv(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'] });
  if (picked.canceled || !picked.result) return null;
  return picked.result.text();
}
