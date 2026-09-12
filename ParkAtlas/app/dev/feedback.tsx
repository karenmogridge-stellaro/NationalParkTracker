import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ParkAtlas as C, Radii } from '@/constants/theme';
import { fetchFeedback, type FeedbackRecord } from '@/utils/feedbackApi';
import { openFeedback } from '@/utils/feedbackTrigger';

const CATEGORY_LABEL: Record<string, string> = { bug: 'Bug', idea: 'Idea', other: 'Other' };

/** Dev-only: review shake-to-feedback submissions (screenshot + note + device info). Route: /dev/feedback */
export default function FeedbackReview() {
  const [items, setItems] = useState<FeedbackRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchFeedback(200));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  // Dev: /dev/feedback?open=1 pops the sheet after a beat so screenshot tooling can capture it.
  const { open } = useLocalSearchParams<{ open?: string }>();
  useEffect(() => {
    if (open !== '1') return;
    const t = setTimeout(() => openFeedback(), 1500);
    return () => clearTimeout(t);
  }, [open]);

  if (!__DEV__) return null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Feedback inbox</Text>
        <Text style={styles.count}>{items ? `${items.length}` : '…'}</Text>
        <TouchableOpacity style={styles.testBtn} onPress={() => openFeedback()} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color={C.onPrimary} />
          <Text style={styles.testBtnText}>Test sheet</Text>
        </TouchableOpacity>
      </View>
      {items === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => { void load(); }} />}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {items.length === 0 && !error ? <Text style={styles.empty}>Nothing yet. Shake the phone to send one.</Text> : null}
          {items.map((f) => (
            <View key={f.id} style={styles.card}>
              {f.screenshotUrl ? (
                <Pressable onPress={() => setZoom(f.screenshotUrl!)}>
                  <Image source={{ uri: f.screenshotUrl }} style={styles.shot} resizeMode="cover" />
                </Pressable>
              ) : (
                <View style={[styles.shot, styles.noShot]}><Ionicons name="image-outline" size={22} color={C.outlineVariant} /></View>
              )}
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.metaRow}>
                  <View style={[styles.pill, f.category === 'bug' && styles.pillBug]}>
                    <Text style={styles.pillText}>{CATEGORY_LABEL[f.category] ?? f.category}</Text>
                  </View>
                  <Text style={styles.meta}>{f.createdAt ? new Date(f.createdAt).toLocaleString() : ''}</Text>
                </View>
                <Text style={styles.note}>{f.note}</Text>
                <Text style={styles.meta}>
                  {[f.userName || f.userEmail || 'Anonymous', f.route, f.appVersion && `v${f.appVersion} (${f.build})`, f.device, f.os]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoom(null)}>
          {zoom ? <Image source={{ uri: zoom }} style={styles.zoomImg} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 70, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: C.onSurface, flex: 1 },
  count: { fontSize: 14, fontWeight: '700', color: C.onSurfaceVariant },
  testBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  testBtnText: { color: C.onPrimary, fontWeight: '700', fontSize: 13 },
  list: { padding: 16, gap: 12, paddingBottom: 60 },
  error: { color: C.error, fontSize: 13 },
  empty: { color: C.onSurfaceVariant, fontSize: 14, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: C.surface, borderRadius: Radii.lg, padding: 12, borderWidth: 1, borderColor: C.surfaceContainerHighest },
  shot: { width: 72, height: 128, borderRadius: 10, backgroundColor: C.surfaceContainerLow },
  noShot: { alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { backgroundColor: C.surfaceContainerHigh, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillBug: { backgroundColor: C.errorContainer },
  pillText: { fontSize: 11, fontWeight: '700', color: C.onSurface },
  note: { fontSize: 14, color: C.onSurface, lineHeight: 20 },
  meta: { fontSize: 11, color: C.onSurfaceVariant },
  zoomBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  zoomImg: { width: '100%', height: '100%' },
});
