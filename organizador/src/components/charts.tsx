import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import type { Mood } from '../db/repo';
import { formatLong, formatRelative } from '../lib/dates';
import { MoodFace } from './mood';
import { useTheme } from './theme';
import { Text } from './ui';

// Gráficos con react-native-svg. Reglas: una sola serie por gráfico, un color validado, barras finas con
// la punta redondeada (4 px) y apoyadas en la base, 2 px de separación, ejes y grilla discretos, y el
// detalle de cada barra al tocarla (no hay hover en un celular).

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Barra con las esquinas superiores redondeadas y la base recta. */
function barPath(x: number, w: number, top: number, base: number): string {
  const r = Math.min(4, w / 2, base - top);
  return `M${x} ${base} L${x} ${top + r} Q${x} ${top} ${x + r} ${top} L${x + w - r} ${top} Q${x + w} ${top} ${x + w} ${top + r} L${x + w} ${base} Z`;
}

function useWidth() {
  const [width, setWidth] = useState(0);
  return [width, (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)] as const;
}

export function DailyBars({
  data,
  format,
  height = 140,
}: {
  data: { date: string; value: number | null }[];
  format: (n: number) => string;
  height?: number;
}) {
  const t = useTheme();
  const [width, onLayout] = useWidth();
  const [selected, setSelected] = useState<number | null>(null);
  const gap = 2;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.value ?? 0));
  const barW = n ? Math.max(1, (width - gap * (n - 1)) / n) : 0;
  const base = height - 1;
  const top = 8; // aire para que la barra máxima no toque el borde
  const sel = selected !== null ? data[selected] : null;

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.readout}>
        {sel ? (
          <>
            <Text style={{ fontWeight: '700', color: t.muted }}>{capitalize(formatLong(sel.date))}</Text>
            <Text style={{ fontWeight: '800' }}>{sel.value === null ? 'Sin datos' : format(sel.value)}</Text>
          </>
        ) : (
          <>
            <Text style={{ color: t.muted, fontWeight: '600' }}>Tocá una barra para ver el día</Text>
            <Text style={{ color: t.muted, fontWeight: '700' }}>máx {format(max)}</Text>
          </>
        )}
      </View>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={top} y2={top} stroke={t.border} strokeWidth={1} strokeDasharray="3 4" />
            {data.map((d, i) => {
              const x = i * (barW + gap);
              const dim = selected !== null && selected !== i;
              if (d.value === null) {
                // Sin datos ≠ $0: marca chica y neutra en la base.
                return <Rect key={d.date} x={x} y={base - 3} width={barW} height={3} rx={1} fill={t.chartMuted} />;
              }
              const h = (d.value / max) * (base - top);
              return h > 0.5 ? (
                <Path key={d.date} d={barPath(x, barW, base - h, base)} fill={t.chart} opacity={dim ? 0.35 : 1} />
              ) : null;
            })}
            <Line x1={0} x2={width} y1={base} y2={base} stroke={t.border} strokeWidth={1} />
          </Svg>
        )}
        {/* Zonas táctiles de columna completa (más grandes que la barra). Pressable y no onPress del SVG:
            se comporta igual en Android y en web. */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          {width > 0 &&
            data.map((d, i) => (
              <Pressable
                key={`hit-${d.date}`}
                onPress={() => setSelected(selected === i ? null : i)}
                accessibilityLabel={`${formatLong(d.date)}: ${d.value === null ? 'sin datos' : format(d.value)}`}
                style={{ width: barW + gap, height: '100%' }}
              />
            ))}
        </View>
      </View>
      {n > 0 && (
        <View style={styles.axis}>
          <Text style={styles.axisLabel}>{formatRelative(data[0].date)}</Text>
          <Text style={styles.axisLabel}>{formatRelative(data[n - 1].date)}</Text>
        </View>
      )}
    </View>
  );
}

/** Dos grupos comparados, con etiqueta y valor escritos (el color no es la única pista). */
export function CompareBars({
  items,
  format,
}: {
  items: { label: string; value: number; n?: number }[];
  format: (n: number) => string;
}) {
  const t = useTheme();
  const max = Math.max(1e-9, ...items.map((i) => i.value));
  return (
    <View style={{ gap: 10 }}>
      {items.map((it, idx) => (
        <View key={it.label} style={{ gap: 4 }}>
          <View style={styles.compareHead}>
            <Text style={{ fontWeight: '700', fontSize: 13 }}>
              {it.label}
              {it.n ? <Text style={{ color: t.muted, fontWeight: '600', fontSize: 12 }}> · {it.n} días</Text> : null}
            </Text>
            <Text style={{ fontWeight: '800', fontSize: 13 }}>{format(it.value)}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: t.cardAlt }]}>
            <View
              style={{
                width: `${Math.max(2, (it.value / max) * 100)}%`,
                height: '100%',
                borderRadius: 4,
                backgroundColor: idx === 0 ? t.chart : t.chartMuted,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Gasto promedio por nivel de ánimo: las caritas son las etiquetas del eje. */
export function MoodBars({
  data,
  format,
  height = 110,
}: {
  data: { mood: number; avg: number; n: number }[];
  format: (n: number) => string;
  height?: number;
}) {
  const t = useTheme();
  const [width, onLayout] = useWidth();
  const max = Math.max(1, ...data.map((d) => d.avg));
  const colW = width / Math.max(1, data.length);
  const barW = Math.min(28, colW * 0.5);
  const base = height - 1;
  return (
    <View>
      <View onLayout={onLayout} style={{ height: height + 18 }}>
        {width > 0 && (
          <>
            <View style={[StyleSheet.absoluteFill, styles.valueRow]}>
              {data.map((d) => {
                const h = (d.avg / max) * (height - 22);
                return (
                  <View key={d.mood} style={{ width: colW, alignItems: 'center', paddingTop: height + 1 - h }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: d.n ? t.text : t.muted }}>
                      {d.n ? format(d.avg) : '–'}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Svg width={width} height={height + 18} style={{ position: 'absolute', top: 0 }}>
              {data.map((d, i) => {
                const h = (d.avg / max) * (height - 22);
                const x = i * colW + (colW - barW) / 2;
                return d.n && h > 0.5 ? (
                  <Path key={d.mood} d={barPath(x, barW, base + 18 - h, base + 18)} fill={t.chart} />
                ) : null;
              })}
              <Line x1={0} x2={width} y1={base + 18} y2={base + 18} stroke={t.border} strokeWidth={1} />
            </Svg>
          </>
        )}
      </View>
      <View style={styles.faces}>
        {data.map((d) => (
          <View key={d.mood} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <MoodFace mood={d.mood as Mood} size={26} />
            <Text style={{ fontSize: 10, color: t.muted, fontWeight: '600' }}>{d.n} d</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 22 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontSize: 11, fontWeight: '600', opacity: 0.6 },
  compareHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 12, borderRadius: 4, overflow: 'hidden' },
  valueRow: { flexDirection: 'row' },
  faces: { flexDirection: 'row', marginTop: 6 },
});
