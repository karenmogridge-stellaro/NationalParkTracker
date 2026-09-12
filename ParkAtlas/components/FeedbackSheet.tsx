import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { submitFeedback, type FeedbackCategory } from '@/utils/feedbackApi';

type Props = {
  visible: boolean;
  /** Screen capture taken the moment the sheet was triggered. */
  screenshotUri: string | null;
  route?: string;
  onClose: () => void;
};

const CATEGORIES: { key: FeedbackCategory; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
  { key: 'bug', label: 'Something’s off', icon: 'bug-outline' },
  { key: 'idea', label: 'Idea', icon: 'lightbulb-on-outline' },
  { key: 'other', label: 'Other', icon: 'chat-outline' },
];

/** Shake-to-report sheet: screenshot preview + note + category → Firestore `feedback`. */
export function FeedbackSheet({ visible, screenshotUri, route, onClose }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [includeShot, setIncludeShot] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setNote('');
      setCategory('bug');
      setIncludeShot(true);
    }
  }, [visible]);

  async function send() {
    if (sending) return;
    const text = note.trim();
    if (!text) {
      toast.info('Add a quick note so we know what you saw', { silent: true });
      return;
    }
    setSending(true);
    haptic.tap();
    try {
      await submitFeedback({
        note: text,
        category,
        screenshotUri: includeShot ? screenshotUri : null,
        route,
        userId: user?.id ?? null,
        userName: user?.name ?? user?.firstName ?? null,
        userEmail: user?.email ?? null,
      });
      onClose();
      toast.success('Thanks — got it. We read every one.', { icon: 'heart' });
    } catch {
      toast.error("Couldn't send that. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="vibrate" size={20} color={C.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Send feedback</Text>
              <Text style={styles.subtitle}>Shake anytime to open this. Goes straight to Ren.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.row}>
              {screenshotUri ? (
                <TouchableOpacity style={styles.shotWrap} onPress={() => setIncludeShot((v) => !v)} activeOpacity={0.85}>
                  <Image source={{ uri: screenshotUri }} style={[styles.shot, !includeShot && styles.shotOff]} resizeMode="cover" />
                  <View style={[styles.shotBadge, includeShot ? styles.shotBadgeOn : styles.shotBadgeOff]}>
                    <Ionicons name={includeShot ? 'checkmark' : 'close'} size={12} color="#fff" />
                  </View>
                  <Text style={styles.shotLabel}>{includeShot ? 'Screenshot attached' : 'Screenshot removed'}</Text>
                </TouchableOpacity>
              ) : null}

              <View style={{ flex: 1, gap: 8 }}>
                {CATEGORIES.map((c) => {
                  const active = category === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.cat, active && styles.catActive]}
                      onPress={() => { haptic.select(); setCategory(c.key); }}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <MaterialCommunityIcons name={c.icon} size={18} color={active ? C.onPrimary : C.primary} />
                      <Text style={[styles.catText, active && styles.catTextActive]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder={category === 'idea' ? 'What would make this better?' : 'What happened? What did you expect?'}
              placeholderTextColor={C.outlineVariant}
              value={note}
              onChangeText={setNote}
              multiline
              autoFocus
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.fine}>
              {user?.email ? `We’ll reply to ${user.email} if we need more.` : 'Sign in if you’d like a reply.'} Includes app version and device model.
            </Text>
          </ScrollView>

          <TouchableOpacity style={[styles.sendBtn, sending && { opacity: 0.7 }]} onPress={() => { void send(); }} activeOpacity={0.85} disabled={sending}>
            {sending ? <ActivityIndicator color={C.onPrimary} /> : (
              <>
                <Ionicons name="paper-plane" size={16} color={C.onPrimary} />
                <Text style={styles.sendText}>Send</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,20,14,0.45)' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
    maxHeight: '88%',
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.surfaceContainerHighest, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '800', color: C.onSurface },
  subtitle: { fontSize: 13, color: C.onSurfaceVariant, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceContainerHigh },
  body: { gap: 14, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  shotWrap: { width: 96, alignItems: 'center', gap: 6 },
  shot: { width: 96, height: 170, borderRadius: 14, borderWidth: 1, borderColor: C.surfaceContainerHighest, backgroundColor: C.surfaceContainerLow },
  shotOff: { opacity: 0.35 },
  shotBadge: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  shotBadgeOn: { backgroundColor: C.primary },
  shotBadgeOff: { backgroundColor: C.onSurfaceVariant },
  shotLabel: { fontSize: 11, fontWeight: '600', color: C.onSurfaceVariant, textAlign: 'center' },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radii.lg, backgroundColor: C.surfaceContainerLow, borderWidth: 1, borderColor: C.surfaceContainerHighest },
  catActive: { backgroundColor: C.primary, borderColor: C.primary },
  catText: { fontSize: 14, fontWeight: '700', color: C.onSurface },
  catTextActive: { color: C.onPrimary },
  input: {
    minHeight: 110,
    fontSize: 15,
    color: C.onSurface,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.surfaceContainerHighest,
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fine: { fontSize: 12, color: C.onSurfaceVariant, lineHeight: 17 },
  sendBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 999, paddingVertical: 14 },
  sendText: { fontSize: 16, fontWeight: '800', color: C.onPrimary },
});
