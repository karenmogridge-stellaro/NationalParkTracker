import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/hooks/useAuth';

const GUEST_USER_ID = 'guest_user';

const LEGACY_PLACEHOLDER_IDS = new Set([
  'f_1',
  'f_2',
  'f_3',
  'f_4',
  'f_5',
  'f_6',
  'f_7',
  'f_8',
  'f_9',
  'f_10',
]);

function friendsFileForUser(userId: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${FileSystem.documentDirectory}friends_${safeUserId}.json`;
}

export type FriendProfile = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  meta: string;
  phone?: string;
  email?: string;
  badge?: string;
};

export type SentInvite = {
  inviteId: string;
  inviteUrl: string;
  sentAt: string;
};

type FriendsStore = {
  directoryUsers: FriendProfile[];
  myFriends: FriendProfile[];
  incomingRequests: FriendProfile[];
  requestedIds: string[];
  contactsSynced: boolean;
  matchedContactIds: string[];
  sentInvites: SentInvite[];
};

interface FriendsContextValue {
  loading: boolean;
  directoryUsers: FriendProfile[];
  myFriends: FriendProfile[];
  incomingRequests: FriendProfile[];
  requestedIds: Set<string>;
  contactsSynced: boolean;
  matchedContactIds: Set<string>;
  sentInvites: SentInvite[];
  sendFriendRequest: (userId: string) => Promise<void>;
  acceptRequest: (profile: FriendProfile) => Promise<void>;
  ignoreRequest: (profileId: string) => Promise<void>;
  markContactsSynced: (synced: boolean) => Promise<void>;
  setDirectoryUsers: (profiles: FriendProfile[]) => Promise<void>;
  setMatchedContactIds: (ids: string[]) => Promise<void>;
  recordInviteSent: (inviteUrl: string) => Promise<void>;
  addTestFriend: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

const DEFAULT_MY_FRIENDS: FriendProfile[] = [];

const DEFAULT_INCOMING_REQUESTS: FriendProfile[] = [];

const DEFAULT_STORE: FriendsStore = {
  directoryUsers: [],
  myFriends: DEFAULT_MY_FRIENDS,
  incomingRequests: DEFAULT_INCOMING_REQUESTS,
  requestedIds: [],
  contactsSynced: false,
  matchedContactIds: [],
  sentInvites: [],
};

const DEV_TEST_FRIEND: FriendProfile = {
  id: 'dev_test_friend',
  name: 'Sarah Chen',
  username: 'sarahchen',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
  meta: '@sarahchen',
  email: 'sarah@example.com',
  phone: '4155550101',
  badge: 'Test Friend',
};

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<FriendsStore>(DEFAULT_STORE);

  useEffect(() => {
    (async () => {
      const userId = user?.id || GUEST_USER_ID;
      setLoading(true);
      try {
        const filePath = friendsFileForUser(userId);
        const info = await FileSystem.getInfoAsync(filePath);
        if (!info.exists) {
          setStore(DEFAULT_STORE);
          await FileSystem.writeAsStringAsync(filePath, JSON.stringify(DEFAULT_STORE));
        } else {
          const raw = await FileSystem.readAsStringAsync(filePath);
          const parsed = JSON.parse(raw) as Partial<FriendsStore>;
          const migrated: FriendsStore = {
            directoryUsers: Array.isArray(parsed.directoryUsers)
              ? parsed.directoryUsers.filter((f): f is FriendProfile => !!f && typeof f.id === 'string')
              : DEFAULT_STORE.directoryUsers,
            myFriends: Array.isArray(parsed.myFriends)
              ? parsed.myFriends.filter((f) => !LEGACY_PLACEHOLDER_IDS.has(f.id))
              : DEFAULT_STORE.myFriends,
            incomingRequests: Array.isArray(parsed.incomingRequests)
              ? parsed.incomingRequests.filter((f) => !LEGACY_PLACEHOLDER_IDS.has(f.id))
              : DEFAULT_STORE.incomingRequests,
            requestedIds: Array.isArray(parsed.requestedIds)
              ? parsed.requestedIds.filter((id) => !LEGACY_PLACEHOLDER_IDS.has(id))
              : DEFAULT_STORE.requestedIds,
            contactsSynced: typeof parsed.contactsSynced === 'boolean' ? parsed.contactsSynced : DEFAULT_STORE.contactsSynced,
            matchedContactIds: Array.isArray(parsed.matchedContactIds)
              ? parsed.matchedContactIds.filter((id): id is string => typeof id === 'string')
              : DEFAULT_STORE.matchedContactIds,
            sentInvites: Array.isArray(parsed.sentInvites) ? parsed.sentInvites : DEFAULT_STORE.sentInvites,
          };
          setStore(migrated);
          await FileSystem.writeAsStringAsync(filePath, JSON.stringify(migrated));
        }
      } catch {
        setStore(DEFAULT_STORE);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const persist = useCallback(async (nextStore: FriendsStore) => {
    const userId = user?.id || GUEST_USER_ID;
    setStore(nextStore);
    await FileSystem.writeAsStringAsync(friendsFileForUser(userId), JSON.stringify(nextStore));
  }, [user?.id]);

  const sendFriendRequest = useCallback(async (userId: string) => {
    if (!userId) return;
    if (store.requestedIds.includes(userId)) return;
    if (store.myFriends.some((f) => f.id === userId)) return;
    if (store.incomingRequests.some((f) => f.id === userId)) return;

    const nextStore: FriendsStore = {
      ...store,
      requestedIds: [userId, ...store.requestedIds],
    };
    await persist(nextStore);
  }, [persist, store]);

  const acceptRequest = useCallback(async (profile: FriendProfile) => {
    const nextIncoming = store.incomingRequests.filter((f) => f.id !== profile.id);
    const alreadyFriend = store.myFriends.some((f) => f.id === profile.id);
    const nextFriends = alreadyFriend ? store.myFriends : [profile, ...store.myFriends];

    const nextStore: FriendsStore = {
      ...store,
      incomingRequests: nextIncoming,
      myFriends: nextFriends,
    };

    await persist(nextStore);
  }, [persist, store]);

  const ignoreRequest = useCallback(async (profileId: string) => {
    const nextStore: FriendsStore = {
      ...store,
      incomingRequests: store.incomingRequests.filter((f) => f.id !== profileId),
    };
    await persist(nextStore);
  }, [persist, store]);

  const markContactsSynced = useCallback(async (synced: boolean) => {
    const nextStore: FriendsStore = {
      ...store,
      contactsSynced: synced,
    };
    await persist(nextStore);
  }, [persist, store]);

  const setDirectoryUsers = useCallback(async (profiles: FriendProfile[]) => {
    const unique = new Map<string, FriendProfile>();
    profiles.forEach((p) => {
      if (p?.id) unique.set(p.id, p);
    });
    const nextStore: FriendsStore = {
      ...store,
      directoryUsers: Array.from(unique.values()),
    };
    await persist(nextStore);
  }, [persist, store]);

  const setMatchedContactIds = useCallback(async (ids: string[]) => {
    const nextStore: FriendsStore = {
      ...store,
      matchedContactIds: Array.from(new Set(ids.filter((id): id is string => !!id))),
    };
    await persist(nextStore);
  }, [persist, store]);

  const recordInviteSent = useCallback(async (inviteUrl: string) => {
    const invite: SentInvite = {
      inviteId: `inv_${Date.now()}`,
      inviteUrl,
      sentAt: new Date().toISOString(),
    };

    const nextStore: FriendsStore = {
      ...store,
      sentInvites: [invite, ...store.sentInvites].slice(0, 50),
    };
    await persist(nextStore);
  }, [persist, store]);

  const addTestFriend = useCallback(async () => {
    const nextStore: FriendsStore = {
      ...store,
      directoryUsers: store.directoryUsers.some((f) => f.id === DEV_TEST_FRIEND.id)
        ? store.directoryUsers
        : [DEV_TEST_FRIEND, ...store.directoryUsers],
      myFriends: store.myFriends.some((f) => f.id === DEV_TEST_FRIEND.id)
        ? store.myFriends
        : [DEV_TEST_FRIEND, ...store.myFriends],
      incomingRequests: store.incomingRequests.filter((f) => f.id !== DEV_TEST_FRIEND.id),
      requestedIds: store.requestedIds.filter((id) => id !== DEV_TEST_FRIEND.id),
    };
    await persist(nextStore);
  }, [persist, store]);

  const value = useMemo<FriendsContextValue>(() => ({
    loading,
    directoryUsers: store.directoryUsers,
    myFriends: store.myFriends,
    incomingRequests: store.incomingRequests,
    requestedIds: new Set(store.requestedIds),
    contactsSynced: store.contactsSynced,
    matchedContactIds: new Set(store.matchedContactIds),
    sentInvites: store.sentInvites,
    sendFriendRequest,
    acceptRequest,
    ignoreRequest,
    markContactsSynced,
    setDirectoryUsers,
    setMatchedContactIds,
    recordInviteSent,
    addTestFriend,
  }), [
    loading,
    store,
    sendFriendRequest,
    acceptRequest,
    ignoreRequest,
    markContactsSynced,
    setDirectoryUsers,
    setMatchedContactIds,
    recordInviteSent,
    addTestFriend,
  ]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used inside <FriendsProvider>');
  return ctx;
}
