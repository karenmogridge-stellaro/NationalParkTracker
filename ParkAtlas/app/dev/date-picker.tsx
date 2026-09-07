import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { VisitDatePicker, type VisitDateValue } from '@/components/VisitDatePicker';
import { ParkAtlas as C } from '@/constants/theme';

/** Dev-only: exercise the visit date picker (inline calendar) against light/dark system appearance. */
export default function DatePickerPreview() {
  const [value, setValue] = useState<VisitDateValue>({ kind: 'date', date: new Date(), precision: 'day' });
  if (!__DEV__) return null;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Tap &ldquo;Exact date&rdquo; → calendar should be fully visible</Text>
      <VisitDatePicker value={value} onChange={setValue} initiallyOpen />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  content: { padding: 20, paddingTop: 80, gap: 16 },
  label: { color: C.onSurfaceVariant, fontSize: 13 },
});
