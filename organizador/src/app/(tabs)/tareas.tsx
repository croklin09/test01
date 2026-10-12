import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TaskCard } from '../../components/rows';
import { RADIUS, useTheme } from '../../components/theme';
import { ChipRow, Empty, Fab, Hero, Input, Screen } from '../../components/ui';
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
      <Screen
        hero={
          <Hero
            module="tareas"
            title="Tus tareas"
            subtitle={filter === 'hechas' ? 'Lo que ya resolviste' : 'Sacalas de la cabeza y anotalas acá'}
          />
        }
      >
        <ChipRow options={FILTERS} value={filter} onChange={setFilter} />
        {filter !== 'hechas' && (
          <View style={[styles.quick, { backgroundColor: t.card, borderColor: t.border }]}>
            <Input
              value={quick}
              onChangeText={setQuick}
              onSubmitEditing={quickAdd}
              placeholder="Agregar tarea rápida…"
              returnKeyType="done"
              submitBehavior="submit"
              style={{ flex: 1, paddingVertical: 14, fontWeight: '600' }}
            />
            <Pressable
              onPress={quickAdd}
              accessibilityLabel="Agregar"
              style={[styles.quickBtn, { backgroundColor: quick.trim() ? t.primary : t.chip }]}
            >
              <Ionicons name="arrow-up" size={20} color={quick.trim() ? t.primaryText : t.muted} />
            </Pressable>
          </View>
        )}
        {tasks.length ? (
          <View style={{ gap: 12 }}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={async () => {
                  await toggleTask(db, task);
                  reload();
                }}
              />
            ))}
          </View>
        ) : (
          <Empty icon="checkmark-done-outline" text="No hay tareas en esta vista." />
        )}
      </Screen>
      <Fab onPress={() => router.push('/tarea/nueva')} />
    </>
  );
}

const styles = StyleSheet.create({
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    paddingLeft: 20,
    paddingRight: 6,
    gap: 8,
  },
  quickBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
