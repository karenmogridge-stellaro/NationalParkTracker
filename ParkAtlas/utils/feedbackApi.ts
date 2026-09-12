import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db, storage } from '@/utils/firebase';

export type FeedbackCategory = 'bug' | 'idea' | 'other';

export type FeedbackInput = {
  note: string;
  category: FeedbackCategory;
  /** Local file URI of the screen capture taken when the sheet opened. */
  screenshotUri?: string | null;
  /** Route the user was on when they shook. */
  route?: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
};

export type FeedbackRecord = {
  id: string;
  note: string;
  category: FeedbackCategory;
  screenshotUrl?: string | null;
  route?: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  appVersion?: string;
  build?: string;
  device?: string;
  os?: string;
  createdAt?: string;
  status?: 'new' | 'reviewed' | 'done';
};

// Rules make feedback/ screenshots admin-read-only, so the submitter only records the path.
async function uploadScreenshot(uri: string, id: string): Promise<string | null> {
  try {
    const blob = await (await fetch(uri)).blob();
    const path = `feedback/${id}.jpg`;
    await uploadBytes(ref(storage, path), blob, { contentType: 'image/jpeg' });
    return path;
  } catch {
    return null;
  }
}

/** Writes one feedback doc (screenshot uploaded first so the doc carries its path). */
export async function submitFeedback(input: FeedbackInput): Promise<string> {
  const id = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const screenshotPath = input.screenshotUri ? await uploadScreenshot(input.screenshotUri, id) : null;
  const docRef = await addDoc(collection(db, 'feedback'), {
    id,
    note: input.note.trim(),
    category: input.category,
    screenshotPath,
    route: input.route ?? null,
    userId: input.userId ?? null,
    userName: input.userName ?? null,
    userEmail: input.userEmail ?? null,
    appVersion: Application.nativeApplicationVersion ?? null,
    build: Application.nativeBuildVersion ?? null,
    device: Device.modelName ?? null,
    os: `${Platform.OS} ${Device.osVersion ?? ''}`.trim(),
    status: 'new',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Newest-first list for the dev review screen (admin-only under rules). Resolves screenshot URLs. */
export async function fetchFeedback(max = 100): Promise<FeedbackRecord[]> {
  const snap = await getDocs(query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(max)));
  return Promise.all(snap.docs.map(async (d) => {
    const data = d.data() as Record<string, unknown>;
    const created = data.createdAt as { toDate?: () => Date } | undefined;
    const path = (data.screenshotPath as string | null) ?? null;
    const screenshotUrl = path
      ? await getDownloadURL(ref(storage, path)).catch(() => null)
      : ((data.screenshotUrl as string | null) ?? null);
    return {
      id: d.id,
      note: String(data.note ?? ''),
      category: (data.category as FeedbackCategory) ?? 'other',
      screenshotUrl,
      route: (data.route as string | undefined) ?? undefined,
      userId: (data.userId as string | null) ?? null,
      userName: (data.userName as string | null) ?? null,
      userEmail: (data.userEmail as string | null) ?? null,
      appVersion: (data.appVersion as string | undefined) ?? undefined,
      build: (data.build as string | undefined) ?? undefined,
      device: (data.device as string | undefined) ?? undefined,
      os: (data.os as string | undefined) ?? undefined,
      status: (data.status as FeedbackRecord['status']) ?? 'new',
      createdAt: created?.toDate ? created.toDate().toISOString() : undefined,
    };
  }));
}
