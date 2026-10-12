import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps, ReactNode } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { addDays, formatLong, formatRelative, isValidISODate, today } from '../lib/dates';
import { ModuleArt } from './illustrations';
import { fontFor, RADIUS, useTheme, type Module } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------- Tipografía ----------

/** Text con Nunito: traduce `fontWeight` a la familia del peso correspondiente. */
export function Text({ style, ...props }: TextProps) {
  const t = useTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...rest } = flat;
  return <RNText {...props} style={[{ color: t.text, fontFamily: fontFor(fontWeight) }, rest]} />;
}

export function Input({ style, ...props }: TextInputProps) {
  const t = useTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...rest } = flat;
  return (
    <RNTextInput
      placeholderTextColor={t.muted}
      selectionColor={t.primary}
      {...props}
      style={[{ color: t.text, fontFamily: fontFor(fontWeight), fontSize: 16 }, rest]}
    />
  );
}

// ---------- Estructura ----------

/** Encabezado con ilustración y borde inferior curvo, como un sol que asoma. */
export function Hero({
  module,
  title,
  subtitle,
  eyebrow,
  right,
}: {
  module: Module;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
}) {
  const t = useTheme();
  const a = t.accents[module];
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const lightInk = a.ink === '#FFFFFF';
  return (
    <View style={{ backgroundColor: a.hero, paddingTop: insets.top + 8, overflow: 'hidden' }}>
      {focused && <StatusBar style={lightInk ? 'light' : 'dark'} />}
      {/* Halos de luz detrás de la ilustración */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <Circle cx={50} cy={46} r={44} fill={a.glow} opacity={0.55} />
        <Circle cx={50} cy={46} r={30} fill={a.glow} opacity={0.6} />
      </Svg>
      <View style={s.heroTop}>
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <View style={{ alignItems: 'center', paddingBottom: 4 }}>
        <ModuleArt module={module} size={112} />
      </View>
      <View style={s.heroText}>
        {eyebrow ? (
          <Text style={[s.eyebrow, { color: a.ink, opacity: 0.8 }]}>{eyebrow.toUpperCase()}</Text>
        ) : null}
        <Text style={[s.heroTitle, { color: a.ink }]}>{title}</Text>
        {subtitle ? <Text style={{ color: a.ink, opacity: 0.85, fontSize: 15 }}>{subtitle}</Text> : null}
      </View>
      {/* Curva que "muerde" el encabezado con el color de fondo */}
      <Svg width="100%" height={36} viewBox="0 0 100 36" preserveAspectRatio="none">
        <Path d="M0 36 L0 30 Q50 -8 100 30 L100 36 Z" fill={t.bg} />
      </Svg>
    </View>
  );
}

export function Screen({
  children,
  hero,
  scroll = true,
  padded = true,
}: {
  children: ReactNode;
  hero?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const t = useTheme();
  const body = <View style={[padded && s.body, padded && !hero && { paddingTop: 12, gap: 18 }]}>{children}</View>;
  if (!scroll) return <View style={{ flex: 1, backgroundColor: t.bg }}>{hero}{body}</View>;
  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 110 }}
      keyboardShouldPersistTaps="handled"
    >
      {hero}
      {body}
    </ScrollView>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({ children, style, alt }: { children: ReactNode; style?: ViewStyle; alt?: boolean }) {
  const t = useTheme();
  return (
    <View style={[s.card, { backgroundColor: alt ? t.cardAlt : t.card, shadowColor: t.shadow }, style]}>
      {children}
    </View>
  );
}

export function Empty({ icon, text }: { icon: IconName; text: string }) {
  const t = useTheme();
  return (
    <View style={[s.empty, { backgroundColor: t.cardAlt }]}>
      <Ionicons name={icon} size={26} color={t.muted} />
      <Text style={{ color: t.muted, textAlign: 'center', fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

// ---------- Tarjetas y filas ----------

/** Metadato con ícono: "▶ Video", "🕑 2 min". */
export function Meta({ icon, children, color }: { icon: IconName; children: ReactNode; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Ionicons name={icon} size={14} color={color ?? t.muted} />
      <Text style={{ color: color ?? t.muted, fontSize: 13, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

export function Pill({ children, bg, color }: { children: ReactNode; bg?: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={[s.pill, { backgroundColor: bg ?? t.card }]}>
      <Text style={{ color: color ?? t.text, fontSize: 12, fontWeight: '800' }}>{children}</Text>
    </View>
  );
}

/**
 * Tarjeta tipo "sesión": título grande, metadatos y un mosaico de color con ícono a la derecha.
 */
export function SessionCard({
  title,
  meta,
  tile,
  left,
  done,
  onPress,
  footer,
}: {
  title: string;
  meta?: ReactNode;
  tile?: ReactNode;
  left?: ReactNode;
  done?: boolean;
  onPress?: () => void;
  footer?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        s.session,
        { backgroundColor: t.card, shadowColor: t.shadow, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {left}
      <View style={{ flex: 1, gap: 6, paddingVertical: 2 }}>
        <Text
          numberOfLines={2}
          style={[
            s.sessionTitle,
            done && { color: t.muted, textDecorationLine: 'line-through' },
          ]}
        >
          {title}
        </Text>
        {meta}
        {footer}
      </View>
      {tile}
    </Pressable>
  );
}

/** Mosaico de color para el lado derecho de una SessionCard. */
export function Tile({ color, children }: { color: string; children: ReactNode }) {
  return <View style={[s.tile, { backgroundColor: color }]}>{children}</View>;
}

/** Fila redondeada con check a la derecha (estilo "¿Qué tenés en mente?"). */
export function OptionRow({
  label,
  sublabel,
  checked,
  onPress,
  onLongPress,
  right,
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  right?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={({ pressed }) => [
        s.option,
        {
          backgroundColor: checked ? t.cardAlt : t.card,
          borderColor: checked ? t.cardAlt : t.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>{label}</Text>
        {sublabel ? <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>{sublabel}</Text> : null}
      </View>
      {right}
      <CheckDot checked={checked} />
    </Pressable>
  );
}

export function CheckDot({ checked, size = 26 }: { checked: boolean; size?: number }) {
  const t = useTheme();
  return checked ? (
    <View style={[s.dot, { width: size, height: size, backgroundColor: t.primary }]}>
      <Ionicons name="checkmark" size={size * 0.62} color="#FFFFFF" />
    </View>
  ) : (
    <View style={[s.dot, { width: size, height: size, backgroundColor: t.chip }]} />
  );
}

export function Check({ checked, onPress, color }: { checked: boolean; onPress: () => void; color?: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      {checked ? (
        <View style={[s.dot, { width: 28, height: 28, backgroundColor: t.success }]}>
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
        </View>
      ) : (
        <View style={[s.dot, { width: 28, height: 28, borderWidth: 2.5, borderColor: color ?? t.muted }]} />
      )}
    </Pressable>
  );
}

// ---------- Controles ----------

export function Fab({ onPress, icon = 'add', label }: { onPress: () => void; icon?: IconName; label?: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label ?? 'Agregar'}
      style={({ pressed }) => [
        s.fab,
        { backgroundColor: t.primary, shadowColor: t.primary, transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      <Ionicons name={icon} size={24} color={t.primaryText} />
      {label ? <Text style={{ color: t.primaryText, fontWeight: '800', fontSize: 16 }}>{label}</Text> : null}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.chip,
        active
          ? { backgroundColor: t.text, borderColor: t.text }
          : { backgroundColor: t.card, borderColor: t.border },
      ]}
    >
      <Text style={{ color: active ? t.bg : t.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
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
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <Input
        {...props}
        style={[
          s.input,
          { backgroundColor: t.cardAlt, borderColor: error ? t.danger : 'transparent' },
          props.multiline && { minHeight: 110, textAlignVertical: 'top' },
          props.style,
        ]}
      />
      {error ? <Text style={{ color: t.danger, fontSize: 13, fontWeight: '600' }}>{error}</Text> : null}
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
    <View style={{ gap: 10 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.dateBox, { backgroundColor: t.cardAlt }]}>
        <Pressable
          hitSlop={8}
          onPress={() => onChange(addDays(base, -1))}
          accessibilityLabel="Día anterior"
          style={[s.round, { backgroundColor: t.card }]}
        >
          <Ionicons name="chevron-back" size={20} color={t.text} />
        </Pressable>
        <Text style={{ color: value ? t.text : t.muted, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
          {value && isValidISODate(value) ? `${formatRelative(value)} · ${formatLong(value)}` : 'Sin fecha'}
        </Text>
        <Pressable
          hitSlop={8}
          onPress={() => onChange(addDays(base, 1))}
          accessibilityLabel="Día siguiente"
          style={[s.round, { backgroundColor: t.card }]}
        >
          <Ionicons name="chevron-forward" size={20} color={t.text} />
        </Pressable>
      </View>
      <View style={[s.chipRow, { flexWrap: 'wrap' }]}>
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
  const bg = variant === 'primary' ? t.primary : variant === 'danger' ? 'transparent' : t.cardAlt;
  const fg = variant === 'primary' ? t.primaryText : variant === 'danger' ? t.danger : t.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.button, { backgroundColor: bg, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '800', fontSize: 17 }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color,
  bg,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  color: string;
  bg?: string;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityLabel={label}
      style={[s.round, { backgroundColor: bg ?? 'transparent' }]}
    >
      <Ionicons name={icon} size={21} color={color} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  heroTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 40 },
  heroText: { alignItems: 'center', paddingHorizontal: 24, gap: 2 },
  heroTitle: { fontSize: 30, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  body: { paddingHorizontal: 18, gap: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  section: { fontSize: 22, fontWeight: '800', letterSpacing: -0.2 },
  card: {
    borderRadius: RADIUS.card,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  session: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  sessionTitle: { fontSize: 18, fontWeight: '800', lineHeight: 23 },
  tile: { width: 76, height: 76, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, padding: 22, borderRadius: RADIUS.card },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.pill, alignSelf: 'flex-start' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
  },
  dot: { borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    height: 58,
    minWidth: 58,
    paddingHorizontal: 18,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: RADIUS.pill, borderWidth: 1.5 },
  chipRow: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 15, fontWeight: '800' },
  input: { borderWidth: 1.5, borderRadius: RADIUS.field, paddingHorizontal: 16, paddingVertical: 13 },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.field,
    padding: 8,
    gap: 8,
  },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADIUS.pill,
  },
});
