import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildDateDisplayValue,
  createDatePickerParts,
  DATE_PICKER_MAX_YEAR,
  DATE_PICKER_MIN_YEAR,
  DATE_PICKER_MONTH_OPTIONS,
  getDatePickerDayOptions,
  getDatePickerYearOptions,
  normalizeDatePickerParts,
} from '../../utils/artistRegistrationDate';

const PICKER_ROW_HEIGHT = 44;
const PICKER_VISIBLE_ROWS = 5;
const PICKER_COLUMN_HEIGHT = PICKER_ROW_HEIGHT * PICKER_VISIBLE_ROWS;
const PICKER_VERTICAL_PADDING = (PICKER_COLUMN_HEIGHT - PICKER_ROW_HEIGHT) / 2;
const MONTH_OPTIONS = DATE_PICKER_MONTH_OPTIONS;
const YEAR_OPTIONS = getDatePickerYearOptions();

const scrollToSelectedValue = (ref, options, selectedValue, animated = false) => {
  if (!ref?.current) {
    return;
  }

  const selectedIndex = options.indexOf(selectedValue);

  if (selectedIndex < 0) {
    return;
  }

  ref.current.scrollTo({
    y: selectedIndex * PICKER_ROW_HEIGHT,
    animated,
  });
};

const getNearestOption = (offsetY, options) => {
  const rawIndex = Math.round(offsetY / PICKER_ROW_HEIGHT);
  const safeIndex = Math.min(Math.max(rawIndex, 0), options.length - 1);
  return options[safeIndex];
};

