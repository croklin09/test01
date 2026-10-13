import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { nowISO, today } from '../lib/dates';
import { SCHEMA_VERSION } from './schema';

// Orden de inserción: los padres antes que las tablas con FK.
// `settings` queda afuera a propósito: guarda ids del calendario de ESTE teléfono.
const TABLES = ['tasks', 'events', 'notes', 'habits', 'habit_logs', 'checkins', 'expenses'] as const;
type Table = (typeof TABLES)[number];

export type Backup = {
  app: 'organizador';
  schemaVersion: number;
  exportedAt: string;
  data: Record<Table, Record<string, unknown>[]>;
};

export async function buildBackup(db: SQLiteDatabase): Promise<Backup> {
  const data = {} as Backup['data'];
  for (const t of TABLES) {
    data[t] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${t}`);
  }
  return { app: 'organizador', schemaVersion: SCHEMA_VERSION, exportedAt: nowISO(), data };
}

/** Escribe el backup en caché y abre la hoja de compartir del sistema (Drive, mail, Archivos…). */
export async function exportBackup(db: SQLiteDatabase): Promise<void> {
  const backup = await buildBackup(db);
  const file = new File(Paths.cache, `organizador-${today()}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup, null, 2));
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Exportar backup',
    UTI: 'public.json',
  });
}

export function parseBackup(raw: string): Backup {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const b = json as Partial<Backup>;
  if (b?.app !== 'organizador' || typeof b.schemaVersion !== 'number' || typeof b.data !== 'object' || !b.data) {
    throw new Error('El archivo no es un backup de Organizador.');
  }
  if (b.schemaVersion > SCHEMA_VERSION) {
    throw new Error('El backup viene de una versión más nueva de la app. Actualizá la app primero.');
  }
  for (const t of TABLES) {
    const rows = (b.data as Record<string, unknown>)[t];
    if (rows !== undefined && !Array.isArray(rows)) throw new Error(`Tabla "${t}" inválida en el backup.`);
  }
  return b as Backup;
}

/** Reemplaza TODOS los datos por los del backup, en una sola transacción. */
export async function restoreBackup(db: SQLiteDatabase, backup: Backup): Promise<number> {
  let count = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const t of [...TABLES].reverse()) await txn.execAsync(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      const columns = (await txn.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name);
      for (const row of backup.data[t] ?? []) {
        // Solo columnas conocidas: un backup de un esquema anterior puede no traer columnas nuevas (usan DEFAULT).
        const cols = columns.filter((c) => c in row);
        const values = cols.map((c) => row[c] as string | number | null);
        await txn.runAsync(
          `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          values,
        );
        count++;
      }
    }
  });
  return count;
}

/** Abre el selector de archivos; devuelve null si el usuario cancela. */
export async function pickBackupFile(): Promise<Backup | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled || !picked.result) return null;
  return parseBackup(await picked.result.text());
}
