import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

export function NearbySection() {
  // TODO: Replace with real nearby parks/trails data and map
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.label}>What&apos;s Nearby</ThemedText>
      <View style={styles.cardsRow}>
        {/* Placeholder cards */}
        <View style={styles.card}><ThemedText>Yosemite NP</ThemedText></View>
        <View style={styles.card}><ThemedText>Yellowstone NP</ThemedText></View>
        <View style={styles.card}><ThemedText>Acadia NP</ThemedText></View>
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
    color: '#388e3c',
    fontSize: 18,
    fontWeight: '600',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    backgroundColor: '#f2f4f7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    minWidth: 90,
  },
});
