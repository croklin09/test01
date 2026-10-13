import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CompareBars, DailyBars, MoodBars } from '../components/charts';
import { MoodFace, moodInfo } from '../components/mood';
import { useTheme } from '../components/theme';
import { Button, Card, ChipRow, Empty, Screen, SectionTitle, Text } from '../components/ui';
import { getImportRanges } from '../db/cashew';
import { activeHabits, checkinsBetween, expensesBetween, habitLogsAllBetween, type Mood } from '../db/repo';
import { addDays, today } from '../lib/dates';
import { buildDays, findInsights, summarize, type Insight } from '../lib/insights';
import { formatMoney, mainCurrency } from '../lib/money';
import { useQuery } from '../lib/useQuery';

const PERIODS = [
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
];

export default function EstadisticasScreen() {
  const t = useTheme();
  const [period, setPeriod] = useState(30);
  // Hasta ayer: el día de hoy no terminó (ni los gastos, ni los hábitos).
  const to = addDays(today(), -1);
  const from = addDays(to, -(period - 1));

  const { data } = useQuery(
    async (db) => {
      const [expenses, ranges, checkins, habits, logs] = await Promise.all([
        expensesBetween(db, from, to),
        getImportRanges(db),
        checkinsBetween(db, from, to),
        activeHabits(db),
        habitLogsAllBetween(db, from, to),
      ]);
      const currency = mainCurrency(expenses.filter((e) => !e.is_income));
      const days = buildDays({ from, to, expenses, currency, ranges, checkins, habits, logs });
      return {
        currency,
        days,
        summary: summarize(days),
        insights: findInsights(days, habits, expenses, currency),
        hasCashew: ranges.length > 0,
      };
    },
    `${from}|${to}`,
    null,
  );

  if (!data) return <Screen>{null}</Screen>;
  const { summary: s, currency } = data;
  const money = (n: number) => formatMoney(n, currency);
  const compact = (n: number) => formatMoney(n, currency, { compact: true });

  return (
    <Screen>
      <ChipRow options={PERIODS} value={period} onChange={setPeriod} />

      <View style={styles.tiles}>
        <Tile label="Gasto total" value={data.hasCashew ? money(s.totalSpent) : '–'} hint={`${s.coveredDays} días con datos`} />
        <Tile label="Promedio diario" value={s.coveredDays ? money(s.avgDailySpent) : '–'} />
        <Tile
          label="Ánimo promedio"
          value={s.avgMood !== null ? s.avgMood.toFixed(1).replace('.', ',') : '–'}
          hint={s.avgMood !== null ? moodInfo(s.avgMood).label : `${s.moodDays} registros`}
          face={s.avgMood !== null ? (Math.round(s.avgMood) as Mood) : undefined}
        />
        <Tile
          label="Hábitos cumplidos"
          value={s.habitRate !== null ? `${Math.round(s.habitRate * 100)} %` : '–'}
        />
      </View>

      {!data.hasCashew && (
        <Card alt style={{ padding: 16, gap: 12 }}>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>Conectá tus gastos</Text>
          <Text style={{ color: t.muted }}>
            Importá el CSV de Cashew para ver cuánto gastás por día y cómo se relaciona con tus hábitos y tu ánimo.
          </Text>
          <Button title="Ir a Ajustes" variant="ghost" icon="settings-outline" onPress={() => router.push('/ajustes')} />
        </Card>
      )}

      {data.hasCashew && (
        <>
          <SectionTitle>Gasto por día</SectionTitle>
          <Card style={{ padding: 16 }}>
            <DailyBars data={data.days.map((d) => ({ date: d.date, value: d.spent }))} format={money} />
          </Card>
        </>
      )}

      <SectionTitle>Lo que se ve en tus datos</SectionTitle>
      {data.insights.length ? (
        <View style={{ gap: 12 }}>
          {data.insights.map((i) => (
            <InsightCard key={i.id} insight={i} money={money} />
          ))}
          <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center', fontWeight: '600' }}>
            Son coincidencias en tus días, no causas. Con más días registrados, más confiables.
          </Text>
        </View>
      ) : (
        <Empty
          icon="analytics-outline"
          text="Todavía no hay suficientes días para comparar. Registrá tu ánimo y tus hábitos a diario (hace falta al menos 4 días en cada grupo)."
        />
      )}

      {data.hasCashew && s.moodDays > 0 && (
        <>
          <SectionTitle>Gasto según tu ánimo</SectionTitle>
          <Card style={{ padding: 16 }}>
            <MoodBars data={s.moodSpend} format={compact} />
          </Card>
        </>
      )}
    </Screen>
  );
}

function Tile({ label, value, hint, face }: { label: string; value: string; hint?: string; face?: Mood }) {
  const t = useTheme();
  return (
    <Card style={styles.tile}>
      <Text style={{ color: t.muted, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {face ? <MoodFace mood={face} size={24} /> : null}
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 22, fontWeight: '800', flexShrink: 1 }}>
          {value}
        </Text>
      </View>
      {hint ? <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>{hint}</Text> : null}
    </Card>
  );
}

const ICON: Record<Insight['kind'], keyof typeof Ionicons.glyphMap> = {
  'habit-spend': 'wallet-outline',
  'habit-mood': 'happy-outline',
  'mood-spend': 'pulse-outline',
  category: 'pie-chart-outline',
};

function InsightCard({ insight: i, money }: { insight: Insight; money: (n: number) => string }) {
  const t = useTheme();
  const a = t.accents.hoy;
  const fmt =
    i.format === 'money'
      ? money
      : i.format === 'mood'
        ? (n: number) => n.toFixed(1).replace('.', ',')
        : (n: number) => `${Math.round(n * 100)} %`;
  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={[styles.icon, { backgroundColor: a.tile }]}>
          <Ionicons name={ICON[i.kind]} size={20} color={a.tileInk} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', lineHeight: 21 }}>{i.title}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>{i.detail}</Text>
        </View>
      </View>
      {i.b ? <CompareBars items={[i.a, i.b]} format={fmt} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { padding: 14, gap: 4, flexGrow: 1, flexBasis: '45%' },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
