# ParkAtlas Architecture Analysis

## Overview
This document maps the key files and implementations for the ParkAtlas mobile app, focusing on authentication, user profiles, contact discovery, and API integration.

---

## 1. File Locations

### Friends/Directory Screen
**File:** [`app/(tabs)/directory.tsx`](app/(tabs)/directory.tsx)
- Displays friends, suggested users, search results, and contact-based friend discovery
- Handles "Find from contacts" functionality with environment detection
- Shows incoming friend requests, outgoing requests, and current friends

### Profile/User Screen  
**File:** [`app/(tabs)/settings.tsx`](app/(tabs)/settings.tsx)
- User profile display with name, email shown in header
- Edit profile functionality via modal component

**File:** [`components/EditProfileModal.tsx`](components/EditProfileModal.tsx)
- Modal for editing name, phone, and avatar photo
- Name, phone, and avatar URI populated from `useAuth()` context

### Authentication/Login Implementation
**File:** [`app/login.tsx`](app/login.tsx)
- Sign-in screen with Apple sign-in, email/password auth, Face ID unlock
- Face ID/biometric button shown conditionally

**File:** [`hooks/useAuth.tsx`](hooks/useAuth.tsx)
- Core authentication logic: Apple signin, email auth, biometrics, account management
- User profile persistence in SecureStore
- Face ID/Touch ID implementation

### API Client & Backend Integration
**File:** [`utils/userDirectoryApi.ts`](utils/userDirectoryApi.ts)
- Environment-specific API configuration
- Contact matching with backend
- Friend activities fetching
- User profile upserting

**File:** [`hooks/useFriends.tsx`](hooks/useFriends.tsx)
- Friend state management (directory users, friend requests, contact sync state)
- Dev test friend data

---

## 2. Contact Sync Implementation - "Find from Contacts"

### How It Works

