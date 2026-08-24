import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';

export type FriendFeedItem = {
  id: string;
  userName: string;
  parkName: string;
  meta: string;
  avatar: string;
  imageUri: string;
};

export function FriendsFeedList({
  items,
  onFindMore,
}: {
  items: FriendFeedItem[];
  onFindMore: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.blockHeaderRow}>
        <Text style={styles.blockTitle}>Friends&apos; Adventures</Text>
        <TouchableOpacity style={styles.inlineFindBtn} activeOpacity={0.8} onPress={onFindMore}>
          <Text style={styles.inlineFindBtnText}>Find more friends</Text>
        </TouchableOpacity>
      </View>
      {items.map((item) => (
        <View key={item.id} style={styles.feedRow}>
          <Image source={{ uri: item.imageUri }} style={styles.feedImage} />
          <View style={styles.feedOverlay} />
          <View style={styles.feedContent}>
            <View style={styles.feedWho}>
              <Image source={{ uri: item.avatar }} style={styles.feedAvatar} />
              <Text style={styles.feedUser}>{item.userName}</Text>
            </View>
            <Text style={styles.feedPark}>{item.parkName}</Text>
            <Text style={styles.feedMeta}>{item.meta}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function EmptyStateFindFriends({ onPress }: { onPress: () => void }) {
  return (
    <View style={[styles.card, styles.centerCard]}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="people-outline" size={22} color={C.primary} />
      </View>
      <Text style={styles.emptyTitle}>Follow friends to see their adventures.</Text>
      <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={onPress}>
        <Text style={styles.primaryBtnText}>Find Your People</Text>
      </TouchableOpacity>
    </View>
  );
}

export type PersonActionItem = {
  id: string;
  name: string;
  meta?: string;
  avatar: string;
  actionLabel: string;
  actionStyle?: 'primary' | 'secondary' | 'outline' | 'status';
  disabled?: boolean;
  onAction?: () => void;
};

function PersonList({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: PersonActionItem[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>{title}</Text>
      {subtitle ? <Text style={styles.blockSub}>{subtitle}</Text> : null}
      {items.map((item) => (
        <View key={item.id} style={styles.personRow}>
          <View style={styles.personLeft}>
            <Image source={{ uri: item.avatar }} style={styles.personAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{item.name}</Text>
              {item.meta ? <Text style={styles.personMeta}>{item.meta}</Text> : null}
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.personActionBtn,
              item.actionStyle === 'primary' && styles.personActionPrimary,
              item.actionStyle === 'secondary' && styles.personActionSecondary,
              item.actionStyle === 'outline' && styles.personActionOutline,
              item.actionStyle === 'status' && styles.personActionStatus,
              item.disabled && styles.personActionDisabled,
            ]}
            activeOpacity={0.8}
            disabled={item.disabled || !item.onAction}
            onPress={item.onAction}
          >
            <Text
              style={[
                styles.personActionText,
                item.actionStyle === 'primary' && styles.personActionTextPrimary,
                item.actionStyle === 'status' && styles.personActionTextStatus,
              ]}
            >
              {item.actionLabel}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export function SuggestedUsersList({ items }: { items: PersonActionItem[] }) {
  return <PersonList title="Suggested Users" subtitle="People you likely know on ParkAtlas." items={items} />;
}

export type SearchResultItem = {
  id: string;
  name: string;
  meta: string;
  avatar: string;
  actionLabel: string;
  actionStyle?: 'primary' | 'secondary' | 'outline' | 'status';
  onAction: () => void;
};

export function UserSearchInput({
  value,
  onChangeText,
  results,
}: {
  value: string;
  onChangeText: (text: string) => void;
  results: SearchResultItem[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>Search</Text>
      <Text style={styles.blockSub}>Look up people by name, handle, or email.</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={C.onSurfaceVariant} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search name or email..."
          placeholderTextColor="#6d746c"
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      {value.trim().length > 0 ? (
        <View style={styles.searchResultsWrap}>
          {results.length === 0 ? (
            <Text style={styles.searchEmpty}>No matches yet</Text>
          ) : (
            results.map((item) => (
              <View key={item.id} style={styles.personRow}>
                <View style={styles.personLeft}>
                  <Image source={{ uri: item.avatar }} style={styles.personAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{item.name}</Text>
                    <Text style={styles.personMeta}>{item.meta}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.personActionBtn,
                    item.actionStyle === 'primary' && styles.personActionPrimary,
                    item.actionStyle === 'secondary' && styles.personActionSecondary,
                    item.actionStyle === 'outline' && styles.personActionOutline,
                    item.actionStyle === 'status' && styles.personActionStatus,
                  ]}
                  activeOpacity={0.8}
                  onPress={item.onAction}
                >
                  <Text
                    style={[
                      styles.personActionText,
                      item.actionStyle === 'primary' && styles.personActionTextPrimary,
                      item.actionStyle === 'status' && styles.personActionTextStatus,
                    ]}
                  >
                    {item.actionLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

export function ContactsAccessButton({
  loading,
  synced,
  onPress,
}: {
  loading: boolean;
  synced: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>Find from Contacts</Text>
      <Text style={styles.blockSub}>We only check after you tap. No automatic access requests.</Text>
      <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} disabled={loading} onPress={onPress}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{synced ? 'Refresh Contact Matches' : 'Find from Contacts'}</Text>}
      </TouchableOpacity>
    </View>
  );
}

export type ContactPreviewItem = {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  actionLabel: string;
  actionStyle?: 'primary' | 'secondary' | 'outline' | 'status';
  onAction?: () => void;
  disabled?: boolean;
};

export function ContactsPreviewList({ items }: { items: ContactPreviewItem[] }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>Top Contacts</Text>
      <Text style={styles.blockSub}>Showing a short preview only.</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.personRow}>
          <View style={styles.personLeft}>
            <Image source={{ uri: item.avatar }} style={styles.personAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{item.name}</Text>
              <Text style={styles.personMeta}>{item.subtitle}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.personActionBtn,
              item.actionStyle === 'primary' && styles.personActionPrimary,
              item.actionStyle === 'secondary' && styles.personActionSecondary,
              item.actionStyle === 'outline' && styles.personActionOutline,
              item.actionStyle === 'status' && styles.personActionStatus,
              item.disabled && styles.personActionDisabled,
            ]}
            disabled={item.disabled || !item.onAction}
            activeOpacity={0.8}
            onPress={item.onAction}
          >
            <Text
              style={[
                styles.personActionText,
                item.actionStyle === 'primary' && styles.personActionTextPrimary,
                item.actionStyle === 'status' && styles.personActionTextStatus,
              ]}
            >
              {item.actionLabel}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export function InviteSuggestionsList({ items }: { items: PersonActionItem[] }) {
  return <PersonList title="Smart Suggestions" subtitle="Quick invites for people you likely share trails with." items={items} />;
}

export function InviteInputField({
  value,
  onChangeText,
  onSend,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>Direct Entry</Text>
      <Text style={styles.blockSub}>Send an invite by phone or email.</Text>
      <View style={styles.inlineInputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Enter phone or email"
          placeholderTextColor="#6d746c"
          style={styles.inlineInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.inlineSendBtn} activeOpacity={0.85} onPress={onSend}>
          <Text style={styles.inlineSendBtnText}>Send Invite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ShareInviteButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>Share Link</Text>
      <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.85} onPress={onPress}>
        <Text style={styles.outlineBtnText}>Share invite link</Text>
      </TouchableOpacity>
    </View>
  );
}

export function FeedbackToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#d2d9d2',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  centerCard: {
    alignItems: 'center',
  },
  blockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.onSurface,
  },
  blockSub: {
    marginTop: -4,
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  blockHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  inlineFindBtn: {
    backgroundColor: '#eef4ee',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  inlineFindBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },
  feedRow: {
    height: 126,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  feedImage: {
    ...StyleSheet.absoluteFillObject,
  },
  feedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 26, 16, 0.35)',
  },
  feedContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
  },
  feedWho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  feedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  feedUser: {
    color: '#f7fbf8',
    fontWeight: '700',
    fontSize: 13,
  },
  feedPark: {
    marginTop: 5,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
  },
  feedMeta: {
    marginTop: 2,
    color: '#eef7ef',
    fontSize: 12,
  },
  emptyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e8f1e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 2,
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurface,
    textAlign: 'center',
    fontWeight: '700',
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: C.primary,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#bfd0bf',
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8fbf8',
  },
  outlineBtnText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dbe2db',
  },
  personLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  personAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ebefec',
  },
  personName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
  },
  personMeta: {
    marginTop: 2,
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  personActionBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personActionPrimary: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  personActionSecondary: {
    backgroundColor: '#edf4ee',
    borderColor: '#d3dfd4',
  },
  personActionOutline: {
    backgroundColor: '#ffffff',
    borderColor: '#c4d0c5',
  },
  personActionStatus: {
    backgroundColor: '#f0f3f1',
    borderColor: '#d8dfd8',
  },
  personActionDisabled: {
    opacity: 0.45,
  },
  personActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onSurface,
  },
  personActionTextPrimary: {
    color: '#ffffff',
  },
  personActionTextStatus: {
    color: C.onSurfaceVariant,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#c7d2c8',
    borderRadius: 12,
    backgroundColor: '#f8fbf8',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.onSurface,
    paddingVertical: 2,
  },
  searchResultsWrap: {
    borderWidth: 1,
    borderColor: '#d6ddd6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fafdfb',
  },
  searchEmpty: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    paddingVertical: 8,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c7d2c8',
    borderRadius: 12,
    backgroundColor: '#f8fbf8',
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: C.onSurface,
    fontSize: 14,
  },
  inlineSendBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineSendBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  toast: {
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#e7f1e8',
    borderWidth: 1,
    borderColor: '#c7d8c8',
  },
  toastText: {
    fontSize: 13,
    color: '#1b4332',
    fontWeight: '600',
  },
});
