import type { SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'organizador.db';

// Cada entrada lleva la base de la versión i a la i+1. Nunca editar una migración ya publicada:
// agregar una nueva al final.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    list TEXT NOT NULL DEFAULT 'General',
    priority INTEGER NOT NULL DEFAULT 2,       -- 1 alta · 2 media · 3 baja
    due_date TEXT,                              -- YYYY-MM-DD
    done INTEGER NOT NULL DEFAULT 0,
    done_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_tasks_due ON tasks(done, due_date);

  CREATE TABLE events (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,                         -- YYYY-MM-DD
    start_time TEXT,                            -- HH:MM, NULL = todo el día
    end_time TEXT,
    location TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_events_date ON events(date, start_time);

  CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE habits (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    days_mask INTEGER NOT NULL DEFAULT 127,     -- bit 0 = lunes … bit 6 = domingo
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE habit_logs (
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    PRIMARY KEY (habit_id, date)
  );
  `,
  // v2: ánimo diario, gastos importados de Cashew y ajustes por dispositivo.
  `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE checkins (
    date TEXT PRIMARY KEY NOT NULL,             -- YYYY-MM-DD
    mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
    note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                         -- YYYY-MM-DD, hora local
    occurred_at TEXT NOT NULL,                  -- fecha y hora tal como vino del origen
    amount REAL NOT NULL CHECK (amount >= 0),   -- siempre positivo; el sentido lo da is_income
    is_income INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    account TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'cashew',
    imported_at TEXT NOT NULL
  );
  CREATE INDEX idx_expenses_date ON expenses(source, date);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version > SCHEMA_VERSION) {
    throw new Error(`La base (v${version}) es más nueva que la app (v${SCHEMA_VERSION}).`);
  }
  while (version < SCHEMA_VERSION) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    // Corre en onInit, antes de que cualquier pantalla consulte: no hace falta una transacción exclusiva
    // (que además no existe en web).
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}
