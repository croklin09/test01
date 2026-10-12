import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../components/theme';
import { DB_NAME, migrate } from '../db/schema';

export default function RootLayout() {
  const t = useTheme();
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={migrate} useSuspense={false}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.text,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tarea/[id]" options={{ presentation: 'modal', title: 'Tarea' }} />
        <Stack.Screen name="evento/[id]" options={{ presentation: 'modal', title: 'Evento' }} />
        <Stack.Screen name="nota/[id]" options={{ title: 'Nota' }} />
        <Stack.Screen name="habito/[id]" options={{ presentation: 'modal', title: 'Hábito' }} />
        <Stack.Screen name="ajustes" options={{ title: 'Ajustes y backup' }} />
      </Stack>
    </SQLiteProvider>
  );
}

