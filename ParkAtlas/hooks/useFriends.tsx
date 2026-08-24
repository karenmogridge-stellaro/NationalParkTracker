import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/utils/firebase';

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

function normalizeIdentityValue(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string): string {
  return (value || '').replace(/\D+/g, '');
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

function toFriendProfile(id: string, data?: Record<string, unknown>): FriendProfile {
  const firstName = typeof data?.first_name === 'string' ? data.first_name : '';
  const lastName = typeof data?.last_name === 'string' ? data.last_name : '';
  const fullName = `${firstName} ${lastName}`.trim();
  const name = (typeof data?.name === 'string' && data.name.trim()) || fullName || 'ParkAtlas User';
  const username =
    (typeof data?.username === 'string' && data.username.trim()) ||
    (typeof data?.email === 'string' ? data.email.split('@')[0] : '') ||
    id.slice(0, 8);
  const avatar =
    (typeof data?.avatarUrl === 'string' && data.avatarUrl) ||
    (typeof data?.avatar === 'string' && data.avatar) ||
    'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=160&q=80';

  return {
    id,
    name,
    username,
    avatar,
    meta: '@' + username,
    email: typeof data?.email === 'string' ? data.email : undefined,
    phone: typeof data?.phone === 'string' ? data.phone : undefined,
  };
}

function profileIdentityKey(profile: FriendProfile): string {
  const email = normalizeIdentityValue(profile.email);
  if (email) return `email:${email}`;

  const phone = normalizePhone(profile.phone);
  if (phone) return `phone:${phone}`;

  const name = normalizeIdentityValue(profile.name);
  const username = normalizeIdentityValue(profile.username);
  if (name || username) return `name:${name}|user:${username}`;

  return `id:${profile.id}`;
}

function dedupeProfilesByIdentity(profiles: FriendProfile[]): FriendProfile[] {
  const byIdentity = new Map<string, FriendProfile>();

  profiles.forEach((profile) => {
    if (!profile?.id) return;
    const key = profileIdentityKey(profile);
    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, profile);
      return;
    }

    const existingScore = (existing.email ? 2 : 0) + (existing.phone ? 1 : 0);
    const nextScore = (profile.email ? 2 : 0) + (profile.phone ? 1 : 0);
    if (nextScore > existingScore) {
      byIdentity.set(key, profile);
    }
  });

  return Array.from(byIdentity.values());
}

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<FriendsStore>(DEFAULT_STORE);
  const currentUserId = user?.id || GUEST_USER_ID;

  useEffect(() => {
    (async () => {
      const userId = currentUserId;
      setLoading(true);
      try {
        if (user?.id) {
          // myFriends/incomingRequests/requestedIds come from the Firestore listeners below;
          // the rest (directoryUsers, matchedContactIds, contactsSynced, sentInvites) are only
          // ever written via persist(), so they must be loaded from the same prefs doc here.
          const prefsSnap = await getDoc(doc(db, 'user_prefs', user.id));
          if (prefsSnap.exists()) {
            const parsed = prefsSnap.data() as Partial<FriendsStore>;
            setStore((prev) => ({
              ...prev,
              directoryUsers: Array.isArray(parsed.directoryUsers) ? parsed.directoryUsers : DEFAULT_STORE.directoryUsers,
              contactsSynced: typeof parsed.contactsSynced === 'boolean' ? parsed.contactsSynced : DEFAULT_STORE.contactsSynced,
              matchedContactIds: Array.isArray(parsed.matchedContactIds) ? parsed.matchedContactIds : DEFAULT_STORE.matchedContactIds,
              sentInvites: Array.isArray(parsed.sentInvites) ? parsed.sentInvites : DEFAULT_STORE.sentInvites,
            }));
          } else {
            setStore(DEFAULT_STORE);
          }
          return;
        }

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
              ? dedupeProfilesByIdentity(parsed.myFriends.filter((f) => !LEGACY_PLACEHOLDER_IDS.has(f.id)))
              : DEFAULT_STORE.myFriends,
            incomingRequests: Array.isArray(parsed.incomingRequests)
              ? dedupeProfilesByIdentity(parsed.incomingRequests.filter((f) => !LEGACY_PLACEHOLDER_IDS.has(f.id)))
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
  }, [currentUserId, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setStore((prev) => ({ ...prev, requestedIds: [] }));
      return;
    }

    const pendingRequestsQuery = query(
      collection(db, 'friend_requests'),
      where('fromUserId', '==', user.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(pendingRequestsQuery, (snapshot) => {
      const pendingToIds = Array.from(
        new Set(
          snapshot.docs
            .map((snap) => snap.data()?.toUserId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      );

      setStore((prev) => ({
        ...prev,
        requestedIds: pendingToIds,
      }));
    });

    return () => unsubscribe();
  }, [user?.id]);

  const directoryUsersRef = useRef(store.directoryUsers);
  useEffect(() => {
    directoryUsersRef.current = store.directoryUsers;
  }, [store.directoryUsers]);

  const myFriendsRef = useRef(store.myFriends);
  useEffect(() => {
    myFriendsRef.current = store.myFriends;
  }, [store.myFriends]);

  useEffect(() => {
    if (!user?.id) {
      setStore((prev) => ({ ...prev, incomingRequests: [] }));
      return;
    }

    const incomingRequestsQuery = query(
      collection(db, 'friend_requests'),
      where('toUserId', '==', user.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(incomingRequestsQuery, (snapshot) => {
      void (async () => {
        const fromUserIds = Array.from(
          new Set(
            snapshot.docs
              .map((snap) => snap.data()?.fromUserId)
              .filter((id): id is string => typeof id === 'string' && id.length > 0)
          )
        );

        // Read via refs, not effect deps, so the listener isn't torn down and
        // resubscribed every time the directory tab reloads users or myFriends changes.
        const localProfiles = new Map<string, FriendProfile>();
        directoryUsersRef.current.forEach((profile) => localProfiles.set(profile.id, profile));
        myFriendsRef.current.forEach((profile) => localProfiles.set(profile.id, profile));

        const missingIds = fromUserIds.filter((id) => !localProfiles.has(id));
        const missingProfiles = await Promise.all(
          missingIds.map(async (id) => {
            const snap = await getDoc(doc(db, 'users', id));
            return toFriendProfile(id, snap.exists() ? (snap.data() as Record<string, unknown>) : undefined);
          })
        );

        const merged = new Map<string, FriendProfile>();
        fromUserIds.forEach((id) => {
          const profile = localProfiles.get(id) || missingProfiles.find((p) => p.id === id) || toFriendProfile(id);
          merged.set(id, profile);
        });

        setStore((prev) => ({
          ...prev,
          incomingRequests: dedupeProfilesByIdentity(Array.from(merged.values())),
        }));
      })();
    });

    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setStore((prev) => ({ ...prev, myFriends: [] }));
      return;
    }

    const friendsByAQuery = query(
      collection(db, 'friendships'),
      where('userAId', '==', user.id),
      where('status', '==', 'active')
    );
    const friendsByBQuery = query(
      collection(db, 'friendships'),
      where('userBId', '==', user.id),
      where('status', '==', 'active')
    );

    let friendIdsFromA: string[] = [];
    let friendIdsFromB: string[] = [];
    let disposed = false;

    const syncFriends = async () => {
      const friendIds = Array.from(
        new Set(
          [...friendIdsFromA, ...friendIdsFromB].filter(
            (id): id is string => typeof id === 'string' && id.length > 0 && id !== user.id
          )
        )
      );

      const fetchedProfiles = await Promise.all(
        friendIds.map(async (id) => {
          const snap = await getDoc(doc(db, 'users', id));
          return toFriendProfile(id, snap.exists() ? (snap.data() as Record<string, unknown>) : undefined);
        })
      );
      if (disposed) return;

      const fetchedMap = new Map<string, FriendProfile>();
      fetchedProfiles.forEach((profile) => fetchedMap.set(profile.id, profile));

      setStore((prev) => {
        const localProfiles = new Map<string, FriendProfile>();
        prev.directoryUsers.forEach((profile) => localProfiles.set(profile.id, profile));
        prev.myFriends.forEach((profile) => localProfiles.set(profile.id, profile));

        const mergedFriends = friendIds.map(
          (id) => localProfiles.get(id) || fetchedMap.get(id) || toFriendProfile(id)
        );

        return {
          ...prev,
          myFriends: dedupeProfilesByIdentity(mergedFriends),
        };
      });
    };

    const unsubscribeA = onSnapshot(friendsByAQuery, (snapshot) => {
      friendIdsFromA = snapshot.docs
        .map((snap) => snap.data()?.userBId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      void syncFriends();
    });

    const unsubscribeB = onSnapshot(friendsByBQuery, (snapshot) => {
      friendIdsFromB = snapshot.docs
        .map((snap) => snap.data()?.userAId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      void syncFriends();
    });

    return () => {
      disposed = true;
      unsubscribeA();
      unsubscribeB();
    };
  }, [user?.id]);

  const persist = useCallback(async (nextStore: FriendsStore) => {
    setStore(nextStore);

    if (user?.id) {
      // directoryUsers/matchedContactIds/contactsSynced/sentInvites have no Firestore
      // listener of their own, so without this write they silently don't survive a restart.
      // FriendProfile has optional fields (phone/email/badge) that come through as
      // `undefined`, which Firestore's setDoc rejects — round-trip through JSON to strip them.
      await setDoc(
        doc(db, 'user_prefs', user.id),
        {
          directoryUsers: JSON.parse(JSON.stringify(nextStore.directoryUsers)),
          matchedContactIds: nextStore.matchedContactIds,
          contactsSynced: nextStore.contactsSynced,
          sentInvites: JSON.parse(JSON.stringify(nextStore.sentInvites)),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    await FileSystem.writeAsStringAsync(friendsFileForUser(GUEST_USER_ID), JSON.stringify(nextStore));
  }, [user?.id]);

  const sendFriendRequest = useCallback(async (userId: string) => {
    if (!userId) return;
    if (!user?.id) return;
    if (user.id === userId) return;
    if (store.requestedIds.includes(userId)) return;
    if (store.myFriends.some((f) => f.id === userId)) return;
    if (store.incomingRequests.some((f) => f.id === userId)) return;

    await setDoc(
      doc(db, 'friend_requests', `${user.id}__${userId}`),
      {
        fromUserId: user.id,
        toUserId: userId,
        status: 'pending',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, [store, user?.id]);

  const acceptRequest = useCallback(async (profile: FriendProfile) => {
    if (user?.id) {
      await setDoc(
        doc(db, 'friend_requests', `${profile.id}__${user.id}`),
        {
          fromUserId: profile.id,
          toUserId: user.id,
          status: 'accepted',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const pair = [profile.id, user.id].sort();
      await setDoc(
        doc(db, 'friendships', `${pair[0]}__${pair[1]}`),
        {
          userAId: pair[0],
          userBId: pair[1],
          status: 'active',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Notify the requester in-app that their request was accepted.
      await addDoc(collection(db, 'activity'), {
        toUid: profile.id,
        type: 'request_accepted',
        fromUid: user.id,
        createdAt: serverTimestamp(),
      });

      // The onSnapshot listeners above will pick up incomingRequests/myFriends once
      // these writes land — mutating the local store here too would race with them.
      return;
    }

    const nextIncoming = store.incomingRequests.filter((f) => f.id !== profile.id);
    const alreadyFriend = store.myFriends.some((f) => f.id === profile.id);
    const nextFriends = alreadyFriend ? store.myFriends : [profile, ...store.myFriends];

    const nextStore: FriendsStore = {
      ...store,
      incomingRequests: nextIncoming,
      myFriends: nextFriends,
    };

    await persist(nextStore);
  }, [persist, store, user?.id]);

  const ignoreRequest = useCallback(async (profileId: string) => {
    if (user?.id) {
      await setDoc(
        doc(db, 'friend_requests', `${profileId}__${user.id}`),
        {
          fromUserId: profileId,
          toUserId: user.id,
          status: 'rejected',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      // The incomingRequests listener above will drop this request once the write lands.
      return;
    }

    const nextStore: FriendsStore = {
      ...store,
      incomingRequests: store.incomingRequests.filter((f) => f.id !== profileId),
    };
    await persist(nextStore);
  }, [persist, store, user?.id]);

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
