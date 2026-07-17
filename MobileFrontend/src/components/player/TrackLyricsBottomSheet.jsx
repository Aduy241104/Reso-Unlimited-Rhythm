import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import usePlayer from '../../hooks/usePlayer';
import { Lyric } from '../../lib/reactNativeLyric';
import {
  formatPlayerTime,
  getPlayableDuration,
  hasSyncedLrc,
  resolveTrackLrc,
  resolveTrackStaticLyrics,
} from '../../utils/player';

const BACKGROUND_PALETTES = [
  {
    base: '#10131d',
    accent: '#f25f5c',
    accentSoft: 'rgba(242, 95, 92, 0.24)',
    glow: 'rgba(255, 201, 107, 0.16)',
  },
  {
    base: '#0d1621',
    accent: '#3ddc97',
    accentSoft: 'rgba(61, 220, 151, 0.22)',
    glow: 'rgba(104, 214, 255, 0.14)',
  },
  {
    base: '#1b1224',
    accent: '#ff8fab',
    accentSoft: 'rgba(255, 143, 171, 0.22)',
    glow: 'rgba(255, 214, 10, 0.12)',
  },
  {
    base: '#17110f',
    accent: '#f4a261',
    accentSoft: 'rgba(244, 162, 97, 0.22)',
    glow: 'rgba(233, 196, 106, 0.14)',
  },
  {
    base: '#0d1821',
    accent: '#4cc9f0',
    accentSoft: 'rgba(76, 201, 240, 0.2)',
    glow: 'rgba(114, 239, 221, 0.12)',
  },
];

const pickRandomPalette = (exceptBase = '') => {
  const availablePalettes = BACKGROUND_PALETTES.filter((palette) => palette.base !== exceptBase);

  if (availablePalettes.length === 0) {
    return BACKGROUND_PALETTES[0];
  }

  return availablePalettes[Math.floor(Math.random() * availablePalettes.length)];
};

