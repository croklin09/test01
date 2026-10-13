import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { clearCashew, getImportRanges, importCashew, parseCashewCsv, pickCashewCsv, type ImportRange } from '../db/cashew';
import { expenseCoverage } from '../db/repo';
import { formatRelative } from '../lib/dates';
import { clearFueguitoAudio, getFueguitoAudio, pickFueguitoAudio } from '../lib/fueguitoAudio';
import { useQuery } from '../lib/useQuery';
import {
  countLocalEvents,
  getCalendarSettings,
  hasCalendarPermission,
  listDeviceCalendars,
  moveLocalEventsToDevice,
  requestCalendarPermission,
  setCalendarSettings,
  suggestTarget,
  type CalendarSettings,
  type DeviceCalendar,
} from '../lib/events';
import { Fueguito } from './fueguito';
import { useTheme } from './theme';
import { Button, Card, CheckDot, SectionTitle, Text } from './ui';

function errorAlert(title: string, e: unknown) {
  Alert.alert(title, e instanceof Error ? e.message : String(e));
}

// ---------- Calendario del teléfono ----------

export function CalendarSection() {
  const t = useTheme();
  const { data, reload, db } = useQuery(
    async (db) => {
      const settings = await getCalendarSettings(db);
      if (!settings.enabled) return { settings, calendars: [] as DeviceCalendar[], permission: true };
      const permission = await hasCalendarPermission();
      return { settings, calendars: permission ? await listDeviceCalendars() : [], permission };
    },
    'calendar',
    null,
  );

  async function save(next: CalendarSettings) {
    await setCalendarSettings(db, next);
    reload();
  }

  async function enable() {
    if (!(await requestCalendarPermission())) {
      Alert.alert('Sin permiso', 'Sin acceso al calendario, Organizador sigue usando su agenda propia.');
      return;
    }
    const cals = await listDeviceCalendars();
    const targetId = suggestTarget(cals);
    await save({ enabled: true, visibleIds: cals.map((c) => c.id), targetId });

    const pending = await countLocalEvents(db);
    const target = cals.find((c) => c.id === targetId);
    if (pending > 0 && target) {
      Alert.alert(
        'Mover tus eventos',
        `Tenés ${pending} ${pending === 1 ? 'evento' : 'eventos'} en Organizador. ¿Los paso a "${target.title}"? Desde ahora tu agenda vive en el calendario del teléfono.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          {
            text: 'Mover',
            onPress: () =>
              moveLocalEventsToDevice(db, target.id)
                .then((n) => Alert.alert('Listo', `Se movieron ${n} eventos.`))
                .catch((e) => errorAlert('No se pudieron mover', e)),
          },
        ],
      );
    }
  }

  async function toggle(on: boolean) {
    if (!data) return;
    if (on) await enable().catch((e) => errorAlert('Calendario', e));
    else await save({ ...data.settings, enabled: false });
  }

  if (!data) return null;
  const { settings, calendars, permission } = data;
  const writable = calendars.filter((c) => c.writable);

  return (
    <>
      <SectionTitle>Calendario del teléfono</SectionTitle>
      <Card style={{ padding: 16, gap: 10 }}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '800' }}>Usar mi calendario</Text>
            <Text style={{ color: t.muted, fontSize: 13 }}>
              Ves tus eventos de Google / Xiaomi y lo que crees acá se guarda en tu calendario.
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={toggle}
            trackColor={{ true: t.primary, false: t.chip }}
            thumbColor="#FFFFFF"
          />
        </View>
        {settings.enabled && !permission ? (
          <Text style={{ color: t.danger, fontWeight: '700' }}>
            Falta el permiso de calendario. Activalo en Ajustes del sistema → Apps → Organizador → Permisos.
          </Text>
        ) : null}
      </Card>

      {settings.enabled && permission && calendars.length > 0 && (
        <>
          <Text style={styles.label}>Calendarios que se muestran</Text>
          <View style={{ gap: 8 }}>
            {calendars.map((c) => (
              <CalendarRow
                key={c.id}
                cal={c}
                checked={settings.visibleIds.includes(c.id)}
                onPress={() =>
                  save({
                    ...settings,
                    visibleIds: settings.visibleIds.includes(c.id)
                      ? settings.visibleIds.filter((x) => x !== c.id)
                      : [...settings.visibleIds, c.id],
                  })
                }
              />
            ))}
          </View>
          <Text style={styles.label}>Guardar eventos nuevos en</Text>
          <View style={{ gap: 8 }}>
            {writable.map((c) => (
              <CalendarRow
                key={c.id}
                cal={c}
                checked={settings.targetId === c.id}
                onPress={() =>
                  // El calendario destino siempre se muestra: si no, lo que creás "desaparece".
                  save({
                    ...settings,
                    targetId: c.id,
                    visibleIds: settings.visibleIds.includes(c.id)
                      ? settings.visibleIds
                      : [...settings.visibleIds, c.id],
                  })
                }
              />
            ))}
          </View>
        </>
      )}
    </>
  );
}

function CalendarRow({ cal, checked, onPress }: { cal: DeviceCalendar; checked: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.calRow,
        { backgroundColor: checked ? t.cardAlt : t.card, borderColor: checked ? t.cardAlt : t.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={[styles.calDot, { backgroundColor: cal.color ?? t.muted }]} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontWeight: '700' }}>
          {cal.title}
        </Text>
        {cal.account ? (
          <Text numberOfLines={1} style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>
            {cal.account}
            {cal.writable ? '' : ' · solo lectura'}
          </Text>
        ) : null}
      </View>
      <CheckDot checked={checked} size={24} />
    </Pressable>
  );
}

// ---------- Cashew ----------

export function CashewSection() {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const { data, reload, db } = useQuery(
    async (db) => ({ coverage: await expenseCoverage(db), ranges: await getImportRanges(db) }),
    'cashew',
    { coverage: null, ranges: [] as ImportRange[] },
  );
  const { coverage, ranges } = data;

  async function doImport() {
    if (busy) return;
    setBusy(true);
    try {
      const text = await pickCashewCsv();
      if (!text) return;
      const parsed = parseCashewCsv(text);
      const r = await importCashew(db, parsed);
      const skipped = parsed.skipped.transfers + parsed.skipped.loans;
      Alert.alert(
        'Cashew importado',
        `${r.count} movimientos del ${formatRelative(r.from)} al ${formatRelative(r.to)}.` +
          (skipped ? `\n${skipped} transferencias, ajustes o préstamos no se cuentan como gasto.` : '') +
          (parsed.skipped.invalid ? `\n${parsed.skipped.invalid} filas ilegibles se omitieron.` : ''),
      );
      reload();
    } catch (e) {
      errorAlert('No se pudo importar', e);
    } finally {
      setBusy(false);
    }
  }

  function doClear() {
    Alert.alert('Borrar datos de Cashew', 'Se borran los gastos importados (en Cashew no se toca nada).', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => clearCashew(db).then(reload),
      },
    ]);
  }

  return (
    <>
      <SectionTitle>Cashew</SectionTitle>
      <Text style={{ color: t.muted, fontSize: 15, lineHeight: 21 }}>
        En Cashew: Ajustes → Importación y exportación → «Exportar a archivo CSV» (queda en Descargas). Después, en la
        app Archivos, compartí ese CSV con Organizador, o tocá el botón de abajo. Reimportar no duplica.
      </Text>
      {coverage ? (
        <Card alt style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
          <Ionicons name="wallet-outline" size={20} color={t.accents.tareas.tileInk} />
          <Text style={{ flex: 1, fontWeight: '600' }}>
            {coverage.count} movimientos · {ranges.map((r) => `${formatRelative(r.from)} → ${formatRelative(r.to)}`).join(', ')}
          </Text>
        </Card>
      ) : null}
      <Button
        title={busy ? 'Importando…' : coverage ? 'Actualizar desde Cashew (CSV)' : 'Importar CSV de Cashew'}
        icon="cloud-download-outline"
        variant={coverage ? 'ghost' : 'primary'}
        onPress={doImport}
      />
      {coverage ? <Button title="Borrar datos importados" variant="danger" onPress={doClear} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  calDot: { width: 12, height: 12, borderRadius: 6 },
});

// ---------- Fueguito ----------

export function FueguitoSection() {
  const t = useTheme();
  const { data: audio, reload, db } = useQuery((db) => getFueguitoAudio(db), 'fueguito', null);

  const pick = () =>
    pickFueguitoAudio(db)
      .then(reload)
      .catch((e) => errorAlert('No se pudo usar ese audio', e));

  return (
    <>
      <SectionTitle>Fueguito</SectionTitle>
      <Card style={{ padding: 16, gap: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Fueguito size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>Tocá el sol (o la luna) en Hoy</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>
            Se transforma en el fueguito mientras suena tu canción. El audio queda guardado solo en este teléfono.
          </Text>
        </View>
      </Card>
      {audio ? (
        <Card alt style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
          <Ionicons name="musical-notes" size={20} color={t.accents.hoy.tileInk} />
          <Text numberOfLines={1} style={{ flex: 1, fontWeight: '700' }}>
            {audio.name}
          </Text>
        </Card>
      ) : null}
      <Button
        title={audio ? 'Cambiar canción' : 'Elegir canción'}
        icon="musical-note-outline"
        variant={audio ? 'ghost' : 'primary'}
        onPress={pick}
      />
      {audio ? (
        <Button title="Quitar canción" variant="danger" onPress={() => clearFueguitoAudio(db).then(reload)} />
      ) : null}
    </>
  );
}
