import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ParkAtlas as C } from '@/constants/theme';
import { PARKS, NationalPark } from '../data/parksData';
import { STATE_PARKS } from '../data/stateParksData';
import { PARK_TRAILS, Trail } from '../data/trailsData';
import { useVisitedParks, LogVisitOptions, ParkVisit } from '../hooks/useVisitedParks';
import { stateNameFromCode } from '@/utils/search';

const DEFAULT_HIKE_IMAGE_URL = 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1400&q=80';

let DEFAULT_HIKE_IMAGE_REQUIRE: any = null;
try {
  DEFAULT_HIKE_IMAGE_REQUIRE = require('../assets/images/default-hike.jpg');
} catch {
  // Local image not found, will use URL fallback
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  editVisit?: ParkVisit;
}

interface ParkSelectInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  selectedPark: NationalPark | null;
  error?: string;
}

interface QuickSelectChipsProps {
  chips: { key: string; label: string; onPress: () => void }[];
}

interface PhotoDropzoneOrPickerProps {
  photoUris: string[];
  onPress: () => void;
}

interface GpsLoggingToggleRowProps {
  enabled: boolean;
  onToggle: () => void;
}

interface PrimarySaveButtonProps {
  disabled: boolean;
  onPress: () => void;
}

function formatDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function JournalEntryFormCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.formCard}>{children}</View>;
}

