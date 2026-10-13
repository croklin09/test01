import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting } from '../db/repo';

// Canción y animación del fueguito: las elige la persona desde su teléfono y se copian a la carpeta privada de
// la app. No se empaquetan en el APK ni se suben al repo (pueden tener derechos de autor), ni viajan en el
// backup. Guardar una copia evita depender de que el original siga existiendo o de permisos content:// que
// Android revoca.

export type FueguitoMedia = { uri: string; name: string };
export type MediaKind = 'audio' | 'image';

const KEYS: Record<MediaKind, string> = { audio: 'fueguito.audio', image: 'fueguito.image' };
const MIME: Record<MediaKind, string[]> = {
  audio: ['audio/*'],
  image: ['image/gif', 'image/webp', 'image/png', 'image/apng', 'image/*'],
};
const DEFAULT_EXT: Record<MediaKind, string> = { audio: '.mp3', image: '.gif' };

export async function getFueguitoMedia(db: SQLiteDatabase, kind: MediaKind): Promise<FueguitoMedia | null> {
  const m = await getSetting<FueguitoMedia | null>(db, KEYS[kind], null);
  if (!m) return null;
  // Si se borraron los datos de la app, la copia ya no está.
  return new File(m.uri).exists ? m : null;
}

/** Selector de archivos; devuelve null si se cancela. */
export async function pickFueguitoMedia(db: SQLiteDatabase, kind: MediaKind): Promise<FueguitoMedia | null> {
  const picked = await File.pickFileAsync({ mimeTypes: MIME[kind] });
  if (picked.canceled || !picked.result) return null;
  const source = picked.result;
  const ext = /\.[a-z0-9]{2,4}$/i.exec(source.name)?.[0] ?? DEFAULT_EXT[kind];
  // Nombre nuevo en cada elección: si se reusara, el reproductor o la caché de imágenes mostrarían el anterior.
  const dest = new File(Paths.document, `fueguito-${kind}-${Date.now()}${ext}`);
  await source.copy(dest);
  await removeCopy(db, kind);
  const media = { uri: dest.uri, name: source.name || (kind === 'audio' ? 'Audio' : 'Animación') };
  await setSetting(db, KEYS[kind], media);
  return media;
}

export async function clearFueguitoMedia(db: SQLiteDatabase, kind: MediaKind): Promise<void> {
  await removeCopy(db, kind);
  await setSetting(db, KEYS[kind], null);
}

async function removeCopy(db: SQLiteDatabase, kind: MediaKind) {
  const prev = await getSetting<FueguitoMedia | null>(db, KEYS[kind], null);
  if (!prev) return;
  try {
    const f = new File(prev.uri);
    if (f.exists) f.delete();
  } catch {
    // Si no se puede borrar, solo queda un archivo huérfano en la carpeta privada.
  }
}
