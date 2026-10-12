import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { useTheme } from '../components/theme';
import { Button, Card, Screen, SectionTitle } from '../components/ui';
import { exportBackup, pickBackupFile, restoreBackup } from '../db/backup';
import { SCHEMA_VERSION } from '../db/schema';

export default function AjustesScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const doExport = () => run(() => exportBackup(db));

  const doImport = () =>
    run(async () => {
      const backup = await pickBackupFile();
      if (!backup) return;
      const total = Object.values(backup.data).reduce((n, rows) => n + (rows?.length ?? 0), 0);
      Alert.alert(
        'Restaurar backup',
        `Backup del ${backup.exportedAt.slice(0, 10)} con ${total} registros.\n\nReemplaza TODOS los datos actuales. Conviene exportar antes.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: () =>
              run(async () => {
                const n = await restoreBackup(db, backup);
                Alert.alert('Listo', `Se restauraron ${n} registros.`);
              }),
          },
        ],
      );
    });

  return (
    <Screen>
      <SectionTitle>Backup</SectionTitle>
      <Text style={{ color: t.muted }}>
        Los datos viven solo en este dispositivo. Exportá un archivo JSON y guardalo en Drive, mail o Archivos para no
        perderlos si cambiás de teléfono.
      </Text>
      <Button title={busy ? 'Procesando…' : 'Exportar backup (JSON)'} icon="share-outline" onPress={doExport} />
      <Button title="Importar backup" variant="ghost" icon="download-outline" onPress={doImport} />

      <SectionTitle>Acerca de</SectionTitle>
      <Card>
        <Text style={{ color: t.muted, padding: 14 }}>
          Organizador v{Constants.expoConfig?.version ?? '?'} · esquema de datos v{SCHEMA_VERSION}
        </Text>
      </Card>
    </Screen>
  );
}
