import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { ParkAtlas as C } from '@/constants/theme';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)/home' : '/login'} />;
}