export default function TrackLyricsBottomSheet({ onClose, visible = false }) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const {
    currentTrack,
    hasNext,
    hasPrevious,
    isPlaying,
    playNext,
    playPrevious,
    progressRatio,
    progressSeconds,
    togglePlayback,
  } = usePlayer();
  const [palette, setPalette] = useState(() => pickRandomPalette());
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const lyricRef = useRef(null);
  const lastTrackKeyRef = useRef('');
  const lrc = useMemo(() => resolveTrackLrc(currentTrack), [currentTrack]);
  const plainLyrics = useMemo(() => resolveTrackStaticLyrics(currentTrack), [currentTrack]);
  const hasTimedLyrics = hasSyncedLrc(lrc);
  const duration = getPlayableDuration(currentTrack);
  const lyricHeight = Math.max(screenHeight - insets.top - insets.bottom - 300, 240);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setPalette((previousPalette) => pickRandomPalette(previousPalette?.base));
  }, [visible]);

  useEffect(() => {
    const nextTrackKey = currentTrack?.entityId || currentTrack?.id || '';

    if (!nextTrackKey || nextTrackKey === lastTrackKeyRef.current) {
      return;
    }

    lastTrackKeyRef.current = nextTrackKey;
    setPalette((previousPalette) => pickRandomPalette(previousPalette?.base));
  }, [currentTrack]);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(screenHeight);
      backdropOpacity.setValue(0);
      return;
    }

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
  }, [backdropOpacity, screenHeight, translateY, visible]);

  const closeSheet = useCallback(() => {
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
    ]).start(({ finished }) => {
      if (finished) {
        onClose?.();
      }
    });
  }, [backdropOpacity, onClose, screenHeight, translateY]);

  const handleScrollToCurrentLine = useCallback(() => {
    lyricRef.current?.scrollToCurrentLine?.();
  }, []);

  const lineRenderer = useCallback(
    ({ active, lrcLine }) => (
      <Text style={[styles.lyricLine, active ? styles.lyricLineActive : styles.lyricLineInactive]}>
        {lrcLine.content || '...'}
      </Text>
    ),
    []
  );

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={closeSheet}>
      <View style={styles.backdrop}>
        <Animated.View pointerEvents="none" style={[styles.backdropTint, { opacity: backdropOpacity }]} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.base,
              minHeight: screenHeight,
              paddingTop: insets.top + 10,
              paddingBottom: Math.max(insets.bottom, 18) + 18,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Pressable style={styles.headerButton} onPress={closeSheet}>
              <Ionicons name="chevron-down" size={22} color="#ffffff" />
            </Pressable>

            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {currentTrack?.title || 'No track playing'}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {currentTrack?.artistName || 'Choose a track to see lyrics'}
              </Text>
            </View>

            <Pressable
              style={[styles.headerButton, !hasTimedLyrics && styles.headerButtonDisabled]}
              onPress={handleScrollToCurrentLine}
              disabled={!hasTimedLyrics}
            >
              <Ionicons name="locate-outline" size={20} color={hasTimedLyrics ? '#ffffff' : '#6f6f6f'} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollBody}
            showsVerticalScrollIndicator={false}
          >
            {hasTimedLyrics ? (
              <Lyric
                ref={lyricRef}
                lrc={lrc}
                currentTime={progressSeconds * 1000}
                height={lyricHeight}
                lineHeight={14}
                activeLineHeight={18}
                activeLineAnchorOffset={3}
                style={styles.lyricView}
                lineRenderer={lineRenderer}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.fallbackCard}>
                <Text style={styles.fallbackTitle}>Synced LRC unavailable</Text>
                <Text style={styles.fallbackText}>
                  This track does not include timed lyric lines, so the sheet is showing static lyrics only.
                </Text>

                <Text style={styles.plainLyricsText}>
                  {plainLyrics || 'No lyric text available for this track.'}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.progressBlock}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(progressRatio, 0.02) * 100}%`,
                    backgroundColor: palette.accent,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.controlTimeRow}>
            <Text style={styles.controlTimeText}>{formatPlayerTime(progressSeconds)}</Text>
            <Text style={styles.controlTimeText}>{formatPlayerTime(duration)}</Text>
          </View>

          <View style={styles.controlsRow}>
            <Pressable
              style={[styles.secondaryButton, !hasPrevious && styles.secondaryButtonDisabled]}
              onPress={playPrevious}
              disabled={!hasPrevious}
            >
              <Ionicons name="play-skip-back" size={24} color={hasPrevious ? '#ffffff' : '#666666'} />
            </Pressable>

            <Pressable style={[styles.primaryButton, { backgroundColor: palette.accent }]} onPress={togglePlayback}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color="#050505" />
            </Pressable>

            <Pressable
              style={[styles.secondaryButton, !hasNext && styles.secondaryButtonDisabled]}
              onPress={playNext}
              disabled={!hasNext}
            >
              <Ionicons name="play-skip-forward" size={24} color={hasNext ? '#ffffff' : '#666666'} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  sheet: {
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 16,
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerButtonDisabled: {
    opacity: 0.6,
  },
  headerCopy: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.74)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
    textAlign: 'center',
  },
  contentScroll: {
    marginTop: 18,
    flex: 1,
  },
  contentScrollBody: {
    paddingBottom: 10,
  },
  lyricView: {
    width: '100%',
  },
  lyricLine: {
    width: '100%',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  lyricLineActive: {
    color: '#ffffff',
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '800',
  },
  lyricLineInactive: {
    color: 'rgba(255, 255, 255, 0.32)',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '600',
  },
  fallbackCard: {
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  fallbackTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  fallbackText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  plainLyricsText: {
    color: '#f1f1f1',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 18,
  },
  progressBlock: {
    marginTop: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
  },
  controlTimeRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  primaryButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonDisabled: {
    opacity: 0.58,
  },
});
