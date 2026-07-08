import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../common/AppLoader';
import { formatCompactNumber, formatDateLabel, formatDuration, getInitials, resolveImageUri } from '../../utils/media';
import { formatPlayerTime, getPlayableDuration } from '../../utils/player';

const CLOSE_THRESHOLD = 120;
const CLOSE_VELOCITY = 0.9;

const Artwork = ({ track }) => {
  if (track?.image) {
    return <Image source={{ uri: track.image }} style={styles.heroArtwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.heroArtwork, styles.heroArtworkFallback]}>
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
    return 'No lyrics available.';
  }

  return lines.join('\n');
};

const buildSongInfoRows = (trackPayload) => {
  if (!trackPayload) {
    return [];
  }

  return [
    { label: 'Artist', value: trackPayload?.artist?.name || 'Unknown artist' },
    { label: 'Album', value: trackPayload?.album?.title || 'Single track' },
    { label: 'Duration', value: formatDuration(trackPayload?.duration) || '0s' },
    { label: 'Released', value: formatDateLabel(trackPayload?.releaseDate) || 'Unknown' },
    { label: 'Plays', value: formatCompactNumber(trackPayload?.stats?.totalPlay) },
    { label: 'Likes', value: formatCompactNumber(trackPayload?.stats?.totalLike) },
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
  const { height: screenHeight } = useWindowDimensions();
  const duration = getPlayableDuration(currentTrack);
  const trackPayload = trackDetailResponse?.data?.track || null;
  const artistPayload = artistProfileResponse?.data?.artist || null;
  const songInfoRows = buildSongInfoRows(trackPayload);
  const lyricsPreview = getLyricsPreview(trackPayload?.lyrics?.static || currentTrack?.lyrics);
  const artistSummary = artistPayload?.bio || 'No artist introduction available.';
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
        <View style={styles.dragArea} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Pressable style={styles.closeButton} onPress={closeWithAnimation}>
            <Ionicons name="chevron-down" size={22} color="#ffffff" />
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
              <Text style={styles.emptyTitle}>No track selected</Text>
              <Text style={styles.emptyText}>
                Choose a song from a playlist, artist, or chart to show the player here.
              </Text>
            </View>
          ) : (
            <>
              <Artwork track={currentTrack} />

              <Text style={styles.trackTitle}>{currentTrack.title}</Text>
              <Text style={styles.trackSubtitle}>{currentTrack.artistName}</Text>
              {currentError ? <Text style={styles.statusTextError}>{currentError}</Text> : null}
              {!currentError && isBuffering ? <Text style={styles.statusText}>Loading audio...</Text> : null}

              <View style={styles.progressBlock}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(progressRatio, 0.02) * 100}%` }]} />
                </View>
                <View style={styles.progressMeta}>
                  <Text style={styles.progressLabel}>{formatPlayerTime(progressSeconds)}</Text>
                  <Text style={styles.progressLabel}>{formatPlayerTime(duration)}</Text>
                </View>
              </View>

              <View style={styles.controlsRow}>
                <View style={styles.controlsSideSpacer} />

                <View style={styles.controls}>
                  <Pressable
                    style={[styles.secondaryButton, !hasPrevious && styles.secondaryButtonDisabled]}
                    onPress={onPlayPrevious}
                    disabled={!hasPrevious}
                  >
                    <Ionicons name="play-skip-back" size={24} color={hasPrevious ? '#ffffff' : '#5f5f5f'} />
                  </Pressable>

                  <Pressable style={styles.primaryButton} onPress={onTogglePlayback}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color="#000000" />
                  </Pressable>

                  <Pressable
                    style={[styles.secondaryButton, !hasNext && styles.secondaryButtonDisabled]}
                    onPress={onPlayNext}
                    disabled={!hasNext}
                  >
                    <Ionicons name="play-skip-forward" size={24} color={hasNext ? '#ffffff' : '#5f5f5f'} />
                  </Pressable>
                </View>

                <Pressable
                  style={styles.queueIconButton}
                  onPress={onOpenQueue}
                  accessibilityRole="button"
                  accessibilityLabel={queueStatusLabel}
                >
                  <Ionicons name="reorder-three-outline" size={24} color="#ffffff" />
                </Pressable>
              </View>

              {isDetailLoading ? (
                <View style={styles.detailStateCard}>
                  <AppLoader size="small" />
                  <Text style={styles.detailStateText}>Loading track detail...</Text>
                </View>
              ) : null}

              {!isDetailLoading && detailErrorMessage ? (
                <View style={styles.detailStateCard}>
                  <Text style={styles.detailErrorTitle}>Track detail unavailable</Text>
                  <Text style={styles.detailErrorText}>{detailErrorMessage}</Text>
                  <Pressable style={styles.retryButton} onPress={onRetryDetail}>
                    <Text style={styles.retryButtonText}>Try again</Text>
                  </Pressable>
                </View>
              ) : null}

              {!isDetailLoading ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Lyrics Preview</Text>

                  <View style={styles.detailCard}>
                    <Text style={styles.previewText}>{lyricsPreview}</Text>
                    <Text style={styles.previewHintText}>
                      {canOpenSyncedLyrics
                        ? 'Open the synced lyric screen to follow the current playback line.'
                        : 'Timed LRC is not available for this track yet.'}
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
                    <Text
                      style={[
                        styles.lyricsScreenButtonText,
                        !canOpenSyncedLyrics && styles.lyricsScreenButtonTextDisabled,
                      ]}
                    >
                      {canOpenSyncedLyrics ? 'Open Synced Lyrics' : 'Synced Lyrics Unavailable'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {!isDetailLoading && !detailErrorMessage && trackPayload ? (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Song Info</Text>

                    <View style={styles.detailCard}>
                      {songInfoRows.map((item) => (
                        <DetailRow key={item.label} label={item.label} value={item.value} />
                      ))}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About the Artist</Text>

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
                            {artistPayload?.name || trackPayload?.artist?.name || 'Unknown artist'}
                          </Text>
                          <Text style={styles.artistIntroMeta}>
                            {formatCompactNumber(artistPayload?.stats?.monthlyListeners)} monthly listeners
                            {' - '}
                            {formatCompactNumber(artistPayload?.stats?.followers || artistPayload?.stats?.totalFollowers)} followers
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
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#090909',
    paddingHorizontal: 22,
  },
  dragArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#4a4a4a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 18,
  },
  heroArtwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 26,
    backgroundColor: '#171717',
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
  trackTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 22,
  },
  trackSubtitle: {
    color: '#b3b3b3',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  statusText: {
    color: '#9d9d9d',
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
    marginTop: 26,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#2a2a2a',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#1ed760',
  },
  progressMeta: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#9d9d9d',
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlsSideSpacer: {
    width: 52,
    height: 52,
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  primaryButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1ed760',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonDisabled: {
    opacity: 0.55,
  },
  queueIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailStateCard: {
    marginTop: 20,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222222',
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
    backgroundColor: '#ffffff',
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  detailCard: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222222',
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
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lyricsScreenButtonDisabled: {
    backgroundColor: '#1b1b1b',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  lyricsScreenButtonText: {
    color: '#000000',
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
