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
const SCROLL_IDLE_VELOCITY = 0.05;
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
  onScroll,
  onScrollDragEnd,
  onMomentumScrollEnd,
}) => (
  <View style={styles.columnWrap}>
    <Text style={styles.columnLabel}>{label}</Text>
    <View style={styles.columnCard}>
      <View pointerEvents="none" style={styles.fadeOverlayTop} />
      <View pointerEvents="none" style={styles.fadeOverlayBottom} />
      <View pointerEvents="none" style={styles.selectionHighlight} />
      <View pointerEvents="none" style={styles.selectionBorderTop} />
      <View pointerEvents="none" style={styles.selectionBorderBottom} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.columnContent}
        snapToInterval={PICKER_ROW_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollDragEnd}
        scrollEventThrottle={16}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        {(() => {
          const selectedIndex = options.indexOf(selectedValue);

          return options.map((option, index) => {
          const isSelected = option === selectedValue;
          const distance = Math.abs(index - selectedIndex);

          return (
            <TouchableOpacity
              key={`${label}-${option}`}
              style={styles.optionButton}
              onPress={() => onSelect(option)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.optionText,
                  distance === 1 ? styles.optionTextNearby : null,
                  distance >= 2 ? styles.optionTextFar : null,
                  isSelected ? styles.optionTextSelected : null,
                ]}
              >
                {formatLabel ? formatLabel(option) : option}
              </Text>
            </TouchableOpacity>
          );
          });
        })()}
      </ScrollView>
    </View>
  </View>
);

