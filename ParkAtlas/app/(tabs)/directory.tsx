import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ParkAtlas as C } from '@/constants/theme';
import { AppDrawer } from '@/components/AppDrawer';
import { FriendProfile, useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { isDirectoryApiConfigured, matchRegisteredUsersByContacts } from '@/utils/userDirectoryApi';

type ConnectionState = 'add' | 'requested' | 'friends' | 'incoming';

function normalize(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function phoneDigits(value?: string | null): string {
  return (value || '').replace(/\D+/g, '');
}

function avatarFor(profile: FriendProfile): string {
  return profile.avatar || 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=160&q=80';
}

export default function FriendsPage() {
  const { user } = useAuth();
  const directoryApiReady = isDirectoryApiConfigured();
  const {
    directoryUsers,
    myFriends,
    incomingRequests,
    requestedIds,
    contactsSynced,
    matchedContactIds,
    sendFriendRequest,
    acceptRequest,
    ignoreRequest,
    markContactsSynced,
    setDirectoryUsers,
    setMatchedContactIds,
    recordInviteSent,
  } = useFriends();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [inviteEntry, setInviteEntry] = useState('');
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [showContactMatches, setShowContactMatches] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [findSectionY, setFindSectionY] = useState(0);
  const [scrollToFindPending, setScrollToFindPending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const myFriendIds = useMemo(() => new Set(myFriends.map((f) => f.id)), [myFriends]);
  const incomingIds = useMemo(() => new Set(incomingRequests.map((f) => f.id)), [incomingRequests]);

  const discoverableUsers = useMemo(() => {
    const seen = new Set<string>();
    return [...directoryUsers, ...incomingRequests, ...myFriends].filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [directoryUsers, incomingRequests, myFriends]);

  const suggestedUsers = useMemo(
    () => discoverableUsers.filter((u) => !myFriendIds.has(u.id) && !requestedIds.has(u.id)).slice(0, 6),
    [discoverableUsers, myFriendIds, requestedIds]
  );

  const searchResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];

    return discoverableUsers
      .filter((u) => `${u.name} ${u.username} ${u.email || ''} ${u.phone || ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchText, discoverableUsers]);

  const contactMatches = useMemo(
    () => discoverableUsers.filter((u) => matchedContactIds.has(u.id)).slice(0, 6),
    [discoverableUsers, matchedContactIds]
  );

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!scrollToFindPending || findSectionY <= 0) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, findSectionY - 12), animated: true });
    setScrollToFindPending(false);
  }, [scrollToFindPending, findSectionY]);

  function stateFor(id: string): ConnectionState {
    if (myFriendIds.has(id)) return 'friends';
    if (incomingIds.has(id)) return 'incoming';
    if (requestedIds.has(id)) return 'requested';
    return 'add';
  }

  async function follow(profile: FriendProfile) {
    const state = stateFor(profile.id);
    if (state === 'friends' || state === 'requested') return;
    if (state === 'incoming') {
      await acceptRequest(profile);
      setToast(`You're now following ${profile.name}`);
      return;
    }

    await sendFriendRequest(profile.id);
    setToast(`You're now following ${profile.name}`);
  }

  async function syncContacts() {
    if (syncingContacts) return;

    // expo-contacts is a native module — only works in a development build, not Expo Go
    if (Constants.appOwnership === 'expo') {
      Alert.alert(
        'Development Build Required',
        'Syncing contacts requires the full ParkAtlas app, not Expo Go. Use the TestFlight build to access this feature.'
      );
      return;
    }
    let ExpoContacts: typeof import('expo-contacts') | null = null;
    try {
      ExpoContacts = await import('expo-contacts');
    } catch {
      Alert.alert('Contacts unavailable', 'Finding friends from contacts requires the full ParkAtlas build.');
      return;
    }

    setSyncingContacts(true);
    try {
      if (!directoryApiReady) {
        Alert.alert(
          'Friend matching setup in progress',
          'This TestFlight build is not connected to ParkAtlas account matching yet. You can still invite friends with the Invite section below.'
        );
        return;
      }

      if (contactsSynced) {
        const existing = await ExpoContacts.getPermissionsAsync();
        if (existing.status === 'granted') {
          setShowContactMatches(true);
          return;
        }
        await markContactsSynced(false);
      }

      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Find Friends from Contacts',
          "We'll only use contacts to find matches on ParkAtlas.",
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Continue', onPress: () => resolve(true) },
          ]
        );
      });
      if (!confirmed) return;

      const permission = await ExpoContacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Contacts permission needed', 'Allow contacts access to find people you know on ParkAtlas.');
        return;
      }

      const result = await ExpoContacts.getContactsAsync({
        fields: [ExpoContacts.Fields.Emails, ExpoContacts.Fields.PhoneNumbers, ExpoContacts.Fields.Name],
        pageSize: 1000,
      });

      const contacts = result.data ?? [];
      const emails = contacts.flatMap((c) => (c.emails || []).map((e) => normalize(e.email)).filter(Boolean));
      const phones = contacts.flatMap((c) => (c.phoneNumbers || []).map((p) => phoneDigits(p.number)).filter(Boolean));

      const remoteMatches = await matchRegisteredUsersByContacts({ emails, phones });
      const matchedProfiles: FriendProfile[] = remoteMatches.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatarUrl || 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=160&q=80',
        meta: '@' + u.username,
        status: 'offline',
        email: undefined,
        phone: undefined,
      }));

      if (matchedProfiles.length > 0) {
        await setDirectoryUsers(matchedProfiles);
        await setMatchedContactIds(matchedProfiles.map((p) => p.id));
      } else {
        const fallbackMatchedIds = discoverableUsers
          .filter((profile) => {
            const profileEmail = normalize(profile.email);
            const profilePhone = phoneDigits(profile.phone || profile.meta);
            const profileName = normalize(profile.name);
            return contacts.some((contact) => {
              const contactName = normalize(contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`);
              const contactEmails = (contact.emails || []).map((e) => normalize(e.email));
              const contactPhones = (contact.phoneNumbers || []).map((p) => phoneDigits(p.number));
              return (
                (profileEmail && contactEmails.includes(profileEmail)) ||
                (profilePhone && contactPhones.includes(profilePhone)) ||
                (contactName && (contactName.includes(profileName) || profileName.includes(contactName)))
              );
            });
          })
          .map((p) => p.id);

        await setMatchedContactIds(fallbackMatchedIds);

        if (fallbackMatchedIds.length === 0) {
          Alert.alert(
            'No matches found yet',
            'None of your contacts were found in ParkAtlas yet. Ask friends to create an account first, then try again.'
          );
        }
      }

      await markContactsSynced(true);
      setShowContactMatches(true);
      setToast('Contacts synced');
    } catch {
      Alert.alert('Unable to sync contacts', 'Please try again.');
    } finally {
      setSyncingContacts(false);
    }
  }

  async function shareInviteLink() {
    const inviteCode = `${(user?.id || 'guest').slice(0, 6)}-${Date.now().toString(36).slice(-6)}`;
    const deepLinkUrl = `parkatlas://invite?code=${inviteCode}`;
    const appStoreUrl = 'https://apps.apple.com/app/id6760982981';

    try {
      const result = await Share.share({
        title: 'Join me on ParkAtlas',
        message: `I'm tracking my park visits on ParkAtlas - join me.\n\nOpen in app: ${deepLinkUrl}\nDownload ParkAtlas: ${appStoreUrl}`,
        url: deepLinkUrl,
      });

      if (result.action === Share.sharedAction) {
        await recordInviteSent(deepLinkUrl);
        setToast('Invite link shared');
      }
    } catch {
      Alert.alert('Unable to share', 'Please try again.');
    }
  }

  function sendDirectInvite() {
    const value = inviteEntry.trim();
    if (!value) return;

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const validPhone = phoneDigits(value).length >= 10;
    if (!validEmail && !validPhone) {
      Alert.alert('Enter phone or email', 'Please provide a valid phone number or email address.');
      return;
    }

    setInviteEntry('');
    setToast('Invited');
  }

  function renderPersonRow(profile: FriendProfile) {
    const state = stateFor(profile.id);

    return (
      <View key={profile.id} style={styles.personRow}>
        <View style={styles.personLeft}>
          <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
          <Text style={styles.personName} numberOfLines={1}>{profile.name}</Text>
        </View>

        {state === 'friends' ? (
          <Text style={styles.statusText}>Following</Text>
        ) : state === 'requested' ? (
          <Text style={styles.statusText}>Requested</Text>
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>See what your friends are exploring.</Text>
        </View>

        {myFriends.length === 0 ? null : (
          <TouchableOpacity style={styles.findMoreRow} activeOpacity={0.8} onPress={() => setScrollToFindPending(true)}>
            <Ionicons name="people-outline" size={16} color={C.primary} />
            <Text style={styles.findMoreText}>Find more friends</Text>
          </TouchableOpacity>
        )}

        <View style={styles.findSection} onLayout={(event) => setFindSectionY(event.nativeEvent.layout.y)}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={C.onSurfaceVariant} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search name or email..."
              placeholderTextColor="#6d746c"
              autoCorrect={false}
              autoCapitalize="none"
              style={styles.searchInput}
            />
          </View>

          {searchText.trim().length > 0 ? (
            <View style={styles.sectionBlock}>
              {searchResults.length === 0 ? <Text style={styles.emptyText}>No results</Text> : searchResults.map(renderPersonRow)}
            </View>
          ) : null}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Suggested</Text>
            {suggestedUsers.length === 0 ? <Text style={styles.emptyText}>No suggestions yet</Text> : suggestedUsers.map(renderPersonRow)}
          </View>

          <TouchableOpacity style={styles.contactsRow} activeOpacity={0.8} onPress={() => { void syncContacts(); }}>
            <View style={styles.contactsLeft}>
              <Ionicons name="people-circle-outline" size={20} color={C.primary} />
              <Text style={styles.contactsText}>{syncingContacts ? 'Finding from contacts...' : 'Find from contacts'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.onSurfaceVariant} />
          </TouchableOpacity>

          {!directoryApiReady ? (
            <Text style={styles.contactsHint}>Account matching is not enabled in this build yet.</Text>
          ) : null}

          {showContactMatches ? (
            <View style={styles.sectionBlock}>
              {contactMatches.length === 0 ? <Text style={styles.emptyText}>No contact matches yet</Text> : contactMatches.map(renderPersonRow)}
            </View>
          ) : null}
        </View>

        <View style={styles.inviteSection}>
          <Text style={styles.sectionTitle}>Invite</Text>
          <View style={styles.inviteRow}>
            <TextInput
              value={inviteEntry}
              onChangeText={setInviteEntry}
              placeholder="Enter phone or email"
              placeholderTextColor="#6d746c"
              style={styles.inviteInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.followBtn} activeOpacity={0.85} onPress={sendDirectInvite}>
              <Text style={styles.followBtnText}>Send</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.shareTextBtn} activeOpacity={0.8} onPress={() => { void shareInviteLink(); }}>
            <Text style={styles.shareText}>Share invite link</Text>
          </TouchableOpacity>
        </View>

        {toast ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </ScrollView>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
  findMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  findMoreText: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '700',
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
  contactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  contactsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactsText: {
    fontSize: 15,
    color: C.onSurface,
    fontWeight: '600',
  },
  contactsHint: {
    marginTop: -4,
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  inviteSection: {
    gap: 10,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteInput: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#f5f8f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.onSurface,
    fontSize: 14,
  },
  shareTextBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  shareText: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  toast: {
    alignSelf: 'flex-start',
    backgroundColor: '#e7f1e8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toastText: {
    color: '#18421f',
    fontSize: 13,
    fontWeight: '600',
  },
});
