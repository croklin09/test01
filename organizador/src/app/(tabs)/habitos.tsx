import { router } from 'expo-router';
import { View } from 'react-native';

import { HabitOption } from '../../components/rows';
import { useTheme } from '../../components/theme';
import { Card, Empty, Fab, Hero, Screen, SectionTitle, Text } from '../../components/ui';
import { habitLogsBetween, listHabits, toggleHabit } from '../../db/repo';
import { addDays, today, weekdayIndex, WEEKDAYS_SHORT } from '../../lib/dates';
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
  const due = data.filter(({ habit }) => habit.dueToday);
  const done = due.filter(({ habit }) => habit.doneToday).length;
  const best = Math.max(0, ...data.map(({ habit }) => habit.streak));

  return (
    <>
      <Screen
        hero={
          <Hero
            module="habitos"
            eyebrow="Rutina diaria"
            title="Tus hábitos"
            subtitle={data.length ? `${done} de ${due.length} hoy · mejor racha ${best}` : 'Pequeños pasos, todos los días'}
          />
        }
      >
        <SectionTitle>Hoy</SectionTitle>
        {data.length ? (
          <View style={{ gap: 10 }}>
            {data.map(({ habit }) => (
              <HabitOption
                key={habit.id}
                habit={habit}
                onToggle={async () => {
                  await toggleHabit(db, habit.id, date, habit.doneToday);
                  reload();
                }}
              />
            ))}
            <Text style={{ color: t.muted, fontSize: 13, textAlign: 'center', fontWeight: '600' }}>
              Mantené presionado un hábito para editarlo
            </Text>
          </View>
        ) : (
          <Empty icon="moon-outline" text="Creá tu primer hábito con el botón +." />
        )}

        {data.length > 0 && (
          <>
            <SectionTitle>Últimos {DAYS_SHOWN} días</SectionTitle>
            <Card style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 92 }} />
                {days.map((d) => (
                  <Text key={d} style={{ flex: 1, textAlign: 'center', color: t.muted, fontSize: 10, fontWeight: '700' }}>
                    {WEEKDAYS_SHORT[weekdayIndex(d)]}
                  </Text>
                ))}
              </View>
              {data.map(({ habit, history }) => (
                <View key={habit.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text numberOfLines={1} style={{ width: 92, fontSize: 13, fontWeight: '700' }}>
                    {habit.name}
                  </Text>
                  {days.map((d) => {
                    const scheduled = (habit.days_mask & (1 << weekdayIndex(d))) !== 0;
                    const hit = history.has(d);
                    return (
                      <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                        <View
                          accessibilityLabel={`${habit.name} ${d}: ${hit ? 'hecho' : 'no'}`}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: hit ? t.primary : scheduled ? t.chip : 'transparent',
                            borderWidth: d === date ? 2 : 0,
                            borderColor: t.sun,
                          }}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
            </Card>
          </>
        )}
      </Screen>
      <Fab label="Hábito" onPress={() => router.push('/habito/nuevo')} />
    </>
  );
}
