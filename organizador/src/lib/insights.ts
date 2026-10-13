// Cruces entre gastos (Cashew), hábitos y ánimo. Puro y sin dependencias nativas: se testea en Node.
// Son correlaciones sobre pocos días, no causas: la UI lo dice y acá se exige muestra mínima.

import { addDays, toISODate, weekdayIndex } from './dates';

export const MIN_DAYS = 4; // días mínimos en CADA grupo para comparar
const MIN_SPEND_DIFF = 0.1; // 10 %
const MIN_MOOD_DIFF = 0.3; // puntos en escala 1–5

export type HabitInput = { id: string; name: string; days_mask: number; created_at: string };
export type ExpenseInput = { date: string; amount: number; is_income: number; currency: string; category: string };
export type RangeInput = { from: string; to: string };

export type Day = {
  date: string;
  spent: number | null; // null = sin datos de Cashew ese día (≠ $0)
  mood: number | null;
  habits: Record<string, 'done' | 'missed'>; // solo hábitos programados ese día
};

export function buildDays(input: {
  from: string;
  to: string;
  expenses: ExpenseInput[];
  currency: string;
  ranges: RangeInput[];
  checkins: { date: string; mood: number }[];
  habits: HabitInput[];
  logs: { habit_id: string; date: string }[];
}): Day[] {
  const spentByDay = new Map<string, number>();
  for (const e of input.expenses) {
    if (e.is_income || e.currency !== input.currency) continue;
    spentByDay.set(e.date, (spentByDay.get(e.date) ?? 0) + e.amount);
  }
  const moodByDay = new Map(input.checkins.map((c) => [c.date, c.mood]));
  const logSet = new Set(input.logs.map((l) => `${l.habit_id}|${l.date}`));
  const covered = (d: string) => input.ranges.some((r) => d >= r.from && d <= r.to);

  const days: Day[] = [];
  for (let d = input.from; d <= input.to; d = addDays(d, 1)) {
    const habits: Day['habits'] = {};
    for (const h of input.habits) {
      const created = toISODate(new Date(h.created_at));
      const scheduled = (h.days_mask & (1 << weekdayIndex(d))) !== 0;
      if (!scheduled || d < created) continue;
      habits[h.id] = logSet.has(`${h.id}|${d}`) ? 'done' : 'missed';
    }
    days.push({
      date: d,
      spent: covered(d) ? (spentByDay.get(d) ?? 0) : null,
      mood: moodByDay.get(d) ?? null,
      habits,
    });
  }
  return days;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type Summary = {
  coveredDays: number;
  totalSpent: number;
  avgDailySpent: number;
  moodDays: number;
  avgMood: number | null;
  habitRate: number | null; // 0–1
  moodSpend: { mood: number; avg: number; n: number }[];
};

export function summarize(days: Day[]): Summary {
  const covered = days.filter((d) => d.spent !== null);
  const withMood = days.filter((d) => d.mood !== null);
  let done = 0;
  let total = 0;
  for (const d of days) {
    for (const s of Object.values(d.habits)) {
      total++;
      if (s === 'done') done++;
    }
  }
  const moodSpend = [1, 2, 3, 4, 5].map((m) => {
    const xs = covered.filter((d) => d.mood === m).map((d) => d.spent as number);
    return { mood: m, avg: avg(xs), n: xs.length };
  });
  const totalSpent = covered.reduce((s, d) => s + (d.spent as number), 0);
  return {
    coveredDays: covered.length,
    totalSpent,
    avgDailySpent: covered.length ? totalSpent / covered.length : 0,
    moodDays: withMood.length,
    avgMood: withMood.length ? avg(withMood.map((d) => d.mood as number)) : null,
    habitRate: total ? done / total : null,
    moodSpend,
  };
}

export type Insight = {
  id: string;
  kind: 'habit-spend' | 'habit-mood' | 'mood-spend' | 'category';
  title: string; // frase principal
  detail: string;
  format: 'money' | 'mood' | 'percent';
  a: { label: string; value: number; n: number };
  b?: { label: string; value: number; n: number };
  strength: number; // para ordenar (diferencia relativa)
};

const pct = (x: number) => `${Math.round(Math.abs(x) * 100)} %`;

export function findInsights(days: Day[], habits: HabitInput[], expenses: ExpenseInput[], currency: string): Insight[] {
  const out: Insight[] = [];
  const covered = days.filter((d) => d.spent !== null);

  for (const h of habits) {
    // Hábito × gasto
    const doneSpend = covered.filter((d) => d.habits[h.id] === 'done').map((d) => d.spent as number);
    const missSpend = covered.filter((d) => d.habits[h.id] === 'missed').map((d) => d.spent as number);
    if (doneSpend.length >= MIN_DAYS && missSpend.length >= MIN_DAYS) {
      const a = avg(doneSpend);
      const b = avg(missSpend);
      const diff = b > 0 ? (a - b) / b : 0;
      if (Math.abs(diff) >= MIN_SPEND_DIFF) {
        out.push({
          id: `hs-${h.id}`,
          kind: 'habit-spend',
          title: `Los días que cumplís «${h.name}» gastás ${pct(diff)} ${diff < 0 ? 'menos' : 'más'}`,
          detail: `Promedio por día, comparando ${doneSpend.length} días cumplidos y ${missSpend.length} no cumplidos.`,
          format: 'money',
          a: { label: 'Cumplido', value: a, n: doneSpend.length },
          b: { label: 'No cumplido', value: b, n: missSpend.length },
          strength: Math.abs(diff),
        });
      }
    }
    // Hábito × ánimo
    const withMood = days.filter((d) => d.mood !== null);
    const doneMood = withMood.filter((d) => d.habits[h.id] === 'done').map((d) => d.mood as number);
    const missMood = withMood.filter((d) => d.habits[h.id] === 'missed').map((d) => d.mood as number);
    if (doneMood.length >= MIN_DAYS && missMood.length >= MIN_DAYS) {
      const a = avg(doneMood);
      const b = avg(missMood);
      if (Math.abs(a - b) >= MIN_MOOD_DIFF) {
        out.push({
          id: `hm-${h.id}`,
          kind: 'habit-mood',
          title: `Los días que cumplís «${h.name}» tu ánimo es ${a > b ? 'mejor' : 'peor'}`,
          detail: `Ánimo promedio ${a.toFixed(1).replace('.', ',')} contra ${b.toFixed(1).replace('.', ',')} (escala 1 a 5).`,
          format: 'mood',
          a: { label: 'Cumplido', value: a, n: doneMood.length },
          b: { label: 'No cumplido', value: b, n: missMood.length },
          strength: Math.abs(a - b) / 4,
        });
      }
    }
  }

  // Ánimo × gasto: días bajos (1–2) contra días buenos (4–5)
  const low = covered.filter((d) => d.mood !== null && d.mood <= 2).map((d) => d.spent as number);
  const good = covered.filter((d) => d.mood !== null && d.mood >= 4).map((d) => d.spent as number);
  if (low.length >= 3 && good.length >= 3) {
    const a = avg(low);
    const b = avg(good);
    const diff = b > 0 ? (a - b) / b : 0;
    if (Math.abs(diff) >= 0.15) {
      out.push({
        id: 'mood-spend',
        kind: 'mood-spend',
        title: `Los días que estás bajón gastás ${pct(diff)} ${diff > 0 ? 'más' : 'menos'}`,
        detail: `Días con ánimo 1–2 contra días con ánimo 4–5.`,
        format: 'money',
        a: { label: 'Ánimo bajo', value: a, n: low.length },
        b: { label: 'Ánimo bueno', value: b, n: good.length },
        strength: Math.abs(diff),
      });
    }
  }

  // Categoría principal del período
  const coveredSet = new Set(covered.map((d) => d.date));
  const byCat = new Map<string, number>();
  let total = 0;
  for (const e of expenses) {
    if (e.is_income || e.currency !== currency || !coveredSet.has(e.date)) continue;
    const c = e.category || 'Sin categoría';
    byCat.set(c, (byCat.get(c) ?? 0) + e.amount);
    total += e.amount;
  }
  const top = [...byCat.entries()].sort((x, y) => y[1] - x[1])[0];
  if (top && total > 0) {
    const share = top[1] / total;
    out.push({
      id: 'top-category',
      kind: 'category',
      title: `«${top[0]}» se lleva el ${pct(share)} de tus gastos`,
      detail: 'Tu categoría con más gasto en el período.',
      format: 'percent',
      a: { label: top[0], value: share, n: 0 },
      strength: share / 4, // informativo: va después de los cruces
    });
  }

  return out.sort((x, y) => y.strength - x.strength);
}