export default function ArtistBirthDatePickerModal({ visible, value, onClose, onConfirm, bottomInset = 0 }) {
  const [draftParts, setDraftParts] = useState(() => createDatePickerParts(value));
  const dayScrollRef = useRef(null);
  const monthScrollRef = useRef(null);
  const yearScrollRef = useRef(null);
  const draftPartsRef = useRef(createDatePickerParts(value));

  useEffect(() => {
    draftPartsRef.current = draftParts;
  }, [draftParts]);

  const previewValue = useMemo(() => buildDateDisplayValue(draftParts), [draftParts]);
  const dayOptions = useMemo(
    () => getDatePickerDayOptions(draftParts.month, draftParts.year),
    [draftParts.month, draftParts.year]
  );

  const scrollAllColumns = useCallback((parts, animated = false) => {
    const nextDayOptions = getDatePickerDayOptions(parts.month, parts.year);
    scrollToSelectedValue(dayScrollRef, nextDayOptions, parts.day, animated);
    scrollToSelectedValue(monthScrollRef, MONTH_OPTIONS, parts.month, animated);
    scrollToSelectedValue(yearScrollRef, YEAR_OPTIONS, parts.year, animated);
  }, []);

  const updateParts = useCallback((patch) => {
    const nextParts = normalizeDatePickerParts({ ...draftPartsRef.current, ...patch });
    draftPartsRef.current = nextParts;
    setDraftParts((previous) => (
      previous.day === nextParts.day &&
      previous.month === nextParts.month &&
      previous.year === nextParts.year
        ? previous
        : nextParts
    ));
    return nextParts;
  }, []);

  const createScrollHandler = useCallback((options, key) => (event) => {
    const nextValue = getNearestOption(event.nativeEvent.contentOffset.y, options);

    if (!nextValue || draftPartsRef.current[key] === nextValue) {
      return;
    }

    updateParts({ [key]: nextValue });
  }, [updateParts]);

  const finalizeScrollSelection = useCallback((options, key, ref, event) => {
    const nextValue = getNearestOption(event.nativeEvent.contentOffset.y, options);

    if (!nextValue) {
      return;
    }

    const nextParts = updateParts({ [key]: nextValue });
    scrollToSelectedValue(ref, options, nextParts[key], true);

    if (key !== 'day') {
      scrollToSelectedValue(
        dayScrollRef,
        getDatePickerDayOptions(nextParts.month, nextParts.year),
        nextParts.day,
        true
      );
    }
  }, [updateParts]);

  const createScrollEndHandler = useCallback(
    (options, key, ref) => (event) => finalizeScrollSelection(options, key, ref, event),
    [finalizeScrollSelection]
  );

  const createDragEndHandler = useCallback((options, key, ref) => (event) => {
    const velocityY = Math.abs(event?.nativeEvent?.velocity?.y || 0);

    if (velocityY > SCROLL_IDLE_VELOCITY) {
      return;
    }

    finalizeScrollSelection(options, key, ref, event);
  }, [finalizeScrollSelection]);

  const handleDayScroll = useMemo(
    () => createScrollHandler(dayOptions, 'day'),
    [createScrollHandler, dayOptions]
  );
  const handleMonthScroll = useMemo(
    () => createScrollHandler(MONTH_OPTIONS, 'month'),
    [createScrollHandler]
  );
  const handleYearScroll = useMemo(
    () => createScrollHandler(YEAR_OPTIONS, 'year'),
    [createScrollHandler]
  );

  const handleDayScrollEnd = useMemo(
    () => createScrollEndHandler(dayOptions, 'day', dayScrollRef),
    [createScrollEndHandler, dayOptions]
  );
  const handleDayDragEnd = useMemo(
    () => createDragEndHandler(dayOptions, 'day', dayScrollRef),
    [createDragEndHandler, dayOptions]
  );
  const handleMonthScrollEnd = useMemo(
    () => createScrollEndHandler(MONTH_OPTIONS, 'month', monthScrollRef),
    [createScrollEndHandler]
  );
  const handleMonthDragEnd = useMemo(
    () => createDragEndHandler(MONTH_OPTIONS, 'month', monthScrollRef),
    [createDragEndHandler]
  );
  const handleYearScrollEnd = useMemo(
    () => createScrollEndHandler(YEAR_OPTIONS, 'year', yearScrollRef),
    [createScrollEndHandler]
  );
  const handleYearDragEnd = useMemo(
    () => createDragEndHandler(YEAR_OPTIONS, 'year', yearScrollRef),
    [createDragEndHandler]
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const initialParts = createDatePickerParts(value);
    draftPartsRef.current = initialParts;
    setDraftParts(initialParts);

    const timer = setTimeout(() => {
      scrollAllColumns(initialParts);
    }, 0);

    return () => clearTimeout(timer);
  }, [scrollAllColumns, value, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    scrollToSelectedValue(dayScrollRef, dayOptions, draftParts.day);
  }, [dayOptions.length, draftParts.month, draftParts.year, visible]);

  const handleShiftYear = (direction) => {
    const currentYear = Number(draftParts.year);
    const nextYear = currentYear + direction;

    if (nextYear < DATE_PICKER_MIN_YEAR || nextYear > DATE_PICKER_MAX_YEAR) {
      return;
    }

    const nextParts = updateParts({ year: String(nextYear) });
    scrollAllColumns(nextParts, true);
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
              onSelect={(day) => {
                const nextParts = updateParts({ day });
                scrollToSelectedValue(dayScrollRef, dayOptions, nextParts.day, true);
              }}
              scrollRef={dayScrollRef}
              onScroll={handleDayScroll}
              onScrollDragEnd={handleDayDragEnd}
              onMomentumScrollEnd={handleDayScrollEnd}
            />
            <PickerColumn
              label="Tháng"
              options={MONTH_OPTIONS}
              selectedValue={draftParts.month}
              onSelect={(month) => {
                const nextParts = updateParts({ month });
                scrollAllColumns(nextParts, true);
              }}
              scrollRef={monthScrollRef}
              onScroll={handleMonthScroll}
              onScrollDragEnd={handleMonthDragEnd}
              onMomentumScrollEnd={handleMonthScrollEnd}
            />
            <PickerColumn
              label="Năm"
              options={YEAR_OPTIONS}
              selectedValue={draftParts.year}
              onSelect={(year) => {
                const nextParts = updateParts({ year });
                scrollAllColumns(nextParts, true);
              }}
              scrollRef={yearScrollRef}
              onScroll={handleYearScroll}
              onScrollDragEnd={handleYearDragEnd}
              onMomentumScrollEnd={handleYearScrollEnd}
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
  fadeOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: PICKER_VERTICAL_PADDING + 12,
    backgroundColor: 'rgba(21, 23, 28, 0.88)',
    zIndex: 2,
  },
  fadeOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PICKER_VERTICAL_PADDING + 12,
    backgroundColor: 'rgba(21, 23, 28, 0.88)',
    zIndex: 2,
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
  selectionBorderTop: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: PICKER_VERTICAL_PADDING,
    height: 1,
    backgroundColor: 'rgba(243, 194, 107, 0.45)',
    zIndex: 3,
  },
  selectionBorderBottom: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: PICKER_VERTICAL_PADDING + PICKER_ROW_HEIGHT,
    height: 1,
    backgroundColor: 'rgba(243, 194, 107, 0.45)',
    zIndex: 3,
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
  optionTextNearby: {
    color: '#bcc3ce',
    fontSize: 16,
    fontWeight: '700',
  },
  optionTextFar: {
    color: '#667080',
    fontSize: 14,
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

