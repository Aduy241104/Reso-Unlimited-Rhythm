import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_CLOSE_DISTANCE = 460;

const QUALITY_LABELS = {
  original: 'Gốc',
  lossless: 'Lossless',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Tiết kiệm',
};

const getQualityLabel = (quality) => {
  const label = QUALITY_LABELS[quality?.label] || quality?.label || 'Mặc định';

  return quality?.bitrate ? `${label} · ${quality.bitrate} kbps` : label;
};

const isSelectedQuality = (quality, selectedAudioQuality) => {
  if (!quality || !selectedAudioQuality) {
    return false;
  }

  return Boolean(
    (quality.url && quality.url === selectedAudioQuality.url) ||
    (quality.bitrate > 0 && quality.bitrate === selectedAudioQuality.bitrate)
  );
};

export default function AudioQualityBottomSheet({
  availableAudioQualities = [],
  isPremium = false,
  onClose,
  onPremiumRequired,
  onSelectQuality,
  selectedAudioQuality = null,
  visible = false,
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_CLOSE_DISTANCE)).current;
  const isClosingRef = useRef(false);
  const qualityOptions = useMemo(
    () => (Array.isArray(availableAudioQualities) ? availableAudioQualities.filter(Boolean) : []),
    [availableAudioQualities]
  );

  const closeWithAnimation = (afterClose) => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    Animated.timing(translateY, {
      toValue: SHEET_CLOSE_DISTANCE,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      isClosingRef.current = false;
      translateY.setValue(SHEET_CLOSE_DISTANCE);
      onClose?.();

      if (typeof afterClose === 'function') {
        requestAnimationFrame(afterClose);
      }
    });
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    isClosingRef.current = false;
    translateY.setValue(SHEET_CLOSE_DISTANCE);

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 4,
    }).start();
  }, [translateY, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 90 || gestureState.vy > 0.85;

        if (shouldClose) {
          closeWithAnimation();
          return;
        }

        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 4,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 4,
        }).start();
      },
    })
  ).current;

  const handleSelectQuality = (quality) => {
    if (!isPremium) {
      closeWithAnimation(() => onPremiumRequired?.('Chọn chất lượng âm thanh'));
      return;
    }

    closeWithAnimation(() => {
      void onSelectQuality?.(quality);
    });
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => closeWithAnimation()}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={() => closeWithAnimation()} />

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 18) + 12,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.dragArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Chất lượng âm thanh</Text>
              <Text style={styles.subtitle}>
                {isPremium
                  ? 'Chọn phiên bản phù hợp với kết nối của bạn.'
                  : 'Tùy chọn này chỉ khả dụng cho tài khoản Premium.'}
              </Text>
            </View>

            {!isPremium ? (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond-outline" size={14} color="#FDE68A" />
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            ) : null}
          </View>

          <ScrollView
            style={styles.optionList}
            contentContainerStyle={styles.optionListContent}
            showsVerticalScrollIndicator={false}
          >
            {qualityOptions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={22} color="#71717A" />
                <Text style={styles.emptyTitle}>Chưa có tùy chọn khác</Text>
                <Text style={styles.emptyText}>Bài hát này chỉ có một chất lượng mặc định.</Text>
              </View>
            ) : (
              qualityOptions.map((quality, index) => {
                const isSelected = isSelectedQuality(quality, selectedAudioQuality);

                return (
                  <Pressable
                    key={`${quality.label}-${quality.bitrate}-${index}`}
                    style={({ pressed }) => [
                      styles.optionItem,
                      isSelected && styles.optionItemSelected,
                      !isPremium && styles.optionItemLocked,
                      pressed && styles.optionItemPressed,
                    ]}
                    onPress={() => handleSelectQuality(quality)}
                  >
                    <View style={[styles.optionIconWrap, isSelected && styles.optionIconWrapSelected]}>
                      <Ionicons
                        name={!isPremium ? 'lock-closed' : isSelected ? 'checkmark' : 'musical-note'}
                        size={16}
                        color={!isPremium ? '#FDE68A' : isSelected ? '#FFFFFF' : '#B8B2C0'}
                      />
                    </View>

                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {getQualityLabel(quality)}
                      </Text>
                      <Text style={styles.optionDescription}>
                        {isSelected
                          ? 'Đang được sử dụng cho bài hát này.'
                          : isPremium
                            ? 'Chạm để chuyển chất lượng phát.'
                            : 'Nâng cấp Premium để chọn thủ công.'}
                      </Text>
                    </View>

                    {isSelected ? (
                      <Ionicons name="radio-button-on" size={18} color="#A78BFA" />
                    ) : (
                      <Ionicons
                        name={!isPremium ? 'chevron-forward' : 'radio-button-off'}
                        size={18}
                        color={!isPremium ? '#8F8994' : '#5B5563'}
                      />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#141219',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 18,
    paddingTop: 8,
    maxHeight: '70%',
  },
  dragArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 14,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#5A5561',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#F5F3FF',
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9B95A5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(120, 83, 18, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.24)',
  },
  premiumBadgeText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '800',
  },
  optionList: {
    marginTop: 18,
  },
  optionListContent: {
    gap: 10,
    paddingBottom: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionItemSelected: {
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderColor: 'rgba(167, 139, 250, 0.34)',
  },
  optionItemLocked: {
    opacity: 0.84,
  },
  optionItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionIconWrapSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#A78BFA',
  },
  optionCopy: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    color: '#F5F3FF',
    fontSize: 14,
    fontWeight: '700',
  },
  optionTitleSelected: {
    color: '#FFFFFF',
  },
  optionDescription: {
    color: '#9B95A5',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyTitle: {
    color: '#F5F3FF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyText: {
    color: '#9B95A5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
});
