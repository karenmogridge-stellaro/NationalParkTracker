import { Stack, useRouter, useSegments } from "expo-router";

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { VisitedParksProvider } from '@/hooks/useVisitedParks';
import { FriendsProvider } from '@/hooks/useFriends';

export const unstable_settings = {
  anchor: '(tabs)',
};

/** Keeps login optional, but sends authenticated users away from /login */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && (segments[0] as string) === 'login') {
      router.replace('/(tabs)/home');
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <VisitedParksProvider>
      <FriendsProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGate>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="friend/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="park/[id]" options={{ headerShown: false }} />
          </Stack>
        </AuthGate>
        <StatusBar style="auto" />
      </ThemeProvider>
      </FriendsProvider>
      </VisitedParksProvider>
    </AuthProvider>
  );
}
