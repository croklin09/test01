import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { EventRow, TaskRow } from '../../components/rows';
import { useTheme } from '../../components/theme';
import { Card, Empty, Fab, Screen, SectionTitle } from '../../components/ui';
import { eventsBetween, tasksDueOn, toggleTask } from '../../db/repo';
import { addDays, formatLong, fromISODate, startOfWeek, today, WEEKDAYS_SHORT } from '../../lib/dates';
import { useQuery } from '../../lib/useQuery';

export default function AgendaScreen() {
  const t = useTheme();
  const [selected, setSelected] = useState(today());
  const weekStart = startOfWeek(selected);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data, reload, db } = useQuery(
    async (db) => {
      const [weekEvents, tasks] = await Promise.all([
        eventsBetween(db, weekStart, addDays(weekStart, 6)),
        tasksDueOn(db, selected),
      ]);
      return { weekEvents, tasks };
    },
    selected,
    { weekEvents: [], tasks: [] },
  );

  const busyDays = new Set(data.weekEvents.map((e) => e.date));
  const dayEvents = data.weekEvents.filter((e) => e.date === selected);

  return (
    <>
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => setSelected(addDays(selected, -7))} hitSlop={10} accessibilityLabel="Semana anterior">
            <Ionicons name="chevron-back" size={24} color={t.primary} />
          </Pressable>
          <Pressable onPress={() => setSelected(today())}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 16, textTransform: 'capitalize' }}>
              {formatLong(selected)}
            </Text>
          </Pressable>
          <Pressable onPress={() => setSelected(addDays(selected, 7))} hitSlop={10} accessibilityLabel="Semana siguiente">
            <Ionicons name="chevron-forward" size={24} color={t.primary} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {weekDays.map((d, i) => {
            const active = d === selected;
            const isToday = d === today();
            return (
              <Pressable
                key={d}
                onPress={() => setSelected(d)}
                style={{
                  alignItems: 'center',
                  paddingVertical: 8,
                  width: 44,
                  borderRadius: 12,
                  backgroundColor: active ? t.primary : 'transparent',
                }}
              >
                <Text style={{ color: active ? t.primaryText : t.muted, fontSize: 12 }}>{WEEKDAYS_SHORT[i]}</Text>
                <Text
                  style={{
                    color: active ? t.primaryText : isToday ? t.primary : t.text,
                    fontWeight: '700',
                    fontSize: 17,
                  }}
                >
                  {fromISODate(d).getDate()}
                </Text>
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    marginTop: 3,
                    backgroundColor: busyDays.has(d) ? (active ? t.primaryText : t.primary) : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </View>

        <SectionTitle>Eventos</SectionTitle>
        <Card>
          {dayEvents.length ? (
            dayEvents.map((e) => <EventRow key={e.id} event={e} />)
          ) : (
            <Empty icon="calendar-clear-outline" text="Sin eventos este día." />
          )}
        </Card>

        <SectionTitle>Tareas con vencimiento</SectionTitle>
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
            <Empty icon="checkbox-outline" text="Sin tareas que venzan este día." />
          )}
        </Card>
      </Screen>
      <Fab onPress={() => router.push(`/evento/nuevo?date=${selected}`)} />
    </>
  );
}
