import { router } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { File } from 'expo-file-system';

import { importCashew, parseCashewCsv } from '../db/cashew';
import { formatRelative } from '../lib/dates';

/**
 * Recibe archivos compartidos con Organizador (menú "Compartir" de Android). Si es un CSV de Cashew, ofrece
 * importarlo. Se monta una vez en el layout raíz.
 */
export function IncomingShare() {
  const db = useSQLiteContext();
  const { resolvedSharedPayloads, clearSharedPayloads, isResolving } = useIncomingShare();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (isResolving) return;
    const file = resolvedSharedPayloads.find(
      (p) => p.contentUri && (/csv|text|octet/i.test(p.contentMimeType ?? p.mimeType ?? '') || /\.csv$/i.test(p.originalName ?? '')),
    );
    if (!file?.contentUri || handled.current.has(file.contentUri)) return;
    handled.current.add(file.contentUri);
    const uri = file.contentUri;

    (async () => {
      try {
        const parsed = parseCashewCsv(await new File(uri).text());
        if (!parsed.from || !parsed.to) throw new Error('El archivo no tiene movimientos.');
        const { from, to } = parsed;
        Alert.alert(
          'Importar de Cashew',
          `${parsed.rows.length} movimientos del ${formatRelative(from)} al ${formatRelative(to)}. Los días de este archivo se reemplazan.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: clearSharedPayloads },
            {
              text: 'Importar',
              onPress: async () => {
                try {
                  await importCashew(db, parsed);
                  Alert.alert('Listo', 'Gastos actualizados.', [
                    { text: 'OK' },
                    { text: 'Ver estadísticas', onPress: () => router.push('/estadisticas') },
                  ]);
                } catch (e) {
                  Alert.alert('No se pudo importar', e instanceof Error ? e.message : String(e));
                } finally {
                  clearSharedPayloads();
                }
              },
            },
          ],
        );
      } catch (e) {
        clearSharedPayloads();
        Alert.alert('Archivo no reconocido', e instanceof Error ? e.message : String(e));
      }
    })();
  }, [resolvedSharedPayloads, isResolving, clearSharedPayloads, db]);

  return null;
}
