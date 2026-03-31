import React from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.centeredWrapper} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Privacy Policy</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={8}>
              <Ionicons name="close" size={22} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>What We Collect</Text>
            <Text style={styles.paragraph}>
              ParkAtlas stores profile details, login information, and your activity logs so the app can show your hiking history and progress.
            </Text>

            <Text style={styles.sectionTitle}>How We Use Data</Text>
            <Text style={styles.paragraph}>
              Your data is used to power core app features such as outing history, stats, and park progress. We do not sell your personal information.
            </Text>

            <Text style={styles.sectionTitle}>Where Data Is Stored</Text>
            <Text style={styles.paragraph}>
              Account details are stored securely for sign-in. Outing data is saved per signed-in account on this device. If cloud sync is added later, this policy will be updated.
            </Text>

            <Text style={styles.sectionTitle}>Your Choices</Text>
            <Text style={styles.paragraph}>
              You can sign out at any time and manage biometric unlock in Settings. Contact support if you need help with account or data concerns.
            </Text>

            <Text style={styles.updated}>Last updated: March 31, 2026</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  centeredWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: C.background,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  body: {
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.2,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    color: C.onSurfaceVariant,
  },
  updated: {
    marginTop: 16,
    fontSize: 11,
    color: C.outline,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
