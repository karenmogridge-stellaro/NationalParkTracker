import React, { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ParkAtlas as C } from '@/constants/theme';
import { useStravaData } from '@/hooks/useStravaData';
import { useVisitedParks, ParkVisit } from '@/hooks/useVisitedParks';
import { useFriends } from '@/hooks/useFriends';
import { LogOutingSheet } from '../../components/LogOutingSheet';
import { ActivityFeedCard } from '@/components/ActivityFeedCard';
import { LoginGateSheet } from '@/components/LoginGateSheet';
import { setPendingAction, peekPendingAction, consumePendingAction, type PendingAction } from '@/utils/pendingAction';
import { AppDrawer } from '@/components/AppDrawer';
import { useAuth } from '@/hooks/useAuth';
import { StravaActivity } from '@/hooks/useStrava';
import { PARKS } from '@/data/parksData';
import { STATE_PARKS } from '@/data/stateParksData';
import { fetchFriendActivities, FriendActivity } from '@/utils/userDirectoryApi';
import { collection, deleteDoc, doc, limit, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '@/utils/firebase';

const SEASON_MONTHS = [
  { label: 'APR', month: 3 },
  { label: 'MAY', month: 4 },
  { label: 'JUN', month: 5 },
  { label: 'JUL', month: 6 },
  { label: 'AUG', month: 7 },
  { label: 'SEP', month: 8 },
] as const;

const ADVENTURE_IMAGES = [
  'https://images.unsplash.com/photo-1601758261160-ecf8f9f4a4ea?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1508261305438-4f788f2f9d29?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80',
];

const FALLBACK_CAMPING_IMAGE = 'https://images.unsplash.com/photo-1601758261160-ecf8f9f4a4ea?auto=format&fit=crop&w=1400&q=80';

const STAT_RING_TRACK = '#D8D8D8';
const STAT_RING_PROGRESS = '#1b4332';

function firstName(name?: string): string {
  if (!name || !name.trim()) return 'Explorer';
  return name.trim().split(/\s+/)[0];
}

function greetingName(user?: { name?: string; firstName?: string; lastName?: string; email?: string }): string {
  const explicitFirst = (user?.firstName || '').trim();
  if (explicitFirst) {
    return explicitFirst;
  }

  const displayName = (user?.name || '').trim();
  if (displayName) {
    if (/\s+/.test(displayName)) {
      return firstName(displayName);
    }

    const last = (user?.lastName || '').trim();
    if (last && displayName.toLowerCase().endsWith(last.toLowerCase())) {
      const maybeFirst = displayName.slice(0, displayName.length - last.length).trim();
      if (maybeFirst) {
        return maybeFirst;
      }
    }

    return displayName;
  }

  const emailLocal = (user?.email || '').split('@')[0]?.trim() || '';
  if (emailLocal) {
    const fromEmail = emailLocal.split(/[._-]+/)[0]?.trim();
    if (fromEmail) {
      return fromEmail;
    }
  }

  return 'Explorer';
}

function titleCaseFirstWord(value?: string): string {
  const base = firstName(value);
  if (!base) return 'Explorer';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function daysAgoLabel(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days <= 6) return `${days} days`;
  if (days <= 29) return '2 weeks ago';
  return date.toLocaleDateString(undefined, { month: 'short' });
}

function getTimeLabel(iso?: string): string {
  return daysAgoLabel(iso) || 'Recently';
}

function ordinalVisitLabel(value: number): string {
  if (value <= 0) return 'Visit';
  if (value === 1) return 'First visit';
  const rem10 = value % 10;
  const rem100 = value % 100;
  const suffix = rem10 === 1 && rem100 !== 11
    ? 'st'
    : rem10 === 2 && rem100 !== 12
      ? 'nd'
      : rem10 === 3 && rem100 !== 13
        ? 'rd'
        : 'th';
  return `${value}${suffix} visit`;
}

function sortIsoFromVisitId(visitId?: string): string | null {
  const maybeTs = Number(String(visitId || '').split('_').pop());
  if (!Number.isFinite(maybeTs) || maybeTs <= 0) return null;
  const date = new Date(maybeTs);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function imageForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return ADVENTURE_IMAGES[hash % ADVENTURE_IMAGES.length];
}

type FeedItem =
  | { type: 'strava'; data: StravaActivity }
  | { type: 'manual'; data: ParkVisit }
  | { type: 'friend'; data: FriendActivity & { userName: string } };

type CommunityMode = 'all' | 'mine' | 'friends';

type AdventureCardItem = {
  key: string;
  eventId?: string;
  eventOwnerUid?: string;
  canKudos: boolean;
  isKudosd: boolean;
  isKudosPending: boolean;
  kudosCount: number;
  title: string;
  subtitle: string;
  distance: string;
  imageUri: string;
  tag: string;
  // ActivityFeedCard fields
  parkName: string;
  trailName?: string;
  actorLabel: string;
  timeLabel: string;
  onPress?: () => void;
};

function StatProgress({ progress, value }: { progress: number; value: string }) {
  const pct = Math.max(0, Math.min(1, progress));
  const rotation = `${pct * 360}deg`;
  return (
    <View style={styles.statProgressWrap}>
      <View style={styles.statProgressTrack} />
      {pct > 0 ? (
        <View
          style={[
            styles.statProgressFill,
            {
              transform: [{ rotate: rotation }],
            },
          ]}
        />
      ) : null}
      <View style={styles.statProgressCenter}>
        <Text style={styles.statProgressText}>{value}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { activities, visitedParks, parkForActivity } = useStravaData();
  const { visits, removeVisit } = useVisitedParks();
  const { user } = useAuth();
  const { myFriends, incomingRequests } = useFriends();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ParkVisit | null>(null);
  const [communityMode, setCommunityMode] = useState<CommunityMode>('all');
  const [friendActivities, setFriendActivities] = useState<(FriendActivity & { userName: string })[]>([]);
  const [kudosEventIds, setKudosEventIds] = useState<Set<string>>(new Set());
  const [optimisticKudos, setOptimisticKudos] = useState<Record<string, boolean>>({});
  const [kudosPendingEventIds, setKudosPendingEventIds] = useState<Set<string>>(new Set());
  const [kudosCountsByEvent, setKudosCountsByEvent] = useState<Record<string, number>>({});
  // Login gate
  const [gateVisible, setGateVisible] = useState(false);
  const [gateAction, setGateAction] = useState<PendingAction | null>(null);
  const [resumeToast, setResumeToast] = useState<string | null>(null);
  // Track whether the scroll gate has already fired this session
  const scrollGateFiredRef = React.useRef(false);
  // Track previous user ID to detect fresh logins
  const prevUserIdRef = React.useRef<string | null>(null);
  const pendingRequestPromptedUserRef = React.useRef<string | null>(null);


  React.useEffect(() => {
    if (myFriends.length === 0) {
      setFriendActivities([]);
      return;
    }

    fetchFriendActivities(myFriends.filter((f) => f.id !== user?.id).map((f) => f.id)).then((activities) => {
      const enriched = activities.map((a) => ({
        ...a,
        userName: myFriends.find((f) => f.id === a.userId)?.name || a.userName,
      }));
      setFriendActivities(enriched);
    });
  }, [myFriends]);

  React.useEffect(() => {
    if (!user?.id) {
      setKudosEventIds(new Set());
      setOptimisticKudos({});
      setKudosPendingEventIds(new Set());
      return;
    }

    const q = query(
      collection(db, 'kudos'),
      where('fromUid', '==', user.id),
      limit(500)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const next = new Set<string>();
      snapshot.docs.forEach((snap) => {
        const eventId = snap.data()?.eventId;
        if (typeof eventId === 'string' && eventId) {
          next.add(eventId);
        }
      });
      setKudosEventIds(next);
    });

    return () => unsubscribe();
  }, [user?.id]);


  const parkById = useMemo(() => {
    const map = new Map<string, (typeof PARKS)[number] | (typeof STATE_PARKS)[number]>();
    PARKS.forEach((park) => map.set(park.id, park));
    STATE_PARKS.forEach((park) => map.set(park.id, park));
    return map;
  }, []);

  const nationalParkIds = useMemo(() => new Set(PARKS.map((park) => park.id)), []);

  const nationalVisited = useMemo(() => {
    // Only count visits to national parks (PARKS dataset)
    const nationalIds = new Set(PARKS.map((p) => p.id));
    const visitedNationalIds = new Set(visitedParks.filter((p) => nationalIds.has(p.id)).map((p) => p.id));
    visits.forEach((v) => { if (nationalIds.has(v.parkId)) visitedNationalIds.add(v.parkId); });
    return visitedNationalIds.size;
  }, [visitedParks, visits]);

  const stateVisited = useMemo(() => {
    // Only count visits to state parks (STATE_PARKS dataset)
    const stateIds = new Set(STATE_PARKS.map((p) => p.id));
    const visitedStateIds = new Set<string>();
    visits.forEach((v) => { if (stateIds.has(v.parkId)) visitedStateIds.add(v.parkId); });
    return visitedStateIds.size;
  }, [visits]);

  const seasonalMiles = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const mileageByMonth = new Map<number, number>();
    const roundMiles = (value: number) => Math.round(value * 10) / 10;
    const dateForVisit = (visit: ParkVisit): Date => {
      if (visit.dateVisited) {
        const explicit = new Date(visit.dateVisited);
        if (!Number.isNaN(explicit.getTime())) return explicit;
      }

      // Fall back to timestamp embedded in visitId: <parkId>_<epochMs>
      const maybeTs = Number(String(visit.visitId || '').split('_').pop());
      if (Number.isFinite(maybeTs) && maybeTs > 0) {
        const fromId = new Date(maybeTs);
        if (!Number.isNaN(fromId.getTime())) return fromId;
      }

      return new Date();
    };

    SEASON_MONTHS.forEach(({ month }) => mileageByMonth.set(month, 0));

    activities.forEach((activity) => {
      const date = new Date(activity.start_date);
      if (date.getFullYear() !== currentYear) return;
      if (!mileageByMonth.has(date.getMonth())) return;
      const miles = (activity.distance ?? 0) / 1609.34;
      if (!Number.isFinite(miles) || miles <= 0) return;
      mileageByMonth.set(date.getMonth(), (mileageByMonth.get(date.getMonth()) ?? 0) + miles);
    });

    visits.forEach((visit) => {
      const date = dateForVisit(visit);
      if (date.getFullYear() !== currentYear) return;
      if (!mileageByMonth.has(date.getMonth())) return;
      const miles = visit.distanceMiles ?? 0;
      if (!Number.isFinite(miles) || miles <= 0) return;
      mileageByMonth.set(date.getMonth(), (mileageByMonth.get(date.getMonth()) ?? 0) + miles);
    });

    return SEASON_MONTHS.map(({ label, month }) => ({
      label,
      month,
      miles: roundMiles(mileageByMonth.get(month) ?? 0),
    }));
  }, [activities, visits]);

  const seasonalTotal = useMemo(
    () => seasonalMiles.reduce((sum, m) => sum + m.miles, 0),
    [seasonalMiles]
  );

  const myEvents = useMemo<FeedItem[]>(() => {
    const strava: FeedItem[] = activities.slice(0, 10).map((a) => ({ type: 'strava', data: a }));
    const manual: FeedItem[] = visits.slice(0, 10).map((v) => ({ type: 'manual', data: v }));

    return [...strava, ...manual]
      .sort((a, b) => {
        const dateA = a.type === 'strava'
          ? a.data.start_date
          : (a.data.dateVisited || sortIsoFromVisitId(a.data.visitId) || '1970-01-01');
        const dateB = b.type === 'strava'
          ? b.data.start_date
          : (b.data.dateVisited || sortIsoFromVisitId(b.data.visitId) || '1970-01-01');
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 8);
  }, [activities, visits]);

  const friendsEvents = useMemo<FeedItem[]>(() => {
    return friendActivities
      .filter((activity) => activity.userId !== user?.id)  // never show own activities as a friend's post
      .map((activity) => ({
        type: 'friend' as const,
        data: activity,
      }))
      .sort((a, b) => {
        const dateA = a.data.createdAt || a.data.dateVisited || '1970-01-01';
        const dateB = b.data.createdAt || b.data.dateVisited || '1970-01-01';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 8);
  }, [friendActivities, user?.id]);

  const feedEvents = useMemo<FeedItem[]>(() => {
    return [...myEvents, ...friendsEvents]
      .sort((a, b) => {
        const dateA = a.type === 'strava'
          ? a.data.start_date
          : a.type === 'friend'
            ? a.data.createdAt || a.data.dateVisited || '1970-01-01'
            : a.data.dateVisited || sortIsoFromVisitId(a.data.visitId) || '1970-01-01';
        const dateB = b.type === 'strava'
          ? b.data.start_date
          : b.type === 'friend'
            ? b.data.createdAt || b.data.dateVisited || '1970-01-01'
            : b.data.dateVisited || sortIsoFromVisitId(b.data.visitId) || '1970-01-01';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 8);
  }, [myEvents, friendsEvents]);

  const displayedFeed = useMemo<FeedItem[]>(() => {
    if (communityMode === 'mine') return myEvents;
    if (communityMode === 'friends') return friendsEvents;
    return feedEvents;
  }, [communityMode, myEvents, friendsEvents, feedEvents]);

  const visibleEventIds = useMemo(() => {
    return displayedFeed.map((item) => {
      const isStrava = item.type === 'strava';
      const isFriend = item.type === 'friend';
      const date = isStrava
        ? item.data.start_date
        : isFriend
          ? (item.data as FriendActivity).createdAt || (item.data as FriendActivity).dateVisited
          : (item.data as ParkVisit).dateVisited || sortIsoFromVisitId((item.data as ParkVisit).visitId) || undefined;

      if (isFriend) {
        const friend = item.data as FriendActivity;
        return `visit_${friend.userId}_${friend.visitId || `${friend.parkId}_${date || ''}`}`;
      }

      if (isStrava) {
        return `strava_${user?.id || 'me'}_${(item.data as StravaActivity).id}`;
      }

      return `visit_${user?.id || 'me'}_${(item.data as ParkVisit).visitId}`;
    });
  }, [displayedFeed, user?.id]);

  React.useEffect(() => {
    if (visibleEventIds.length === 0) {
      setKudosCountsByEvent({});
      return;
    }

    const uniqueEventIds = Array.from(new Set(visibleEventIds.filter(Boolean)));
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueEventIds.length; i += 10) {
      chunks.push(uniqueEventIds.slice(i, i + 10));
    }

    const chunkCounts: Record<string, Record<string, number>> = {};
    const unsubs = chunks.map((chunk, idx) => {
      const key = String(idx);
      return onSnapshot(
        query(collection(db, 'kudos'), where('eventId', 'in', chunk), limit(500)),
        (snapshot) => {
          const nextCounts: Record<string, number> = {};
          snapshot.docs.forEach((snap) => {
            const eventId = snap.data()?.eventId;
            if (typeof eventId === 'string' && eventId) {
              nextCounts[eventId] = (nextCounts[eventId] || 0) + 1;
            }
          });

          chunkCounts[key] = nextCounts;

          const merged: Record<string, number> = {};
          Object.values(chunkCounts).forEach((counts) => {
            Object.entries(counts).forEach(([eventId, count]) => {
              merged[eventId] = (merged[eventId] || 0) + count;
            });
          });
          setKudosCountsByEvent(merged);
        }
      );
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [visibleEventIds]);

  const visitCountByUserPark = useMemo(() => {
    const counts = new Map<string, number>();
    feedEvents.forEach((item) => {
      const isStrava = item.type === 'strava';
      const isFriend = item.type === 'friend';
      const park = isStrava ? parkForActivity(item.data as StravaActivity) : parkById.get((item.data as any).parkId);
      const parkName = park?.name || (isStrava ? 'Unknown Park' : (item.data as any).parkName) || 'Park';
      const actorId = isFriend ? (item.data as FriendActivity).userId : (user?.id || 'me');
      const key = `${actorId}::${parkName}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [feedEvents, parkById, parkForActivity, user?.id]);

  const onCardPress = useCallback((item: FeedItem) => {
    if (item.type !== 'manual') return;

    const visit = item.data;
    Alert.alert(
      visit.trailName || visit.parkName,
      'What would you like to do?',
      [
        {
          text: 'Edit',
          onPress: () => {
            setEditingVisit(visit);
            setSheetVisible(true);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Delete Entry', `Remove "${visit.trailName || visit.parkName}" from your log?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => removeVisit(visit.visitId) },
            ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [removeVisit]);

  const isEventKudosd = useCallback((eventId: string) => {
    if (Object.prototype.hasOwnProperty.call(optimisticKudos, eventId)) {
      return optimisticKudos[eventId];
    }
    return kudosEventIds.has(eventId);
  }, [kudosEventIds, optimisticKudos]);

  const onToggleKudos = useCallback(async (eventId: string, eventOwnerUid: string) => {
    if (!user?.id) return;
    if (!eventId || !eventOwnerUid) return;
    if (eventOwnerUid === user.id) return;

    const currentlyKudosd = isEventKudosd(eventId);
    const nextKudosd = !currentlyKudosd;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    setOptimisticKudos((prev) => ({ ...prev, [eventId]: nextKudosd }));
    setKudosPendingEventIds((prev) => new Set(prev).add(eventId));

    try {
      if (nextKudosd) {
        await setDoc(
          doc(db, 'kudos', `${eventId}__${user.id}`),
          {
            eventId,
            fromUid: user.id,
            toUid: eventOwnerUid,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Deterministic id (mirrors the kudos doc's) so un-giving kudos can delete
        // this same doc instead of leaving an orphaned notification behind.
        await setDoc(
          doc(db, 'activity', `kudos_${eventId}__${user.id}`),
          {
            toUid: eventOwnerUid,
            type: 'kudos_received',
            fromUid: user.id,
            eventId,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        setKudosEventIds((prev) => {
          const next = new Set(prev);
          next.add(eventId);
          return next;
        });
      } else {
        await deleteDoc(doc(db, 'kudos', `${eventId}__${user.id}`));
        await deleteDoc(doc(db, 'activity', `kudos_${eventId}__${user.id}`));
        setKudosEventIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      }
    } catch {
      setOptimisticKudos((prev) => ({ ...prev, [eventId]: currentlyKudosd }));
    } finally {
      setKudosPendingEventIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  }, [isEventKudosd, user?.id]);

  // ── Toast auto-clear ───────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!resumeToast) return;
    const id = setTimeout(() => setResumeToast(null), 2500);
    return () => clearTimeout(id);
  }, [resumeToast]);

  // ── Post-login resume: execute pending action after user logs in ───────────
  React.useEffect(() => {
    if (!user?.id || user.id === prevUserIdRef.current) return;
    prevUserIdRef.current = user.id;

    const pending = peekPendingAction();
    if (!pending || pending.type !== 'highFive') return;
    const action = consumePendingAction();
    if (!action || action.type !== 'highFive') return;

    void onToggleKudos(action.eventId, action.eventOwnerUid);
    setResumeToast(`High-Fived ${action.displayName} 👋`);
  }, [user?.id, onToggleKudos]);

  React.useEffect(() => {
    if (!user?.id) return;
    if (incomingRequests.length === 0) return;
    if (pendingRequestPromptedUserRef.current === user.id) return;

    pendingRequestPromptedUserRef.current = user.id;
    const count = incomingRequests.length;
    setResumeToast(`You have ${count} pending friend request${count === 1 ? '' : 's'}`);

    Alert.alert(
      'Pending Friend Request',
      count === 1
        ? 'You have 1 pending friend request. Review it now?'
        : `You have ${count} pending friend requests. Review them now?`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Review',
          onPress: () => {
            router.push('/(tabs)/directory?pendingIncoming=1');
          },
        },
      ]
    );
  }, [incomingRequests.length, user?.id]);

  // ── Login gate helpers ─────────────────────────────────────────────────────
  function showLoginGate(action: PendingAction): void {
    setPendingAction(action);
    setGateAction(action);
    setGateVisible(true);
  }

  function handleGateDismiss(): void {
    setGateVisible(false);
  }

  function handleGateLogin(): void {
    setGateVisible(false);
    router.push('/login');
  }

  const displayedKudosCount = useCallback((eventId: string, baseCount: number): number => {
    const optimistic = optimisticKudos[eventId];
    if (optimistic === undefined) {
      return Math.max(0, baseCount);
    }

    const wasKudosd = kudosEventIds.has(eventId);
    if (optimistic && !wasKudosd) {
      return Math.max(0, baseCount + 1);
    }
    if (!optimistic && wasKudosd) {
      return Math.max(0, baseCount - 1);
    }
    return Math.max(0, baseCount);
  }, [kudosEventIds, optimisticKudos]);

  const adventureCards = useMemo<AdventureCardItem[]>(() => {
    if (displayedFeed.length === 0) {
      return [];
    }

    return displayedFeed.map((item) => {
      const isStrava = item.type === 'strava';
      const isFriend = item.type === 'friend';
      const date = isStrava
        ? item.data.start_date
        : isFriend
          ? (item.data as FriendActivity).createdAt || (item.data as FriendActivity).dateVisited
          : (item.data as ParkVisit).dateVisited || sortIsoFromVisitId((item.data as ParkVisit).visitId) || undefined;
      const eventId = isFriend
        ? (`visit_${(item.data as FriendActivity).userId}_${(item.data as FriendActivity).visitId || `${(item.data as FriendActivity).parkId}_${date || ''}`}`)
        : isStrava
          ? `strava_${user?.id || 'me'}_${(item.data as StravaActivity).id}`
          : `visit_${user?.id || 'me'}_${(item.data as ParkVisit).visitId}`;
      // eventId is already a stable, globally-unique id per item — appending the
      // array index made the key shift (and remount the row) whenever the feed reorders.
      const key = eventId;
      const park = isStrava ? parkForActivity(item.data as StravaActivity) : parkById.get((item.data as any).parkId);
      const parkId = isStrava ? park?.id : (item.data as any).parkId;
      const baseParkName = (park?.name || (isStrava ? 'Unknown Park' : (item.data as any).parkName) || 'Park').trim();
      const parkName = parkId && nationalParkIds.has(parkId) && !/\bnational park\b/i.test(baseParkName)
        ? `${baseParkName} National Park`
        : baseParkName;
      const actorId = isFriend ? (item.data as FriendActivity).userId : (user?.id || 'me');
      const userLabel = actorId === user?.id ? 'You' : titleCaseFirstWord((item.data as any).userName);
      const miles = isStrava
        ? ((item.data as StravaActivity).distance / 1609.34)
        : ((item.data as any).distanceMiles ?? 0);
      const distanceLabel = `${miles.toFixed(1)} miles`;
      const timeLabel = getTimeLabel(date);
      const visitCount = visitCountByUserPark.get(`${actorId}::${parkName}`) || 1;
      const contextLabel = ordinalVisitLabel(visitCount);
      const subtitle = `${timeLabel} • ${distanceLabel}`;
      const eventOwnerUid = isFriend ? (item.data as FriendActivity).userId : user?.id;
      const canKudos = !!eventOwnerUid && eventOwnerUid !== user?.id;
      const isKudosd = canKudos ? isEventKudosd(eventId) : false;
      const isKudosPending = canKudos ? kudosPendingEventIds.has(eventId) : false;
      const baseKudosCount = kudosCountsByEvent[eventId] || 0;
      const kudosCount = displayedKudosCount(eventId, baseKudosCount);

      return {
        key,
        eventId,
        eventOwnerUid,
        canKudos,
        isKudosd,
        isKudosPending,
        kudosCount,
        title: `${userLabel} visited ${parkName}`,
        subtitle,
        distance: '',
        imageUri: isStrava
          ? FALLBACK_CAMPING_IMAGE
          : isFriend
            ? (item.data as FriendActivity).photoUri || FALLBACK_CAMPING_IMAGE
            : (item.data as ParkVisit).photoUri || FALLBACK_CAMPING_IMAGE,
        tag: contextLabel,
        // ActivityFeedCard props
        parkName,
        trailName: !isStrava ? ((item.data as any).trailName as string | undefined) || undefined : undefined,
        actorLabel: `${userLabel} visited`,
        timeLabel,
        onPress: isStrava
          ? undefined
          : isFriend
            ? (() => {
                const friendVisit = item.data as FriendActivity;
                if (friendVisit.userId !== user?.id || !friendVisit.visitId) return undefined;
                const localVisit = visits.find((v) => v.visitId === friendVisit.visitId);
                if (!localVisit) return undefined;
                return () => onCardPress({ type: 'manual', data: localVisit });
              })()
            : () => onCardPress(item as { type: 'manual'; data: ParkVisit }),
      };
    });
  }, [displayedFeed, parkForActivity, parkById, nationalParkIds, user?.id, visits, onCardPress, visitCountByUserPark, isEventKudosd, kudosPendingEventIds, kudosCountsByEvent, displayedKudosCount]);

  const isFirstTimeEmpty = myEvents.length === 0 && friendsEvents.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isFirstTimeEmpty && styles.scrollContentEmpty]}
        showsVerticalScrollIndicator={false}
        onScroll={!user?.id ? (e) => {
          if (scrollGateFiredRef.current) return;
          // Trigger once after the user scrolls past ~one card height (≈260px)
          if (e.nativeEvent.contentOffset.y > 260) {
            scrollGateFiredRef.current = true;
            showLoginGate({ type: 'scrollFeed' });
          }
        } : undefined}
        scrollEventThrottle={!user?.id ? 100 : undefined}
      >
        <View style={[styles.section, { marginBottom: 14 }]}>
          <View style={styles.greetingRow}>
            <Image
              source={require('../../assets/images/parkatlas-logo.png')}
              style={styles.greetingLogo}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingTitle}>Hello, {titleCaseFirstWord(greetingName(user ?? undefined))}.</Text>
              <Text style={styles.greetingSub}>Ready for your next expedition?</Text>
            </View>
          </View>
        </View>

        {isFirstTimeEmpty ? (
          <View style={styles.firstTimeEmptyWrap}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80' }}
              style={styles.firstTimeHeroImage}
            />
            <Text style={styles.firstTimeTitle}>Start your adventure</Text>
            <Text style={styles.firstTimeSub}>Track the parks you visit and build your journey over time.</Text>

            <TouchableOpacity
              style={styles.firstTimePrimaryBtn}
              activeOpacity={0.85}
              onPress={() => setSheetVisible(true)}
            >
              <Text style={styles.firstTimePrimaryBtnText}>Log your first park</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.firstTimeSecondaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.firstTimeSecondaryBtnText}>Explore parks</Text>
            </TouchableOpacity>

            <View style={styles.firstTimeSupportRow}>
              <Text style={styles.firstTimeSupportText}>0/63 National</Text>
              <Text style={styles.firstTimeSupportText}>0/120 State</Text>
              <Text style={styles.firstTimeSupportText}>0 mi</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statTile}>
                <View style={styles.statTileContentRow}>
                  <StatProgress
                    progress={nationalVisited / 63}
                    value={`${Math.round((nationalVisited / 63) * 100)}%`}
                  />
                  <View style={styles.statTileTextCol}>
                    <Text style={styles.statTileValue} numberOfLines={1}>{nationalVisited}/63</Text>
                    <Text style={styles.statTileLabel} numberOfLines={1}>National</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statTile}>
                <View style={styles.statTileContentRow}>
                  <StatProgress
                    progress={stateVisited / 120}
                    value={`${Math.round((stateVisited / 120) * 100)}%`}
                  />
                  <View style={styles.statTileTextCol}>
                    <Text style={styles.statTileValue} numberOfLines={1}>{stateVisited}/120</Text>
                    <Text style={styles.statTileLabel} numberOfLines={1}>State</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statTile}>
                <View style={styles.statTileContentRow}>
                  <View style={styles.statTileSpacer} />
                  <View style={styles.statTileTextCol}>
                    <Text style={styles.statTileValue} numberOfLines={1}>{Math.round(seasonalTotal)} mi</Text>
                    <Text style={styles.statTileLabel} numberOfLines={1}>Miles</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Recent Adventures</Text>
                <View style={styles.toggleWrap}>
                  <TouchableOpacity
                    style={[styles.toggleButton, communityMode === 'all' && styles.toggleButtonActive]}
                    onPress={() => setCommunityMode('all')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.toggleText, communityMode === 'all' && styles.toggleTextActive]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, communityMode === 'mine' && styles.toggleButtonActive]}
                    onPress={() => setCommunityMode('mine')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.toggleText, communityMode === 'mine' && styles.toggleTextActive]}>You</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, communityMode === 'friends' && styles.toggleButtonActive]}
                    onPress={() => setCommunityMode('friends')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.toggleText, communityMode === 'friends' && styles.toggleTextActive]}>Friends</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardsList}>
                {adventureCards.length === 0 && communityMode === 'mine' ? (
                  <View style={styles.emptyFriendsFeed}>
                    <Text style={styles.emptyFriendsFeedTitle}>Start your adventure</Text>
                    <Text style={styles.emptyFriendsFeedText}>Track the parks you visit and build your journey over time.</Text>

                    <TouchableOpacity
                      style={styles.firstTimePrimaryBtn}
                      activeOpacity={0.85}
                      onPress={() => setSheetVisible(true)}
                    >
                      <Text style={styles.firstTimePrimaryBtnText}>Log your first park</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.firstTimeSecondaryBtn}
                      activeOpacity={0.85}
                      onPress={() => router.push('/(tabs)/explore')}
                    >
                      <Text style={styles.firstTimeSecondaryBtnText}>Explore parks</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {adventureCards.length === 0 && communityMode === 'friends' ? (
                  <View style={styles.emptyFriendsFeed}>
                    {/* Ghost preview cards */}
                    <View style={styles.ghostCardsWrap} pointerEvents="none">
                      {[
                        { name: 'Alex', park: 'Zion', img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=60' },
                        { name: 'Jordan', park: 'Yosemite', img: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=60' },
                      ].map((item, i) => (
                        <View key={i} style={[styles.ghostCard, i === 1 && styles.ghostCardOffset]}>
                          <Image source={{ uri: item.img }} style={styles.ghostCardImage} blurRadius={3} />
                          <View style={styles.ghostCardOverlay} />
                          <View style={styles.ghostCardLabel}>
                            <Text style={styles.ghostCardLabelText}>{item.name} • {item.park}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.emptyFriendsFeedTitle}>Follow friends to see their adventures</Text>
                    <Text style={styles.emptyFriendsFeedText}>See where your friends have been — and get inspired for your next trip.</Text>

                    <TouchableOpacity
                      style={styles.emptyFriendsCTA}
                      activeOpacity={0.85}
                      onPress={() => router.push('/(tabs)/directory')}
                    >
                      <Text style={styles.emptyFriendsCTAText}>Find Your People</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => router.push('/(tabs)/directory')}
                    >
                      <Text style={styles.emptyFriendsInvite}>Invite a friend</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {adventureCards.map((card) => (
                  <ActivityFeedCard
                    key={card.key}
                    cardKey={card.key}
                    imageUri={card.imageUri}
                    parkName={card.parkName}
                    trailName={card.trailName}
                    dateLabel={card.timeLabel}
                    actorLabel={card.actorLabel}
                    variant="standard"
                    canHighFive={card.canKudos}
                    isHighFived={card.isKudosd}
                    onHighFive={card.canKudos && card.eventId && card.eventOwnerUid
                      ? () => {
                          if (!user?.id) {
                            const name = card.actorLabel.replace(/ visited$/i, '').trim() || 'them';
                            showLoginGate({ type: 'highFive', displayName: name, eventId: card.eventId!, eventOwnerUid: card.eventOwnerUid! });
                            return;
                          }
                          void onToggleKudos(card.eventId!, card.eventOwnerUid!);
                        }
                      : undefined}
                    onPress={card.onPress}
                  />
                ))}

                {adventureCards.length > 0 ? (
                  <Text style={styles.feedFooterText}>You&apos;re all caught up.</Text>
                ) : null}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {!isFirstTimeEmpty ? (
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setSheetVisible(true)}>
          <MaterialCommunityIcons name="plus" size={26} color="#ffffff" />
        </TouchableOpacity>
      ) : null}

      <LogOutingSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingVisit(null);
        }}
        onSaved={() => {
          setSheetVisible(false);
          setEditingVisit(null);
        }}
        editVisit={editingVisit ?? undefined}
      />
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Login gate bottom sheet */}
      <LoginGateSheet
        visible={gateVisible}
        action={gateAction}
        onLogin={handleGateLogin}
        onDismiss={handleGateDismiss}
      />

      {/* Post-login resume toast */}
      {resumeToast ? (
        <View style={styles.resumeToast} pointerEvents="none">
          <Text style={styles.resumeToastText}>{resumeToast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greetingLogo: {
    width: 68,
    height: 68,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    paddingBottom: 36,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.8,
  },
  greetingSub: {
    marginTop: 3,
    fontSize: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  firstTimeEmptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  firstTimeHeroImage: {
    width: '100%',
    maxWidth: 320,
    height: 240,
    borderRadius: 18,
    marginBottom: 22,
  },
  firstTimeTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  firstTimeSub: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 330,
  },
  firstTimePrimaryBtn: {
    marginTop: 26,
    width: '100%',
    maxWidth: 320,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  firstTimePrimaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onPrimary,
    letterSpacing: 0.2,
  },
  firstTimeSecondaryBtn: {
    marginTop: 10,
    width: '100%',
    maxWidth: 320,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  firstTimeSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  firstTimeSupportRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  firstTimeSupportText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statTile: {
    flex: 1,
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: '#FFF',
    padding: 6,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statTileContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTileTextCol: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  statTileSpacer: {
    width: 36,
    height: 36,
  },
  statTileValue: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  statTileLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#6f7772',
  },
  statProgressWrap: {
    width: 36,
    height: 36,
  },
  statProgressTrack: {
    position: 'absolute',
    inset: 0,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: STAT_RING_TRACK,
  },
  statProgressFill: {
    position: 'absolute',
    inset: 0,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: STAT_RING_PROGRESS,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-90deg' }],
  },
  statProgressCenter: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statProgressText: {
    fontSize: 8,
    fontWeight: '700',
    color: C.onSurface,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  recentTitle: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: C.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#dde3df',
    borderRadius: 999,
    padding: 3,
    gap: 4,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  toggleButtonActive: {
    backgroundColor: C.primary,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: '#4a514e',
  },
  toggleTextActive: {
    color: '#fff',
  },
  cardsList: {
    gap: 14,
  },
  adventureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 165,
    backgroundColor: '#dce2de',
  },
  imageTag: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  imageTagText: {
    fontSize: 10,
    color: C.onSurface,
    fontWeight: '600',
  },
  cardMetaRow: {
    marginTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardMetaLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  cardSub: {
    marginTop: 2,
    fontSize: 14,
    color: '#6a746f',
  },
  cardDistance: {
    fontSize: 16,
    color: C.onSurfaceVariant,
    fontWeight: '700',
    paddingTop: 2,
  },
  cardFooterRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  kudosAnimatedWrap: {
    alignSelf: 'flex-start',
  },
  kudosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
  kudosText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.onSurfaceVariant,
  },
  kudosTextActive: {
    color: '#8E3746',
  },
  kudosCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    marginLeft: 1,
  },
  emptyFriendsFeed: {
    borderRadius: 20,
    backgroundColor: '#f5f7f6',
    overflow: 'hidden',
    paddingBottom: 24,
    alignItems: 'center',
    gap: 0,
  },
  emptyMineFeed: {
    borderRadius: 20,
    backgroundColor: '#f5f7f6',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ghostCardsWrap: {
    flexDirection: 'row',
    height: 120,
    width: '100%',
    marginBottom: 20,
  },
  ghostCard: {
    position: 'absolute',
    left: 16,
    top: 12,
    width: '55%',
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ghostCardOffset: {
    left: undefined,
    right: 16,
    top: 20,
  },
  ghostCardImage: {
    width: '100%',
    height: '100%',
  },
  ghostCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,247,246,0.55)',
  },
  ghostCardLabel: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ghostCardLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  emptyFriendsFeedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.onSurface,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 6,
  },
  emptyFriendsFeedText: {
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  emptyFriendsCTA: {
    backgroundColor: C.primary,
    borderRadius: 28,
    paddingVertical: 13,
    paddingHorizontal: 36,
    marginBottom: 14,
  },
  emptyFriendsCTAText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyFriendsInvite: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
    textDecorationLine: 'underline',
  },
  feedFooterText: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 13,
    color: C.onSurfaceVariant,
    fontWeight: '600',
    paddingBottom: 6,
  },
  resumeToast: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  resumeToastText: {
    backgroundColor: 'rgba(27, 67, 50, 0.94)',
    color: '#d4f5dd',
    fontSize: 14,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    overflow: 'hidden',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 90,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f2e0d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
});
