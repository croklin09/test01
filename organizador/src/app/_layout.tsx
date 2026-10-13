import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';

import { IncomingShare } from '../components/IncomingShare';
import { FONTS, useTheme } from '../components/theme';
import { DB_NAME, migrate } from '../db/schema';

export default function RootLayout() {
  const t = useTheme();
  // Import por peso (no el índice del paquete) para no empaquetar las 18 variantes.
  const [fontsLoaded, fontError] = useFonts({
    [FONTS.regular]: Nunito_400Regular,
    [FONTS.semibold]: Nunito_600SemiBold,
    [FONTS.bold]: Nunito_700Bold,
    [FONTS.extrabold]: Nunito_800ExtraBold,
  });

  // Si la fuente falla, se sigue con la del sistema en lugar de bloquear la app.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={migrate} useSuspense={false}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      {/* Recibir archivos compartidos (CSV de Cashew): solo Android lo soporta. */}
      {Platform.OS === 'android' && <IncomingShare />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerShadowVisible: false,
          headerTintColor: t.text,
          headerTitleStyle: { fontFamily: FONTS.extrabold, fontSize: 18 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tarea/[id]" options={{ presentation: 'modal', title: 'Tarea' }} />
        <Stack.Screen name="evento/[id]" options={{ presentation: 'modal', title: 'Evento' }} />
        <Stack.Screen name="nota/[id]" options={{ title: 'Nota' }} />
        <Stack.Screen name="habito/[id]" options={{ presentation: 'modal', title: 'Hábito' }} />
        <Stack.Screen name="ajustes" options={{ title: 'Ajustes' }} />
        <Stack.Screen name="estadisticas" options={{ title: 'Estadísticas' }} />
      </Stack>
    </SQLiteProvider>
  );
}
