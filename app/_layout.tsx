import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme';

export default function RootLayout() {
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
        <Stack.Screen name="settings" options={{ title: 'Ajustes', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
