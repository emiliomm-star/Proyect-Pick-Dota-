import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme';
import { initTelegram } from '../src/lib/telegram';

export default function RootLayout() {
  useEffect(() => {
    // Initialize the Telegram Mini App if we're running inside Telegram.
    initTelegram(colors.bg);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Draft Recommender' }} />
        <Stack.Screen name="hero/[id]" options={{ title: 'Héroe' }} />
        <Stack.Screen name="counters" options={{ title: 'Counters' }} />
        <Stack.Screen name="bans" options={{ title: 'Baneos' }} />
        <Stack.Screen name="simulator" options={{ title: 'Simulador' }} />
        <Stack.Screen name="arena" options={{ title: 'Arena de capitanes' }} />
        <Stack.Screen name="arena-online" options={{ title: 'Arena online' }} />
        <Stack.Screen name="settings" options={{ title: 'Ajustes', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
