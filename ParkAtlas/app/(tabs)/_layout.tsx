
import { Tabs } from 'expo-router';
import { HapticTab } from '@/components/haptic-tab';
import { Ionicons } from '@expo/vector-icons';
import { ParkAtlas } from '@/constants/theme';
import { Platform, View } from 'react-native';
import { useFriends } from '@/hooks/useFriends';

export default function TabLayout() {
  const { incomingRequests } = useFriends();
  const pendingRequestCount = incomingRequests.length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ParkAtlas.primary,
        tabBarInactiveTintColor: `${ParkAtlas.onSurface}80`,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: ParkAtlas.background }} />
        ),
        tabBarStyle: {
          backgroundColor: ParkAtlas.background,
          borderTopColor: `${ParkAtlas.surfaceContainerHighest}80`,
          borderTopWidth: Platform.OS === 'ios' ? 0.5 : 1,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarBadge: pendingRequestCount > 0 ? (pendingRequestCount > 99 ? '99+' : pendingRequestCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: ParkAtlas.error,
            color: '#ffffff',
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
