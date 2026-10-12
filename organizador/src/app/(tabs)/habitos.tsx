import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { HabitRow } from '../../components/rows';
import { useTheme } from '../../components/theme';
import { Card, Empty, Fab, Screen, SectionTitle } from '../../components/ui';
import { habitLogsBetween, listHabits, toggleHabit } from '../../db/repo';
import { addDays, fromISODate, today, weekdayIndex, WEEKDAYS_SHORT } from '../../lib/dates';
import { useQuery } from '../../lib/useQuery';

const DAYS_SHOWN = 14;

export default function HabitosScreen() {
  const t = useTheme();
  const date = today();
  const from = addDays(date, -(DAYS_SHOWN - 1));
  const { data, reload, db } = useQuery(
    async (db) => {
      const habits = await listHabits(db, date);
      const history = await Promise.all(habits.map((h) => habitLogsBetween(db, h.id, from, date)));
      return habits.map((h, i) => ({ habit: h, history: history[i] }));
    },
    date,
    [],
  );
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(from, i));

  return (
    <>
      <Screen>
        <SectionTitle>Hoy</SectionTitle>
        <Card>
          {data.length ? (
            data.map(({ habit }) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                onToggle={async () => {
                  await toggleHabit(db, habit.id, date, habit.doneToday);
                  reload();
                }}
              />
            ))
          ) : (
            <Empty icon="leaf-outline" text="Creá tu primer hábito con el botón +." />
          )}
        </Card>

        {data.length > 0 && (
          <>
            <SectionTitle>Últimos {DAYS_SHOWN} días</SectionTitle>
            <Card>
              <View style={{ padding: 12, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 90 }} />
                  {days.map((d) => (
                    <Text key={d} style={{ flex: 1, textAlign: 'center', color: t.muted, fontSize: 10 }}>
                      {WEEKDAYS_SHORT[weekdayIndex(d)]}
                    </Text>
                  ))}
                </View>
                {data.map(({ habit, history }) => (
                  <View key={habit.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text numberOfLines={1} style={{ width: 90, color: t.text, fontSize: 13 }}>
                      {habit.name}
                    </Text>
                    {days.map((d) => {
                      const scheduled = (habit.days_mask & (1 << weekdayIndex(d))) !== 0;
                      const done = history.has(d);
                      return (
                        <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                          <View
                            accessibilityLabel={`${habit.name} ${fromISODate(d).getDate()}: ${done ? 'hecho' : 'no'}`}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 4,
                              backgroundColor: done ? t.success : scheduled ? t.chip : 'transparent',
                              borderWidth: d === date ? 1.5 : 0,
                              borderColor: t.primary,
                            }}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}
      </Screen>
      <Fab onPress={() => router.push('/habito/nuevo')} />
    </>
  );
}
