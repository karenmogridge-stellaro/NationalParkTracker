import type { AuthUser } from '@/hooks/useAuth';

export type DirectoryUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
};

export type FriendActivity = {
  userId: string;
  userName: string;
  parkId: string;
  parkName: string;
  trailName?: string;
  dateVisited?: string;
  distanceMiles?: number;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_PARKATLAS_API_BASE_URL?.trim() || '';

function endpoint(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function normalizeEmail(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null): string {
  return (value || '').replace(/\D+/g, '');
}

function mockFriendActivities(friendIds: string[]): FriendActivity[] {
  return friendIds.flatMap((friendId, index) => {
    if (friendId === 'dev_test_friend') {
      return [
        {
          userId: friendId,
          userName: 'Sarah Chen',
          parkId: 'zion',
          parkName: 'Zion National Park',
          trailName: 'Angels Landing',
          dateVisited: '2024-05-15',
          distanceMiles: 5.5,
        },
        {
          userId: friendId,
          userName: 'Sarah Chen',
          parkId: 'bryce',
          parkName: 'Bryce Canyon',
          trailName: 'Navajo Loop',
          dateVisited: '2024-04-28',
          distanceMiles: 3.1,
        },
      ];
    }

    return [
      {
        userId: friendId,
        userName: `Friend ${index + 1}`,
        parkId: 'grand_canyon',
        parkName: 'Grand Canyon',
        trailName: 'South Kaibab',
        dateVisited: '2024-04-12',
        distanceMiles: 4.8,
      },
    ];
  });
}

export function isDirectoryApiConfigured(): boolean {
  return API_BASE_URL.length > 0;
}

export async function upsertProductionUserProfile(user: AuthUser): Promise<void> {
  if (!isDirectoryApiConfigured() || !user?.id) return;

  const username = normalizeEmail(user.email).split('@')[0] || user.name.replace(/\s+/g, '').toLowerCase();
  const payload = {
    id: user.id,
    name: user.name,
    username,
    email: normalizeEmail(user.email) || null,
    phone: normalizePhone(user.phone) || null,
    avatarUrl: user.avatarUrl || null,
  };

  try {
    await fetch(endpoint('/api/parkatlas/users/upsert'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking: profile sync failure should not block auth flows.
  }
}

export async function matchRegisteredUsersByContacts(input: {
  phones: string[];
  emails: string[];
  limit?: number;
}): Promise<DirectoryUser[]> {
  if (!isDirectoryApiConfigured()) return [];

  const phones = Array.from(new Set(input.phones.map(normalizePhone).filter(Boolean)));
  const emails = Array.from(new Set(input.emails.map(normalizeEmail).filter(Boolean)));
  if (phones.length === 0 && emails.length === 0) return [];

  const res = await fetch(endpoint('/api/parkatlas/users/match'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phones, emails, limit: input.limit ?? 200 }),
  });

  if (!res.ok) return [];

  const json = (await res.json()) as { items?: DirectoryUser[] };
  return Array.isArray(json.items) ? json.items : [];
}

export async function fetchFriendActivities(friendIds: string[]): Promise<FriendActivity[]> {
  if (friendIds.length === 0) return [];
  if (!isDirectoryApiConfigured()) return mockFriendActivities(friendIds);

  try {
    const res = await fetch(endpoint('/api/parkatlas/friends/activities'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendIds, limit: 50 }),
    });

    if (!res.ok) return mockFriendActivities(friendIds);

    const json = (await res.json()) as { items?: FriendActivity[] };
    return Array.isArray(json.items) && json.items.length > 0 ? json.items : mockFriendActivities(friendIds);
  } catch {
    return mockFriendActivities(friendIds);
  }
}
