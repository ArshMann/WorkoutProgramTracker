import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { runMigrations } from '@/db/client';
import { configureNotifications } from '@/services/notifications';
import { useColors } from '@/ui/theme';

export default function RootLayout() {
  useMemo(() => runMigrations(), []);
  useEffect(() => {
    void configureNotifications();
  }, []);
  const c = useColors();
  return (
    <SafeAreaProvider>
      <StatusBar style={c.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: c.bg },
          animation: 'fade',
          animationDuration: 120,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="session" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="substitute" options={{ presentation: 'modal', title: 'Substitute' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'History' }} />
        <Stack.Screen name="exercises" options={{ title: 'Exercises' }} />
        <Stack.Screen name="metrics" options={{ title: 'Body' }} />
        <Stack.Screen name="photos" options={{ title: 'Progress photos' }} />
        <Stack.Screen name="reference" options={{ title: 'Program' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="review" options={{ title: 'Block review' }} />
        <Stack.Screen name="history" options={{ presentation: 'modal', title: 'Logged sessions' }} />
        <Stack.Screen name="edit/[id]" options={{ title: 'Edit session' }} />
        <Stack.Screen name="edit/new" options={{ title: 'Log a past session' }} />
        <Stack.Screen name="erase" options={{ presentation: 'modal', title: 'Erase all data' }} />
        <Stack.Screen name="report" options={{ title: 'PDF report' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
