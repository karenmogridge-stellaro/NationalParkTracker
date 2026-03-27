import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function StatsSummary() {
  // TODO: Replace with real stats
  return (
    <View style={styles.card}>
      <ThemedText type="subtitle" style={styles.header}>My Stats</ThemedText>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <MaterialCommunityIcons name="pine-tree" size={28} color="#1b5e20" style={styles.icon} />
          <ThemedText style={styles.statValue}>12</ThemedText>
          <ThemedText style={styles.statLabel}>Parks</ThemedText>
        </View>
        <View style={styles.statBox}>
          <MaterialCommunityIcons name="medal" size={28} color="#ff9800" style={styles.icon} />
          <ThemedText style={styles.statValue}>8</ThemedText>
          <ThemedText style={styles.statLabel}>Badges</ThemedText>
        </View>
        <View style={styles.statBox}>
          <MaterialCommunityIcons name="walk" size={28} color="#1976d2" style={styles.icon} />
          <ThemedText style={styles.statValue}>74</ThemedText>
          <ThemedText style={styles.statLabel}>Miles</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 18,
    marginTop: 18,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e6eae6',
  },
  header: {
    fontWeight: '700',
    fontSize: 19,
    marginBottom: 18,
    color: '#1b5e20',
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  icon: {
    marginBottom: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  statLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
