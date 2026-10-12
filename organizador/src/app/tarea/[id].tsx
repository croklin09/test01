import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { PRIORITY_LABEL } from '../../components/theme';
import { Button, ChipRow, DateField, Field, OptionRow, Screen, Text } from '../../components/ui';
import { deleteTask, getTask, saveTask, taskLists, type Priority } from '../../db/repo';
import { isValidISODate } from '../../lib/dates';

const PRIORITY_DESCRIPTION: Record<Priority, string> = {
  1: 'Urgente, no puede esperar',
  2: 'Importante, esta semana',
  3: 'Cuando haya tiempo',
};

export default function TareaEditor() {
  const db = useSQLiteContext();
  const { id, due } = useLocalSearchParams<{ id: string; due?: string }>();
  const isNew = id === 'nueva';

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [list, setList] = useState('General');
  const [priority, setPriority] = useState<Priority>(2);
  const [dueDate, setDueDate] = useState<string | null>(due && isValidISODate(due) ? due : null);
  const [lists, setLists] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    taskLists(db).then(setLists);
    if (isNew) return;
    getTask(db, id).then((task) => {
      if (!task) return router.back();
      setTitle(task.title);
      setNotes(task.notes);
      setList(task.list);
      setPriority(task.priority);
      setDueDate(task.due_date);
    });
  }, [db, id, isNew]);

  async function save() {
    if (!title.trim()) return setError('El título es obligatorio.');
    await saveTask(db, isNew ? null : id, {
      title: title.trim(),
      notes: notes.trim(),
      list: list.trim() || 'General',
      priority,
      due_date: dueDate,
    });
    router.back();
  }

  function remove() {
    Alert.alert('Eliminar tarea', '¿Seguro? No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(db, id);
          router.back();
        },
      },
    ]);
  }

  const listOptions = Array.from(new Set(['General', ...lists])).map((l) => ({ value: l, label: l }));

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'Nueva tarea' : 'Editar tarea' }} />
      <Field
        label="Título"
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          setError(undefined);
        }}
        autoFocus={isNew}
        placeholder="¿Qué hay que hacer?"
        error={error}
      />
      <DateField label="Vence" value={dueDate} onChange={setDueDate} optional />
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '800' }}>¿Qué tan importante es?</Text>
        {([1, 2, 3] as Priority[]).map((p) => (
          <OptionRow
            key={p}
            label={PRIORITY_DESCRIPTION[p]}
            sublabel={`Prioridad ${PRIORITY_LABEL[p].toLowerCase()}`}
            checked={priority === p}
            onPress={() => setPriority(p)}
          />
        ))}
      </View>
      <Field label="Lista" value={list} onChangeText={setList} placeholder="General, Casa, Salud, Finanzas…" />
      {listOptions.length > 1 && <ChipRow options={listOptions} value={list} onChange={setList} />}
      <Field label="Notas" value={notes} onChangeText={setNotes} multiline placeholder="Detalles opcionales" />
      <Button title="Guardar" icon="checkmark" onPress={save} />
      {!isNew && <Button title="Eliminar" variant="danger" icon="trash-outline" onPress={remove} />}
    </Screen>
  );
}
