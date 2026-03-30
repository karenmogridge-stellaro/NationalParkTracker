import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';

interface Props {
  visible: boolean;
  parkName: string;
  onClose: () => void;
  onSave: (trailName: string) => void;
}

export function LogVisitSheet({ visible, parkName, onClose, onSave }: Props) {
  const [trailName, setTrailName] = useState('');

  function handleSave() {
    onSave(trailName);
    setTrailName('');
  }

  function handleClose() {
    setTrailName('');
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
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="hiking" size={18} color={C.outlineVariant} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Angel's Landing, Mist Trail..."
                placeholderTextColor={C.outlineVariant}
                value={trailName}
                onChangeText={setTrailName}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                maxLength={80}
              />
              {trailName.length > 0 && (
                <TouchableOpacity onPress={() => setTrailName('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color={C.outlineVariant} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={18} color={C.onPrimary} />
              <Text style={styles.saveBtnText}>Mark as Visited</Text>
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
