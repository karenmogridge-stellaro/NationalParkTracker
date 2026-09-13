import React, { useEffect, useState } from 'react';
import { Image, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { doc, onSnapshot } from 'firebase/firestore';
import { ParkAtlas as C } from '@/constants/theme';
import { db } from '@/utils/firebase';

const APP_STORE_ID = '6760982981';
const STORE_URL = `itms-apps://apps.apple.com/app/id${APP_STORE_ID}`;
const STORE_URL_WEB = `https://apps.apple.com/app/id${APP_STORE_ID}`;

export type UpdateGateConfig = {
  /** Builds below this number are blocked. Edit in Firestore: app_config/ios. */
  minBuild: number;
  title?: string;
  message?: string;
};

export function currentBuildNumber(): number {
  const n = Number(Application.nativeBuildVersion);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/** Full-screen, non-dismissable "please update" screen. */
export function UpdateRequiredScreen({ config }: { config: UpdateGateConfig }) {
  const version = Application.nativeApplicationVersion ?? '';
  return (
    <View style={styles.root}>
      <Image source={require('../assets/images/parkatlas-logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>{config.title || 'Time for a quick update'}</Text>
      <Text style={styles.body}>
        {config.message || 'This version of ParkAtlas can’t connect anymore. Update from the App Store to keep tracking your parks — your visits are safe.'}
      </Text>
      <TouchableOpacity
        style={styles.btn}
        activeOpacity={0.85}
        onPress={() => { Linking.openURL(STORE_URL).catch(() => Linking.openURL(STORE_URL_WEB)); }}
      >
        <Ionicons name="logo-apple" size={18} color={C.onPrimary} />
        <Text style={styles.btnText}>Update on the App Store</Text>
      </TouchableOpacity>
      <Text style={styles.fine}>You’re on {version} (build {Application.nativeBuildVersion}). Minimum build {config.minBuild}.</Text>
    </View>
  );
}

/**
 * Listens to app_config/ios and blocks the app when this build is older than minBuild.
 * Lets future server-side changes (rules, schema) force stragglers to update instead of failing silently.
 */
export function UpdateGate() {
  const [config, setConfig] = useState<UpdateGateConfig | null>(null);

  useEffect(() => {
    if (__DEV__) return;
    const unsub = onSnapshot(doc(db, 'app_config', 'ios'), (snap) => {
      const data = snap.data();
      const minBuild = Number(data?.minBuild);
      if (!Number.isFinite(minBuild)) { setConfig(null); return; }
      setConfig({ minBuild, title: data?.title, message: data?.message });
    }, () => setConfig(null));
    return () => unsub();
  }, []);

  if (!config || currentBuildNumber() >= config.minBuild) return null;
  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <UpdateRequiredScreen config={config} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  logo: { width: 96, height: 96, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: C.onSurface, textAlign: 'center', letterSpacing: -0.3 },
  body: { fontSize: 15.5, color: C.onSurfaceVariant, textAlign: 'center', lineHeight: 23 },
  btn: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 14 },
  btnText: { color: C.onPrimary, fontSize: 16, fontWeight: '800' },
  fine: { marginTop: 18, fontSize: 12, color: C.outlineVariant, textAlign: 'center' },
});
