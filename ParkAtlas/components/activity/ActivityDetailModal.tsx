import { Modal, View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';

interface Activity {
  park?: string;
  trail?: string;
  state?: string;
  date?: string;
  distance?: number;
  notes?: string;
  [key: string]: unknown;
}

interface Props {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onSave: (updated: Activity) => void;
}

export function ActivityDetailModal({ visible, activity, onClose, onSave }: Props) {
  const [distance, setDistance] = useState(activity?.distance?.toString() || '');
  const [notes, setNotes] = useState(activity?.notes || '');

  if (!activity) return null;
  // Reset fields when activity changes
  // (This is a simple approach for demo; for production, useEffect is better)
  if (distance !== activity.distance?.toString()) setDistance(activity.distance?.toString() || '');
  if (notes !== (activity.notes || '')) setNotes(activity.notes || '');

  const handleSave = () => {
    onSave({ ...activity, distance: parseFloat(distance), notes });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ThemedText type="title">Activity Details</ThemedText>
          <ThemedText style={styles.label}>Park: {activity.park}</ThemedText>
          <ThemedText style={styles.label}>Trail: {activity.trail}</ThemedText>
          <ThemedText style={styles.label}>State: {activity.state}</ThemedText>
          <ThemedText style={styles.label}>Date: {activity.date}</ThemedText>
          <ThemedText style={styles.label}>Distance (mi):</ThemedText>
          <TextInput
            style={styles.input}
            value={distance}
            onChangeText={setDistance}
            keyboardType="decimal-pad"
            placeholder="Distance"
          />
          <ThemedText style={styles.label}>Notes:</ThemedText>
          <TextInput
            style={[styles.input, { height: 60 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            multiline
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Save</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <ThemedText style={{ color: '#388e3c', fontWeight: '700' }}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: '#222',
  },
  input: {
    width: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    fontSize: 16,
    color: '#222',
    backgroundColor: '#f8f8f8',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  saveBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#388e3c',
    minWidth: 70,
    alignItems: 'center',
  },
  closeBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e0f2e9',
    minWidth: 70,
    alignItems: 'center',
  },
});
