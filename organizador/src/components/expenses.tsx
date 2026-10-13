import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { Expense } from '../db/repo';
import { formatMoney } from '../lib/money';
import { useTheme } from './theme';
import { Card, Text } from './ui';

const MAX_ITEMS = 6;

/** Gastos de un día importados de Cashew. `covered = false`: no hay datos de ese día (no es lo mismo que $0). */
export function DayExpensesCard({ items, covered }: { items: Expense[]; covered: boolean }) {
  const t = useTheme();
  const a = t.accents.tareas;
  if (!covered) {
    return (
      <Card alt style={styles.empty}>
        <Ionicons name="wallet-outline" size={20} color={t.muted} />
        <Text style={{ color: t.muted, fontWeight: '600', flex: 1 }}>
          Sin datos de Cashew para este día. Importá un CSV actualizado desde Ajustes.
        </Text>
      </Card>
    );
  }
  const spent = items.filter((e) => !e.is_income);
  const income = items.filter((e) => e.is_income);
  const currency = items[0]?.currency ?? '';
  const total = spent.reduce((s, e) => s + e.amount, 0);
  const totalIncome = income.reduce((s, e) => s + e.amount, 0);
  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: a.tile }]}>
          <Ionicons name="wallet" size={22} color={a.tileInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.muted, fontSize: 13, fontWeight: '700' }}>Gastaste</Text>
          <Text style={{ fontSize: 26, fontWeight: '800' }}>{formatMoney(total, currency)}</Text>
        </View>
        {totalIncome > 0 ? (
          <Text style={{ color: t.success, fontWeight: '800' }}>+{formatMoney(totalIncome, currency)}</Text>
        ) : null}
      </View>
      {spent.length === 0 ? (
        <Text style={{ color: t.success, fontWeight: '700' }}>Día sin gastos</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {spent.slice(0, MAX_ITEMS).map((e) => (
            <View key={e.id} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontWeight: '700' }}>
                  {e.title || e.category || 'Gasto'}
                </Text>
                {e.title && e.category ? (
                  <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>{e.category}</Text>
                ) : null}
              </View>
              <Text style={{ fontWeight: '800' }}>{formatMoney(e.amount, e.currency)}</Text>
            </View>
          ))}
          {spent.length > MAX_ITEMS ? (
            <Text style={{ color: t.muted, fontSize: 13, fontWeight: '600' }}>
              y {spent.length - MAX_ITEMS} más
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
