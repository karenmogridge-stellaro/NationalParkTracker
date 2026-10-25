import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ParkAtlas as C } from '@/constants/theme';
import { parkBySlug } from '@/utils/parkSlug';

/** Universal-link target for https://parkatlas.io/parks/<slug>[?trail=<slug>] — forwards to the park screen. */
export default function ParkSlugRoute() {
  const router = useRouter();
  const { slug, trail } = useLocalSearchParams<{ slug?: string; trail?: string }>();
  const park = parkBySlug(slug);

  useEffect(() => {
    if (!park) return;
    router.replace({ pathname: '/park/[id]', params: { id: park.id, ...(trail ? { trail: String(trail) } : {}) } });
  }, [park, trail, router]);

  if (!park) return <Redirect href="/(tabs)/explore" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface }}>
      <ActivityIndicator color={C.primary} />
    </View>
  );
}
