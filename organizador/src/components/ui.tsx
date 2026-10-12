import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { addDays, formatLong, formatRelative, isValidISODate, today } from '../lib/dates';
import { useTheme } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTheme();
  if (!scroll) return <View style={[s.screen, { backgroundColor: t.bg }]}>{children}</View>;
  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={s.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={s.sectionRow}>
      <Text style={[s.section, { color: t.muted }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>{children}</View>;
}

export function Empty({ icon, text }: { icon: IconName; text: string }) {
  const t = useTheme();
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={28} color={t.muted} />
      <Text style={{ color: t.muted, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

export function Check({ checked, onPress, color }: { checked: boolean; onPress: () => void; color?: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <Ionicons
        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
        size={26}
        color={checked ? t.success : (color ?? t.muted)}
      />
    </Pressable>
  );
}

export function ListRow({
  left,
  title,
  subtitle,
  right,
  onPress,
  strike,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  strike?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, { borderColor: t.border, opacity: pressed ? 0.6 : 1 }]}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={2}
          style={[
            s.rowTitle,
            { color: strike ? t.muted : t.text, textDecorationLine: strike ? 'line-through' : 'none' },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Fab({ onPress, icon = 'add' }: { onPress: () => void; icon?: IconName }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Agregar"
      style={({ pressed }) => [
        s.fab,
        { backgroundColor: t.primary, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Ionicons name={icon} size={28} color={t.primaryText} />
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, { backgroundColor: active ? t.primary : t.chip }]}
    >
      <Text style={{ color: active ? t.primaryText : t.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
      {options.map((o) => (
        <Chip key={String(o.value)} label={o.label} active={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[s.label, { color: t.muted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={t.muted}
        {...props}
        style={[
          s.input,
          { color: t.text, backgroundColor: t.card, borderColor: error ? t.danger : t.border },
          props.multiline && { minHeight: 100, textAlignVertical: 'top' },
          props.style,
        ]}
      />
      {error ? <Text style={{ color: t.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

/** Fecha opcional: atajos + ajuste día a día. Sin dependencia de un date picker nativo. */
export function DateField({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  optional?: boolean;
}) {
  const t = useTheme();
  const base = value ?? today();
  const shortcuts: { label: string; value: string | null }[] = [
    ...(optional ? [{ label: 'Sin fecha', value: null }] : []),
    { label: 'Hoy', value: today() },
    { label: 'Mañana', value: addDays(today(), 1) },
    { label: '+1 sem', value: addDays(today(), 7) },
  ];
  return (
    <View style={{ gap: 8 }}>
      <Text style={[s.label, { color: t.muted }]}>{label}</Text>
      <View style={[s.dateBox, { backgroundColor: t.card, borderColor: t.border }]}>
        <Pressable hitSlop={8} onPress={() => onChange(addDays(base, -1))} accessibilityLabel="Día anterior">
          <Ionicons name="chevron-back" size={22} color={t.primary} />
        </Pressable>
        <Text style={{ color: value ? t.text : t.muted, fontSize: 16, fontWeight: '600' }}>
          {value && isValidISODate(value) ? `${formatRelative(value)} · ${formatLong(value)}` : 'Sin fecha'}
        </Text>
        <Pressable hitSlop={8} onPress={() => onChange(addDays(base, 1))} accessibilityLabel="Día siguiente">
          <Ionicons name="chevron-forward" size={22} color={t.primary} />
        </Pressable>
      </View>
      <View style={s.chipRow}>
        {shortcuts.map((sc) => (
          <Chip key={sc.label} label={sc.label} active={sc.value === value} onPress={() => onChange(sc.value)} />
        ))}
      </View>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  icon?: IconName;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : variant === 'danger' ? 'transparent' : t.chip;
  const fg = variant === 'primary' ? t.primaryText : variant === 'danger' ? t.danger : t.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
        variant === 'danger' && { borderWidth: 1, borderColor: t.danger },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  screenContent: { padding: 16, paddingBottom: 96, gap: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  section: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  empty: { alignItems: 'center', gap: 8, padding: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
});
