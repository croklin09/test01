import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting } from '../db/repo';

// Audio del fueguito: lo elige la persona desde su teléfono y se copia a la carpeta privada de la app
// (no viaja en el backup ni se sube a ningún lado). Guardar una copia evita depender de que el archivo
// original siga existiendo o de permisos de content:// que Android revoca.

export type FueguitoAudio = { uri: string; name: string };
const KEY = 'fueguito.audio';

export async function getFueguitoAudio(db: SQLiteDatabase): Promise<FueguitoAudio | null> {
  const a = await getSetting<FueguitoAudio | null>(db, KEY, null);
  if (!a) return null;
  // Si la app se reinstaló o se borraron datos, la copia ya no está.
  return new File(a.uri).exists ? a : null;
}

/** Selector de audio; devuelve null si se cancela. */
export async function pickFueguitoAudio(db: SQLiteDatabase): Promise<FueguitoAudio | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['audio/*'] });
  if (picked.canceled || !picked.result) return null;
  const source = picked.result;
  const ext = /\.[a-z0-9]{2,4}$/i.exec(source.name)?.[0] ?? '.mp3';
  // Nombre nuevo en cada elección: si se reusara, el reproductor podría quedarse con el audio anterior en caché.
  const dest = new File(Paths.document, `fueguito-${Date.now()}${ext}`);
  await source.copy(dest);
  await removeCopy(db);
  const audio = { uri: dest.uri, name: source.name || 'Audio' };
  await setSetting(db, KEY, audio);
  return audio;
}

export async function clearFueguitoAudio(db: SQLiteDatabase): Promise<void> {
  await removeCopy(db);
  await setSetting(db, KEY, null);
}

async function removeCopy(db: SQLiteDatabase) {
  const prev = await getSetting<FueguitoAudio | null>(db, KEY, null);
  if (!prev) return;
  try {
    const f = new File(prev.uri);
    if (f.exists) f.delete();
  } catch {
    // Si no se puede borrar, solo queda un archivo huérfano en la carpeta privada.
  }
}
