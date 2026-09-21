import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { captureScreen } from 'react-native-view-shot';
import { ref, uploadBytes } from 'firebase/storage';
import { ParkAtlas as C } from '@/constants/theme';
import { auth, storage } from '@/utils/firebase';

/** Dev-only: exercises the shake-feedback screenshot pipeline step by step and prints each result. */
export default function FeedbackProbe() {
  const [log, setLog] = useState<string[]>([]);
  const add = (s: string) => setLog((l) => [...l, s]);

  useEffect(() => {
    (async () => {
      add(`auth uid: ${auth.currentUser?.uid ?? 'none'} anon=${auth.currentUser?.isAnonymous}`);
      let uri = '';
      try {
        const raw = await captureScreen({ format: 'jpg', quality: 0.8, result: 'tmpfile' });
        uri = raw.startsWith('/') ? `file://${raw}` : raw;
        add(`captureScreen OK: ${uri.slice(0, 60)}…`);
      } catch (e: any) { add(`captureScreen FAIL: ${e?.message ?? e}`); return; }
      let blob: Blob;
      try {
        const res = await fetch(uri);
        blob = await res.blob();
        add(`fetch→blob OK: ${blob.size} bytes, type="${blob.type}"`);
      } catch (e: any) { add(`fetch→blob FAIL: ${e?.message ?? e}`); return; }
      try {
        const path = `feedback/probe_${Date.now()}.jpg`;
        await uploadBytes(ref(storage, path), blob, { contentType: 'image/jpeg' });
        add(`uploadBytes OK: ${path}`);
      } catch (e: any) { add(`uploadBytes FAIL: ${e?.code ?? ''} ${e?.message ?? e}`); }
    })();
  }, []);

  if (!__DEV__) return null;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {log.map((l, i) => <Text key={i} style={styles.line}>{l}</Text>)}
      {log.length === 0 ? <Text style={styles.line}>running…</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  content: { padding: 20, paddingTop: 90, gap: 10 },
  line: { color: C.onSurface, fontSize: 14, fontFamily: 'Menlo' },
});
