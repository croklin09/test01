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

// ---------- Varias animaciones (una al azar cada vez) ----------

const IMAGES_KEY = 'fueguito.images';

/** Animaciones elegidas por la persona. Incluye la elegida con la versión anterior (una sola imagen). */
export async function getFueguitoImages(db: SQLiteDatabase): Promise<FueguitoMedia[]> {
  let list = await getSetting<FueguitoMedia[]>(db, IMAGES_KEY, []);
  const legacy = await getSetting<FueguitoMedia | null>(db, KEYS.image, null);
  if (legacy) {
    list = [...list, legacy];
    await setSetting(db, IMAGES_KEY, list);
    await setSetting(db, KEYS.image, null);
  }
  return list.filter((m) => new File(m.uri).exists);
}

/** Selector múltiple: copia cada imagen a la carpeta privada y las suma a la lista. */
export async function addFueguitoImages(db: SQLiteDatabase): Promise<number> {
  const picked = await File.pickFileAsync({ mimeTypes: MIME.image, multipleFiles: true });
  if (picked.canceled || !picked.result) return 0;
  const added: FueguitoMedia[] = [];
  for (const [i, source] of picked.result.entries()) {
    const ext = /\.[a-z0-9]{2,4}$/i.exec(source.name)?.[0] ?? DEFAULT_EXT.image;
    const dest = new File(Paths.document, `fueguito-image-${Date.now()}-${i}${ext}`);
    await source.copy(dest);
    added.push({ uri: dest.uri, name: source.name || 'Animación' });
  }
  const list = await getFueguitoImages(db);
  await setSetting(db, IMAGES_KEY, [...list, ...added]);
  return added.length;
}

export async function removeFueguitoImage(db: SQLiteDatabase, uri: string): Promise<void> {
  const list = await getFueguitoImages(db);
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // archivo huérfano en la carpeta privada: no afecta
  }
  await setSetting(db, IMAGES_KEY, list.filter((m) => m.uri !== uri));
}
