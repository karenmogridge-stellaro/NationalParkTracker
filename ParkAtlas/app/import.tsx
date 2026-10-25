import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii } from '@/constants/theme';
import { useVisitedParks } from '@/hooks/useVisitedParks';
import { useToast } from '@/components/ui/Toast';
import { haptic } from '@/utils/haptics';
import { parkByRef } from '@/utils/parkSlug';
import { stateDisplayName } from '@/utils/search';

/**
 * Universal-link target for https://parkatlas.io/import?v=1,3,63 (ids or slugs)
 * The website's "Been here?" checklist hands its picks to the app here. Visits are logged
 * with an unknown date; the user can add dates/trails later from Home.
 */
export default function ImportRoute() {
  const router = useRouter();
  const { v } = useLocalSearchParams<{ v?: string | string[] }>();
  const { hasVisited, logVisit } = useVisitedParks();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const parks = useMemo(() => {
    const raw = Array.isArray(v) ? v.join(',') : String(v || '');
    const seen = new Set<string>();
    return raw.split(',').map((s) => parkByRef(s)).filter((p): p is NonNullable<typeof p> => {
      if (!p || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [v]);
  const toAdd = parks.filter((p) => !hasVisited(p.id));
  const already = parks.length - toAdd.length;

  async function addAll() {
    if (busy || toAdd.length === 0) return;
    haptic.medium();
    setBusy(true);
    try {
      for (const p of toAdd) await logVisit(p.id, p.name, '', { dateUnknown: true });
      setDone(true);
      toast.success(`Added ${toAdd.length} ${toAdd.length === 1 ? 'park' : 'parks'}`, { icon: 'checkmark-circle' });
      router.replace('/(tabs)/home');
    } catch {
      toast.error("Couldn't add those parks. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.close} onPress={() => router.replace('/(tabs)/home')} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={C.onSurface} />
        </TouchableOpacity>
        <Text style={styles.eyebrow}>From parkatlas.io</Text>
        <Text style={styles.title}>
          {parks.length === 0
            ? 'Nothing to import'
            : toAdd.length === 0
              ? 'Already logged'
              : `Add ${toAdd.length} ${toAdd.length === 1 ? 'park' : 'parks'} to your ring?`}
        </Text>
        <Text style={styles.sub}>
          {parks.length === 0
            ? 'That link didn\u2019t include any parks we recognize.'
            : toAdd.length === 0
              ? 'Every park in this link is already on your map.'
              : `They\u2019ll be logged without a date${already ? ` (${already} already logged)` : ''}. You can add dates, trails, and photos any time.`}
        </Text>
      </View>

      <FlatList
        data={parks}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const have = hasVisited(item.id);
          return (
            <View style={styles.row}>
              <Ionicons name={have ? 'checkmark-circle' : 'add-circle-outline'} size={22} color={have ? C.success : C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSub}>{stateDisplayName(item.state)}{have ? ' \u00b7 already logged' : ''}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        {toAdd.length > 0 && !done ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={addAll} disabled={busy} activeOpacity={0.85} accessibilityRole="button">
            {busy ? <ActivityIndicator color={C.onPrimary} /> : <Text style={styles.primaryBtnText}>Add {toAdd.length} {toAdd.length === 1 ? 'park' : 'parks'}</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Go to my parks</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.surface },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  close: { alignSelf: 'flex-end', padding: 8, marginRight: -8 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: C.primary, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: C.onSurface, letterSpacing: -0.4 },
  sub: { marginTop: 6, fontSize: 15, lineHeight: 21, color: C.onSurfaceVariant },
  list: { paddingHorizontal: 20, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.outlineVariant },
  rowTitle: { fontSize: 16, fontWeight: '700', color: C.onSurface },
  rowSub: { fontSize: 13, color: C.onSurfaceVariant, marginTop: 2 },
  footer: { padding: 20, paddingTop: 8 },
  primaryBtn: { backgroundColor: C.primary, borderRadius: Radii.lg, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  primaryBtnText: { color: C.onPrimary, fontSize: 16, fontWeight: '800' },
});
