
import { Tabs } from 'expo-router';
import { HapticTab } from '@/components/haptic-tab';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ParkAtlas } from '@/constants/theme';
import { Platform, View } from 'react-native';

export default function TabLayout() {
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
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
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
          title: 'Trails',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'hiking' : 'hiking'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
