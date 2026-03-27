import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityDetailModal } from './ActivityDetailModal';
import { AddActivityButton } from './AddActivityButton';

// TODO: Replace with real activity data/props
const activities = [
  { id: 1, park: 'Yosemite NP', trail: 'Mist Trail', state: 'CA', distance: 7.2, date: '2026-03-10', badges: ['Trailblazer'] },
  { id: 2, park: 'Yellowstone NP', trail: 'Fairy Falls', state: 'WY', distance: 5.4, date: '2026-02-28', badges: ['Explorer'] },
  { id: 3, park: 'Acadia NP', trail: 'Beehive Loop', state: 'ME', distance: 1.4, date: '2026-01-15', badges: [] },
];

export function ActivityList() {
  const [selected, setSelected] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  const handleCardPress = (activity: any) => {
    setSelected(activity);
    setModalVisible(true);
  };

  const handleClose = () => {
    setModalVisible(false);
    setSelected(null);
  };

  const handleAdd = () => {
    setAddVisible(true);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.label}>Activity History</ThemedText>
      <FlatList
        data={activities}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleCardPress(item)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="map-marker-radius" size={32} color="#1b5e20" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.park}>{item.park}</ThemedText>
              <ThemedText style={styles.trail}>{item.trail}</ThemedText>
              <ThemedText style={styles.meta}>{item.state} • {item.distance} mi • {item.date}</ThemedText>
              {item.badges.length > 0 && (
                <View style={styles.badgesRow}>
                  {item.badges.map(badge => (
                    <View key={badge} style={styles.badge}><ThemedText style={styles.badgeText}>{badge}</ThemedText></View>
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
      <ActivityDetailModal
        visible={modalVisible}
        activity={selected}
        onClose={handleClose}
        onSave={() => {}}
      />
      <AddActivityButton onPress={handleAdd} />
      {/* TODO: Add AddActivityModal for addVisible */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  label: {
    marginBottom: 8,
    color: '#1b5e20', // deep green for ADA contrast
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  listContent: {
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e6eae6',
  },
  park: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 2,
  },
  trail: {
    fontSize: 15,
    color: '#ff9800',
    fontWeight: '700',
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: '#e0f2e9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    color: '#388e3c',
    fontWeight: '600',
  },
});
