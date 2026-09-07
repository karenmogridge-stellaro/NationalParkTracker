import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ShareCard } from '@/components/ShareCard';
import { ParkAtlas as C } from '@/constants/theme';

/**
 * Dev-only gallery for eyeballing share cards without going through the share sheet.
 * /dev/share-cards?count=15&park=47   (&clean=1 hides chrome/labels for video capture)
 */
export default function ShareCardPreview() {
  const { count = '15', park = '47', only, clean } = useLocalSearchParams<{ count?: string; park?: string; only?: string; clean?: string }>();
  const n = Number(count) || 15;

  if (!__DEV__) return null;

  const show = (key: string) => !only || only === key;
  const isClean = clean === '1';
  const Label = ({ children }: { children: string }) => (isClean ? null : <Text style={styles.label}>{children}</Text>);

  return (
    <ScrollView
      style={[styles.root, isClean && styles.rootClean]}
      contentContainerStyle={[styles.content, isClean && styles.contentClean]}
      scrollEnabled={!isClean}
    >
      <Stack.Screen options={{ headerShown: !isClean }} />
      {show('rank-story') ? (<>
        <Label>rank · story</Label>
        <ShareCard variant="rank" format="story" parkId={park} parkName="Olympic" state="WA" nationalVisited={n} userName="Karen" />
      </>) : null}
      {show('park-story') ? (<>
        <Label>park · story</Label>
        <ShareCard variant="park" format="story" parkId={park} parkName="Olympic" state="WA" nationalVisited={n} detail="Hoh River Trail · 14.6 mi" userName="Karen" />
      </>) : null}
      {show('park-card') ? (<>
        <Label>park · card</Label>
        <ShareCard variant="park" format="card" parkId="63" parkName="Zion" state="UT" nationalVisited={n} detail="Angels Landing · 5.4 mi" />
      </>) : null}
      {show('invite-story') ? (<>
        <Label>invite · story</Label>
        <ShareCard variant="invite" format="story" parkId={park} parkName="Olympic" state="WA" nationalVisited={n} userName="Karen" />
      </>) : null}
      {isClean ? null : <View style={{ height: 60 }} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  rootClean: { backgroundColor: C.surfaceContainerLow },
  content: { alignItems: 'center', gap: 16, paddingVertical: 60 },
  contentClean: { flexGrow: 1, justifyContent: 'center', paddingVertical: 0 },
  label: { color: C.outlineVariant, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
