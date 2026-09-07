import { Stack, useRouter, useSegments } from "expo-router";

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { VisitedParksProvider, useVisitedParks } from '@/hooks/useVisitedParks';
import { FriendsProvider } from '@/hooks/useFriends';
import { WishlistProvider } from '@/hooks/useWishlist';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { CelebrationOverlay, type CelebrationPayload } from '@/components/CelebrationOverlay';
import { ShareCard } from '@/components/ShareCard';
import { useShareCard } from '@/hooks/useShareCard';
import { PARKS } from '@/data/parksData';
import { NameCaptureSheet } from '@/components/NameCaptureSheet';
import { NearbyParksPrompt } from '@/components/NearbyParksPrompt';

// Unsigned simulator builds lack the keychain entitlement; the warning is expected there and just covers the UI.
if (__DEV__) LogBox.ignoreLogs([/SecureStore (read|write|delete) unavailable/]);

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

/** Shows the confetti card whenever a first-time national park visit is logged anywhere in the app. */
function CelebrationHost() {
  const { lastNewParkEvent, clearNewParkEvent } = useVisitedParks();
  const { user } = useAuth();
  const firstName = (user?.firstName || user?.name?.split(/\s+/)[0] || '').trim();
  const [demo, setDemo] = useState<CelebrationPayload | null>(null);

  // Dev-only: screenshot tooling drops screenshot_celebrate.json to preview the overlay.
  useEffect(() => {
    if (!__DEV__) return;
    const file = `${FileSystem.documentDirectory}screenshot_celebrate.json`;
    FileSystem.readAsStringAsync(file)
      .then((raw) => {
        setDemo(JSON.parse(raw));
        return FileSystem.deleteAsync(file, { idempotent: true });
      })
      .catch(() => {});
  }, []);

  const payload = demo ?? lastNewParkEvent;
  const toast = useToast();
  const rankLabel = payload?.newRank ? `New rank: ${payload.newRank.title}` : payload ? `${payload.uniqueParks} parks` : '';
  const { ref: shareRef, share, sharing } = useShareCard({
    format: 'story',
    message: payload
      ? `${rankLabel} — ${payload.uniqueParks} of 63 U.S. National Parks. Tracking them all on ParkAtlas.`
      : '',
    onShared: () => toast.success("Tag @parkatlas.io and we'll reshare it", { icon: 'logo-instagram', silent: true, durationMs: 3200 }),
    onError: () => toast.error("Couldn't create the share card. Try again."),
  });
  const parkState = payload ? PARKS.find((p) => p.id === payload.parkId)?.state ?? '' : '';

  return (
    <>
      <CelebrationOverlay
        payload={payload}
        onDismiss={() => { setDemo(null); clearNewParkEvent(); }}
        onShare={() => { void share(); }}
        sharing={sharing}
      />
      {payload ? (
        <View style={hostStyles.offscreen} pointerEvents="none">
          <ShareCard
            ref={shareRef}
            format="story"
            variant="rank"
            parkId={payload.parkId}
            parkName={payload.parkName}
            state={parkState}
            nationalVisited={payload.uniqueParks}
            userName={firstName || undefined}
          />
        </View>
      ) : null}
    </>
  );
}

const hostStyles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0 },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <VisitedParksProvider>
      <WishlistProvider>
      <FriendsProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ToastProvider>
          <AuthGate>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="invite" options={{ headerShown: false }} />
              <Stack.Screen name="invite/[inviteCode]" options={{ headerShown: false }} />
              <Stack.Screen name="friend/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="park/[id]" options={{ headerShown: false }} />
            </Stack>
          </AuthGate>
          <CelebrationHost />
          <NameCaptureSheet />
          <NearbyParksPrompt />
          <StatusBar style="auto" />
        </ToastProvider>
      </ThemeProvider>
      </FriendsProvider>
      </WishlistProvider>
      </VisitedParksProvider>
    </AuthProvider>
  );
}
