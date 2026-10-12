import { useIsFocused } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/**
 * Ejecuta `fn` cuando la pantalla gana foco, cuando cambia `key` o al llamar `reload()`.
 * Las pantallas de edición se apilan encima: al volver, la lista recupera el foco y se refresca sola.
 * `key` resume los parámetros de la consulta (ej. el filtro o el texto buscado).
 */
export function useQuery<T>(fn: (db: SQLiteDatabase) => Promise<T>, key: string, initial: T) {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const [data, setData] = useState<T>(initial);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false; // descarta respuestas viejas si la consulta cambió en el medio
    fn(db).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
    // `fn` es una closure nueva en cada render; su identidad la captura `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key, version, isFocused]);

  return { data, db, reload: () => setVersion((v) => v + 1) };
}
