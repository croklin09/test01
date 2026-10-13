import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { EventCard, HabitOption, TaskCard, TimelineItem } from '../../components/rows';
import { useTheme } from '../../components/theme';
import { Card, Empty, Fab, Hero, IconButton, Meta, Screen, SectionTitle, SessionCard, Text, Tile } from '../../components/ui';
import { MoodPicker } from '../../components/mood';
import {
  getCheckin,
  listHabits,
  listTasks,
  setMood,
  tasksDueOn,
  toggleHabit,
  toggleTask,
  type Mood,
  type Task,
} from '../../db/repo';
import { listAgendaEvents, type AgendaEvent } from '../../lib/events';
import { formatLong, today } from '../../lib/dates';
import { useQuery } from '../../lib/useQuery';

type Step = { kind: 'event'; event: AgendaEvent; done: boolean } | { kind: 'task'; task: Task; done: boolean };

function greeting(): string {
  const h = new Date().getHours();
  return h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function HoyScreen() {
  const t = useTheme();
  const date = today();
  const { data, reload, db } = useQuery(
    async (db) => {
      const [pending, dueToday, events, habits, checkin] = await Promise.all([
        listTasks(db, 'hoy'), // pendientes de hoy + vencidas
        tasksDueOn(db, date), // incluye las ya hechas, para que no desaparezcan al tildarlas
        listAgendaEvents(db, date, date).catch(() => [] as AgendaEvent[]),
        listHabits(db, date),
        getCheckin(db, date),
      ]);
      const tasks = [...pending, ...dueToday.filter((x) => x.done)];
      return { tasks, events, habits: habits.filter((h) => h.dueToday), mood: (checkin?.mood ?? null) as Mood | null };
    },
    date,
    { tasks: [], events: [], habits: [], mood: null as Mood | null },
  );

  // Línea de tiempo: eventos en orden horario y después las tareas. El primer paso sin hacer es el "actual".
  const now = nowHHMM();
  const steps: Step[] = [
    ...data.events.map((event) => ({
      kind: 'event' as const,
      event,
      // Termina hoy y ya pasó su hora de fin (los de varios días que siguen mañana no están "hechos").
      done: event.end_date === date && !!event.start_time && (event.end_time ?? event.start_time) < now,
    })),
    ...data.tasks.map((task) => ({ kind: 'task' as const, task, done: !!task.done })),
  ];
  const currentIndex = steps.findIndex((s) => !s.done);

  const habitsDone = data.habits.filter((h) => h.doneToday).length;
  const pendingTasks = data.tasks.filter((x) => !x.done).length;
  const allDone = steps.length + data.habits.length > 0 && pendingTasks === 0 && habitsDone === data.habits.length;

  const subtitle = allDone
    ? 'Todo listo por hoy'
    : `${pendingTasks} ${pendingTasks === 1 ? 'tarea' : 'tareas'} · ${data.events.length} ${
        data.events.length === 1 ? 'evento' : 'eventos'
      } · hábitos ${habitsDone}/${data.habits.length}`;

  return (
    <>
      <Screen
        hero={
          <Hero
            module="hoy"
            eyebrow={formatLong(date)}
            title={greeting()}
            subtitle={subtitle}
            right={
              <IconButton
                icon="settings-outline"
                label="Ajustes"
                color={t.accents.hoy.ink}
                bg="rgba(255,255,255,0.35)"
                onPress={() => router.push('/ajustes')}
              />
            }
          />
        }
      >
        {allDone && (
          <View style={{ alignItems: 'center', gap: 4, paddingVertical: 6 }}>
            <Ionicons name="sparkles" size={22} color={t.success} />
            <Text style={{ color: t.success, fontSize: 17, fontWeight: '700' }}>
              Terminaste todo lo de hoy. ¡Bien ahí!
            </Text>
          </View>
        )}

        <Card style={{ padding: 14, gap: 6 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', textAlign: 'center' }}>¿Cómo te sentís hoy?</Text>
          <MoodPicker
            value={data.mood}
            onChange={async (m) => {
              await setMood(db, date, m);
              reload();
            }}
          />
        </Card>

        <SectionTitle>Tu día</SectionTitle>
        {steps.length ? (
          <View>
            {steps.map((step, i) => (
              <TimelineItem
                key={step.kind === 'event' ? `e-${step.event.id}-${step.event.start_time}` : `t-${step.task.id}`}
                state={step.done ? 'done' : i === currentIndex ? 'current' : 'upcoming'}
                last={i === steps.length - 1}
              >
                {step.kind === 'event' ? (
                  <EventCard event={step.event} day={date} />
                ) : (
                  <TaskCard
                    task={step.task}
                    onToggle={async () => {
                      await toggleTask(db, step.task);
                      reload();
                    }}
                  />
                )}
              </TimelineItem>
            ))}
          </View>
        ) : (
          <Empty icon="cafe-outline" text="Día libre: nada agendado ni pendiente." />
        )}

        <SectionTitle>Tus hábitos</SectionTitle>
        {data.habits.length ? (
          <View style={{ gap: 10 }}>
            {data.habits.map((h) => (
              <HabitOption
                key={h.id}
                habit={h}
                onToggle={async () => {
                  await toggleHabit(db, h.id, date, h.doneToday);
                  reload();
                }}
              />
            ))}
          </View>
        ) : (
          <Empty icon="leaf-outline" text="No hay hábitos programados hoy." />
        )}

        <SectionTitle>Tu progreso</SectionTitle>
        <SessionCard
          title="Estadísticas"
          onPress={() => router.push('/estadisticas')}
          meta={<Meta icon="analytics-outline">Gastos, hábitos y ánimo cruzados</Meta>}
          tile={
            <Tile color={t.accents.hoy.tile}>
              <Ionicons name="bar-chart" size={30} color={t.accents.hoy.tileInk} />
            </Tile>
          }
        />
      </Screen>
      <Fab label="Tarea" onPress={() => router.push(`/tarea/nueva?due=${date}`)} />
    </>
  );
}