function ParkSelectInput({ value, onChangeText, onFocus, selectedPark, error }: ParkSelectInputProps) {
  return (
    <View>
      <Text style={styles.fieldLabel}>Select Park *</Text>
      <View style={[styles.inputRow, error && styles.inputRowError]}>
        <Ionicons name="search" size={18} color={C.outline} />
        <TextInput
          style={styles.input}
          placeholder="Search 500+ parks..."
          placeholderTextColor={C.outline}
          value={value}
          onFocus={onFocus}
          onChangeText={onChangeText}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {selectedPark ? <Ionicons name="checkmark-circle" size={18} color={C.primary} /> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function QuickSelectChips({ chips }: QuickSelectChipsProps) {
  if (chips.length === 0) return null;
  return (
    <View style={styles.quickSelectWrap}>
      <Text style={styles.quickSelectLabel}>QUICK SELECT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {chips.map((chip) => (
          <TouchableOpacity key={chip.key} style={styles.quickChip} activeOpacity={0.8} onPress={chip.onPress}>
            <Text style={styles.quickChipText}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function PhotoDropzoneOrPicker({ photoUris, onPress }: PhotoDropzoneOrPickerProps) {
  return (
    <View>
      <Text style={styles.fieldLabel}>Your Adventure Photos</Text>
      <TouchableOpacity style={styles.photoDropzone} activeOpacity={0.8} onPress={onPress}>
        {photoUris.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoPreviewRow}>
            {photoUris.map((uri, idx) => (
              <Image key={`${uri}_${idx}`} source={{ uri }} style={styles.photoPreview} />
            ))}
          </ScrollView>
        ) : (
          <>
            <Ionicons name="images-outline" size={32} color={C.outline} />
            <Text style={styles.dropzoneText}>Tap to upload photos</Text>
            <Text style={styles.dropzoneHint}>JPG or PNG</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function GpsLoggingToggleRow({ enabled, onToggle }: GpsLoggingToggleRowProps) {
  return (
    <TouchableOpacity style={styles.gpsRow} activeOpacity={0.8} onPress={onToggle}>
      <View style={styles.gpsRowLeft}>
        <Ionicons name="location-outline" size={18} color={C.primary} />
        <Text style={styles.gpsLabel}>Automatic GPS Logging</Text>
      </View>
      <View style={[styles.gpsPill, enabled && styles.gpsPillActive]}>
        <Text style={[styles.gpsPillText, enabled && styles.gpsPillTextActive]}>{enabled ? 'ACTIVE' : 'OFF'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function PrimarySaveButton({ disabled, onPress }: PrimarySaveButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.saveBtn, disabled && styles.saveBtnDisabled]}
      activeOpacity={0.9}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.saveBtnText}>Save Adventure</Text>
      <Ionicons name="arrow-forward" size={18} color={C.onPrimary} />
    </TouchableOpacity>
  );
}

export function LogOutingSheet({ visible, onClose, onSaved, editVisit }: Props) {
  const { logVisit, updateVisit, visits } = useVisitedParks();

  const [parkSearch, setParkSearch] = useState('');
  const [selectedPark, setSelectedPark] = useState<NationalPark | null>(null);
  const [showParkResults, setShowParkResults] = useState(false);
  const [parkError, setParkError] = useState('');

  const [trailSearch, setTrailSearch] = useState('');
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [showTrailResults, setShowTrailResults] = useState(false);
  const [distanceMiles, setDistanceMiles] = useState('');
  const [customTrail, setCustomTrail] = useState('');
  const [comments, setComments] = useState('');
  const [gpsEnabled, setGpsEnabled] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);

  const allParkOptions = useMemo(() => {
    const national = PARKS.map((p) => ({ ...p, type: 'national' as const }));
    const state = STATE_PARKS.map((p) => ({ ...p, type: 'state' as const }));
    return [...national, ...state];
  }, []);

  const filteredParks = useMemo<NationalPark[]>(() => {
    const normalizedQuery = normalizeSearchText(parkSearch);
    if (!normalizedQuery) return allParkOptions.slice(0, 20);

    const tokens = normalizedQuery.split(' ').filter(Boolean);

    return allParkOptions
      .filter((p) => {
        const stateName = normalizeSearchText(stateNameFromCode(p.state) ?? '');
        const fields = [p.name, p.state, p.npsCode].map(normalizeSearchText);
        if (stateName) fields.push(stateName);
        if (p.keywords) p.keywords.forEach((kw) => fields.push(normalizeSearchText(kw)));
        return tokens.every((token) => fields.some((field) => field.includes(token)));
      })
      .slice(0, 30);
  }, [allParkOptions, parkSearch]);

  const quickChips = useMemo(() => {
    const chips: { key: string; label: string; onPress: () => void }[] = [];
    const recent = visits
      .flatMap((v) => {
        const park = allParkOptions.find((p) => p.id === v.parkId);
        return park ? [park] : [];
      })
      .filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx)
      .slice(0, 1);

    const recentPark = recent[0];
    if (recentPark) {
      chips.push({
        key: `recent_${recentPark.id}`,
        label: `Recent: ${recentPark.name}`,
        onPress: () => {
          setSelectedPark(recentPark);
          setParkSearch(recentPark.name);
          setShowParkResults(false);
          setParkError('');
          setSelectedTrail(null);
          setTrailSearch('');
        },
      });
    }

    const nearbyPark = allParkOptions[2];
    if (nearbyPark) {
      chips.push({
        key: `nearby_${nearbyPark.id}`,
        label: `Nearby: ${nearbyPark.name}`,
        onPress: () => {
          setSelectedPark(nearbyPark);
          setParkSearch(nearbyPark.name);
          setShowParkResults(false);
          setParkError('');
          setSelectedTrail(null);
          setTrailSearch('');
        },
      });
    }

    return chips;
  }, [allParkOptions, visits]);

  const parkNpsCode = useMemo(() => {
    // For national parks, use npsCode; for state parks, use id
    return selectedPark?.npsCode?.toLowerCase() || selectedPark?.id || null;
  }, [selectedPark]);

  const availableTrails = useMemo(() => {
    if (!parkNpsCode) return [];
    return PARK_TRAILS[parkNpsCode] || [];
  }, [parkNpsCode]);

  const filteredTrails = useMemo<Trail[]>(() => {
    const normalizedQuery = normalizeSearchText(trailSearch);
    if (!normalizedQuery) return availableTrails.slice(0, 15);

    const tokens = normalizedQuery.split(' ').filter(Boolean);
    return availableTrails
      .filter((trail) => {
        const fields = [normalizeSearchText(trail.name)];
        return tokens.every((token) => fields.some((field) => field.includes(token)));
      })
      .slice(0, 15);
  }, [availableTrails, trailSearch]);

  useEffect(() => {
    if (!visible) return;

    if (editVisit) {
      const park = allParkOptions.find((p) => p.id === editVisit.parkId) ?? null;
      setSelectedPark(park);
      setParkSearch(park?.name ?? editVisit.parkName ?? '');
      setCustomTrail(editVisit.trailName ?? '');
      setDistanceMiles(editVisit.distanceMiles ? String(editVisit.distanceMiles) : '');
      setSelectedDate(editVisit.dateVisited ? new Date(editVisit.dateVisited) : null);
      setPhotoUris(editVisit.photoUri ? [editVisit.photoUri] : []);
      setComments('');
      setGpsEnabled(true);
      setParkError('');
      setShowParkResults(false);
      setTrailSearch('');
      setSelectedTrail(null);
      setShowTrailResults(false);
      return;
    }

    setSelectedPark(null);
    setParkSearch('');
    setCustomTrail('');
    setTrailSearch('');
    setSelectedTrail(null);
    setDistanceMiles('');
    setSelectedDate(null);
    setPhotoUris([]);
    setComments('');
    setGpsEnabled(true);
    setParkError('');
    setShowParkResults(false);
    setShowTrailResults(false);
  }, [visible, editVisit, allParkOptions]);

  if (!visible) return null;

  async function pickPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.7,
    });

    if (result.canceled) return;
    const nextUris = result.assets
      .map((asset) => asset.uri)
      .filter((uri): uri is string => !!uri);

    if (nextUris.length > 0) setPhotoUris(nextUris);
  }

  async function capturePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access in Settings.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUris(uri ? [uri] : []);
    }
  }

  function handlePhotoPress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', ...(photoUris.length > 0 ? ['Clear Photos'] : [])],
          cancelButtonIndex: 0,
          destructiveButtonIndex: photoUris.length > 0 ? 3 : undefined,
        },
        (idx) => {
          if (idx === 1) capturePhoto();
          else if (idx === 2) pickPhotos();
          else if (idx === 3) setPhotoUris([]);
        },
      );
      return;
    }

    Alert.alert('Adventure Photos', undefined, [
      { text: 'Take Photo', onPress: capturePhoto },
      { text: 'Choose from Library', onPress: pickPhotos },
      ...(photoUris.length > 0
        ? [{ text: 'Clear Photos', style: 'destructive' as const, onPress: () => setPhotoUris([]) }]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleDateChange(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed' || !picked) return;
    setSelectedDate(picked);
  }

  async function handleSave() {
    if (!selectedPark) {
      setParkError('Please select a park before saving.');
      setShowParkResults(true);
      return;
    }

    const finalTrailName = selectedTrail?.name || customTrail.trim();
    const finalDistance = distanceMiles ? parseFloat(distanceMiles) : undefined;
    
    // Use local image if available, otherwise use online URL
    let defaultPhotoUri = DEFAULT_HIKE_IMAGE_URL;
    if (DEFAULT_HIKE_IMAGE_REQUIRE) {
      defaultPhotoUri = Image.resolveAssetSource(DEFAULT_HIKE_IMAGE_REQUIRE).uri;
    }

    const opts: LogVisitOptions = {
      photoUri: photoUris[0] ?? defaultPhotoUri,
      dateVisited: selectedDate ? selectedDate.toISOString() : undefined,
      dateUnknown: !selectedDate,
      distanceMiles: finalDistance,
      elevationGainFt: editVisit?.elevationGainFt,
      activityType: editVisit?.activityType,
      rating: editVisit?.rating,
    };

    if (editVisit) {
      await updateVisit(editVisit.visitId, selectedPark.id, selectedPark.name, finalTrailName, opts);
    } else {
      await logVisit(selectedPark.id, selectedPark.name, finalTrailName, opts);
    }

    onSaved?.();
    onClose();
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <JournalEntryFormCard>
            <View style={styles.formIntro}>
              <View style={styles.journalHeaderRow}>
                <Image
                  source={require('../assets/images/parkatlas-logo.png')}
                  style={styles.journalHeaderLogo}
                  resizeMode="contain"
                />
                <Text style={styles.heading}>Log Your Visit</Text>
                <TouchableOpacity style={styles.topCloseBtn} activeOpacity={0.8} onPress={onClose}>
                  <Ionicons name="close" size={22} color={C.onSurface} />
                </TouchableOpacity>
              </View>
              <Text style={styles.description}>Save your adventure</Text>
            </View>

            <ParkSelectInput
              value={parkSearch}
              selectedPark={selectedPark}
              error={parkError}
              onFocus={() => setShowParkResults(true)}
              onChangeText={(text) => {
                setParkSearch(text);
                setShowParkResults(true);
                setParkError('');
                if (!text.trim()) setSelectedPark(null);
              }}
            />

            {showParkResults ? (
              <View style={styles.resultsPanel}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 220 }}
                  nestedScrollEnabled
                >
                  {filteredParks.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.resultRow}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedPark(item);
                        setParkSearch(item.name);
                        setShowParkResults(false);
                        setParkError('');
                      }}
                    >
                      <View style={styles.resultTopRow}>
                        <Text style={styles.resultName}>{item.name}</Text>
                        <Text style={[styles.resultTypeBadge, item.type === 'state' && styles.resultTypeBadgeState]}>
                          {item.type === 'state' ? 'STATE' : 'NATIONAL'}
                        </Text>
                      </View>
                      <Text style={styles.resultMeta}>{item.state}{item.npsCode ? ` · ${item.npsCode.toUpperCase()}` : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <QuickSelectChips chips={quickChips} />

            {selectedPark && availableTrails.length > 0 ? (
              <>
                <View>
                  <Text style={styles.fieldLabel}>Select Trail</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="search" size={18} color={C.outline} />
                    <TextInput
                      style={styles.input}
                      placeholder={`Search ${availableTrails.length} trails...`}
                      placeholderTextColor={C.outline}
                      value={trailSearch}
                      onFocus={() => setShowTrailResults(true)}
                      onChangeText={(text) => {
                        setTrailSearch(text);
                        setShowTrailResults(true);
                      }}
                      autoCorrect={false}
                      autoCapitalize="words"
                    />
                    {selectedTrail ? <Ionicons name="checkmark-circle" size={18} color={C.primary} /> : null}
                  </View>
                </View>

                {showTrailResults && filteredTrails.length > 0 ? (
                  <View style={styles.resultsPanel}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      style={{ maxHeight: 200 }}
                      nestedScrollEnabled
                    >
                      {filteredTrails.map((trail) => (
                        <TouchableOpacity
                          key={trail.name}
                          style={styles.resultRow}
                          activeOpacity={0.8}
                          onPress={() => {
                            setSelectedTrail(trail);
                            setTrailSearch(trail.name);
                            setDistanceMiles(String(trail.miles));
                            setShowTrailResults(false);
                            setCustomTrail('');
                          }}
                        >
                          <View style={styles.resultTopRow}>
                            <Text style={styles.resultName}>{trail.name}</Text>
                            <Text style={styles.resultMiles}>{trail.miles} mi</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            ) : null}

            <View>
              <Text style={styles.fieldLabel}>{selectedPark && availableTrails.length > 0 ? 'Custom Trail Name' : 'Trail Name'} (Optional)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Hidden Valley Trail"
                  placeholderTextColor={C.outline}
                  value={customTrail}
                  onChangeText={(text) => {
                    setCustomTrail(text);
                    setSelectedTrail(null);
                    setDistanceMiles('');
                  }}
                />
              </View>
            </View>

            <View>
              <Text style={styles.fieldLabel}>Distance (Miles) (Optional)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 5.2"
                  placeholderTextColor={C.outline}
                  value={distanceMiles}
                  onChangeText={setDistanceMiles}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View>
              <Text style={styles.fieldLabel}>Date of Visit (Optional)</Text>
              <TouchableOpacity style={styles.inputRow} activeOpacity={0.8} onPress={() => setShowDatePicker((prev) => !prev)}>
                <Text style={[styles.input, !selectedDate && styles.placeholderText]}>
                  {selectedDate ? formatDate(selectedDate) : 'mm/dd/yyyy'}
                </Text>
                <Ionicons name={showDatePicker ? 'chevron-up' : 'calendar-outline'} size={18} color={C.onSurfaceVariant} />
              </TouchableOpacity>
              {showDatePicker ? (
                <View>
                  <DateTimePicker
                    value={selectedDate ?? new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={handleDateChange}
                  />
                  {Platform.OS === 'ios' ? (
                    <View style={styles.datePickerActionsRow}>
                      <TouchableOpacity
                        style={styles.datePickerActionBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedDate(null);
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={styles.datePickerActionText}>Clear</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.datePickerActionBtn, styles.datePickerDoneBtn]}
                        activeOpacity={0.8}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={[styles.datePickerActionText, styles.datePickerDoneText]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <PhotoDropzoneOrPicker photoUris={photoUris} onPress={handlePhotoPress} />

            <View>
              <Text style={styles.fieldLabel}>Comments (Optional)</Text>
              <View style={[styles.inputRow, styles.commentsWrap]}>
                <TextInput
                  style={[styles.input, styles.commentsInput]}
                  placeholder="Note terrain conditions, wildlife sightings, or equipment performance..."
                  placeholderTextColor={C.outline}
                  value={comments}
                  onChangeText={setComments}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            <GpsLoggingToggleRow enabled={gpsEnabled} onToggle={() => setGpsEnabled((v) => !v)} />

            <PrimarySaveButton disabled={!selectedPark} onPress={handleSave} />

            <TouchableOpacity style={styles.closeLink} activeOpacity={0.7} onPress={onClose}>
              <Text style={styles.closeLinkText}>Cancel</Text>
            </TouchableOpacity>
          </JournalEntryFormCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.background,
    zIndex: 80,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 16,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8dfdb',
    padding: 16,
    gap: 14,
  },
  formIntro: {
    gap: 4,
  },
  journalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  topCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d9d4',
    backgroundColor: '#ffffff',
  },
  journalHeaderLogo: {
    width: 96,
    height: 96,
  },
  heading: {
    flex: 1,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.8,
    fontWeight: '700',
    color: C.onSurface,
  },
  description: {
    fontSize: 16,
    color: C.onSurfaceVariant,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: C.onSurface,
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#c8d0cb',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
    backgroundColor: '#ffffff',
  },
  inputRowError: {
    borderColor: '#be2a2a',
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: C.onSurface,
    paddingVertical: 10,
  },
  placeholderText: {
    color: C.outline,
  },
  datePickerActionsRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  datePickerActionBtn: {
    minWidth: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c8d0cb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  datePickerDoneBtn: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  datePickerActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.onSurface,
  },
  datePickerDoneText: {
    color: C.onPrimary,
  },
  errorText: {
    marginTop: 6,
    color: '#be2a2a',
    fontSize: 13,
    fontWeight: '600',
  },
  resultsPanel: {
    borderWidth: 1,
    borderColor: '#c8d0cb',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    marginTop: -4,
  },
  resultTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultTypeBadge: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.onPrimary,
    backgroundColor: C.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  resultTypeBadgeState: {
    backgroundColor: '#2f6a4f',
  },
  resultRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dce2de',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  resultMeta: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 1,
  },
  resultMiles: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  quickSelectWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickSelectLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.onSurfaceVariant,
    fontWeight: '700',
  },
  chipsRow: {
    gap: 8,
    paddingRight: 12,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: '#cfd6d2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f4f7f5',
  },
  quickChipText: {
    fontSize: 13,
    color: C.onSurface,
    fontWeight: '600',
  },
  photoDropzone: {
    minHeight: 132,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#bfc9c3',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
  },
  dropzoneText: {
    fontSize: 16,
    color: C.onSurface,
    fontWeight: '600',
  },
  dropzoneHint: {
    fontSize: 11,
    color: C.outline,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  photoPreviewRow: {
    gap: 10,
    alignItems: 'center',
  },
  photoPreview: {
    width: 88,
    height: 88,
    borderRadius: 10,
  },
  commentsWrap: {
    alignItems: 'flex-start',
    minHeight: 100,
  },
  commentsInput: {
    minHeight: 92,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d9d4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f3f7f4',
  },
  gpsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsLabel: {
    fontSize: 15,
    color: C.primary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  gpsPill: {
    borderWidth: 1,
    borderColor: '#b8c4bc',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#eef3ef',
  },
  gpsPillActive: {
    backgroundColor: '#e4efe6',
    borderColor: '#95b59d',
  },
  gpsPillText: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#5f7168',
    fontWeight: '700',
  },
  gpsPillTextActive: {
    color: C.primary,
  },
  saveBtn: {
    marginTop: 8,
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontSize: 18,
    color: C.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeLink: {
    alignItems: 'center',
    paddingTop: 4,
  },
  closeLinkText: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});