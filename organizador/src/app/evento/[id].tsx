import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, View } from 'react-native';

import { useTheme } from '../../components/theme';
import { Button, Card, DateField, Field, Screen, Text } from '../../components/ui';
import { deleteAgendaEvent, getAgendaEvent, getCalendarSettings, saveAgendaEvent } from '../../lib/events';
import { isValidISODate, isValidTime, today } from '../../lib/dates';

export default function EventoEditor() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { id, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
  const isNew = id === 'nuevo';

  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string>(dateParam && isValidISODate(dateParam) ? dateParam : today());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calendarTitle, setCalendarTitle] = useState<string>();
  const [lockReason, setLockReason] = useState<string>();
  const [phoneCalendar, setPhoneCalendar] = useState(false);

  useEffect(() => {
    if (isNew) {
      getCalendarSettings(db).then((s) => setPhoneCalendar(s.enabled));
      return;
    }
    getAgendaEvent(db, id).then((e) => {
      if (!e) return router.back();
      setCalendarTitle(e.calendarTitle);
      // Este editor maneja eventos de un solo día; series y eventos largos se editan en la app de calendario.
      if (e.readOnly) setLockReason('Es un evento repetido o de un calendario de solo lectura.');
      else if (e.date !== e.end_date) setLockReason('Es un evento de varios días.');
      setTitle(e.title);
      setDate(e.date);
      setStart(e.start_time ?? '');
      setEnd(e.end_time ?? '');
      setLocation(e.location);
      setNotes(e.notes);
    });
  }, [db, id, isNew]);

  async function save() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'El título es obligatorio.';
    if (start && !isValidTime(start)) errs.start = 'Formato HH:MM (ej. 09:30).';
    if (end && !isValidTime(end)) errs.end = 'Formato HH:MM.';
    if (end && !start) errs.start = 'Indicá el inicio si cargás un fin.';
    if (start && end && isValidTime(start) && isValidTime(end) && end <= start) errs.end = 'Debe ser posterior al inicio.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await saveAgendaEvent(db, isNew ? null : id, {
        title: title.trim(),
        date,
        start_time: start || null,
        end_time: end || null,
        location: location.trim(),
        notes: notes.trim(),
      });
      router.back();
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : String(e));
    }
  }

  function remove() {
    Alert.alert('Eliminar evento', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAgendaEvent(db, id);
            router.back();
          } catch (e) {
            Alert.alert('No se pudo eliminar', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'Nuevo evento' : lockReason ? 'Evento' : 'Editar evento' }} />
      {calendarTitle || (isNew && phoneCalendar) ? (
        <Card alt style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
          <Ionicons name={lockReason ? 'lock-closed-outline' : 'calendar-outline'} size={20} color={t.muted} />
          <Text style={{ flex: 1, color: t.muted, fontWeight: '600' }}>
            {lockReason
              ? `${lockReason} Editalo desde tu app de calendario.`
              : calendarTitle
                ? `Calendario: ${calendarTitle}. Los cambios se guardan en tu calendario del teléfono.`
                : 'Se guarda en tu calendario del teléfono.'}
          </Text>
        </Card>
      ) : null}
      <Field
        label="Título"
        value={title}
        onChangeText={setTitle}
        autoFocus={isNew}
        error={errors.title}
        editable={!lockReason}
      />
      <DateField label="Fecha" value={date} onChange={(v) => setDate(v ?? today())} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Inicio"
            value={start}
            onChangeText={setStart}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            error={errors.start}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Fin"
            value={end}
            onChangeText={setEnd}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            error={errors.end}
          />
        </View>
      </View>
      <Field label="Lugar" value={location} onChangeText={setLocation} />
      <Field label="Notas" value={notes} onChangeText={setNotes} multiline />
      {!lockReason && <Button title="Guardar" icon="checkmark" onPress={save} />}
      {!isNew && !lockReason && <Button title="Eliminar" variant="danger" icon="trash-outline" onPress={remove} />}
    </Screen>
  );
}
