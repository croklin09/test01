import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { TaskRow } from '../../components/rows';
import { useTheme } from '../../components/theme';
import { Card, ChipRow, Empty, Fab, Screen } from '../../components/ui';
import { listTasks, saveTask, toggleTask, type TaskFilter } from '../../db/repo';
import { today } from '../../lib/dates';
import { useQuery } from '../../lib/useQuery';

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'pendientes', label: 'Pendientes' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'proximas', label: 'Próximas' },
  { value: 'hechas', label: 'Hechas' },
];

export default function TareasScreen() {
  const t = useTheme();
  const [filter, setFilter] = useState<TaskFilter>('pendientes');
  const [quick, setQuick] = useState('');
  const { data: tasks, reload, db } = useQuery((db) => listTasks(db, filter), filter, []);

  // Captura rápida estilo bandeja de entrada: enter y listo; los detalles se completan después.
  async function quickAdd() {
    const title = quick.trim();
    if (!title) return;
    await saveTask(db, null, {
      title,
      notes: '',
      list: 'General',
      priority: 2,
      due_date: filter === 'hoy' ? today() : null,
    });
    setQuick('');
    reload();
  }

  return (
    <>
      <Screen>
        <ChipRow options={FILTERS} value={filter} onChange={setFilter} />
        {filter !== 'hechas' && (
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.card }}>
            <TextInput
              value={quick}
              onChangeText={setQuick}
              onSubmitEditing={quickAdd}
              placeholder="Agregar tarea rápida…"
              placeholderTextColor={t.muted}
              returnKeyType="done"
              submitBehavior="submit"
              style={{ color: t.text, padding: 12, fontSize: 16 }}
            />
          </View>
        )}
        <Card>
          {tasks.length ? (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={async () => {
                  await toggleTask(db, task);
                  reload();
                }}
              />
            ))
          ) : (
            <Empty icon="checkmark-done-outline" text="No hay tareas en esta vista." />
          )}
        </Card>
      </Screen>
      <Fab onPress={() => router.push('/tarea/nueva')} />
    </>
  );
}
