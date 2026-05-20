import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';

import { ParkAtlas as C } from '@/constants/theme';
import { db } from '@/utils/firebase';

type DirectoryUser = {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

export default function FindFriendsScreen() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DirectoryUser[];

      setUsers(results);
    } catch (error) {
      console.log('Error loading users:', error);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ').trim();
          const displayName = item.name?.trim() || fullName || 'Unnamed user';

          return (
            <View style={styles.row}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email}>{item.email || 'No email'}</Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: C.background,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9df',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onSurface,
  },
  email: {
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  empty: {
    marginTop: 18,
    color: C.onSurfaceVariant,
    fontSize: 14,
  },
});
