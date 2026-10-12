import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, useTheme } from '../../components/theme';
import type { IconName } from '../../components/ui';

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Hoy', icon: 'sunny-outline', iconActive: 'sunny' },
  { name: 'tareas', title: 'Tareas', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
  { name: 'agenda', title: 'Agenda', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'notas', title: 'Notas', icon: 'document-text-outline', iconActive: 'document-text' },
  { name: 'habitos', title: 'Hábitos', icon: 'moon-outline', iconActive: 'moon' },
];

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        // Cada pestaña dibuja su propio encabezado ilustrado (Hero).
        headerShown: false,
        // Nunito es más alta que la fuente del sistema: con la altura por defecto se recortan las etiquetas.
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          height: 72 + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 6,
        },
        tabBarActiveTintColor: t.text,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle: { fontFamily: FONTS.bold, fontSize: 12, lineHeight: 16 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
