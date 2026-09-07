import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ShareCard } from '@/components/ShareCard';
import { ParkAtlas as C } from '@/constants/theme';

/**
 * Dev-only gallery for eyeballing share cards without going through the share sheet.
 * /dev/share-cards?count=15&park=47
 */
export default function ShareCardPreview() {
  const { count = '15', park = '47', only } = useLocalSearchParams<{ count?: string; park?: string; only?: string }>();
  const n = Number(count) || 15;

  if (!__DEV__) return null;

  const show = (key: string) => !only || only === key;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {show('rank-story') ? (<>
        <Text style={styles.label}>rank · story</Text>
        <ShareCard variant="rank" format="story" parkId={park} parkName="Olympic" state="WA" nationalVisited={n} userName="Karen" />
      </>) : null}
      {show('park-story') ? (<>
        <Text style={styles.label}>park · story</Text>
        <ShareCard variant="park" format="story" parkId={park} parkName="Olympic" state="WA" nationalVisited={n} detail="Hoh River Trail · 14.6 mi" userName="Karen" />
      </>) : null}
      {show('park-card') ? (<>
        <Text style={styles.label}>park · card</Text>
        <ShareCard variant="park" format="card" parkId="63" parkName="Zion" state="UT" nationalVisited={n} detail="Angels Landing · 5.4 mi" />
      </>) : null}
      {show('invite-story') ? (<>
        <Text style={styles.label}>invite · story</Text>
        <ShareCard variant="invite" format="story" parkId={park} parkName="Olympic" state="WA" nationalVisited={n} userName="Karen" />
      </>) : null}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  content: { alignItems: 'center', gap: 16, paddingVertical: 60 },
  label: { color: C.outlineVariant, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