**Code Location:** [app/(tabs)/directory.tsx#L107-L166](app/(tabs)/directory.tsx#L107-L166)

```javascript
async function syncContacts() {
  if (syncingContacts) return;

  // ⚠️ CRITICAL: Environment Detection
  // expo-contacts is a native module — only works in a development build, not Expo Go
  if (Constants.appOwnership === 'expo') {
    Alert.alert(
      'Development Build Required',
      'Syncing contacts requires the full ParkAtlas app, not Expo Go. Use the TestFlight build to access this feature.'
    );
    return;
  }
```

**Key Points:**
1. **Feature is DISABLED in Expo Go** — Only works in TestFlight or production builds
2. **Gating mechanism:** `Constants.appOwnership === 'expo'` checks if running in Expo Go
3. **Permission required:** Uses `expo-contacts` native module (requires development/production build)

### Contact Matching Flow

1. **Get User Contacts** — Fetch contacts with emails and phone numbers
2. **Normalize Data** — Extract and normalize emails and phone numbers
3. **Remote API Call** — POST to `/api/parkatlas/users/match` with contact data
4. **Fallback Local Matching** — If API returns no results, do local name/email/phone matching

**Code Location:** [app/(tabs)/directory.tsx#L135-L180](app/(tabs)/directory.tsx#L135-L180)

```javascript
const remoteMatches = await matchRegisteredUsersByContacts({ emails, phones });
const matchedProfiles: FriendProfile[] = remoteMatches.map((u) => ({
  id: u.id,
  name: u.name,
  username: u.username,
  avatar: u.avatarUrl || 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e...',
  meta: '@' + u.username,
  status: 'offline',
  email: undefined,
  phone: undefined,
}));

// Fallback: Local matching if no remote results
if (matchedProfiles.length > 0) {
  await setDirectoryUsers(matchedProfiles);
  await setMatchedContactIds(matchedProfiles.map((p) => p.id));
} else {
  const fallbackMatchedIds = discoverableUsers
    .filter((profile) => {
      // Match by email, phone, or name similarity
      return contacts.some((contact) => {
        const profileEmail = normalize(profile.email);
        const profilePhone = phoneDigits(profile.phone || profile.meta);
        const profileName = normalize(profile.name);
        return (
          (profileEmail && contactEmails.includes(profileEmail)) ||
          (profilePhone && contactPhones.includes(profilePhone)) ||
          (contactName && (contactName.includes(profileName) || profileName.includes(contactName)))
        );
      });
    })
    .map((p) => p.id);
  await setMatchedContactIds(fallbackMatchedIds);
}
```

---

## 3. User Profile Population

### Profile Data Sources

**From Authentication Context** [`hooks/useAuth.tsx`](hooks/useAuth.tsx):

```typescript
interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  provider: 'apple' | 'email';
}
```

### How Name is Populated

#### Apple Sign-In
**Code:** [hooks/useAuth.tsx#L190-L212](hooks/useAuth.tsx#L190-L212)

```javascript
const firstName = credential.fullName?.givenName ?? '';
const lastName = credential.fullName?.familyName ?? '';
const fullName = [firstName, lastName].filter(Boolean).join(' ');
const email = credential.email ?? (isSameAppleUser ? cached!.email : '');

const authUser: AuthUser = {
  id: `apple_${credential.user}`,
  name: fullName || (isSameAppleUser ? cached!.name : (email ? email.split('@')[0] : 'Explorer')),
  // ↑ Default to email prefix, or 'Explorer' as last resort
  email,
  provider: 'apple',
};
```

**Default Text Logic:**
1. Uses Apple's provided full name (first + last name)
2. Falls back to email address username (part before @)
3. **Falls back to `'Explorer'` if both are empty** ← This is the hardcoded default!

#### Email Sign-Up
**Code:** [hooks/useAuth.tsx#L214-L240](hooks/useAuth.tsx#L214-L240)

```javascript
const authUser: AuthUser = {
  id: `email_${normalizedEmail}`,
  name: name.trim(), // User-provided name
  email: normalizedEmail,
  provider: 'email',
};
```

#### Email Sign-In (Restores Existing Name)
**Code:** [hooks/useAuth.tsx#L259-L275](hooks/useAuth.tsx#L259-L275)

```javascript
const authUser: AuthUser = {
  id: `email_${normalizedEmail}`,
  name: isSame ? cached!.name : normalizedEmail.split('@')[0],
  email: normalizedEmail,
  // ↑ Falls back to email prefix on first signin with email
  provider: 'email',
};
```

### How Profile is Displayed

**In Settings Screen:** [app/(tabs)/settings.tsx](app/(tabs)/settings.tsx)
- User context: `const { signOut, deleteAccount, user, ... } = useAuth();`
- User object contains: `user?.email`, `user?.name`, `user?.phone`, `user?.avatarUrl`

**Edit Profile Modal:** [components/EditProfileModal.tsx](components/EditProfileModal.tsx)
```javascript
const { user, updateProfile } = useAuth();
const [name, setName] = useState(user?.name ?? '');
const [phone, setPhone] = useState(user?.phone ?? '');
const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
```

---

## 4. Face ID / Biometric Authentication

### Implementation

**Core Logic:** [hooks/useAuth.tsx#L291-L310](hooks/useAuth.tsx#L291-L310)

```typescript
const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
  if (!pendingBiometricUser) return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock ParkAtlas',
      cancelLabel: 'Use Password',
      disableDeviceFallback: false,
    });
    if (result.success) {
      await persistUser(pendingBiometricUser);
      return true;
    }
  } catch (e) {
    console.error('[useAuth] Biometric error:', e);
  }
  return false;
}, [pendingBiometricUser]);
```

### Face ID UI Flow

**Login Screen:** [app/login.tsx#L142-L167](app/login.tsx#L142-L167)

When user has biometric enabled and a prior session exists, show locked login banner:

```javascript
{showBiometricPrompt && (
  <View style={styles.bioLockBanner}>
    <View style={styles.bioAvatarCircle}>
      <Ionicons name="person" size={32} color={C.primary} />
    </View>
    <Text style={styles.bioLockName}>
      Welcome back, {pendingBiometricUser!.name.split(' ')[0]}!
    </Text>
    <Text style={styles.bioLockSub}>Use Face ID to unlock your account</Text>

    <TouchableOpacity
      style={styles.bioUnlockBtn}
      onPress={handleBiometricUnlock}
      activeOpacity={0.85}
      disabled={biometricLoading}
    >
      {biometricLoading ? (
        <ActivityIndicator size="small" color={C.onPrimary} />
      ) : (
        <>
          <Ionicons name="scan-outline" size={22} color={C.onPrimary} />
          <Text style={styles.bioUnlockText}>Unlock with Face ID</Text>
        </>
      )}
    </TouchableOpacity>

    <TouchableOpacity onPress={dismissBiometricPrompt} style={styles.switchAccountLink}>
      <Text style={styles.switchAccountText}>Sign in with a different account</Text>
    </TouchableOpacity>
  </View>
)}
```

**Session Detection:** [hooks/useAuth.tsx#L131-L162](hooks/useAuth.tsx#L131-L162)

```javascript
useEffect(() => {
  (async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const deviceSupports = hasHardware && isEnrolled;
      setBiometricAvailable(deviceSupports);

      const bioRaw = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      const isBioEnabled = bioRaw === 'true';
      setBiometricEnabledState(isBioEnabled);

      const stored = await SecureStore.getItemAsync(AUTH_USER_KEY);
      if (stored) {
        const storedUser: AuthUser = JSON.parse(stored);
        if (isBioEnabled && deviceSupports) {
          // Lock the session — show biometric prompt on login screen
          setPendingBiometricUser(storedUser);
        } else {
          setUser(storedUser);
        }
      }
    } catch {
      // First launch or SecureStore unavailable
    } finally {
      setLoading(false);
    }
  })();
}, []);
```

**Key Points:**
- Uses `LocalAuthentication.authenticateAsync()` from Expo
- Locked sessions stored with `BIOMETRIC_ENABLED_KEY` = `'true'`
- Shows Face ID prompt on app launch if biometric is enabled AND hardware/enrollment exists
- Users can switch accounts by dismissing the prompt

---

## 5. Environment-Specific API Configuration

### API Base URL Configuration

**File:** [utils/userDirectoryApi.ts#L20-L23](utils/userDirectoryApi.ts#L20-L23)

```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_PARKATLAS_API_BASE_URL?.trim() || '';

function endpoint(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function isDirectoryApiConfigured(): boolean {
  return API_BASE_URL.length > 0;
}
```

### How It's Used

1. **Contact Matching:** `POST ${API_BASE_URL}/api/parkatlas/users/match`
2. **Friend Activities:** `POST ${API_BASE_URL}/api/parkatlas/friends/activities`
3. **User Profile Upsert:** `POST ${API_BASE_URL}/api/parkatlas/users/upsert`

**Fallback Behavior:**
- If `EXPO_PUBLIC_PARKATLAS_API_BASE_URL` is not set (empty string)
- Contact sync returns empty array
- Friend activities use mock data
- User profile sync is skipped

### Configuration via Environment Variable

The app uses **Expo's `EXPO_PUBLIC_*` prefix convention**, which means:
- Must be set in `.env.local` or passed during build
- Automatically available in `process.env` at runtime
- Works in both development and production builds

**Example .env.local:**
```
EXPO_PUBLIC_PARKATLAS_API_BASE_URL=https://api.example.com
```

---

## 6. Dev-Only Overrides & Mock Data

### Dev Sign-In Button (Only in __DEV__)

**File:** [app/login.tsx#L397-L399](app/login.tsx#L397-L399)

```javascript
{__DEV__ && (
  <TouchableOpacity style={styles.devBtn} onPress={signInDev} activeOpacity={0.7}>
    <Text style={styles.devBtnText}>Skip Sign In (Dev)</Text>
  </TouchableOpacity>
)}
```

**Implementation:** [hooks/useAuth.tsx#L285-L292](hooks/useAuth.tsx#L285-L292)

```typescript
const signInDev = useCallback(async () => {
  const devUser: AuthUser = {
    id: 'dev_user',
    name: 'Dev User',
    email: 'dev@parkatlas.app',
    provider: 'email',
  };
  await persistUser(devUser);
}, []);
```

**Key Points:**
- Only visible when `__DEV__ === true` (development builds)
- **NOT visible in TestFlight or production builds**
- Signs in as: `dev@parkatlas.app` with name `Dev User`

### Mock Test Friend Data

**File:** [hooks/useFriends.tsx#L93-L103](hooks/useFriends.tsx#L93-L103)

```typescript
const DEV_TEST_FRIEND: FriendProfile = {
  id: 'dev_test_friend',
  name: 'Sarah Chen',
  username: 'sarahchen',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330...',
  meta: '@sarahchen',
  email: 'sarah@example.com',
  phone: '4155550101',
  badge: 'Test Friend',
};
```

### Mock Friend Activities

**File:** [utils/userDirectoryApi.ts#L26-L62](utils/userDirectoryApi.ts#L26-L62)

```javascript
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
```

**When Mock Data is Used:**
- When API is not configured (`API_BASE_URL` is empty)
- When API call fails
- When contact matching returns no results

---

## 7. Critical Environment Checks

### 1. **expo-contacts Availability** (Contact Sync)
- **Location:** [app/(tabs)/directory.tsx#L110-L115](app/(tabs)/directory.tsx#L110-L115)
- **Check:** `Constants.appOwnership === 'expo'`
- **Behavior:** Blocks contact sync in Expo Go, allows in TestFlight/production

### 2. **Dev Features Visibility**
- **Location:** [app/login.tsx#L397](app/login.tsx#L397)
- **Check:** `{__DEV__ && ...}`
- **Behavior:** Dev button only visible in development builds

### 3. **API Configuration**
- **Location:** [utils/userDirectoryApi.ts#L20-L23](utils/userDirectoryApi.ts#L20-L23)
- **Check:** `process.env.EXPO_PUBLIC_PARKATLAS_API_BASE_URL`
- **Behavior:** Enables/disables remote API calls; uses mock data if not configured

### 4. **Biometric Hardware Check**
- **Location:** [hooks/useAuth.tsx#L138-L141](hooks/useAuth.tsx#L138-L141)
- **Check:** `LocalAuthentication.hasHardwareAsync()` + `isEnrolledAsync()`
- **Behavior:** Only shows Face ID UI if device supports it

---

## 8. Summary of Potential Issues/Observations

| Feature | Status | Gating Mechanism | TestFlight Behavior |
|---------|--------|------------------|-------------------|
| Contact Sync | Implemented | `Constants.appOwnership === 'expo'` | ✅ Works (full build) |
| Face ID | Implemented | Biometric hardware check | ✅ Works |
| Dev Sign-In | Implemented | `__DEV__` | ❌ Not visible |
| Remote API | Conditional | `EXPO_PUBLIC_PARKATLAS_API_BASE_URL` | Depends on config |
| Mock Activities | Fallback | API failure or no config | ✅ Always available |
| Default Name | Fallback | `'Explorer'` if no email/name | ✅ Works |

---

## 9. Files & API Endpoints Summary

### API Endpoints Called
- `POST /api/parkatlas/users/upsert` — Sync user profile
- `POST /api/parkatlas/users/match` — Match contacts to registered users
- `POST /api/parkatlas/friends/activities` — Fetch friend activities

### Key Files
| File | Purpose |
|------|---------|
| `app/(tabs)/directory.tsx` | Friends/contact discovery screen |
| `app/(tabs)/settings.tsx` | User settings & profile display |
| `app/login.tsx` | Authentication UI |
| `hooks/useAuth.tsx` | Auth logic & state management |
| `hooks/useFriends.tsx` | Friend state management |
| `components/EditProfileModal.tsx` | Profile editing |
| `utils/userDirectoryApi.ts` | API client & backend integration |
| `constants/authConfig.ts` | Auth constants (SecureStore keys) |

---

## 10. Secrets & Security

### SecureStore Keys
- `parkatlasauthuser` — Persisted auth user profile
- `parkatlasbiometricenabled` — Biometric preference flag
- `parkatlascreds{emailHex}` — Email account credentials (hashed password + salt)

### Password Hashing
- Algorithm: SHA256
- Salt: Random 16 bytes
- Each email account gets unique credentials entry

