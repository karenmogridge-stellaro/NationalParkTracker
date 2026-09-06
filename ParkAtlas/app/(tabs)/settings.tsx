import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as MailComposer from 'expo-mail-composer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useVisitedParks } from '@/hooks/useVisitedParks';
import { useFriends } from '@/hooks/useFriends';
import { AppDrawer } from '@/components/AppDrawer';
import { EditProfileModal } from '@/components/EditProfileModal';
import { PrivacyPolicyModal } from '@/components/PrivacyPolicyModal';
import { collection, documentId, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/utils/firebase';
// import { useStrava } from '@/hooks/useStrava';

type ActivityInboxDoc = {
  id: string;
  toUid: string;
  type: 'kudos_received' | 'request_accepted' | 'friend_logged' | string;
  fromUid?: string;
  eventId?: string;
  parkName?: string;
  createdAtIso?: string;
};

type IncomingKudosDoc = {
  id: string;
  fromUid: string;
  eventId?: string;
  createdAtIso?: string;
};

type ActivityRow = {
  id: string;
  kind: 'kudos' | 'accepted' | 'logged' | 'other';
  fromUid?: string;
  message: string;
  createdAtIso?: string;
};

export default function SettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { signOut, deleteAccount, user, biometricAvailable, biometricEnabled, setBiometricEnabled, changePassword } = useAuth();
  const { deleteAllDataForCurrentUser } = useVisitedParks();
  const { incomingRequests, sentInvites, requestedIds, directoryUsers, myFriends, acceptRequest, ignoreRequest } = useFriends();
  const [biometricSaving, setBiometricSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [activityInbox, setActivityInbox] = useState<ActivityInboxDoc[]>([]);
  const [incomingKudos, setIncomingKudos] = useState<IncomingKudosDoc[]>([]);
  const [userNamesById, setUserNamesById] = useState<Record<string, string>>({});
  const canChangePassword = user?.provider === 'email';
  const isSignedIn = !!user;
  const outgoingRequestCount = useMemo(() => requestedIds.size, [requestedIds]);
  // A kudos can show up in both activityInbox (as a 'kudos_received' activity doc)
  // and incomingKudos (the kudos doc itself) — dedup by fromUid+eventId so it isn't
  // counted twice in the badge, matching the dedup already applied to activityRows below.
  const existingKudosKeys = useMemo(
    () => new Set(
      activityInbox
        .filter((item) => item.type === 'kudos_received')
        .map((item) => `${item.fromUid || ''}::${item.eventId || ''}`)
    ),
    [activityInbox]
  );
  const dedupedIncomingKudosCount = useMemo(
    () => incomingKudos.filter((item) => !existingKudosKeys.has(`${item.fromUid}::${item.eventId || ''}`)).length,
    [incomingKudos, existingKudosKeys]
  );
  // Only things that need the user's attention or happened *to* them count toward the badge.
  const totalNotificationCount = incomingRequests.length + activityInbox.length + dedupedIncomingKudosCount;

  useEffect(() => {
    if (!user?.id) {
      setActivityInbox([]);
      return;
    }

    const inboxQuery = query(
      collection(db, 'activity'),
      where('toUid', '==', user.id),
      limit(80)
    );

    const unsubscribe = onSnapshot(inboxQuery, (snapshot) => {
      const rows: ActivityInboxDoc[] = snapshot.docs.map((snap) => {
        const data = snap.data() as Record<string, any>;
        const createdAtIso = typeof data?.createdAt?.toDate === 'function'
          ? data.createdAt.toDate()?.toISOString()
          : undefined;
        return {
          id: snap.id,
          toUid: typeof data.toUid === 'string' ? data.toUid : '',
          type: typeof data.type === 'string' ? data.type : '',
          fromUid: typeof data.fromUid === 'string' ? data.fromUid : undefined,
          eventId: typeof data.eventId === 'string' ? data.eventId : undefined,
          parkName: typeof data.parkName === 'string' ? data.parkName : undefined,
          createdAtIso,
        };
      });

      rows.sort((a, b) => new Date(b.createdAtIso || 0).getTime() - new Date(a.createdAtIso || 0).getTime());
      setActivityInbox(rows);
    });

    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setIncomingKudos([]);
      return;
    }

    const incomingQuery = query(
      collection(db, 'kudos'),
      where('toUid', '==', user.id),
      limit(80)
    );

    const unsubscribe = onSnapshot(incomingQuery, (snapshot) => {
      const rows: IncomingKudosDoc[] = snapshot.docs.map((snap) => {
        const data = snap.data() as Record<string, any>;
        const createdAtIso = typeof data?.createdAt?.toDate === 'function'
          ? data.createdAt.toDate()?.toISOString()
          : undefined;
        return {
          id: snap.id,
          fromUid: typeof data.fromUid === 'string' ? data.fromUid : '',
          eventId: typeof data.eventId === 'string' ? data.eventId : undefined,
          createdAtIso,
        };
      }).filter((row) => !!row.fromUid);

      rows.sort((a, b) => new Date(b.createdAtIso || 0).getTime() - new Date(a.createdAtIso || 0).getTime());
      setIncomingKudos(rows);
    });

    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    const localNameMap = new Map<string, string>();
    if (user?.id) {
      localNameMap.set(user.id, (user.name || 'You').trim() || 'You');
    }
    directoryUsers.forEach((profile) => localNameMap.set(profile.id, profile.name || profile.username || profile.id));
    myFriends.forEach((profile) => localNameMap.set(profile.id, profile.name || profile.username || profile.id));

    const idsToFetch = new Set<string>();
    activityInbox.forEach((row) => {
      if (row.fromUid && !localNameMap.has(row.fromUid)) idsToFetch.add(row.fromUid);
      if (row.toUid && !localNameMap.has(row.toUid)) idsToFetch.add(row.toUid);
    });
    incomingKudos.forEach((row) => {
      if (row.fromUid && !localNameMap.has(row.fromUid)) idsToFetch.add(row.fromUid);
    });

    if (idsToFetch.size === 0) {
      setUserNamesById(Object.fromEntries(localNameMap.entries()));
      return;
    }

    void (async () => {
      const fetched = new Map<string, string>();
      const ids = Array.from(idsToFetch);
      for (let i = 0; i < ids.length; i += 10) {
        const chunk = ids.slice(i, i + 10);
        try {
          const snapshot = await getDocs(
            query(collection(db, 'users'), where(documentId(), 'in', chunk), limit(10))
          );
          snapshot.docs.forEach((snap) => {
            const data = snap.data() as Record<string, any>;
            const firstName = typeof data.first_name === 'string' ? data.first_name : '';
            const lastName = typeof data.last_name === 'string' ? data.last_name : '';
            const fullName = `${firstName} ${lastName}`.trim();
            const name =
              (typeof data.name === 'string' && data.name.trim()) ||
              fullName ||
              (typeof data.username === 'string' && data.username.trim()) ||
              snap.id;
            fetched.set(snap.id, name);
          });
        } catch {
          // Best-effort name hydration for inbox.
        }
      }

      const merged = new Map<string, string>(localNameMap);
      fetched.forEach((name, id) => merged.set(id, name));
      setUserNamesById(Object.fromEntries(merged.entries()));
    })();
  }, [activityInbox, incomingKudos, directoryUsers, myFriends, user?.id, user?.name]);
  // const [emailNewsletter, setEmailNewsletter] = useState(false);
  // const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  // const { status: stravaStatus, summary: stravaSummary, authorize: authorizeStrava, disconnect: disconnectStrava } = useStrava();

  async function handleBiometricToggle(enabled: boolean) {
    haptic.select();
    try {
      setBiometricSaving(true);
      await setBiometricEnabled(enabled);
      toast.success(enabled ? 'Biometric unlock on' : 'Biometric unlock off', { icon: 'finger-print', silent: true });
    } catch {
      toast.error("Couldn't update biometric setting");
    } finally {
      setBiometricSaving(false);
    }
  }

  async function handleSendFeedback() {
    const message = feedbackText.trim();
    if (!message) {
      toast.error('Add a note before sending');
      return;
    }

    setSendingFeedback(true);
    try {
      const bodyText = `${message}\n\n---\nUser: ${user?.email ?? user?.name ?? 'Unknown'}\nSent from ParkAtlas mobile app.`;
      const isAvailable = await MailComposer.isAvailableAsync();

      if (isAvailable) {
        const result = await MailComposer.composeAsync({
          recipients: ['info@stellaroos.com'],
          subject: 'ParkAtlas App Feedback',
          body: bodyText,
        });

        if (result.status === 'sent' || result.status === 'saved') {
          setFeedbackVisible(false);
          setFeedbackText('');
          toast.success('Thanks for the feedback!', { icon: 'heart' });
        }
        return;
      }

      const subject = encodeURIComponent('ParkAtlas App Feedback');
      const body = encodeURIComponent(bodyText);
      const url = `mailto:info@stellaroos.com?subject=${subject}&body=${body}`;
      await Linking.openURL(url);
      setFeedbackVisible(false);
      setFeedbackText('');
    } catch {
      toast.error('Unable to open mail. Email info@stellaroos.com directly.', { durationMs: 4500 });
    } finally {
      setSendingFeedback(false);
    }
  }

  function resetPasswordForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSaving(false);
  }

  function closePasswordModal() {
    setPasswordModalVisible(false);
    resetPasswordForm();
  }

  async function handleChangePassword() {
    if (!canChangePassword) {
      toast.info('Password changes are only available for email accounts');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Fill out all three password fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('New password must differ from your current one');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      closePasswordModal();
      toast.success('Password updated', { icon: 'lock-closed' });
    } catch (error: any) {
      toast.error(error?.message ?? "Couldn't change password. Try again.");
    } finally {
      setPasswordSaving(false);
    }
  }

  function confirmDeleteAccount() {
    haptic.warning();
    Alert.alert(
      'Delete account?',
      'This permanently deletes your ParkAtlas account and all app data stored on this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            void handleDeleteAccount();
          },
        },
      ],
    );
  }

  async function handleDeleteAccount() {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      await deleteAllDataForCurrentUser();
      await deleteAccount();
      toast.info('Your account and data were deleted', { icon: 'trash', durationMs: 4000 });
    } catch {
      toast.error("Couldn't delete your account. Try again.");
    } finally {
      setDeletingAccount(false);
    }
  }

  function openFriendsFromNotifications() {
    setNotificationsVisible(false);
    router.push('/(tabs)/directory');
  }

  const friendlyName = useCallback((uid?: string, fallback: string = 'Someone'): string => {
    if (!uid) return fallback;
    if (uid === user?.id) return 'You';
    return userNamesById[uid] || fallback;
  }, [user?.id, userNamesById]);

  function formatRelativeTime(iso?: string): string {
    if (!iso) return 'Just now';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const diffMs = Date.now() - date.getTime();
    const mins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const activityRows = useMemo<ActivityRow[]>(() => {
    const inboxRows: ActivityRow[] = activityInbox.map((item) => {
      const fromName = friendlyName(item.fromUid);
      const base = { id: `inbox_${item.id}`, fromUid: item.fromUid, createdAtIso: item.createdAtIso };
      if (item.type === 'kudos_received') {
        return { ...base, kind: 'kudos', message: `${fromName} High-Fived your visit` };
      }
      if (item.type === 'request_accepted') {
        return { ...base, kind: 'accepted', message: `${fromName} accepted your friend request` };
      }
      if (item.type === 'friend_logged') {
        return { ...base, kind: 'logged', message: `${fromName} logged ${item.parkName || 'a park'}` };
      }
      return { ...base, kind: 'other', message: `${fromName} sent an update` };
    });

    const incomingKudosRows: ActivityRow[] = incomingKudos
      .filter((item) => !existingKudosKeys.has(`${item.fromUid}::${item.eventId || ''}`))
      .map((item) => ({
        id: `kudos_in_${item.id}`,
        kind: 'kudos',
        fromUid: item.fromUid,
        message: `${friendlyName(item.fromUid)} High-Fived your visit`,
        createdAtIso: item.createdAtIso,
      }));

    return [...inboxRows, ...incomingKudosRows]
      .sort((a, b) => new Date(b.createdAtIso || 0).getTime() - new Date(a.createdAtIso || 0).getTime())
      .slice(0, 30);
  }, [activityInbox, incomingKudos, existingKudosKeys, friendlyName]);

  const latestActivity = activityRows[0];

  function openFriendProfile(uid?: string) {
    if (!uid || uid === user?.id) return;
    setNotificationsVisible(false);
    router.push(`/friend/${encodeURIComponent(uid)}`);
  }

  function iconForActivity(kind: ActivityRow['kind']): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
    if (kind === 'kudos') return 'hand-wave';
    if (kind === 'accepted') return 'account-check';
    if (kind === 'logged') return 'pine-tree';
    return 'bell-ring-outline';
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroRow}>
            <Image
              source={require('../../assets/images/parkatlas-logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Settings</Text>
              <Text style={styles.pageSubtitle}>Manage your expedition preferences and profile.</Text>
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={styles.groupLabel}>
          <Ionicons name="person" size={13} color={C.secondary} />
          <Text style={styles.groupLabelText}>ACCOUNT</Text>
        </View>
        <View style={styles.card}>
          {!isSignedIn ? (
            <TouchableOpacity
              style={styles.rowItem}
              activeOpacity={0.7}
              onPress={() => router.navigate('/login' as any)}
            >
              <MaterialCommunityIcons name="account-plus-outline" size={22} color={C.primary} style={styles.supportIcon} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Sign In or Create Account</Text>
                <Text style={styles.rowSubtitle}>Optional for profile, password, and account management features</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.accountIdentityCard}>
                <Text style={styles.accountIdentityName}>{(user?.name || 'Explorer').trim() || 'Explorer'}</Text>
                <Text style={styles.accountIdentityEmail}>
                  {user?.email?.trim()
                    ? user.email
                    : 'No email available (Sign in with Apple may hide your email)'}
                </Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => setEditProfileVisible(true)}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Edit Profile</Text>
                  <Text style={styles.rowSubtitle}>Update your display name and avatar</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.onSurfaceVariant} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={[styles.rowItem, !canChangePassword && styles.rowItemDisabled]}
                activeOpacity={0.7}
                onPress={() => setPasswordModalVisible(true)}
                disabled={!canChangePassword}
              >
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Change Password</Text>
                  <Text style={styles.rowSubtitle}>
                    {canChangePassword
                      ? 'Secure your account with a new password'
                      : 'Unavailable for Sign in with Apple accounts'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={canChangePassword ? C.onSurfaceVariant : C.outlineVariant} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Face ID Lock</Text>
                  <Text style={styles.rowSubtitle}>
                    {biometricAvailable
                      ? 'Require Face ID / Touch ID to unlock ParkAtlas'
                      : 'Face ID / Touch ID is not available on this device'}
                  </Text>
                </View>
                {biometricSaving ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: C.outlineVariant, true: C.primary }}
                    thumbColor={C.onPrimary}
                    disabled={!biometricAvailable || biometricSaving}
                  />
                )}
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={signOut}>
                <MaterialCommunityIcons name="logout" size={22} color={C.onSurfaceVariant} style={styles.supportIcon} />
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Sign Out</Text>
                  <Text style={styles.rowSubtitle}>Sign out of your ParkAtlas account on this device</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.onSurfaceVariant} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={[styles.rowItem, deletingAccount && styles.rowItemDisabled]}
                activeOpacity={0.7}
                onPress={confirmDeleteAccount}
                disabled={deletingAccount}
              >
                <MaterialCommunityIcons name="delete-forever" size={22} color={C.error} style={styles.supportIcon} />
                <View style={styles.rowTextWrap}>
                  <Text style={styles.deleteTitle}>Delete Account</Text>
                  <Text style={styles.rowSubtitle}>Permanently delete your account and all data on this device</Text>
                </View>
                {deletingAccount ? (
                  <ActivityIndicator size="small" color={C.error} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={C.error} />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.groupLabel}>
          <Ionicons name="notifications" size={13} color={C.secondary} />
          <Text style={styles.groupLabelText}>NOTIFICATIONS</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => setNotificationsVisible(true)}>
            <MaterialCommunityIcons name="bell-badge-outline" size={22} color={C.primary} style={styles.supportIcon} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Activity</Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {incomingRequests.length > 0
                  ? `${incomingRequests.length} friend request${incomingRequests.length === 1 ? '' : 's'} waiting`
                  : latestActivity
                    ? `${latestActivity.message} · ${formatRelativeTime(latestActivity.createdAtIso)}`
                    : 'High-Fives, requests, and friend activity'}
              </Text>
            </View>
            {totalNotificationCount > 0 ? (
              <View style={styles.notificationsBadge}>
                <Text style={styles.notificationsBadgeText}>{Math.min(totalNotificationCount, 99)}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={C.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Device Integration — hidden until integrations are ready */}
        {/* <View style={styles.groupLabel}>
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
        <View style={[styles.card, stravaStatus === 'connected' ? undefined : styles.cardMuted, styles.cardMt]}>
          <View style={styles.deviceRow}>
            <MaterialCommunityIcons
              name="run"
              size={28}
              color={stravaStatus === 'connected' ? '#FC4C02' : C.onSurfaceVariant}
            />
            {stravaStatus === 'connected' ? (
              <View style={styles.deviceRowRight}>
                <Text style={styles.connectedBadge}>CONNECTED</Text>
                <TouchableOpacity onPress={disconnectStrava} activeOpacity={0.7}>
                  <Text style={styles.unlinkText}>UNLINK</Text>
                </TouchableOpacity>
              </View>
            ) : stravaStatus === 'loading' || stravaStatus === 'authorizing' ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <TouchableOpacity style={styles.linkBtn} activeOpacity={0.85} onPress={authorizeStrava}>
                <Text style={styles.linkBtnText}>LINK</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.deviceName}>Strava</Text>
          {stravaStatus === 'connected' && stravaSummary ? (
            <Text style={styles.deviceSub}>
              Last 30 days: {stravaSummary.hikeCount} hikes · {stravaSummary.totalDistanceKm} km · {stravaSummary.totalElevationM} m gain
            </Text>
          ) : stravaStatus === 'error' ? (
            <Text style={[styles.deviceSub, { color: C.error }]}>Connection failed — tap LINK to retry</Text>
          ) : (
            <Text style={styles.deviceSub}>Sync hike distance, elevation and trail activity</Text>
          )}
        </View> */}

        {/* Units of Measure — commented out for later */}
        {/* <View style={styles.groupLabel}>
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
        </View> */}

        {/* Support */}
        <View style={styles.groupLabel}>
          <Ionicons name="help-circle" size={13} color={C.secondary} />
          <Text style={styles.groupLabelText}>SUPPORT</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => setFeedbackVisible(true)}>
            <MaterialCommunityIcons name="message-text-outline" size={22} color={C.primary} style={styles.supportIcon} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Send Feedback</Text>
              <Text style={styles.rowSubtitle}>Share ideas, bugs, and feature requests</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => setPrivacyVisible(true)}>
            <MaterialCommunityIcons name="shield-search" size={22} color={C.primary} style={styles.supportIcon} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Privacy Policy</Text>
              <Text style={styles.rowSubtitle}>How we handle your expedition data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>VERSION 2.4.1 (STABLE)</Text>
      </ScrollView>
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <EditProfileModal visible={editProfileVisible} onClose={() => setEditProfileVisible(false)} />
      <PrivacyPolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />

      <Modal
        visible={notificationsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setNotificationsVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Activity</Text>
                <Text style={styles.sheetSubtitle}>
                  {totalNotificationCount > 0
                    ? `${totalNotificationCount} new`
                    : "You're all caught up"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)} style={styles.sheetCloseBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={C.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              {incomingRequests.length > 0 ? (
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetSectionTitle}>NEEDS YOUR REPLY</Text>
                  {incomingRequests.map((request) => (
                    <View key={request.id} style={styles.requestCard}>
                      <TouchableOpacity style={styles.requestPerson} activeOpacity={0.75} onPress={() => openFriendProfile(request.id)}>
                        <Image source={{ uri: request.avatar }} style={styles.requestAvatar} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.requestName} numberOfLines={1}>{request.name}</Text>
                          <Text style={styles.requestMeta} numberOfLines={1}>wants to follow your adventures</Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={styles.requestIgnoreBtn}
                          activeOpacity={0.75}
                          onPress={() => { haptic.select(); void ignoreRequest(request.id); }}
                          accessibilityRole="button"
                          accessibilityLabel={`Ignore ${request.name}`}
                        >
                          <Text style={styles.requestIgnoreText}>Ignore</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.requestAcceptBtn}
                          activeOpacity={0.75}
                          onPress={() => {
                            void acceptRequest(request);
                            toast.success(`You're now following ${request.name}`, { icon: 'person-add' });
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Accept ${request.name}`}
                        >
                          <Ionicons name="checkmark" size={15} color={C.onPrimary} />
                          <Text style={styles.requestAcceptText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.sheetSection}>
                {incomingRequests.length > 0 ? <Text style={styles.sheetSectionTitle}>RECENT</Text> : null}
                {activityRows.length === 0 ? (
                  <View style={styles.sheetEmpty}>
                    <View style={styles.sheetEmptyIcon}>
                      <MaterialCommunityIcons name="bell-sleep-outline" size={26} color={C.primary} />
                    </View>
                    <Text style={styles.sheetEmptyTitle}>Nothing new yet</Text>
                    <Text style={styles.sheetEmptyText}>
                      When friends High-Five your visits or log a park, you&apos;ll see it here.
                    </Text>
                    <TouchableOpacity style={styles.sheetEmptyBtn} activeOpacity={0.8} onPress={openFriendsFromNotifications}>
                      <Ionicons name="people-outline" size={15} color={C.primary} />
                      <Text style={styles.sheetEmptyBtnText}>Find friends</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  activityRows.map((row) => (
                    <TouchableOpacity
                      key={row.id}
                      style={styles.activityRow}
                      activeOpacity={row.fromUid && row.fromUid !== user?.id ? 0.7 : 1}
                      onPress={() => openFriendProfile(row.fromUid)}
                      disabled={!row.fromUid || row.fromUid === user?.id}
                    >
                      <View style={[styles.activityIcon, row.kind === 'kudos' && styles.activityIconKudos]}>
                        <MaterialCommunityIcons name={iconForActivity(row.kind)} size={17} color={row.kind === 'kudos' ? C.onPrimary : C.primary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.activityMessage}>{row.message}</Text>
                        <Text style={styles.activityTime}>{formatRelativeTime(row.createdAtIso)}</Text>
                      </View>
                      {row.fromUid && row.fromUid !== user?.id ? (
                        <Ionicons name="chevron-forward" size={16} color={C.outlineVariant} />
                      ) : null}
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {outgoingRequestCount > 0 || sentInvites.length > 0 ? (
                <TouchableOpacity style={styles.sheetFooter} activeOpacity={0.7} onPress={openFriendsFromNotifications}>
                  <Ionicons name="paper-plane-outline" size={14} color={C.onSurfaceVariant} />
                  <Text style={styles.sheetFooterText}>
                    {[
                      outgoingRequestCount > 0 ? `${outgoingRequestCount} request${outgoingRequestCount === 1 ? '' : 's'} awaiting a reply` : null,
                      sentInvites.length > 0 ? `${sentInvites.length} invite${sentInvites.length === 1 ? '' : 's'} sent` : null,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={C.outlineVariant} />
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={feedbackVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Send Feedback</Text>
            <Text style={styles.feedbackSubtitle}>Your message will open in your email app to send to info@stellaroos.com.</Text>

            <TextInput
              style={styles.feedbackInput}
              multiline
              placeholder="What would make ParkAtlas better?"
              placeholderTextColor={C.outlineVariant}
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
              editable={!sendingFeedback}
            />

            <View style={styles.feedbackActions}>
              <TouchableOpacity
                style={styles.feedbackCancelBtn}
                onPress={() => setFeedbackVisible(false)}
                activeOpacity={0.7}
                disabled={sendingFeedback}
              >
                <Text style={styles.feedbackCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.feedbackSendBtn}
                onPress={handleSendFeedback}
                activeOpacity={0.8}
                disabled={sendingFeedback}
              >
                {sendingFeedback ? (
                  <ActivityIndicator size="small" color={C.onPrimary} />
                ) : (
                  <Text style={styles.feedbackSendText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closePasswordModal}
      >
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Change Password</Text>
            <Text style={styles.feedbackSubtitle}>Use at least 8 characters for your new password.</Text>

            <TextInput
              style={styles.feedbackInput}
              placeholder="Current password"
              placeholderTextColor={C.outlineVariant}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              editable={!passwordSaving}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.feedbackInput}
              placeholder="New password"
              placeholderTextColor={C.outlineVariant}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!passwordSaving}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.feedbackInput}
              placeholder="Confirm new password"
              placeholderTextColor={C.outlineVariant}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!passwordSaving}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.feedbackActions}>
              <TouchableOpacity
                style={styles.feedbackCancelBtn}
                onPress={closePasswordModal}
                activeOpacity={0.7}
                disabled={passwordSaving}
              >
                <Text style={styles.feedbackCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.feedbackSendBtn}
                onPress={handleChangePassword}
                activeOpacity={0.8}
                disabled={passwordSaving}
              >
                {passwordSaving ? (
                  <ActivityIndicator size="small" color={C.onPrimary} />
                ) : (
                  <Text style={styles.feedbackSendText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  heroHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 6,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroLogo: {
    width: 96,
    height: 96,
  },
  pageTitle: {
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -0.8,
    fontWeight: '700',
    color: C.onSurface,
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: C.onSurfaceVariant,
    lineHeight: 19,
    maxWidth: 320,
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
    backgroundColor: C.surfaceContainerHigh,
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
  rowItemDisabled: {
    opacity: 0.5,
  },
  accountIdentityCard: {
    paddingVertical: 2,
    gap: 3,
  },
  accountIdentityName: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: C.onSurface,
  },
  accountIdentityEmail: {
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
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
  deleteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.error,
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
  unavailableText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
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
  deviceRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unlinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 1,
    textDecorationLine: 'underline',
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
  // ── Activity sheet ──
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 18, 12, 0.5)',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: C.onSurface,
  },
  sheetSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceContainerHigh,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetContent: {
    gap: 18,
    paddingBottom: 6,
  },
  sheetSection: {
    gap: 8,
  },
  sheetSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: C.onSurfaceVariant,
  },
  requestCard: {
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: C.primaryContainer,
  },
  requestPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceContainerHighest,
  },
  requestName: {
    fontSize: 15,
    fontWeight: '800',
    color: C.onSurface,
  },
  requestMeta: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 1,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestIgnoreBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.surface,
  },
  requestIgnoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.onSurface,
  },
  requestAcceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.primary,
  },
  requestAcceptText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.onPrimary,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surfaceContainerHighest,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryContainer,
  },
  activityIconKudos: {
    backgroundColor: C.primary,
  },
  activityMessage: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: C.onSurface,
  },
  activityTime: {
    marginTop: 1,
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  sheetEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  sheetEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryContainer,
    marginBottom: 4,
  },
  sheetEmptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.onSurface,
  },
  sheetEmptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: C.onSurfaceVariant,
  },
  sheetEmptyBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  sheetEmptyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.primary,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: C.surfaceContainerLow,
  },
  sheetFooterText: {
    flex: 1,
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  notificationsBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  notificationsBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.onPrimary,
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  feedbackCard: {
    backgroundColor: C.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    gap: 12,
    maxHeight: '85%',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.onSurface,
  },
  feedbackSubtitle: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    lineHeight: 18,
  },
  feedbackInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.onSurface,
    fontSize: 14,
    backgroundColor: C.surfaceContainerLow,
  },
  feedbackActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  feedbackCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.surfaceContainerLow,
  },
  feedbackCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.onSurfaceVariant,
  },
  feedbackSendBtn: {
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.primary,
  },
  feedbackSendText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.onPrimary,
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
