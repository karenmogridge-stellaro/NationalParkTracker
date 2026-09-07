import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ParkAtlas as C, Radii } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import { fallbackImageForPark } from '@/utils/parkImagery';
import { formatVisitDate } from '@/components/VisitDatePicker';
import type { ParkVisit } from '@/hooks/useVisitedParks';

type Props = {
  visit: ParkVisit | null;
  onClose: () => void;
  onEdit: (visit: ParkVisit) => void;
  onDelete: (visit: ParkVisit) => void;
  /** Omit for parks without a detail page (state parks). */
  onViewPark?: (visit: ParkVisit) => void;
};

/** Bottom sheet for a logged visit: photo header, quick facts, and Edit / View park / Delete. */
export function VisitActionSheet({ visit, onClose, onEdit, onDelete, onViewPark }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (visit) setConfirmDelete(false); }, [visit]);

  if (!visit) return null;
  const photo = visit.photoUri || fallbackImageForPark(visit.parkId);
  const when = visit.dateUnknown ? 'Date not recorded' : formatVisitDate(visit.dateVisited, visit.datePrecision) ?? 'Date not recorded';
  const facts = [
    visit.trailName || null,
    when,
    visit.distanceMiles ? `${visit.distanceMiles.toFixed(1)} mi` : null,
  ].filter(Boolean).join(' · ');

  const Row = ({ icon, label, sub, danger, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; sub?: string; danger?: boolean; onPress: () => void }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75} accessibilityRole="button">
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? C.error : C.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {!danger ? <Ionicons name="chevron-forward" size={18} color={C.outlineVariant} /> : null}
    </TouchableOpacity>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.hero}>
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <LinearGradient colors={['rgba(8,18,12,0.05)', 'rgba(8,18,12,0.85)']} style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={styles.close} onPress={onClose} activeOpacity={0.8} accessibilityLabel="Close">
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroText}>
              <Text style={styles.eyebrow}>YOUR VISIT</Text>
              <Text style={styles.title} numberOfLines={2}>{visit.parkName}</Text>
              {facts ? <Text style={styles.facts} numberOfLines={2}>{facts}</Text> : null}
            </View>
          </View>

          {confirmDelete ? (
            <View style={styles.confirm}>
              <View style={styles.confirmIcon}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color={C.error} />
              </View>
              <Text style={styles.confirmTitle}>Delete this visit?</Text>
              <Text style={styles.confirmBody}>It comes off your log and your park count. This can’t be undone.</Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.keepBtn} onPress={() => setConfirmDelete(false)} activeOpacity={0.8}>
                  <Text style={styles.keepText}>Keep it</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => { haptic.medium(); onDelete(visit); onClose(); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.rows}>
              <Row icon="create-outline" label="Edit visit" sub="Trails, date, distance, photo" onPress={() => { haptic.select(); onClose(); onEdit(visit); }} />
              {onViewPark ? (
                <Row icon="map-outline" label="Open park page" sub="Trails, friends, share card" onPress={() => { haptic.select(); onClose(); onViewPark(visit); }} />
              ) : null}
              <Row icon="trash-outline" label="Delete visit" danger onPress={() => { haptic.select(); setConfirmDelete(true); }} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10, 20, 14, 0.45)' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
    overflow: 'hidden',
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 8, position: 'absolute', top: 0, zIndex: 2 },
  hero: { height: 168, justifyContent: 'flex-end', backgroundColor: '#1a2e22' },
  close: {
    position: 'absolute', top: 18, right: 14, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(8,18,12,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  heroText: { padding: 16, gap: 3 },
  eyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  facts: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  rows: { paddingHorizontal: 12, paddingTop: 10, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 10, paddingVertical: 12, borderRadius: Radii.lg },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primaryContainer },
  rowIconDanger: { backgroundColor: C.errorContainer },
  rowText: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 16, fontWeight: '700', color: C.onSurface },
  rowLabelDanger: { color: C.error },
  rowSub: { fontSize: 12.5, color: C.onSurfaceVariant },
  confirm: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, gap: 8 },
  confirmIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: C.errorContainer, marginBottom: 4 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: C.onSurface },
  confirmBody: { fontSize: 14, lineHeight: 20, color: C.onSurfaceVariant, textAlign: 'center' },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' },
  keepBtn: { flex: 1, paddingVertical: 13, borderRadius: 999, alignItems: 'center', backgroundColor: C.surfaceContainerHigh },
  keepText: { fontSize: 15, fontWeight: '700', color: C.onSurface },
  deleteBtn: { flex: 1, paddingVertical: 13, borderRadius: 999, alignItems: 'center', backgroundColor: C.error },
  deleteText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
