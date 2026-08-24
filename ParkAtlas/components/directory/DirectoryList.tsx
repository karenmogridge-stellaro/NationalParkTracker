import React, { useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { PARKS } from '../../data/parksData';

// PARKS is now imported from data/parksData

export default function DirectoryList() {
  const [search, setSearch] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  const filtered = PARKS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.state.toLowerCase().includes(search.toLowerCase())
  );

  const handleUseLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied.');
        setLocationLoading(false);
        return;
      }
      await Location.getCurrentPositionAsync({});
      // In a real app, use loc.coords to search for nearby parks
      setSearch('');
      setLocationError('');
      // For demo, just show a message
      setLocationError('Location search not implemented in demo.');
    } catch {
      setLocationError('Could not get location.');
    }
    setLocationLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Type city, state, or just state"
          placeholderTextColor="#888"
          accessibilityLabel="Search by city, state, or just state"
        />
        <TouchableOpacity
          style={styles.locationBtn}
          onPress={handleUseLocation}
          disabled={locationLoading}
          accessibilityLabel="Use current location"
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={26} color="#1b4332" />
        </TouchableOpacity>
      </View>
      <ThemedText style={styles.searchHint}>
        Search by city, state, or tap the location icon to use your current location.
      </ThemedText>
      {locationError ? <ThemedText style={{ color: '#b71c1c', marginBottom: 8 }}>{locationError}</ThemedText> : null}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={{ width: 38, height: 38, borderRadius: 8, marginRight: 12, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="pine-tree" size={22} color="#1b4332" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" style={{ color: '#1b4332', fontWeight: '700', fontSize: 17 }}>{item.name}</ThemedText>
              <ThemedText style={styles.state}>{item.state}</ThemedText>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<ThemedText>No parks found.</ThemedText>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  locationBtn: {
    marginLeft: 4,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  searchHint: {
    color: '#555',
    fontSize: 13,
    marginLeft: 18,
    marginBottom: 6,
  },
  search: {
    backgroundColor: '#f5f7f5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    fontSize: 17,
    margin: 18,
    borderWidth: 1,
    borderColor: '#e6eae6',
    color: '#222',
    fontFamily: Platform.OS === 'ios' ? 'San Francisco' : 'Roboto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: '#e6eae6',
  },
  state: {
    color: '#3a5d3a',
    fontWeight: '500',
    marginTop: 4,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
