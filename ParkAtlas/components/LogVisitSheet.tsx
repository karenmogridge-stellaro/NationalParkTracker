import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii } from '@/constants/theme';
import { PARK_TRAILS, type Trail } from '@/data/trailsData';
import { haptic } from '@/utils/haptics';
import { VisitDatePicker, type VisitDateValue } from '@/components/VisitDatePicker';
import type { LogVisitOptions } from '@/hooks/useVisitedParks';

export type LogVisitResult = {
  trailName: string;
  trailMiles?: number;
  /** Date fields ready to spread into LogVisitOptions. */
  date: Pick<LogVisitOptions, 'dateVisited' | 'dateUnknown' | 'datePrecision'>;
};

interface Props {
  visible: boolean;
  parkName: string;
  /** Enables the curated trail picker for this park. */
  npsCode?: string;
  /** Pre-fills the trail (e.g. tapped from the park's Trails card). */
  initialTrail?: Trail | null;
  onClose: () => void;
  onSave: (result: LogVisitResult) => void;
}

export function LogVisitSheet({ visible, parkName, npsCode, initialTrail, onClose, onSave }: Props) {
  const [trailName, setTrailName] = useState('');
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [dateValue, setDateValue] = useState<VisitDateValue>({ kind: 'unknown' });

  const trails = useMemo<Trail[]>(() => (npsCode ? PARK_TRAILS[npsCode] || [] : []), [npsCode]);

  useEffect(() => {
    if (!visible) return;
    setSelectedTrail(initialTrail ?? null);
    setTrailName(initialTrail?.name ?? '');
    setDateValue({ kind: 'unknown' });
  }, [visible, initialTrail]);

  const filteredTrails = useMemo(() => {
    const q = trailName.trim().toLowerCase();
    if (!q || (selectedTrail && selectedTrail.name === trailName)) return trails;
    return trails.filter((t) => t.name.toLowerCase().includes(q));
  }, [trails, trailName, selectedTrail]);

  function pickTrail(trail: Trail) {
    haptic.select();
    if (selectedTrail?.name === trail.name) {
      setSelectedTrail(null);
      setTrailName('');
      return;
    }
    setSelectedTrail(trail);
    setTrailName(trail.name);
  }

  function onChangeText(text: string) {
    setTrailName(text);
    if (selectedTrail && text !== selectedTrail.name) setSelectedTrail(null);
  }

  function handleSave() {
    onSave({
      trailName: trailName.trim(),
      trailMiles: selectedTrail?.miles,
      date: dateValue.kind === 'date'
        ? { dateVisited: dateValue.date.toISOString(), dateUnknown: false, datePrecision: dateValue.precision }
        : { dateUnknown: true },
    });
    setTrailName('');
    setSelectedTrail(null);
  }

  function handleClose() {
    setTrailName('');
    setSelectedTrail(null);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop tap to dismiss */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetIconWrap}>
              <MaterialCommunityIcons name="map-marker-check" size={22} color={C.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Log a Visit</Text>
              <Text style={styles.sheetSubtitle} numberOfLines={1}>{parkName} National Park</Text>
            </View>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Trail input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Trail hiked (optional)</Text>
            <View style={[styles.inputRow, selectedTrail && styles.inputRowSelected]}>
              <MaterialCommunityIcons name="hiking" size={18} color={selectedTrail ? C.primary : C.outlineVariant} />
              <TextInput
                style={styles.input}
                placeholder={trails.length > 0 ? `Search ${trails.length} trails or type your own` : "e.g. Angel's Landing, Mist Trail..."}
                placeholderTextColor={C.outlineVariant}
                value={trailName}
                onChangeText={onChangeText}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                maxLength={80}
              />
              {trailName.length > 0 && (
                <TouchableOpacity onPress={() => { setTrailName(''); setSelectedTrail(null); }} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color={C.outlineVariant} />
                </TouchableOpacity>
              )}
            </View>

            {trails.length > 0 ? (
              <ScrollView
                style={styles.trailList}
                contentContainerStyle={styles.trailListContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {filteredTrails.length === 0 ? (
                  <Text style={styles.trailEmpty}>No matching trail — we&apos;ll save “{trailName.trim()}” as a custom trail.</Text>
                ) : filteredTrails.map((trail) => {
                  const active = selectedTrail?.name === trail.name;
                  return (
                    <TouchableOpacity
                      key={trail.name}
                      style={[styles.trailRow, active && styles.trailRowActive]}
                      onPress={() => pickTrail(trail)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Ionicons
                        name={active ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={active ? C.primary : C.outlineVariant}
                      />
                      <Text style={[styles.trailName, active && styles.trailNameActive]} numberOfLines={1}>{trail.name}</Text>
                      <Text style={styles.trailMiles}>{trail.miles.toFixed(1)} mi</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>

          <VisitDatePicker value={dateValue} onChange={setDateValue} />
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={18} color={C.onPrimary} />
              <Text style={styles.saveBtnText}>
                {selectedTrail ? `Log ${selectedTrail.miles.toFixed(1)} mi hike` : 'Mark as Visited'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: C.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
    alignSelf: 'center',
    marginBottom: 4,
  },
  body: {
    flexGrow: 0,
    maxHeight: 520,
  },
  bodyContent: {
    gap: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.onSurface,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.onSurface,
  },
  inputRowSelected: {
    borderColor: C.primary,
    backgroundColor: C.primaryContainer,
  },
  trailList: {
    maxHeight: 190,
    marginTop: 4,
  },
  trailListContent: {
    gap: 6,
  },
  trailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radii.sm,
    backgroundColor: C.surfaceContainerLow,
  },
  trailRowActive: {
    backgroundColor: C.primaryContainer,
  },
  trailName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurface,
  },
  trailNameActive: {
    color: C.primary,
    fontWeight: '700',
  },
  trailMiles: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  trailEmpty: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  actions: {
    gap: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onPrimary,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    fontWeight: '600',
  },
});
