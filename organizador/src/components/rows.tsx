import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Text } from 'react-native';

import type { CalendarEvent, HabitWithStatus, Task } from '../db/repo';
import { formatRelative, today } from '../lib/dates';
import { priorityColor, useTheme } from './theme';
import { Check, ListRow } from './ui';

export function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const t = useTheme();
  const overdue = !task.done && task.due_date !== null && task.due_date < today();
  const parts = [
    task.due_date ? formatRelative(task.due_date) : null,
    task.list !== 'General' ? task.list : null,
  ].filter(Boolean);
  return (
    <ListRow
      left={<Check checked={!!task.done} onPress={onToggle} color={priorityColor(t, task.priority)} />}
      title={task.title}
      subtitle={parts.join(' · ') || undefined}
      strike={!!task.done}
      onPress={() => router.push(`/tarea/${task.id}`)}
      right={overdue ? <Text style={{ color: t.danger, fontSize: 12, fontWeight: '700' }}>Vencida</Text> : null}
    />
  );
}

export function EventRow({ event }: { event: CalendarEvent }) {
  const t = useTheme();
  const time = event.start_time
    ? event.end_time
      ? `${event.start_time}–${event.end_time}`
      : event.start_time
    : 'Todo el día';
  return (
    <ListRow
      left={
        <Text style={{ color: t.primary, fontWeight: '700', width: 52, fontSize: 13 }} numberOfLines={2}>
          {time}
        </Text>
      }
      title={event.title}
      subtitle={event.location || undefined}
      onPress={() => router.push(`/evento/${event.id}`)}
    />
  );
}

export function HabitRow({ habit, onToggle }: { habit: HabitWithStatus; onToggle: () => void }) {
  const t = useTheme();
  return (
    <ListRow
      left={<Check checked={habit.doneToday} onPress={onToggle} />}
      title={habit.name}
      subtitle={habit.dueToday ? undefined : 'No programado hoy'}
      onPress={() => router.push(`/habito/${habit.id}`)}
      right={
        habit.streak > 0 ? (
          <Text style={{ color: t.warning, fontWeight: '700' }}>
            <Ionicons name="flame" size={14} color={t.warning} /> {habit.streak}
          </Text>
        ) : null
      }
    />
  );
}
