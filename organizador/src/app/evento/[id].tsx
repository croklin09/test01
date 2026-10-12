import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, DateField, Field, Screen } from '../../components/ui';
import { deleteEvent, getEvent, saveEvent } from '../../db/repo';
import { isValidISODate, isValidTime, today } from '../../lib/dates';

export default function EventoEditor() {
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

  useEffect(() => {
    if (isNew) return;
    getEvent(db, id).then((e) => {
      if (!e) return router.back();
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
    await saveEvent(db, isNew ? null : id, {
      title: title.trim(),
      date,
      start_time: start || null,
      end_time: end || null,
      location: location.trim(),
      notes: notes.trim(),
    });
    router.back();
  }

  function remove() {
    Alert.alert('Eliminar evento', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteEvent(db, id);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'Nuevo evento' : 'Editar evento' }} />
      <Field label="Título" value={title} onChangeText={setTitle} autoFocus={isNew} error={errors.title} />
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
      <Button title="Guardar" icon="checkmark" onPress={save} />
      {!isNew && <Button title="Eliminar" variant="danger" icon="trash-outline" onPress={remove} />}
    </Screen>
  );
}
