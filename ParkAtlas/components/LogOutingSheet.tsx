import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { PARKS, NationalPark } from '../data/parksData';
import { PARK_TRAILS } from '../data/trailsData';
import { useVisitedParks, LogVisitOptions } from '../hooks/useVisitedParks';
import { ParkVisit } from '../hooks/useVisitedParks';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.92;

const ACTIVITY_TYPES = ['Hike', 'Backpack', 'Camp', 'Scenic Drive', 'Wildlife'] as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** When provided the sheet opens in edit mode pre-filled with this visit */
  editVisit?: ParkVisit;
}

type Step = 'park' | 'details';

export function LogOutingSheet({ visible, onClose, onSaved, editVisit }: Props) {
  const { logVisit, updateVisit } = useVisitedParks();

  // Steps
  const [step, setStep] = useState<Step>('park');

  // Park picker state
  const [parkSearch, setParkSearch] = useState('');
  const [selectedPark, setSelectedPark] = useState<NationalPark | null>(null);

  // Details state
  const [selectedTrails, setSelectedTrails] = useState<string[]>([]);
  const [customTrail, setCustomTrail] = useState('');
  const [showCustomTrailInput, setShowCustomTrailInput] = useState(false);
  const [distanceText, setDistanceText] = useState('');
  const [dateText, setDateText] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${d.getFullYear()}`;
  });
  const [elevGainText, setElevGainText] = useState('');
  const [selectedActivityType, setSelectedActivityType] = useState('');
  const [rating, setRating] = useState(0);

  // When opened in edit mode, pre-fill all fields from the existing visit
  useEffect(() => {
    if (visible && editVisit) {
      const park = PARKS.find((p) => p.id === editVisit.parkId) ?? null;
      setSelectedPark(park);
      // Split stored trail string back into array; filter out any that aren't
      // in the known trails list so they land in customTrail instead
      const known = park ? (PARK_TRAILS[park.npsCode] ?? []) : [];
      const allTrails = editVisit.trailName ? editVisit.trailName.split(', ') : [];
      const knownSelected = allTrails.filter((t) => known.includes(t));
      const customPart = allTrails.filter((t) => !known.includes(t)).join(', ');
      setSelectedTrails(knownSelected);
      setCustomTrail(customPart);
      setShowCustomTrailInput(customPart.length > 0);
      setDistanceText(editVisit.distanceMiles != null ? String(editVisit.distanceMiles) : '');
      setElevGainText(editVisit.elevationGainFt != null ? String(editVisit.elevationGainFt) : '');
      setSelectedActivityType(editVisit.activityType ?? '');
      setRating(editVisit.rating ?? 0);
      // Format date to MM/DD/YYYY
      const d = new Date(editVisit.dateVisited);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDateText(`${mm}/${dd}/${d.getFullYear()}`);
      setStep('details');
    }
  }, [visible, editVisit]);

  // Filtered park list
  const filteredParks = useMemo<NationalPark[]>(() => {
    const q = parkSearch.trim().toLowerCase();
    if (!q) return PARKS;
    return PARKS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.state.toLowerCase().includes(q),
    );
  }, [parkSearch]);

  // Trails for selected park
  const availableTrails = useMemo<string[]>(() => {
    if (!selectedPark) return [];
    return PARK_TRAILS[selectedPark.npsCode] ?? [];
  }, [selectedPark]);

  function handleSelectPark(park: NationalPark) {
    setSelectedPark(park);
    setSelectedTrails([]);
    setCustomTrail('');
    setShowCustomTrailInput(false);
    setStep('details');
  }

  function handleToggleTrail(trail: string) {
    setSelectedTrails((prev) =>
      prev.includes(trail) ? prev.filter((t) => t !== trail) : [...prev, trail],
    );
  }

  function handleCustomTrailToggle() {
    setShowCustomTrailInput((prev) => !prev);
  }

  async function handleSave() {
    if (!selectedPark) return;
    const allTrails = [
      ...selectedTrails,
      ...(customTrail.trim() && (showCustomTrailInput || availableTrails.length === 0)
        ? [customTrail.trim()]
        : []),
    ];
    const trailName = allTrails.join(', ');
    const distanceMiles = parseFloat(distanceText);
    const elevationGainFt = parseFloat(elevGainText);
    const parsedDate = parseDateInput(dateText);
    const opts: LogVisitOptions = {
      distanceMiles: isNaN(distanceMiles) ? undefined : distanceMiles,
      dateVisited: parsedDate,
      elevationGainFt: isNaN(elevationGainFt) ? undefined : elevationGainFt,
      activityType: selectedActivityType || undefined,
      rating: rating > 0 ? rating : undefined,
    };
    if (editVisit) {
      await updateVisit(editVisit.visitId, selectedPark.id, selectedPark.name, trailName, opts);
    } else {
      await logVisit(selectedPark.id, selectedPark.name, trailName, opts);
    }
    onSaved?.();
    handleClose();
  }

  function handleClose() {
    setStep('park');
    setParkSearch('');
    setSelectedPark(null);
    setSelectedTrails([]);
    setCustomTrail('');
    setShowCustomTrailInput(false);
    setDistanceText('');
    setElevGainText('');
    setSelectedActivityType('');
    setRating(0);
    setDateText(() => {
      const d = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${mm}/${dd}/${d.getFullYear()}`;
    });
    onClose();
  }

  function handleBack() {
    setStep('park');
    setSelectedTrails([]);
    setCustomTrail('');
    setShowCustomTrailInput(false);
    setDistanceText('');
    setElevGainText('');
    setSelectedActivityType('');
    setRating(0);
  }

  function handleDateChange(raw: string) {
    // Strip non-numeric chars then re-insert slashes at positions 2 and 5
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setDateText(formatted);
  }

  const allSelectedTrails = [
    ...selectedTrails,
    ...(customTrail.trim() && (showCustomTrailInput || availableTrails.length === 0)
      ? [customTrail.trim()]
      : []),
  ];
  const finalTrailLabel = allSelectedTrails.join(', ');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/* Outer: full screen, backdrop colour, anchors sheet to bottom */}
      <View style={styles.overlay}>
        {/* Tap outside the sheet to dismiss */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />

        {/* KAV wraps only the sheet so keyboard lift works correctly */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* onStartShouldSetResponder stops taps inside sheet bubbling to backdrop */}
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />

            {step === 'park' ? (
              <>
                {/* Header */}
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetIconWrap}>
                    <MaterialCommunityIcons name="map-marker-plus" size={20} color={C.onPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>{editVisit ? 'Edit Outing' : 'Log New Outing'}</Text>
                    <Text style={styles.sheetSubtitle}>Choose a national park</Text>
                  </View>
                  <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color={C.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchRow}>
                  <Ionicons name="search" size={16} color={C.outlineVariant} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search parks by name or state..."
                    placeholderTextColor={C.outlineVariant}
                    value={parkSearch}
                    onChangeText={setParkSearch}
                    autoCapitalize="none"
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                  {parkSearch.length > 0 && Platform.OS !== 'ios' && (
                    <TouchableOpacity onPress={() => setParkSearch('')} activeOpacity={0.7}>
                      <Ionicons name="close-circle" size={16} color={C.outlineVariant} />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.countLabel}>
                  {filteredParks.length} park{filteredParks.length !== 1 ? 's' : ''}
                </Text>

                {/* Park list — flex:1 fills remaining sheet height */}
                <FlatList
                  data={filteredParks}
                  keyExtractor={(p) => p.id}
                  style={styles.parkList}
                  contentContainerStyle={styles.parkListContent}
                  keyboardShouldPersistTaps="always"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.parkRow}
                      activeOpacity={0.7}
                      onPress={() => handleSelectPark(item)}
                    >
                      <View style={styles.parkRowIcon}>
                        <MaterialCommunityIcons name="pine-tree" size={17} color={C.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.parkRowName}>{item.name}</Text>
                        <Text style={styles.parkRowState}>{item.state} · National Park</Text>
                      </View>
                      <View style={styles.npsBadge}>
                        <Text style={styles.npsBadgeText}>{item.npsCode.toUpperCase()}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.outlineVariant} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons name="pine-tree" size={36} color={C.outlineVariant} />
                      <Text style={styles.emptyText}>No parks match "{parkSearch}"</Text>
                    </View>
                  }
                />
              </>
            ) : (
              /* ───── Step 2: Details ───── */
              <>
                {/* Header */}
                <View style={styles.sheetHeader}>
                  <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={18} color={C.onSurfaceVariant} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle} numberOfLines={1}>{selectedPark!.name}</Text>
                    <Text style={styles.sheetSubtitle}>{selectedPark!.state} · National Park</Text>
                  </View>
                  <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color={C.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                {/* Scrollable fields */}
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.detailsContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Trail picker */}
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Trails hiked (optional · select multiple)</Text>

                    {availableTrails.length > 0 ? (
                      <>
                        {availableTrails.map((trail) => {
                          const active = selectedTrails.includes(trail);
                          return (
                            <TouchableOpacity
                              key={trail}
                              style={[styles.trailRow, active && styles.trailRowActive]}
                              onPress={() => handleToggleTrail(trail)}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons
                                name="hiking"
                                size={16}
                                color={active ? C.onPrimary : C.secondary}
                              />
                              <Text
                                style={[styles.trailRowText, active && styles.trailRowTextActive]}
                                numberOfLines={2}
                              >
                                {trail}
                              </Text>
                              <Ionicons
                                name={active ? 'checkbox' : 'square-outline'}
                                size={18}
                                color={active ? C.onPrimary : C.outlineVariant}
                              />
                            </TouchableOpacity>
                          );
                        })}

                        {/* "Other" toggle */}
                        <TouchableOpacity
                          style={[styles.trailRow, styles.trailRowOther, showCustomTrailInput && styles.trailRowChecked]}
                          onPress={handleCustomTrailToggle}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={16}
                            color={showCustomTrailInput ? C.secondary : C.onSurfaceVariant}
                          />
                          <Text style={[styles.trailRowText, { color: showCustomTrailInput ? C.onSurface : C.onSurfaceVariant }]}>
                            Other / enter trail name...
                          </Text>
                          <Ionicons
                            name={showCustomTrailInput ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={showCustomTrailInput ? C.secondary : C.outlineVariant}
                          />
                        </TouchableOpacity>

                        {showCustomTrailInput && (
                          <View style={styles.inputRow}>
                            <TextInput
                              style={styles.input}
                              placeholder="Type trail name..."
                              placeholderTextColor={C.outlineVariant}
                              value={customTrail}
                              onChangeText={setCustomTrail}
                              autoFocus
                              returnKeyType="done"
                              maxLength={80}
                            />
                            {customTrail.length > 0 && (
                              <TouchableOpacity onPress={() => setCustomTrail('')} activeOpacity={0.7}>
                                <Ionicons name="close-circle" size={16} color={C.outlineVariant} />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </>
                    ) : (
                      /* No trail data — free-text only */
                      <View style={styles.inputRow}>
                        <MaterialCommunityIcons name="hiking" size={16} color={C.outlineVariant} />
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. Canyon loop, Ridge trail..."
                          placeholderTextColor={C.outlineVariant}
                          value={customTrail}
                          onChangeText={setCustomTrail}
                          returnKeyType="done"
                          maxLength={120}
                        />
                        {customTrail.length > 0 && (
                          <TouchableOpacity onPress={() => setCustomTrail('')} activeOpacity={0.7}>
                            <Ionicons name="close-circle" size={16} color={C.outlineVariant} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Activity type */}
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Activity type (optional)</Text>
                    <View style={styles.activityChipsRow}>
                      {ACTIVITY_TYPES.map((type) => {
                        const active = selectedActivityType === type;
                        return (
                          <TouchableOpacity
                            key={type}
                            style={[styles.activityChip, active && styles.activityChipActive]}
                            onPress={() => setSelectedActivityType(active ? '' : type)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.activityChipText, active && styles.activityChipTextActive]}>
                              {type}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Distance */}
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Distance (optional)</Text>
                    <View style={styles.inputRow}>
                      <MaterialCommunityIcons name="map-marker-distance" size={16} color={C.outlineVariant} />
                      <TextInput
                        style={styles.input}
                        placeholder="Miles hiked"
                        placeholderTextColor={C.outlineVariant}
                        value={distanceText}
                        onChangeText={(v) => setDistanceText(v.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        maxLength={6}
                      />
                      {distanceText.length > 0 && (
                        <Text style={styles.unitLabel}>mi</Text>
                      )}
                    </View>
                  </View>

                  {/* Elevation gain */}
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Elevation gain (optional)</Text>
                    <View style={styles.inputRow}>
                      <MaterialCommunityIcons name="arrow-up-bold" size={16} color={C.outlineVariant} />
                      <TextInput
                        style={styles.input}
                        placeholder="Feet climbed"
                        placeholderTextColor={C.outlineVariant}
                        value={elevGainText}
                        onChangeText={(v) => setElevGainText(v.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        maxLength={6}
                      />
                      {elevGainText.length > 0 && (
                        <Text style={styles.unitLabel}>ft</Text>
                      )}
                    </View>
                  </View>

                  {/* Rating */}
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Rating (optional)</Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <TouchableOpacity
                          key={n}
                          onPress={() => setRating((r) => (r === n ? 0 : n))}
                          activeOpacity={0.7}
                          style={styles.starBtn}
                        >
                          <Ionicons
                            name={n <= rating ? 'star' : 'star-outline'}
                            size={30}
                            color={n <= rating ? C.tertiary : C.outlineVariant}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Date */}
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Date visited</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="calendar-outline" size={16} color={C.outlineVariant} />
                      <TextInput
                        style={styles.input}
                        placeholder="MM/DD/YYYY"
                        placeholderTextColor={C.outlineVariant}
                        value={dateText}
                        onChangeText={handleDateChange}
                        keyboardType="numbers-and-punctuation"
                        returnKeyType="done"
                        maxLength={10}
                      />
                    </View>
                  </View>

                  {/* Live preview */}
                  {(finalTrailLabel || distanceText || elevGainText || rating > 0 || selectedActivityType) ? (
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryTitle}>Outing Preview</Text>
                      <Text style={styles.summaryPark}>{selectedPark!.name} National Park</Text>
                      {selectedActivityType ? (
                        <View style={styles.summaryRow}>
                          <MaterialCommunityIcons name="tag-outline" size={14} color={C.secondary} />
                          <Text style={styles.summaryDetail}>{selectedActivityType}</Text>
                        </View>
                      ) : null}
                      {finalTrailLabel ? (
                        <View style={styles.summaryRow}>
                          <MaterialCommunityIcons name="hiking" size={14} color={C.secondary} />
                          <Text style={styles.summaryDetail}>{finalTrailLabel}</Text>
                        </View>
                      ) : null}
                      {distanceText ? (
                        <View style={styles.summaryRow}>
                          <MaterialCommunityIcons name="routes" size={14} color={C.secondary} />
                          <Text style={styles.summaryDetail}>{parseFloat(distanceText).toFixed(1)} miles</Text>
                        </View>
                      ) : null}
                      {elevGainText ? (
                        <View style={styles.summaryRow}>
                          <MaterialCommunityIcons name="arrow-up-bold" size={14} color={C.secondary} />
                          <Text style={styles.summaryDetail}>{parseInt(elevGainText, 10).toLocaleString()} ft gain</Text>
                        </View>
                      ) : null}
                      {rating > 0 ? (
                        <View style={styles.summaryRow}>
                          <Ionicons name="star" size={14} color={C.tertiary} />
                          <Text style={styles.summaryDetail}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={{ height: 12 }} />
                </ScrollView>

                {/* Sticky save button pinned at bottom */}
                <View style={styles.stickyActions}>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                    <Ionicons name="checkmark-circle" size={20} color={C.onPrimary} />
                    <Text style={styles.saveBtnText}>Log Outing</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** Parse "MM/DD/YYYY" → ISO string. Returns today's ISO if invalid. */
function parseDateInput(text: string): string {
  const parts = text.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (
      year >= 1900 && year <= 2100 &&
      month >= 1 && month <= 12 &&
      day >= 1 && day <= 31
    ) {
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date().toISOString();
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: C.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
    paddingBottom: 0,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  sheetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Park step */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: C.onSurface,
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  parkList: {
    flex: 1,
  },
  parkListContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  parkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  parkRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${C.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  parkRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  parkRowState: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  npsBadge: {
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  npsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.outlineVariant,
    marginLeft: 52,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: C.onSurfaceVariant,
  },
  /* Details step */
  detailsContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 20,
  },
  fieldSection: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  activityChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerLow,
  },
  activityChipActive: {
    borderColor: C.secondary,
    backgroundColor: C.secondary,
  },
  activityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
  activityChipTextActive: {
    color: C.onPrimary,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
    paddingTop: 2,
  },
  starBtn: {
    padding: 4,
  },
  trailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
    marginBottom: 8,
  },
  trailRowActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  trailRowOther: {
    borderStyle: 'dashed',
  },
  trailRowChecked: {
    borderColor: C.secondary,
    backgroundColor: `${C.secondary}14`,
  },
  trailRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: C.onSurface,
  },
  trailRowTextActive: {
    color: C.onPrimary,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.onSurface,
  },
  unitLabel: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: `${C.primary}0e`,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: `${C.primary}30`,
    padding: 14,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryPark: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDetail: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    flex: 1,
  },
  stickyActions: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.outlineVariant,
    backgroundColor: C.background,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onPrimary,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    fontWeight: '600',
  },
});
