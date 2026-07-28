import React, { useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../common/AppLoader';
import { formatCompactNumber, formatDateLabel, formatDuration, getInitials, resolveImageUri } from '../../utils/media';
import { formatPlayerTime, getPlayableDuration, resolveTrackStaticLyrics } from '../../utils/player';

const CLOSE_THRESHOLD = 120;
const CLOSE_VELOCITY = 0.9;

const Artwork = ({ track, style }) => {
  if (track?.image) {
    return (
      <Image
        source={track.image}
        style={[styles.heroArtwork, style]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={track.image}
        allowDownscaling
        enforceEarlyResizing
      />
    );
  }

  return (
    <View style={[styles.heroArtwork, styles.heroArtworkFallback, style]}>
      <Text style={styles.heroArtworkFallbackText}>{getInitials(track?.title)}</Text>
    </View>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text style={styles.detailRowValue}>{value}</Text>
  </View>
);

const getLyricsPreview = (value) => {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (lines.length === 0) {
    return 'Chưa có lời bài hát.';
  }

  return lines.join('\n');
};

const buildSongInfoRows = (trackPayload) => {
  if (!trackPayload) {
    return [];
  }

  return [
    { label: 'Nghệ sĩ', value: trackPayload?.artist?.name || 'Nghệ sĩ không xác định' },
    { label: 'Album', value: trackPayload?.album?.title || 'Đĩa đơn' },
    { label: 'Thời lượng', value: formatDuration(trackPayload?.duration) || '0s' },
    { label: 'Phát hành', value: formatDateLabel(trackPayload?.releaseDate) || 'Không xác định' },
    { label: 'Lượt phát', value: formatCompactNumber(trackPayload?.stats?.totalPlay) },
    { label: 'Lượt thích', value: formatCompactNumber(trackPayload?.stats?.totalLike) },
  ].filter((item) => String(item.value || '').trim());
};

export default function PlayerDetailSheet({
  artistProfileResponse,
  currentError,
  currentIndex = -1,
  currentTrack,
  detailErrorMessage = '',
  hasNext = false,
  hasPrevious = false,
  hasSyncedLyrics = false,
  isDetailLoading = false,
  isBuffering = false,
  isPlaying = false,
  onClose,
  onOpenLyrics,
  onOpenQueue,
  onPlayNext,
  onPlayPrevious,
  onRetryDetail,
  onTogglePlayback,
  progressRatio = 0,
  progressSeconds = 0,
  queueLength = 0,
  trackDetailResponse,
}) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const artworkSize = Math.min(screenWidth - 44, screenHeight * 0.42, 390);
  const duration = getPlayableDuration(currentTrack);
  const trackPayload = trackDetailResponse?.data?.track || null;
  const artistPayload = artistProfileResponse?.data?.artist || null;
  const songInfoRows = buildSongInfoRows(trackPayload);
  const lyricsPreview = getLyricsPreview(
    resolveTrackStaticLyrics(trackPayload) || resolveTrackStaticLyrics(currentTrack)
  );
  const artistSummary = artistPayload?.bio || 'Chưa có phần giới thiệu cho nghệ sĩ này.';
  const queueStatusLabel = currentIndex >= 0
    ? `Open playing queue. ${queueLength} tracks queued. Current track ${currentIndex + 1}.`
    : `Open playing queue. ${queueLength} tracks queued.`;
  const canOpenSyncedLyrics = hasSyncedLyrics && typeof onOpenLyrics === 'function';
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const resetSheetPosition = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeWithAnimation = () => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosingRef.current = false;
      translateY.setValue(screenHeight);
      backdropOpacity.setValue(0);
      onClose?.();
    });
  };

  useEffect(() => {
    isClosingRef.current = false;
    translateY.setValue(screenHeight);
    backdropOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, screenHeight, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },

      onPanResponderMove: (_, gestureState) => {
        const nextTranslateY = gestureState.dy > 0 ? gestureState.dy : gestureState.dy * 0.18;
        const nextBackdropOpacity = gestureState.dy > 0
          ? Math.max(0.18, 1 - (gestureState.dy / Math.max(screenHeight * 0.75, 1)))
          : 1;

        translateY.setValue(nextTranslateY);
        backdropOpacity.setValue(nextBackdropOpacity);
      },

      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > CLOSE_THRESHOLD || gestureState.vy > CLOSE_VELOCITY;

        if (shouldClose) {
          closeWithAnimation();
          return;
        }

        resetSheetPosition();
      },

      onPanResponderTerminate: () => {
        resetSheetPosition();
      },
    })
  ).current;

  return (
    <View style={styles.backdrop}>
      <Animated.View pointerEvents="none" style={[styles.backdropTint, { opacity: backdropOpacity }]} />

      <Animated.View
        style={[
          styles.sheet,
          {
            minHeight: screenHeight,
            paddingTop: insets.top + 10,
            paddingBottom: Math.max(insets.bottom, 18) + 18,
            transform: [{ translateY }],
          },
        ]}
      >
        <LinearGradient
          colors={['#24133F', '#110D1B', '#09080D', '#09080D']}
          locations={[0, 0.28, 0.58, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View pointerEvents="none" style={styles.ambientGlowLeft} />
        <View pointerEvents="none" style={styles.ambientGlowRight} />

        <View style={styles.dragArea} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={closeWithAnimation}>
            <Ionicons name="chevron-down" size={22} color="#ffffff" />
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>ĐANG PHÁT</Text>
            <Text style={styles.headerMeta} numberOfLines={1}>
              {currentIndex >= 0
                ? `${currentIndex + 1} / ${queueLength} trong hàng chờ`
                : 'Trình phát nhạc'}
            </Text>
          </View>

          <Pressable
            style={styles.headerQueueButton}
            onPress={onOpenQueue}
            accessibilityRole="button"
            accessibilityLabel={queueStatusLabel}
          >
            <Ionicons name="list" size={20} color="#ffffff" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {!currentTrack ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Chưa chọn bài hát</Text>
              <Text style={styles.emptyText}>
                Hãy chọn bài hát từ playlist, nghệ sĩ hoặc bảng xếp hạng để hiển thị trình phát tại đây.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.artworkStage}>
                <View
                  style={[
                    styles.artworkShadow,
                    { width: artworkSize, height: artworkSize },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(167, 139, 250, 0.72)', 'rgba(255, 255, 255, 0.1)']}
                    style={styles.artworkBorder}
                  >
                    <Artwork
                      track={currentTrack}
                      style={{ width: artworkSize - 2, height: artworkSize - 2 }}
                    />
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.trackHeading}>
                <View style={styles.trackCopy}>
                  <Text style={styles.trackTitle} numberOfLines={2}>{currentTrack.title}</Text>
                  <Text style={styles.trackSubtitle} numberOfLines={1}>{currentTrack.artistName}</Text>
                </View>
                <View style={styles.playingBadge}>
                  <Ionicons name="musical-notes" size={15} color="#C4B5FD" />
                </View>
              </View>
              {currentError ? <Text style={styles.statusTextError}>{currentError}</Text> : null}
              {!currentError && isBuffering ? <Text style={styles.statusText}>Đang tải âm thanh...</Text> : null}

              <View style={styles.progressBlock}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(0, Math.min(progressRatio, 1)) * 100}%` },
                    ]}
                  />
                </View>
                <View style={styles.progressMeta}>
                  <Text style={styles.progressLabel}>{formatPlayerTime(progressSeconds)}</Text>
                  <Text style={styles.progressLabel}>{formatPlayerTime(duration)}</Text>
                </View>
              </View>

              <View style={styles.controlsRow}>
                <Pressable
                  style={[styles.secondaryButton, !hasPrevious && styles.secondaryButtonDisabled]}
                  onPress={onPlayPrevious}
                  disabled={!hasPrevious}
                >
                  <Ionicons name="play-skip-back" size={25} color={hasPrevious ? '#ffffff' : '#625D69'} />
                </Pressable>

                <Pressable style={styles.primaryButton} onPress={onTogglePlayback}>
                  <LinearGradient
                    colors={['#A78BFA', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButtonFill}
                  >
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#ffffff" />
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={[styles.secondaryButton, !hasNext && styles.secondaryButtonDisabled]}
                  onPress={onPlayNext}
                  disabled={!hasNext}
                >
                  <Ionicons name="play-skip-forward" size={25} color={hasNext ? '#ffffff' : '#625D69'} />
                </Pressable>
              </View>

              {isDetailLoading ? (
                <View style={styles.detailStateCard}>
                  <AppLoader size="small" />
                  <Text style={styles.detailStateText}>Đang tải chi tiết bài hát...</Text>
                </View>
              ) : null}

              {!isDetailLoading && detailErrorMessage ? (
                <View style={styles.detailStateCard}>
                  <Text style={styles.detailErrorTitle}>Không thể tải chi tiết bài hát</Text>
                  <Text style={styles.detailErrorText}>{detailErrorMessage}</Text>
                  <Pressable style={styles.retryButton} onPress={onRetryDetail}>
                    <Text style={styles.retryButtonText}>Thử lại</Text>
                  </Pressable>
                </View>
              ) : null}

              {!isDetailLoading ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <View style={styles.sectionIcon}>
                      <Ionicons name="document-text-outline" size={17} color="#C4B5FD" />
                    </View>
                    <Text style={styles.sectionTitle}>Lời bài hát</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.previewText}>{lyricsPreview}</Text>
                    <Text style={styles.previewHintText}>
                      {canOpenSyncedLyrics
                        ? 'Mở lời đồng bộ để theo dõi từng câu theo nhạc.'
                        : 'Bài hát này chưa có lời đồng bộ theo thời gian.'}
                    </Text>
                  </View>

                  <Pressable
                    style={[
                      styles.lyricsScreenButton,
                      !canOpenSyncedLyrics && styles.lyricsScreenButtonDisabled,
                    ]}
                    onPress={onOpenLyrics}
                    disabled={!canOpenSyncedLyrics}
                  >
                    <Ionicons
                      name="mic-outline"
                      size={17}
                      color={canOpenSyncedLyrics ? '#ffffff' : '#777777'}
                    />
                    <Text
                      style={[
                        styles.lyricsScreenButtonText,
                        !canOpenSyncedLyrics && styles.lyricsScreenButtonTextDisabled,
                      ]}
                    >
                      {canOpenSyncedLyrics ? 'Mở lời đồng bộ' : 'Chưa có lời đồng bộ'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {!isDetailLoading && !detailErrorMessage && trackPayload ? (
                <>
                  <View style={styles.section}>
                    <View style={styles.sectionHeading}>
                      <View style={styles.sectionIcon}>
                        <Ionicons name="information-circle-outline" size={18} color="#C4B5FD" />
                      </View>
                      <Text style={styles.sectionTitle}>Thông tin bài hát</Text>
                    </View>

                    <View style={styles.detailCard}>
                      {songInfoRows.map((item) => (
                        <DetailRow key={item.label} label={item.label} value={item.value} />
                      ))}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <View style={styles.sectionHeading}>
                      <View style={styles.sectionIcon}>
                        <Ionicons name="person-outline" size={17} color="#C4B5FD" />
                      </View>
                      <Text style={styles.sectionTitle}>Về nghệ sĩ</Text>
                    </View>

                    <View style={styles.detailCard}>
                      <View style={styles.artistIntroHeader}>
                        <View style={styles.artistAvatarWrap}>
                          <Artwork
                            track={{
                              image: resolveImageUri(artistPayload?.avatar || artistPayload?.coverImage),
                              title: artistPayload?.name || trackPayload?.artist?.name,
                            }}
                          />
                        </View>

                        <View style={styles.artistIntroCopy}>
                          <Text style={styles.artistIntroName}>
                            {artistPayload?.name || trackPayload?.artist?.name || 'Nghệ sĩ không xác định'}
                          </Text>
                          <Text style={styles.artistIntroMeta}>
                            {formatCompactNumber(artistPayload?.stats?.monthlyListeners)} người nghe mỗi tháng
                            {' - '}
                            {formatCompactNumber(artistPayload?.stats?.followers || artistPayload?.stats?.totalFollowers)} người theo dõi
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.artistSummaryText}>{artistSummary}</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#09080D',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    paddingHorizontal: 20,
  },
  ambientGlowLeft: {
    position: 'absolute',
    top: 110,
    left: -110,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(124, 58, 237, 0.13)',
  },
  ambientGlowRight: {
    position: 'absolute',
    top: 360,
    right: -130,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(167, 139, 250, 0.07)',
  },
  dragArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    paddingBottom: 9,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerEyebrow: {
    color: '#C4B5FD',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  headerMeta: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  headerQueueButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  artworkStage: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 4,
  },
  artworkShadow: {
    borderRadius: 27,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 18,
  },
  artworkBorder: {
    flex: 1,
    padding: 1,
    borderRadius: 27,
    overflow: 'hidden',
  },
  heroArtwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 26,
    backgroundColor: '#1F1B24',
  },
  heroArtworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArtworkFallbackText: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 2,
  },
  trackHeading: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 14,
  },
  trackTitle: {
    color: '#F9F7FC',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  trackSubtitle: {
    color: '#B8B2C0',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  playingBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.22)',
  },
  statusText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  statusTextError: {
    color: '#ff8a8a',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  progressBlock: {
    marginTop: 24,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#9F7AEA',
  },
  progressMeta: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#938C9B',
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  primaryButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 10,
  },
  primaryButtonFill: {
    flex: 1,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  secondaryButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonDisabled: {
    opacity: 0.48,
  },
  detailStateCard: {
    marginTop: 26,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    alignItems: 'center',
  },
  detailStateText: {
    color: '#a3a3a3',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  detailErrorTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  detailErrorText: {
    color: '#ff9b9b',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#8B5CF6',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginTop: 28,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  sectionTitle: {
    color: '#F3F0F7',
    fontSize: 17,
    fontWeight: '800',
  },
  detailCard: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 14,
  },
  detailRowLabel: {
    color: '#8d8d8d',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRowValue: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  previewText: {
    color: '#dddddd',
    fontSize: 14,
    lineHeight: 22,
  },
  previewHintText: {
    color: '#8f8f8f',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  lyricsScreenButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 48,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lyricsScreenButtonDisabled: {
    backgroundColor: '#1b1b1b',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  lyricsScreenButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  lyricsScreenButtonTextDisabled: {
    color: '#777777',
  },
  artistIntroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artistAvatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    marginRight: 14,
  },
  artistIntroCopy: {
    flex: 1,
  },
  artistIntroName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  artistIntroMeta: {
    color: '#9f9f9f',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  artistSummaryText: {
    color: '#d7d7d7',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
  },
  emptyState: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#9d9d9d',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
});
