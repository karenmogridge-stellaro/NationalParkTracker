import { View, StyleSheet } from 'react-native';
import DirectoryList from '@/components/directory/DirectoryList';

export default function DirectoryScreen() {
  return (
    <View style={styles.container}>
      <DirectoryList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f5', // soft off-white
    paddingTop: 0,
  },
});