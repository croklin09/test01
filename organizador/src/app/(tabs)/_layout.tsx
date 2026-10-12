import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable } from 'react-native';

import { useTheme } from '../../components/theme';
import type { IconName } from '../../components/ui';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Hoy', icon: 'sunny-outline' },
  { name: 'tareas', title: 'Tareas', icon: 'checkbox-outline' },
  { name: 'agenda', title: 'Agenda', icon: 'calendar-outline' },
  { name: 'notas', title: 'Notas', icon: 'document-text-outline' },
  { name: 'habitos', title: 'Hábitos', icon: 'repeat-outline' },
];

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.card },
        headerTintColor: t.text,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        sceneStyle: { backgroundColor: t.bg },
        headerRight: () => (
          <Link href="/ajustes" asChild>
            <Pressable hitSlop={10} style={{ marginRight: 16 }} accessibilityLabel="Ajustes">
              <Ionicons name="settings-outline" size={22} color={t.text} />
            </Pressable>
          </Link>
        ),
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
