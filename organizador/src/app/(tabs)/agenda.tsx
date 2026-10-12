import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EventCard, TaskCard } from '../../components/rows';
import { RADIUS, useTheme } from '../../components/theme';
import { Card, Empty, Fab, Hero, IconButton, Screen, SectionTitle, Text } from '../../components/ui';
import { eventsBetween, tasksDueOn, toggleTask } from '../../db/repo';
import { addDays, formatLong, fromISODate, startOfWeek, today, WEEKDAYS_SHORT } from '../../lib/dates';
import { useQuery } from '../../lib/useQuery';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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
  const d = fromISODate(selected);

  return (
    <>
      <Screen
        hero={
          <Hero
            module="agenda"
            eyebrow={`${MONTHS[d.getMonth()]} ${d.getFullYear()}`}
            title="Tu agenda"
            subtitle={selected === today() ? 'Hoy' : formatLong(selected)}
          />
        }
      >
        <Card style={{ padding: 12, gap: 10 }}>
          <View style={styles.weekHeader}>
            <IconButton
              icon="chevron-back"
              label="Semana anterior"
              color={t.text}
              bg={t.cardAlt}
              onPress={() => setSelected(addDays(selected, -7))}
            />
            <Pressable onPress={() => setSelected(today())} hitSlop={8}>
              <Text style={{ fontWeight: '800', fontSize: 15 }}>
                {selected === today() ? 'Esta semana' : 'Volver a hoy'}
              </Text>
            </Pressable>
            <IconButton
              icon="chevron-forward"
              label="Semana siguiente"
              color={t.text}
              bg={t.cardAlt}
              onPress={() => setSelected(addDays(selected, 7))}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {weekDays.map((day, i) => {
              const active = day === selected;
              const isToday = day === today();
              return (
                <Pressable
                  key={day}
                  onPress={() => setSelected(day)}
                  style={[styles.day, { backgroundColor: active ? t.text : 'transparent' }]}
                >
                  <Text style={{ color: active ? t.bg : t.muted, fontSize: 12, fontWeight: '700' }}>
                    {WEEKDAYS_SHORT[i]}
                  </Text>
                  <Text
                    style={{
                      color: active ? t.bg : isToday ? t.sun : t.text,
                      fontWeight: '800',
                      fontSize: 18,
                    }}
                  >
                    {fromISODate(day).getDate()}
                  </Text>
                  <View
                    style={[styles.busy, { backgroundColor: busyDays.has(day) ? t.sun : 'transparent' }]}
                  />
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionTitle>Eventos</SectionTitle>
        {dayEvents.length ? (
          <View style={{ gap: 12 }}>
            {dayEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </View>
        ) : (
          <Empty icon="calendar-clear-outline" text="Sin eventos este día." />
        )}

        <SectionTitle>Vencen este día</SectionTitle>
        {data.tasks.length ? (
          <View style={{ gap: 12 }}>
            {data.tasks.map((task) => (
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
          <Empty icon="checkmark-circle-outline" text="Ninguna tarea vence este día." />
        )}
      </Screen>
      <Fab label="Evento" onPress={() => router.push(`/evento/nuevo?date=${selected}`)} />
    </>
  );
}

const styles = StyleSheet.create({
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  day: { alignItems: 'center', paddingVertical: 8, width: 42, borderRadius: RADIUS.pill, gap: 1 },
  busy: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
});
