import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { haptic } from '@/utils/haptics';

/**
 * Shown once when a social sign-in gives us an account but no usable name
 * (Apple only returns the name on first-ever authorization; Hide My Email hides it too).
 */
export function NameCaptureSheet() {
  const { user, needsProfileName, updateProfile } = useAuth();
  const toast = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const visible = !!user && needsProfileName && !dismissed;
  const canSave = firstName.trim().length > 0;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateProfile(`${firstName.trim()} ${lastName.trim()}`.trim(), user?.avatarUrl, user?.phone);
      haptic.success();
      toast.success(`Welcome, ${firstName.trim()}!`, { icon: 'hand-left', silent: true });
    } catch {
      toast.error("Couldn't save your name. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setDismissed(true)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="account-edit-outline" size={28} color={C.onPrimary} />
          </View>
          <Text style={styles.title}>What should we call you?</Text>
          <Text style={styles.sub}>Your friends will see this name on your adventures.</Text>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="First name"
              placeholderTextColor={C.outline}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
              autoFocus
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Last name"
              placeholderTextColor={C.outline}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoComplete="family-name"
              textContentType="familyName"
              returnKeyType="done"
              onSubmitEditing={() => { void save(); }}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, !canSave && styles.btnDisabled]}
            onPress={() => { void save(); }}
            disabled={!canSave || saving}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>{saving ? 'Saving…' : 'Continue'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={10} accessibilityRole="button">
            <Text style={styles.later}>Later</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 18, 12, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 10,
    borderRadius: Radii.xl,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    backgroundColor: C.surface,
    ...Shadows.floating,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: C.onSurface,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  input: {
    minHeight: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerLow,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.onSurface,
  },
  btn: {
    marginTop: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: Radii.pill,
    paddingVertical: 13,
    backgroundColor: C.primary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: C.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  later: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
});
