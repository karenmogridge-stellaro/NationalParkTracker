import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as MailComposer from 'expo-mail-composer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useVisitedParks } from '@/hooks/useVisitedParks';
import { useFriends } from '@/hooks/useFriends';
import { AppDrawer } from '@/components/AppDrawer';
import { EditProfileModal } from '@/components/EditProfileModal';
import { PrivacyPolicyModal } from '@/components/PrivacyPolicyModal';
// import { useStrava } from '@/hooks/useStrava';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, deleteAccount, user, biometricAvailable, biometricEnabled, setBiometricEnabled, changePassword } = useAuth();
  const { deleteAllDataForCurrentUser } = useVisitedParks();
  const { incomingRequests, sentInvites, requestedIds, acceptRequest, ignoreRequest } = useFriends();
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
  const canChangePassword = user?.provider === 'email';
  const isSignedIn = !!user;
  const outgoingRequestCount = useMemo(() => requestedIds.size, [requestedIds]);
  const totalNotificationCount = incomingRequests.length + sentInvites.length + outgoingRequestCount;
  // const [emailNewsletter, setEmailNewsletter] = useState(false);
  // const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  // const { status: stravaStatus, summary: stravaSummary, authorize: authorizeStrava, disconnect: disconnectStrava } = useStrava();

  async function handleBiometricToggle(enabled: boolean) {
    try {
      setBiometricSaving(true);
      await setBiometricEnabled(enabled);
    } finally {
      setBiometricSaving(false);
    }
  }

  async function handleSendFeedback() {
    const message = feedbackText.trim();
    if (!message) {
      Alert.alert('Feedback required', 'Please enter your feedback before sending.');
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
      Alert.alert('Unable to send feedback', 'Please email info@stellaroos.com directly.');
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
      Alert.alert('Unavailable', 'Password changes are only available for email sign-in accounts.');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing details', 'Please fill out all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please confirm the same new password.');
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert('Choose a new password', 'Your new password must be different from your current password.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Password updated', 'Your password has been changed successfully.');
      closePasswordModal();
    } catch (error: any) {
      Alert.alert('Unable to change password', error?.message ?? 'Please try again.');
    } finally {
      setPasswordSaving(false);
    }
  }

  function confirmDeleteAccount() {
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
      Alert.alert('Account deleted', 'Your account and local app data were deleted from this device.');
    } catch {
      Alert.alert('Unable to delete account', 'Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  }

  function formatWhen(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function openFriendsFromNotifications() {
    setNotificationsVisible(false);
    router.push('/(tabs)/directory');
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
                <MaterialCommunityIcons name="delete-forever" size={22} color="#c62828" style={styles.supportIcon} />
                <View style={styles.rowTextWrap}>
                  <Text style={styles.deleteTitle}>Delete Account</Text>
                  <Text style={styles.rowSubtitle}>Permanently delete your account and all data on this device</Text>
                </View>
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#c62828" />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#c62828" />
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
              <Text style={styles.rowTitle}>Friend Requests & Invites</Text>
              <Text style={styles.rowSubtitle}>
                {totalNotificationCount > 0
                  ? `${incomingRequests.length} pending requests · ${sentInvites.length} invites sent`
                  : 'No new friend notifications'}
              </Text>
            </View>
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
            <Text style={[styles.deviceSub, { color: '#c62828' }]}>Connection failed — tap LINK to retry</Text>
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
        animationType="fade"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Notifications</Text>
            <Text style={styles.feedbackSubtitle}>Review incoming friend requests and sent invites.</Text>

            <ScrollView style={styles.notificationsScroll} contentContainerStyle={styles.notificationsContent}>
              <Text style={styles.notificationsSectionTitle}>Pending Requests</Text>
              {incomingRequests.length > 0 ? (
                <TouchableOpacity
                  style={styles.openFriendsBtn}
                  activeOpacity={0.8}
                  onPress={openFriendsFromNotifications}
                >
                  <Ionicons name="people-outline" size={14} color={C.onPrimary} />
                  <Text style={styles.openFriendsBtnText}>Open Friends to Review All</Text>
                </TouchableOpacity>
              ) : null}
              {incomingRequests.length === 0 ? (
                <Text style={styles.notificationsEmptyText}>No pending friend requests.</Text>
              ) : (
                incomingRequests.map((request) => (
                  <View key={request.id} style={styles.notificationRow}>
                    <TouchableOpacity
                      style={styles.notificationProfileTap}
                      activeOpacity={0.75}
                      onPress={openFriendsFromNotifications}
                    >
                      <Image source={{ uri: request.avatar }} style={styles.notificationAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notificationName}>{request.name}</Text>
                        <Text style={styles.notificationMeta}>@{request.username}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.notificationSecondaryBtn}
                      activeOpacity={0.75}
                      onPress={() => {
                        void ignoreRequest(request.id);
                      }}
                    >
                      <Text style={styles.notificationSecondaryText}>Ignore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.notificationPrimaryBtn}
                      activeOpacity={0.75}
                      onPress={() => {
                        void acceptRequest(request);
                      }}
                    >
                      <Text style={styles.notificationPrimaryText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <Text style={styles.notificationsSectionTitle}>Sent Invites</Text>
              {sentInvites.length === 0 ? (
                <Text style={styles.notificationsEmptyText}>No invites sent yet.</Text>
              ) : (
                sentInvites.slice(0, 15).map((invite) => (
                  <View key={invite.inviteId} style={styles.notificationInviteRow}>
                    <MaterialCommunityIcons name="link-variant" size={16} color={C.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notificationMeta}>Invite sent {formatWhen(invite.sentAt)}</Text>
                      <Text style={styles.notificationUrl} numberOfLines={1}>{invite.inviteUrl}</Text>
                    </View>
                  </View>
                ))
              )}

              <Text style={styles.notificationsSectionTitle}>Outgoing Requests</Text>
              <Text style={styles.notificationsEmptyText}>
                {outgoingRequestCount > 0
                  ? `${outgoingRequestCount} friend request${outgoingRequestCount === 1 ? '' : 's'} pending response.`
                  : 'No outgoing friend requests.'}
              </Text>
            </ScrollView>

            <View style={styles.feedbackActions}>
              <TouchableOpacity
                style={styles.feedbackSendBtn}
                onPress={() => setNotificationsVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.feedbackSendText}>Done</Text>
              </TouchableOpacity>
            </View>
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
    color: '#c62828',
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
  notificationsScroll: {
    maxHeight: 340,
  },
  notificationsContent: {
    gap: 10,
  },
  notificationsSectionTitle: {
    marginTop: 6,
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: '800',
    color: C.secondary,
  },
  notificationsEmptyText: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    lineHeight: 18,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationProfileTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  notificationName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
  },
  notificationMeta: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  notificationPrimaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  notificationPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onPrimary,
  },
  notificationSecondaryBtn: {
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: C.surfaceContainerLow,
  },
  notificationSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onSurface,
  },
  notificationInviteRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  notificationUrl: {
    fontSize: 12,
    color: C.onSurface,
  },
  openFriendsBtn: {
    marginTop: 2,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  openFriendsBtnText: {
    fontSize: 12,
    fontWeight: '700',
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
