import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import type { VisitDatePrecision } from '@/hooks/useVisitedParks';

export type VisitDateValue =
  | { kind: 'unknown' }
  | { kind: 'date'; date: Date; precision: VisitDatePrecision };

type Mode = 'unknown' | 'exact' | 'approx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEAR_SPAN = 40;

/** Human label for a visit date honoring its precision ("2019", "Jun 2019", "Jun 14, 2019"). */
export function formatVisitDate(iso?: string, precision?: VisitDatePrecision): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (precision === 'year') return String(d.getFullYear());
  if (precision === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Builds an ISO date from partial knowledge; month/year-only dates land on the 1st. */
export function dateFromParts(year: number, month?: number, day?: number): Date {
  return new Date(year, month ?? 0, day ?? 1, 12, 0, 0, 0);
}

export function toVisitDateValue(iso?: string, precision?: VisitDatePrecision, unknown?: boolean): VisitDateValue {
  if (unknown || !iso) return { kind: 'unknown' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { kind: 'unknown' };
  return { kind: 'date', date: d, precision: precision ?? 'day' };
}

type Props = {
  value: VisitDateValue;
  onChange: (value: VisitDateValue) => void;
  label?: string;
};

/**
 * Compact "when did you go?" control. Users can pick an exact date, or just a
 * year (optionally a month) when they don't remember — or leave it unknown.
 */
export function VisitDatePicker({ value, onChange, label = 'When did you go? (optional)' }: Props) {
  const initialMode: Mode = value.kind === 'unknown' ? 'unknown' : value.precision === 'day' ? 'exact' : 'approx';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [showExactPicker, setShowExactPicker] = useState(false);

  const now = useMemo(() => new Date(), []);
  const years = useMemo(() => Array.from({ length: YEAR_SPAN }, (_, i) => now.getFullYear() - i), [now]);

  const selectedYear = value.kind === 'date' ? value.date.getFullYear() : undefined;
  const selectedMonth = value.kind === 'date' && value.precision !== 'year' ? value.date.getMonth() : undefined;

  function switchMode(next: Mode) {
    haptic.select();
    setMode(next);
    setShowExactPicker(next === 'exact');
    if (next === 'unknown') {
      onChange({ kind: 'unknown' });
    } else if (next === 'exact') {
      onChange({ kind: 'date', date: value.kind === 'date' ? value.date : now, precision: 'day' });
    } else if (value.kind === 'date') {
      onChange({ kind: 'date', date: dateFromParts(value.date.getFullYear()), precision: 'year' });
    }
  }

  function pickYear(year: number) {
    haptic.select();
    onChange({ kind: 'date', date: dateFromParts(year), precision: 'year' });
  }

  function pickMonth(month: number | undefined) {
    if (selectedYear === undefined) return;
    haptic.select();
    if (month === undefined) {
      onChange({ kind: 'date', date: dateFromParts(selectedYear), precision: 'year' });
    } else {
      onChange({ kind: 'date', date: dateFromParts(selectedYear, month), precision: 'month' });
    }
  }

  function onExactChange(_: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === 'android') setShowExactPicker(false);
    if (!picked) return;
    onChange({ kind: 'date', date: picked, precision: 'day' });
  }

  const summary = value.kind === 'date'
    ? formatVisitDate(value.date.toISOString(), value.precision)
    : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.segments}>
        {([
          { key: 'unknown', text: "Don't recall" },
          { key: 'approx', text: 'Just the year' },
          { key: 'exact', text: 'Exact date' },
        ] as { key: Mode; text: string }[]).map((seg) => {
          const active = mode === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => switchMode(seg.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{seg.text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === 'approx' ? (
        <View style={styles.approxWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} keyboardShouldPersistTaps="handled">
            {years.map((year) => {
              const active = selectedYear === year;
              return (
                <TouchableOpacity key={year} style={[styles.chip, active && styles.chipActive]} onPress={() => pickYear(year)} activeOpacity={0.8}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{year}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedYear !== undefined ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[styles.chip, styles.chipSmall, selectedMonth === undefined && styles.chipActive]}
                onPress={() => pickMonth(undefined)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, selectedMonth === undefined && styles.chipTextActive]}>Any month</Text>
              </TouchableOpacity>
              {MONTHS.map((m, i) => {
                const disabled = selectedYear === now.getFullYear() && i > now.getMonth();
                const active = selectedMonth === i;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, styles.chipSmall, active && styles.chipActive, disabled && styles.chipDisabled]}
                    onPress={() => pickMonth(i)}
                    disabled={disabled}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.hint}>Pick the year — add a month if you remember it.</Text>
          )}
        </View>
      ) : null}

      {mode === 'exact' ? (
        <View>
          <TouchableOpacity style={styles.exactRow} onPress={() => setShowExactPicker((v) => !v)} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={18} color={C.primary} />
            <Text style={styles.exactText}>{summary ?? 'Choose a date'}</Text>
            <Ionicons name={showExactPicker ? 'chevron-up' : 'chevron-down'} size={16} color={C.onSurfaceVariant} />
          </TouchableOpacity>
          {showExactPicker ? (
            <View>
              <DateTimePicker
                value={value.kind === 'date' ? value.date : now}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={now}
                onChange={onExactChange}
                accentColor={C.primary}
              />
              {Platform.OS === 'ios' ? (
                <TouchableOpacity style={styles.doneBtn} onPress={() => setShowExactPicker(false)} activeOpacity={0.8}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {mode !== 'unknown' && summary ? (
        <View style={styles.summaryRow}>
          <Ionicons name="checkmark-circle" size={14} color={C.primary} />
          <Text style={styles.summaryText}>Visited {summary}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  segments: {
    flexDirection: 'row',
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: Radii.pill,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radii.pill,
  },
  segmentActive: {
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onSurfaceVariant,
  },
  segmentTextActive: {
    color: C.primary,
  },
  approxWrap: {
    gap: 8,
  },
  chipRow: {
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surface,
  },
  chipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipDisabled: {
    opacity: 0.35,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.onSurface,
    fontVariant: ['tabular-nums'],
  },
  chipTextActive: {
    color: C.onPrimary,
  },
  hint: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  exactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
    borderRadius: Radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  exactText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurface,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  doneText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
  },
});
