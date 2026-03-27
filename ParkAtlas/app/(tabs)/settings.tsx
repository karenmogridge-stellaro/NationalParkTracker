import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';

const SETTINGS_ITEMS = [
  { icon: 'person-outline', label: 'Profile' },
  { icon: 'notifications-outline', label: 'Notifications' },
  { icon: 'map-outline', label: 'Map Preferences' },
  { icon: 'watch-outline', label: 'Connected Devices' },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Data' },
  { icon: 'help-circle-outline', label: 'Help & Support' },
  { icon: 'information-circle-outline', label: 'About ParkAtlas' },
] as const;

export default function SettingsScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={s.list}>
        {SETTINGS_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={s.row} activeOpacity={0.7}>
            <Ionicons name={item.icon as any} size={22} color={C.primary} style={s.icon} />
            <Text style={s.label}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={C.outlineVariant} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: C.onSurface, letterSpacing: -0.3 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  icon: { marginRight: 14 },
  label: { flex: 1, fontSize: 15, color: C.onSurface, fontWeight: '500' },
});


