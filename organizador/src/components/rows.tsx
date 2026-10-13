import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { HabitWithStatus, Task } from '../db/repo';
import type { AgendaEvent } from '../lib/calendarMapping';
import { formatRelative, fromISODate, today } from '../lib/dates';
import { PRIORITY_LABEL, priorityColor, useTheme } from './theme';
import { Check, Meta, OptionRow, Pill, SessionCard, Text, Tile } from './ui';

export function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const t = useTheme();
  const overdue = !task.done && task.due_date !== null && task.due_date < today();
  return (
    <SessionCard
      title={task.title}
      done={!!task.done}
      onPress={() => router.push(`/tarea/${task.id}`)}
      left={<Check checked={!!task.done} onPress={onToggle} color={priorityColor(t, task.priority)} />}
      meta={
        <View style={styles.metaRow}>
          {task.due_date ? (
            <Meta icon={overdue ? 'alert-circle' : 'calendar-outline'} color={overdue ? t.danger : undefined}>
              {overdue ? `Vencida · ${formatRelative(task.due_date)}` : formatRelative(task.due_date)}
            </Meta>
          ) : null}
          <Meta icon="flag-outline" color={priorityColor(t, task.priority)}>
            {PRIORITY_LABEL[task.priority]}
          </Meta>
        </View>
      }
      footer={
        task.list !== 'General' ? (
          <Pill bg={t.accents.tareas.tile} color={t.accents.tareas.tileInk}>
            {task.list}
          </Pill>
        ) : null
      }
    />
  );
}

export function EventCard({ event, day }: { event: AgendaEvent; day?: string }) {
  const t = useTheme();
  const a = t.accents.agenda;
  return (
    <SessionCard
      title={event.title}
      onPress={() => router.push(`/evento/${event.id}`)}
      meta={
        <View style={{ gap: 4 }}>
          <Meta icon="time-outline">{eventTimeLabel(event, day)}</Meta>
          {event.location ? <Meta icon="location-outline">{event.location}</Meta> : null}
          {event.calendarTitle ? (
            <View style={styles.calRow}>
              <View style={[styles.calDot, { backgroundColor: event.color ?? t.muted }]} />
              <Text numberOfLines={1} style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>
                {event.calendarTitle}
              </Text>
            </View>
          ) : null}
        </View>
      }
      tile={
        <Tile color={a.tile}>
          {event.start_time && (!day || day === event.date) ? (
            <Text style={{ color: a.tileInk, fontWeight: '800', fontSize: 18 }}>{event.start_time}</Text>
          ) : (
            <Ionicons name="sunny" size={30} color={a.tileInk} />
          )}
        </Tile>
      }
    />
  );
}

export function HabitOption({ habit, onToggle }: { habit: HabitWithStatus; onToggle: () => void }) {
  const t = useTheme();
  return (
    <OptionRow
      label={habit.name}
      sublabel={habit.dueToday ? undefined : 'No programado hoy'}
      checked={habit.doneToday}
      onPress={onToggle}
      onLongPress={() => router.push(`/habito/${habit.id}`)}
      right={
        habit.streak > 0 ? (
          <View style={styles.streak}>
            <Ionicons name="flame" size={15} color={t.warning} />
            <Text style={{ color: t.warning, fontWeight: '800' }}>{habit.streak}</Text>
          </View>
        ) : null
      }
    />
  );
}

/**
 * Paso de una línea de tiempo vertical: punto (lleno = actual, check = hecho) y guía punteada.
 */
export function TimelineItem({
  state,
  last,
  children,
}: {
  state: 'done' | 'current' | 'upcoming';
  last?: boolean;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 22, alignItems: 'center' }}>
        <View style={{ height: 34, justifyContent: 'center' }}>
          {state === 'done' ? (
            <View style={[styles.node, { backgroundColor: t.success, borderColor: t.success }]}>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            </View>
          ) : (
            <View
              style={[
                styles.node,
                state === 'current'
                  ? { backgroundColor: t.sun, borderColor: t.sun }
                  : { backgroundColor: t.bg, borderColor: t.muted },
              ]}
            />
          )}
        </View>
        {!last && (
          // Guía punteada con puntos reales: los bordes `dashed` de un solo lado no se dibujan en Android.
          <View style={styles.rail}>
            {RAIL_DOTS.map((i) => (
              <View key={i} style={[styles.railDot, { backgroundColor: t.border }]} />
            ))}
          </View>
        )}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 12 }}>{children}</View>
    </View>
  );
}

/** "09:00 – 10:00", "Todo el día", o "Día 2 de 3" en eventos de varios días. */
function eventTimeLabel(e: AgendaEvent, day?: string): string {
  if (e.date !== e.end_date) {
    if (day && day !== e.date) {
      const total = daysBetween(e.date, e.end_date) + 1;
      return `Día ${daysBetween(e.date, day) + 1} de ${total}`;
    }
    if (!e.start_time) return `Todo el día · hasta el ${formatRelative(e.end_date).toLowerCase()}`;
  }
  if (!e.start_time) return 'Todo el día';
  return e.end_time ? `${e.start_time} – ${e.end_time}` : e.start_time;
}

function daysBetween(a: string, b: string): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000);
}

const RAIL_DOTS = Array.from({ length: 40 }, (_, i) => i);

const styles = StyleSheet.create({
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calDot: { width: 8, height: 8, borderRadius: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  node: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  // Absoluta: así los puntos no aportan altura y la guía se estira lo que mida la tarjeta.
  rail: { position: 'absolute', top: 38, bottom: 0, overflow: 'hidden', alignItems: 'center', gap: 5 },
  railDot: { width: 3, height: 3, borderRadius: 1.5 },
});
