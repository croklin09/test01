import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Mood } from '../db/repo';
import { useTheme } from './theme';
import { Text } from './ui';

export const MOODS: { value: Mood; label: string; color: string }[] = [
  { value: 1, label: 'Muy mal', color: '#8C9AB8' },
  { value: 2, label: 'Mal', color: '#7FA6EE' },
  { value: 3, label: 'Normal', color: '#FFCF3F' },
  { value: 4, label: 'Bien', color: '#FFA25E' },
  { value: 5, label: 'Muy bien', color: '#FF7A2E' },
];

export const moodInfo = (m: number) => MOODS[Math.min(5, Math.max(1, Math.round(m))) - 1];

/** Carita: la boca va de triste (1) a sonrisa amplia (5). */
export function MoodFace({ mood, size = 44, dim }: { mood: Mood; size?: number; dim?: boolean }) {
  const { color } = moodInfo(mood);
  const curve = (mood - 3) * 4; // control de la curva: negativo = triste
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" opacity={dim ? 0.45 : 1}>
      <Circle cx={24} cy={24} r={22} fill={color} />
      <Circle cx={17} cy={20} r={2.6} fill="#3A2414" />
      <Circle cx={31} cy={20} r={2.6} fill="#3A2414" />
      <Path
        d={`M15 ${31 - curve / 3} Q24 ${31 + curve} 33 ${31 - curve / 3}`}
        stroke="#3A2414"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** Selector de ánimo del día: un toque guarda, tocar el mismo otra vez lo borra. */
export function MoodPicker({ value, onChange }: { value: Mood | null; onChange: (m: Mood | null) => void }) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      {MOODS.map((m) => {
        const active = value === m.value;
        return (
          <Pressable
            key={m.value}
            onPress={() => onChange(active ? null : m.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={m.label}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: active ? t.cardAlt : 'transparent', transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}
          >
            <MoodFace mood={m.value} size={active ? 46 : 40} dim={value !== null && !active} />
            <Text style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? t.text : t.muted }}>
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 16, width: '19.5%' },
});
