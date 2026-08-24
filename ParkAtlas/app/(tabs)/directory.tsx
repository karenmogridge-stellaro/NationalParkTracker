import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { ParkAtlas as C } from '@/constants/theme';
import { AppDrawer } from '@/components/AppDrawer';
import { FriendProfile, useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { isFirebaseConfigured, missingFirebaseConfigKeys } from '@/utils/firebase';
import { matchContactsToUsers, searchDirectoryUsersByUsername } from '@/utils/userDirectoryApi';
import { readDeviceContacts, ContactsPermissionDeniedError } from '@/utils/contactsSync';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LoginGateSheet } from '@/components/LoginGateSheet';
import { setPendingAction, peekPendingAction, consumePendingAction, type PendingAction } from '@/utils/pendingAction';

type ConnectionState = 'add' | 'requested' | 'friends' | 'incoming';

function avatarFor(profile: FriendProfile): string {
  return profile.avatar || 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=160&q=80';
}

export default function FriendsPage() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const params = useLocalSearchParams<{ pendingIncoming?: string }>();
  const { user } = useAuth();
  const {
    directoryUsers,
    myFriends,
    incomingRequests,
    requestedIds,
    matchedContactIds,
    contactsSynced,
    sendFriendRequest,
    acceptRequest,
    ignoreRequest,
    setDirectoryUsers,
    setMatchedContactIds,
    markContactsSynced,
  } = useFriends();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [requestedExpanded, setRequestedExpanded] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [directoryWarning, setDirectoryWarning] = useState<string | null>(null);
  // Login gate
  const [gateVisible, setGateVisible] = useState(false);
  const [gateAction, setGateAction] = useState<PendingAction | null>(null);
  // Track previous user ID to detect fresh logins
  const prevUserIdRef = useRef<string | null>(null);
  const pendingIncomingHandledRef = useRef(false);
  const isLoggedIn = Boolean(user?.id);

  const myFriendIds = useMemo(() => new Set(myFriends.map((f) => f.id)), [myFriends]);
  const incomingIds = useMemo(() => new Set(incomingRequests.map((f) => f.id)), [incomingRequests]);

  // Profile lookup map – used to resolve IDs to display profiles
  const profileById = useMemo(() => {
    const map = new Map<string, FriendProfile>();
    directoryUsers.forEach((u) => map.set(u.id, u));
    myFriends.forEach((u) => map.set(u.id, u));
    incomingRequests.forEach((u) => map.set(u.id, u));
    return map;
  }, [directoryUsers, myFriends, incomingRequests]);

  // ── FOLLOWING: only confirmed friends ──────────────────────────────────
  const followingUsers = useMemo(
    () => myFriends.filter((f) => f.id !== user?.id),
    [myFriends, user?.id]
  );

  // ── FROM CONTACTS: contact-matched users NOT followed, NOT requested, NOT incoming, NOT self ─
  // Deliberately scoped to matchedContactIds, not the full directory — the Friends tab
  // should surface people you know, not everyone who's ever signed up.
  const contactMatches = useMemo(
    () => directoryUsers
      .filter((u) =>
        matchedContactIds.has(u.id) &&
        u.id !== user?.id &&
        !myFriendIds.has(u.id) &&
        !requestedIds.has(u.id) &&
        !incomingIds.has(u.id)
      ),
    [directoryUsers, matchedContactIds, user?.id, myFriendIds, requestedIds, incomingIds]
  );

  // ── REQUESTED (outgoing): pending requests that aren't already friends ─
  const requestedUsers = useMemo(() => {
    if (requestedIds.size === 0) return [];

    return Array.from(requestedIds)
      .filter((id) => !myFriendIds.has(id) && id !== user?.id)
      .map((id) => {
        const existing = profileById.get(id);
        if (existing) return existing;
        return {
          id,
          name: 'Pending user',
          username: id.slice(0, 8),
          avatar: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=160&q=80',
          meta: '@' + id.slice(0, 8),
        };
      });
  }, [requestedIds, myFriendIds, user?.id, profileById]);

  // Explicit search hits Firestore directly for a username match instead of filtering
  // a pre-loaded "everyone" list — this is the deliberate way to find someone who
  // isn't already a contact match.
  useEffect(() => {
    if (!isLoggedIn) {
      setSearchResults([]);
      return;
    }
    const q = searchText.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      void searchDirectoryUsersByUsername({ text: q, excludeUserId: user?.id }).then((results) => {
        if (cancelled) return;
        setSearchResults(
          results.map((u) => ({
            id: u.id,
            name: u.name,
            username: u.username,
            avatar: u.avatarUrl || 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=160&q=80',
            meta: '@' + u.username,
          }))
        );
        setSearching(false);
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isLoggedIn, searchText, user?.id]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (params.pendingIncoming !== '1' || pendingIncomingHandledRef.current) return;
    pendingIncomingHandledRef.current = true;
    const count = incomingRequests.length;
    const message = count > 0
      ? `You have ${count} pending friend request${count === 1 ? '' : 's'}.`
      : 'You have a pending friend request.';
    setToast(message);
    Alert.alert('Pending Friend Request', message);
    router.replace('/(tabs)/directory');
  }, [incomingRequests.length, params.pendingIncoming, router]);

  const syncContacts = useCallback(async () => {
    if (!user?.id) return;
    setSyncingContacts(true);
    try {
      if (!isFirebaseConfigured()) {
        const missing = missingFirebaseConfigKeys();
        setDirectoryWarning(`Firebase config missing: ${missing.join(', ')}`);
        return;
      }

      const { phones, emails } = await readDeviceContacts();
      const matches = await matchContactsToUsers({ phones, emails, excludeUserId: user.id });
      setDirectoryWarning(null);

      const profiles: FriendProfile[] = matches.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatarUrl || 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=160&q=80',
        meta: '@' + u.username,
      }));

      await setDirectoryUsers(profiles);
      await setMatchedContactIds(profiles.map((p) => p.id));
      await markContactsSynced(true);
    } catch (e) {
      if (e instanceof ContactsPermissionDeniedError) {
        Alert.alert(
          'Contacts access needed',
          'Allow contacts access in Settings to find friends who are already using ParkAtlas.'
        );
      } else {
        Alert.alert('Unable to sync contacts', 'Please try again.');
      }
    } finally {
      setSyncingContacts(false);
    }
  }, [user?.id, setDirectoryUsers, setMatchedContactIds, markContactsSynced]);

  // Post-login resume: execute a pending 'follow' or 'viewProfile' action when user logs in
  useEffect(() => {
    if (!user?.id || user.id === prevUserIdRef.current) return;
    prevUserIdRef.current = user.id;

    const pending = peekPendingAction();
    if (!pending || (pending.type !== 'follow' && pending.type !== 'viewProfile')) return;
    const action = consumePendingAction();
    if (!action || (action.type !== 'follow' && action.type !== 'viewProfile')) return;

    if (action.type === 'viewProfile') {
      router.push(`/friend/${encodeURIComponent(action.userId)}`);
      return;
    }

    const target = profileById.get(action.userId);
    if (target) {
      void follow(target).then(() => {
        setToast(`Following ${action.displayName} ✅`);
      });
    } else {
      // User not in current list; attempt follow by id anyway
      void sendFriendRequest(action.userId);
      setToast(`Following ${action.displayName} ✅`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isFocused]);

  function stateFor(id: string): ConnectionState {
    if (myFriendIds.has(id)) return 'friends';
    if (incomingIds.has(id)) return 'incoming';
    if (requestedIds.has(id)) return 'requested';
    return 'add';
  }

  async function follow(profile: FriendProfile) {
    // Gate: require login
    if (!user?.id) {
      const action: PendingAction = { type: 'follow', userId: profile.id, displayName: profile.name };
      setPendingAction(action);
      setGateAction(action);
      setGateVisible(true);
      return;
    }

    const state = stateFor(profile.id);
    if (state === 'friends' || state === 'requested') return;
    if (state === 'incoming') {
      await acceptRequest(profile);
      setToast(`You're now following ${profile.name}`);
      return;
    }

    await sendFriendRequest(profile.id);
    setToast(`Requested ${profile.name}`);
  }



  function renderPersonRow(profile: FriendProfile) {
    const state = stateFor(profile.id);

    return (
      <View key={profile.id} style={styles.personRow}>
        <TouchableOpacity
          style={styles.personLeft}
          activeOpacity={0.75}
          onPress={() => {
            if (!user?.id) {
              const action: PendingAction = { type: 'viewProfile', userId: profile.id, displayName: profile.name };
              setPendingAction(action);
              setGateAction(action);
              setGateVisible(true);
              return;
            }
            router.push(`/friend/${encodeURIComponent(profile.id)}`);
          }}
        >
          <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
          <Text style={styles.personName} numberOfLines={1}>{profile.name}</Text>
        </TouchableOpacity>

        {state === 'requested' ? (
          <Text style={styles.statusText}>Requested</Text>
        ) : state === 'friends' ? (
          <Text style={styles.statusText}>Following</Text>
        ) : state === 'incoming' ? (
          <View style={styles.inlineActions}>
            <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={() => { void ignoreRequest(profile.id); }}>
              <Text style={styles.ghostBtnText}>Ignore</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.followBtn} activeOpacity={0.8} onPress={() => { void follow(profile); }}>
              <Text style={styles.followBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.followBtn} activeOpacity={0.8} onPress={() => { void follow(profile); }}>
            <Text style={styles.followBtnText}>Follow</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderFollowingRow(profile: FriendProfile) {
    return (
      <View key={profile.id} style={styles.personRow}>
        <TouchableOpacity
          style={styles.personLeft}
          activeOpacity={0.75}
          onPress={() => {
            if (!user?.id) {
              const action: PendingAction = { type: 'viewProfile', userId: profile.id, displayName: profile.name };
              setPendingAction(action);
              setGateAction(action);
              setGateVisible(true);
              return;
            }
            router.push(`/friend/${encodeURIComponent(profile.id)}`);
          }}
        >
          <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
          <Text style={styles.personName} numberOfLines={1}>{profile.name}</Text>
        </TouchableOpacity>
        <Text style={styles.statusText}>Following</Text>
      </View>
    );
  }

  function renderSuggestedRow(profile: FriendProfile) {
    return (
      <View key={profile.id} style={styles.personRow}>
        <TouchableOpacity
          style={styles.personLeft}
          activeOpacity={0.75}
          onPress={() => {
            if (!user?.id) {
              const action: PendingAction = { type: 'viewProfile', userId: profile.id, displayName: profile.name };
              setPendingAction(action);
              setGateAction(action);
              setGateVisible(true);
              return;
            }
            router.push(`/friend/${encodeURIComponent(profile.id)}`);
          }}
        >
          <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
          <Text style={styles.personName} numberOfLines={1}>{profile.name}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.followBtn} activeOpacity={0.8} onPress={() => { void follow(profile); }}>
          <Text style={styles.followBtnText}>Follow</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderRequestedRow(profile: FriendProfile) {
    return (
      <View key={profile.id} style={styles.personRow}>
        <TouchableOpacity
          style={styles.personLeft}
          activeOpacity={0.75}
          onPress={() => {
            if (!user?.id) {
              const action: PendingAction = { type: 'viewProfile', userId: profile.id, displayName: profile.name };
              setPendingAction(action);
              setGateAction(action);
              setGateVisible(true);
              return;
            }
            router.push(`/friend/${encodeURIComponent(profile.id)}`);
          }}
        >
          <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
          <Text style={styles.personName} numberOfLines={1}>{profile.name}</Text>
        </TouchableOpacity>
        <Text style={styles.statusText}>Requested</Text>
      </View>
    );
  }

  function openInviteScreen() {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    router.push('/invite');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={syncingContacts}
            onRefresh={() => {
              void syncContacts();
            }}
            tintColor={C.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>See what your friends are exploring.</Text>
        </View>

        <View style={styles.findSection}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={C.onSurfaceVariant} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search people"
              placeholderTextColor="#6d746c"
              autoCorrect={false}
              autoCapitalize="none"
              style={styles.searchInput}
            />
          </View>

          {isLoggedIn && searchText.trim().length > 0 ? (
            <View style={styles.sectionBlock}>
              {searching
                ? <Text style={styles.emptyText}>Searching…</Text>
                : searchResults.length === 0
                  ? <Text style={styles.emptyText}>No results</Text>
                  : searchResults.map(renderPersonRow)}
            </View>
          ) : null}

          {isLoggedIn ? (
            <>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Following</Text>
                {followingUsers.length === 0
                  ? <Text style={styles.emptyText}>You&apos;re not following anyone yet</Text>
                  : followingUsers.map(renderFollowingRow)}
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>From your contacts</Text>
                {__DEV__ && directoryWarning ? <Text style={styles.warningText}>{directoryWarning}</Text> : null}
                {!contactsSynced ? (
                  <View style={styles.contactsPromptCard}>
                    <Ionicons name="people-outline" size={22} color={C.primary} />
                    <Text style={styles.contactsPromptText}>
                      Find friends who are already using ParkAtlas by matching your contacts.
                    </Text>
                    <TouchableOpacity
                      style={styles.followBtn}
                      activeOpacity={0.85}
                      disabled={syncingContacts}
                      onPress={() => { void syncContacts(); }}
                    >
                      <Text style={styles.followBtnText}>{syncingContacts ? 'Syncing…' : 'Sync Contacts'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : contactMatches.length > 0 ? (
                  contactMatches.map(renderSuggestedRow)
                ) : (
                  <Text style={styles.emptyText}>None of your contacts are on ParkAtlas yet — invite them!</Text>
                )}
              </View>

              {requestedUsers.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <TouchableOpacity
                    style={styles.requestedHeader}
                    activeOpacity={0.8}
                    onPress={() => setRequestedExpanded((prev) => !prev)}
                  >
                    <Text style={styles.sectionTitle}>Requested ({requestedUsers.length})</Text>
                    <Ionicons
                      name={requestedExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={C.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                  {requestedExpanded ? requestedUsers.map(renderRequestedRow) : null}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.sectionBlock}>
              <Text style={styles.emptyText}>Sign in to view your following list and suggestions.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.inviteBtn} activeOpacity={0.85} onPress={openInviteScreen}>
            <Ionicons name="add" size={18} color={C.onPrimary} />
            <Text style={styles.inviteBtnText}>{isLoggedIn ? 'Invite friends' : 'Sign in to invite friends'}</Text>
          </TouchableOpacity>
        </View>

        {toast ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </ScrollView>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Login gate bottom sheet */}
      <LoginGateSheet
        visible={gateVisible}
        action={gateAction}
        onLogin={() => {
          setGateVisible(false);
          router.push('/login');
        }}
        onDismiss={() => setGateVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 18,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.6,
    fontWeight: '700',
    color: C.onSurface,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurfaceVariant,
  },
  findSection: {
    gap: 14,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#f5f8f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: C.onSurface,
    fontSize: 15,
    paddingVertical: 0,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.onSurface,
  },
  contactsPromptCard: {
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 14,
    backgroundColor: '#f5f8f6',
    padding: 14,
  },
  contactsPromptText: {
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  personRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  personLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ef',
  },
  personName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
  },
  followBtn: {
    backgroundColor: C.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 62,
    alignItems: 'center',
  },
  followBtnDisabled: {
    opacity: 0.45,
  },
  followBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    fontWeight: '700',
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ghostBtn: {
    borderRadius: 999,
    backgroundColor: '#edf2ee',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ghostBtnText: {
    fontSize: 12,
    color: C.onSurface,
    fontWeight: '700',
  },
  requestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: C.primary,
    paddingVertical: 12,
  },
  inviteBtnText: {
    color: C.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  warningText: {
    fontSize: 12,
    color: '#8a4b00',
  },
  toast: {
    alignSelf: 'flex-start',
    backgroundColor: '#e7f1e8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toastText: {
    color: '#1b4332',
    fontSize: 13,
    fontWeight: '600',
  },
});
