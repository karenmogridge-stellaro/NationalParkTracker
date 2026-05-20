import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ParkAtlas as C } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AppDrawer({ visible, onClose }: Props) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  function navigate(href: string) {
    onClose();
    router.navigate(href as any);
  }

  function handleSignOut() {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            onClose();
            await signOut();
          },
        },
      ],
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Scrim */}
      <Pressable style={styles.scrim} onPress={onClose} />

      {/* Drawer panel */}
      <View style={styles.drawer}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={8}>
          <Ionicons name="close" size={24} color={C.onSurface} />
        </TouchableOpacity>

        {/* Brand */}
        <View style={styles.brand}>
          <MaterialCommunityIcons name="pine-tree" size={32} color={C.primary} />
          <Text style={styles.brandName}>ParkAtlas</Text>
        </View>

        {/* User info */}
        {user && (
          <View style={styles.userRow}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={20} color={C.onPrimary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Menu items */}
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => navigate('/(tabs)/home')}>
          <Ionicons name="home-outline" size={20} color={C.onSurface} />
          <Text style={styles.menuItemText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => navigate('/(tabs)/explore')}>
          <Ionicons name="compass-outline" size={20} color={C.onSurface} />
          <Text style={styles.menuItemText}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => navigate('/(tabs)/directory')}>
          <Ionicons name="map-outline" size={20} color={C.onSurface} />
          <Text style={styles.menuItemText}>Trails</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => navigate('/(tabs)/settings')}>
          <Ionicons name="settings-outline" size={20} color={C.onSurface} />
          <Text style={styles.menuItemText}>Settings</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {user ? (
          <TouchableOpacity style={styles.signOutItem} activeOpacity={0.7} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#c0392b" />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.signInItem} activeOpacity={0.7} onPress={() => navigate('/login')}>
            <Ionicons name="log-in-outline" size={20} color={C.primary} />
            <Text style={styles.signInText}>Sign in or create account</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 290,
    backgroundColor: C.background,
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: -0.3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  userEmail: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: C.outlineVariant,
    marginVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onSurface,
  },
  signOutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c0392b',
  },
  signInItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
  },
});
