import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { ParkAtlas as C } from '@/constants/theme';
import { FriendActivity, fetchFriendActivities } from '@/utils/userDirectoryApi';

function formatVisitedDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FriendProfileScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    username?: string;
    avatar?: string;
    meta?: string;
    badge?: string;
  }>();

  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadActivities() {
      if (!params.id) {
        if (active) setLoading(false);
        return;
      }

      try {
        const items = await fetchFriendActivities([params.id]);
        if (active) setActivities(items.filter((item) => item.userId === params.id));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadActivities();

    return () => {
      active = false;
    };
  }, [params.id]);

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.dateVisited || 0).getTime() - new Date(a.dateVisited || 0).getTime()),
    [activities]
  );

  const displayName = params.name || 'Friend';
  const displayUsername = params.meta || (params.username ? `@${params.username}` : '');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.75} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friend Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          {params.avatar ? <Image source={{ uri: params.avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback} />}
          <Text style={styles.name}>{displayName}</Text>
          {displayUsername ? <Text style={styles.username}>{displayUsername}</Text> : null}
          {params.badge ? <Text style={styles.badge}>{params.badge}</Text> : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.sectionMeta}>{sortedActivities.length} logged</Text>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={C.primary} />
            <Text style={styles.stateText}>Loading activity...</Text>
          </View>
        ) : null}

        {!loading && sortedActivities.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No activity yet</Text>
            <Text style={styles.stateText}>This friend has not logged any park visits yet.</Text>
          </View>
        ) : null}

        {!loading
          ? sortedActivities.map((activity) => {
              const visitedDate = formatVisitedDate(activity.dateVisited);
              return (
                <View key={`${activity.userId}_${activity.parkId}_${activity.dateVisited || activity.trailName || 'activity'}`} style={styles.activityCard}>
                  <View style={styles.activityIconWrap}>
                    <MaterialCommunityIcons name="pine-tree" size={18} color={C.primary} />
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={styles.parkName}>{activity.parkName}</Text>
                    {activity.trailName ? <Text style={styles.trailName}>{activity.trailName}</Text> : null}
                    <View style={styles.activityMetaRow}>
                      {visitedDate ? <Text style={styles.activityMeta}>{visitedDate}</Text> : null}
                      {activity.distanceMiles ? (
                        <Text style={styles.activityMeta}>{`${activity.distanceMiles.toFixed(1)} mi`}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          : null}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ec',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.onSurface,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 16,
  },
  heroCard: {
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#f5f7f2',
    borderWidth: 1,
    borderColor: '#dde5d9',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 14,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 14,
    backgroundColor: '#dfe6db',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: C.onSurface,
  },
  username: {
    marginTop: 4,
    fontSize: 15,
    color: C.onSurfaceVariant,
  },
  badge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.primary,
    color: C.onPrimary,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.onSurface,
  },
  sectionMeta: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  stateCard: {
    alignItems: 'center',
    gap: 10,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 24,
    backgroundColor: '#f7f8f5',
    borderWidth: 1,
    borderColor: '#e1e6dc',
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.onSurface,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: C.onSurfaceVariant,
  },
  activityCard: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e8df',
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf4ea',
  },
  activityBody: {
    flex: 1,
    gap: 4,
  },
  parkName: {
    fontSize: 17,
    fontWeight: '700',
    color: C.onSurface,
  },
  trailName: {
    fontSize: 15,
    color: C.onSurface,
  },
  activityMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  activityMeta: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
});