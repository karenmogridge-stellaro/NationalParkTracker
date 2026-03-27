import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';

export default function SettingsScreen() {
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNewsletter, setEmailNewsletter] = useState(false);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="menu" size={26} color={C.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerBrand}>ParkAtlas</Text>
        </View>
        <TouchableOpacity style={styles.avatar} activeOpacity={0.7}>
          <Ionicons name="person" size={20} color={C.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>Manage your expedition preferences and profile.</Text>
        </View>

        {/* Account */}
        <View style={styles.groupLabel}>
          <Ionicons name="person" size={13} color={C.secondary} />
          <Text style={styles.groupLabelText}>ACCOUNT</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Edit Profile</Text>
              <Text style={styles.rowSubtitle}>Update your display name and avatar</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Change Password</Text>
              <Text style={styles.rowSubtitle}>Secure your account with a new password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Device Integration */}
        <View style={styles.groupLabel}>
          <MaterialCommunityIcons name="satellite-uplink" size={13} color={C.secondary} />
          <Text style={styles.groupLabelText}>DEVICE INTEGRATION</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.deviceRow}>
            <MaterialCommunityIcons name="watch" size={28} color={C.primary} />
            <Text style={styles.connectedBadge}>CONNECTED</Text>
          </View>
          <Text style={styles.deviceName}>Garmin Connect</Text>
          <Text style={styles.deviceSub}>Last synced: 2h ago</Text>
        </View>
        <View style={[styles.card, styles.cardMuted, styles.cardMt]}>
          <View style={styles.deviceRow}>
            <Ionicons name="heart" size={28} color={C.onSurfaceVariant} />
            <TouchableOpacity style={styles.linkBtn} activeOpacity={0.85}>
              <Text style={styles.linkBtnText}>LINK</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.deviceName}>Apple Health</Text>
          <Text style={styles.deviceSub}>Import trail activity data</Text>
        </View>

        {/* Notifications */}
        <View style={styles.groupLabel}>
          <Ionicons name="notifications" size={13} color={C.secondary} />
          <Text style={styles.groupLabelText}>NOTIFICATIONS</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSubtitle}>Trail alerts and weather warnings</Text>
            </View>
            <Switch
              value={pushNotifs}
              onValueChange={setPushNotifs}
              trackColor={{ false: C.outlineVariant, true: C.primary }}
              thumbColor={C.onPrimary}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.switchRow}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Email Newsletter</Text>
              <Text style={styles.rowSubtitle}>Weekly curated expeditions</Text>
            </View>
            <Switch
              value={emailNewsletter}
              onValueChange={setEmailNewsletter}
              trackColor={{ false: C.outlineVariant, true: C.primary }}
              thumbColor={C.onPrimary}
            />
          </View>
        </View>

        {/* Units of Measure */}
        <View style={styles.groupLabel}>
          <MaterialCommunityIcons name="ruler" size={13} color={C.secondary} />
          <Text style={styles.groupLabelText}>UNITS OF MEASURE</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.unitsRow}>
            <TouchableOpacity
              style={[styles.unitBtn, units === 'metric' && styles.unitBtnActive]}
              activeOpacity={0.8}
              onPress={() => setUnits('metric')}
            >
              <Text style={[styles.unitBtnText, units === 'metric' && styles.unitBtnTextActive]}>METRIC</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitBtn, units === 'imperial' && styles.unitBtnActive]}
              activeOpacity={0.8}
              onPress={() => setUnits('imperial')}
            >
              <Text style={[styles.unitBtnText, units === 'imperial' && styles.unitBtnTextActive]}>IMPERIAL</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.unitsHint}>Affects elevation, distance, and temperature displays across the atlas.</Text>
        </View>

        {/* Support */}
        <View style={styles.groupLabel}>
          <Ionicons name="help-circle" size={13} color={C.secondary} />
          <Text style={styles.groupLabelText}>SUPPORT</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <MaterialCommunityIcons name="book-open-outline" size={22} color={C.primary} style={styles.supportIcon} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Help Center</Text>
              <Text style={styles.rowSubtitle}>Guides and troubleshooting</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <MaterialCommunityIcons name="shield-search" size={22} color={C.primary} style={styles.supportIcon} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Privacy Policy</Text>
              <Text style={styles.rowSubtitle}>How we handle your expedition data</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.8}>
          <Text style={styles.signOutText}>SIGN OUT OF PARK ATLAS</Text>
        </TouchableOpacity>

        <Text style={styles.version}>VERSION 2.4.1 (STABLE)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: C.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBrand: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  titleSection: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
    gap: 6,
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: C.onSurface,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 15,
    color: C.onSurfaceVariant,
    lineHeight: 22,
  },

  groupLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 10,
  },
  groupLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.secondary,
    letterSpacing: 1.5,
  },

  card: {
    marginHorizontal: 24,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  cardMuted: {
    backgroundColor: '#ededea',
  },
  cardMt: {
    marginTop: 10,
  },

  divider: {
    height: 1,
    backgroundColor: C.outlineVariant,
    marginVertical: 10,
    marginHorizontal: -16,
  },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowTextWrap: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  rowSubtitle: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    lineHeight: 18,
  },

  // Device cards
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  connectedBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: C.secondary,
    letterSpacing: 1.5,
  },
  linkBtn: {
    backgroundColor: C.primary,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  linkBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '800',
    color: C.onSurface,
  },
  deviceSub: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  // Switches
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },

  // Units
  unitsRow: {
    flexDirection: 'row',
    gap: 0,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: C.outlineVariant,
  },
  unitBtnActive: {
    backgroundColor: C.primary,
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  unitBtnTextActive: {
    color: '#ffffff',
  },
  unitsHint: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Support
  supportIcon: {
    width: 28,
  },

  // Sign out
  signOutBtn: {
    marginHorizontal: 24,
    marginTop: 36,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fce4ec',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#c62828',
    letterSpacing: 1.5,
  },

  version: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    letterSpacing: 1.5,
    marginTop: 20,
  },
});