const PickerColumn = ({
  label,
  options,
  selectedValue,
  onSelect,
  scrollRef,
  formatLabel,
  onScrollEnd,
}) => (
  <View style={styles.columnWrap}>
    <Text style={styles.columnLabel}>{label}</Text>
    <View style={styles.columnCard}>
      <View pointerEvents="none" style={styles.selectionHighlight} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.columnContent}
        snapToInterval={PICKER_ROW_HEIGHT}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        scrollEventThrottle={16}
      >
        {options.map((option) => {
          const isSelected = option === selectedValue;

          return (
            <TouchableOpacity
              key={`${label}-${option}`}
              style={styles.optionButton}
              onPress={() => onSelect(option)}
              activeOpacity={0.85}
            >
              <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                {formatLabel ? formatLabel(option) : option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  </View>
);

export default function ArtistBirthDatePickerModal({ visible, value, onClose, onConfirm, bottomInset = 0 }) {
  const [draftParts, setDraftParts] = useState(() => createDatePickerParts(value));
  const dayScrollRef = useRef(null);
  const monthScrollRef = useRef(null);
  const yearScrollRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setDraftParts(createDatePickerParts(value));
    }
  }, [value, visible]);

  const previewValue = useMemo(() => buildDateDisplayValue(draftParts), [draftParts]);
  const dayOptions = useMemo(
    () => getDatePickerDayOptions(draftParts.month, draftParts.year),
    [draftParts.month, draftParts.year]
  );

  const updateParts = (patch) => {
    setDraftParts((previous) => normalizeDatePickerParts({ ...previous, ...patch }));
  };

  const createScrollEndHandler = useCallback((options, key, ref) => (event) => {
    const nextValue = getNearestOption(event.nativeEvent.contentOffset.y, options);

    if (!nextValue) {
      return;
    }

    updateParts({ [key]: nextValue });
    scrollToSelectedValue(ref, options, nextValue, true);
  }, []);

  const handleDayScrollEnd = useMemo(
    () => createScrollEndHandler(dayOptions, 'day', dayScrollRef),
    [dayOptions]
  );
  const handleMonthScrollEnd = useMemo(
    () => createScrollEndHandler(MONTH_OPTIONS, 'month', monthScrollRef),
    [createScrollEndHandler]
  );
  const handleYearScrollEnd = useMemo(
    () => createScrollEndHandler(YEAR_OPTIONS, 'year', yearScrollRef),
    [createScrollEndHandler]
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(() => {
      scrollToSelectedValue(dayScrollRef, dayOptions, draftParts.day);
      scrollToSelectedValue(monthScrollRef, MONTH_OPTIONS, draftParts.month);
      scrollToSelectedValue(yearScrollRef, YEAR_OPTIONS, draftParts.year);
    }, 0);

    return () => clearTimeout(timer);
  }, [dayOptions, draftParts.day, draftParts.month, draftParts.year, visible]);

  const handleShiftYear = (direction) => {
    const currentYear = Number(draftParts.year);
    const nextYear = currentYear + direction;

    if (nextYear < DATE_PICKER_MIN_YEAR || nextYear > DATE_PICKER_MAX_YEAR) {
      return;
    }

    updateParts({ year: String(nextYear) });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <View style={[styles.card, { marginBottom: Math.max(bottomInset, 16) }]}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Chọn ngày sinh</Text>
              <Text style={styles.subtitle}>Cuộn ngày, tháng, năm và dừng ở đâu thì chọn ngay ở đó.</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.85}>
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewBox}>
            <Ionicons name="sparkles-outline" size={18} color="#f3c26b" />
            <Text style={styles.previewText}>{previewValue}</Text>
          </View>

          <View style={styles.quickJumpRow}>
            <TouchableOpacity style={styles.quickJumpButton} onPress={() => handleShiftYear(-10)} activeOpacity={0.85}>
              <Text style={styles.quickJumpButtonText}>-10 năm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickJumpButton} onPress={() => handleShiftYear(-1)} activeOpacity={0.85}>
              <Text style={styles.quickJumpButtonText}>-1 năm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickJumpButton} onPress={() => handleShiftYear(1)} activeOpacity={0.85}>
              <Text style={styles.quickJumpButtonText}>+1 năm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickJumpButton} onPress={() => handleShiftYear(10)} activeOpacity={0.85}>
              <Text style={styles.quickJumpButtonText}>+10 năm</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerRow}>
            <PickerColumn
              label="Ngày"
              options={dayOptions}
              selectedValue={draftParts.day}
              onSelect={(day) => updateParts({ day })}
              scrollRef={dayScrollRef}
              onScrollEnd={handleDayScrollEnd}
            />
            <PickerColumn
              label="Tháng"
              options={MONTH_OPTIONS}
              selectedValue={draftParts.month}
              onSelect={(month) => updateParts({ month })}
              scrollRef={monthScrollRef}
              onScrollEnd={handleMonthScrollEnd}
            />
            <PickerColumn
              label="Năm"
              options={YEAR_OPTIONS}
              selectedValue={draftParts.year}
              onSelect={(year) => updateParts({ year })}
              scrollRef={yearScrollRef}
              onScrollEnd={handleYearScrollEnd}
            />
          </View>

          <Text style={styles.helperText}>Cuộn tới đâu sẽ tự chọn tới đó, không cần bấm lại vào từng số.</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => onConfirm(buildDateDisplayValue(draftParts))}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: '#0f1013',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#2d2f36',
    padding: 16,
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9da3ae',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181a1f',
    borderWidth: 1,
    borderColor: '#2a2d34',
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3d3221',
    backgroundColor: '#1a1610',
  },
  previewText: {
    color: '#fff7e8',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  quickJumpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  quickJumpButton: {
    minWidth: 74,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17191e',
    borderWidth: 1,
    borderColor: '#2b2d35',
  },
  quickJumpButtonText: {
    color: '#d6d9df',
    fontSize: 12,
    fontWeight: '700',
  },
  pickerRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  columnWrap: {
    flex: 1,
  },
  columnLabel: {
    color: '#dfe3ea',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  columnCard: {
    height: PICKER_COLUMN_HEIGHT,
    borderRadius: 18,
    backgroundColor: '#15171c',
    borderWidth: 1,
    borderColor: '#2b2d35',
    overflow: 'hidden',
    position: 'relative',
  },
  selectionHighlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: PICKER_VERTICAL_PADDING,
    height: PICKER_ROW_HEIGHT,
    borderRadius: 14,
    backgroundColor: '#f3c26b',
    opacity: 0.14,
    borderWidth: 1,
    borderColor: '#f3c26b',
    zIndex: 1,
  },
  columnContent: {
    paddingVertical: PICKER_VERTICAL_PADDING,
  },
  optionButton: {
    height: PICKER_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    color: '#8f98a8',
    fontSize: 15,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#fff7e8',
    fontSize: 17,
    fontWeight: '800',
  },
  helperText: {
    color: '#8f98a8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#1a1c21',
    borderWidth: 1,
    borderColor: '#2c2f36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#f3c26b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#201507',
    fontSize: 14,
    fontWeight: '800',
  },
});

