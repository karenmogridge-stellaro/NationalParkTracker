import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ThemedText } from '@/components/themed-text';

// TODO: Replace with real badge data/props
const badges = [
  { id: 1, name: 'Trailblazer', icon: require('../../assets/images/icon.png') },
  { id: 2, name: 'Explorer', icon: require('../../assets/images/icon.png') },
  { id: 3, name: 'Summiteer', icon: require('../../assets/images/icon.png') },
];

export function BadgesBar({ onBadgePress }: { onBadgePress?: (badge: any) => void }) {
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.label}>Badges</ThemedText>
      <View style={styles.badgeRow}>
        {badges.map(badge => (
          <TouchableOpacity
            key={badge.id}
            style={styles.badgeCard}
            onPress={() => onBadgePress?.(badge)}
            activeOpacity={0.7}
          >
            <Image source={badge.icon} style={styles.badgeIcon} />
            <ThemedText style={styles.badgeName}>{badge.name}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    alignItems: 'center',
  },
  label: {
    marginBottom: 8,
    color: '#1b4332',
    fontSize: 18,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  badgeCard: {
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
    borderRadius: 12,
    padding: 8,
    minWidth: 70,
  },
  badgeIcon: {
    width: 36,
    height: 36,
    marginBottom: 4,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  badgeName: {
    fontSize: 12,
    color: '#222',
    textAlign: 'center',
  },
});
