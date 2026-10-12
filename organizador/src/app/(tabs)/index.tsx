import { router } from 'expo-router';
import { Text } from 'react-native';

import { EventRow, HabitRow, TaskRow } from '../../components/rows';
import { useTheme } from '../../components/theme';
import { Card, Empty, Fab, Screen, SectionTitle } from '../../components/ui';
import { eventsBetween, listHabits, listTasks, toggleHabit, toggleTask } from '../../db/repo';
import { formatLong, today } from '../../lib/dates';
import { useQuery } from '../../lib/useQuery';

export default function HoyScreen() {
  const t = useTheme();
  const date = today();
  const { data, reload, db } = useQuery(
    async (db) => {
      const [tasks, events, habits] = await Promise.all([
        listTasks(db, 'hoy'),
        eventsBetween(db, date, date),
        listHabits(db, date),
      ]);
      return { tasks, events, habits: habits.filter((h) => h.dueToday) };
    },
    date,
    { tasks: [], events: [], habits: [] },
  );

  const habitsDone = data.habits.filter((h) => h.doneToday).length;

  return (
    <>
      <Screen>
        <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', textTransform: 'capitalize' }}>
          {formatLong(date)}
        </Text>
        <Text style={{ color: t.muted }}>
          {data.tasks.length} tareas · {data.events.length} eventos · hábitos {habitsDone}/{data.habits.length}
        </Text>

        <SectionTitle>Agenda</SectionTitle>
        <Card>
          {data.events.length ? (
            data.events.map((e) => <EventRow key={e.id} event={e} />)
          ) : (
            <Empty icon="calendar-clear-outline" text="Nada agendado hoy." />
          )}
        </Card>

        <SectionTitle>Tareas (hoy y vencidas)</SectionTitle>
        <Card>
          {data.tasks.length ? (
            data.tasks.map((task) => (
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
            <Empty icon="happy-outline" text="Sin tareas para hoy." />
          )}
        </Card>

        <SectionTitle>Hábitos</SectionTitle>
        <Card>
          {data.habits.length ? (
            data.habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                onToggle={async () => {
                  await toggleHabit(db, h.id, date, h.doneToday);
                  reload();
                }}
              />
            ))
          ) : (
            <Empty icon="leaf-outline" text="No hay hábitos programados hoy." />
          )}
        </Card>
      </Screen>
      <Fab onPress={() => router.push(`/tarea/nueva?due=${date}`)} />
    </>
  );
}
