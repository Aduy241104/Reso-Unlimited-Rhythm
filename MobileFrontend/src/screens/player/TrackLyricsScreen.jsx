import React, { useCallback, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import usePlayer from '../../hooks/usePlayer';
import { Lyric } from '../../lib/reactNativeLyric';
import { formatPlayerTime, hasSyncedLrc, resolveTrackLrc, resolveTrackStaticLyrics } from '../../utils/player';

export default function TrackLyricsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { currentTrack, isPlaying, progressSeconds } = usePlayer();
  const lyricRef = useRef(null);
  const lrc = useMemo(() => resolveTrackLrc(currentTrack), [currentTrack]);
  const plainLyrics = useMemo(() => resolveTrackStaticLyrics(currentTrack), [currentTrack]);
  const hasTimedLyrics = hasSyncedLrc(lrc);
  const lyricHeight = Math.max(screenHeight - insets.top - insets.bottom - 190, 280);

  const handleScrollToCurrentLine = useCallback(() => {
    lyricRef.current?.scrollToCurrentLine?.();
  }, []);

  const lineRenderer = useCallback(
    ({ lrcLine, active }) => (
      <Text style={[styles.lyricLine, active ? styles.lyricLineActive : styles.lyricLineInactive]}>
        {lrcLine.content || '...'}
      </Text>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070707" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.headerButton} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>SYNCED LYRICS</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentTrack?.title || 'No track playing'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {currentTrack?.artistName || 'Choose a track to see lyrics'}
          </Text>
        </View>

        {hasTimedLyrics ? (
          <Pressable style={styles.headerButton} onPress={handleScrollToCurrentLine} hitSlop={8}>
            <Ionicons name="locate-outline" size={20} color="#ffffff" />
          </Pressable>
        ) : (
          <View style={styles.headerButtonSpacer} />
        )}
      </View>

      {!currentTrack ? (
        <View style={styles.centerState}>
          <Ionicons name="musical-notes-outline" size={26} color="#6d6d6d" />
          <Text style={styles.stateTitle}>No track playing</Text>
          <Text style={styles.stateText}>Start playback from any album, artist, or playlist to open synced lyrics here.</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.metaBar}>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>{isPlaying ? 'Playing' : 'Paused'}</Text>
            </View>
            <Text style={styles.metaTime}>{formatPlayerTime(progressSeconds)}</Text>
          </View>

          {hasTimedLyrics ? (
            <Lyric
              ref={lyricRef}
              lrc={lrc}
              currentTime={progressSeconds * 1000}
              height={lyricHeight}
              lineHeight={34}
              activeLineHeight={42}
              style={styles.lyricView}
              lineRenderer={lineRenderer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.fallbackCard}>
              <Text style={styles.fallbackTitle}>Synced LRC unavailable</Text>
              <Text style={styles.fallbackText}>
                This track does not have timed lyric data in the playback response.
              </Text>

              <ScrollView style={styles.plainLyricsScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.plainLyricsText}>
                  {plainLyrics || 'No lyric text available for this track.'}
                </Text>
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070707',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#242424',
  },
  headerButtonSpacer: {
    width: 40,
    height: 40,
  },
  headerCopy: {
    flex: 1,
    marginHorizontal: 14,
  },
  headerEyebrow: {
    color: '#818181',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 4,
  },
  headerSubtitle: {
    color: '#a5a5a5',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stateTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  stateText: {
    color: '#9a9a9a',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metaPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
  },
  metaPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  metaTime: {
    color: '#a0a0a0',
    fontSize: 12,
    fontWeight: '600',
  },
  lyricView: {
    width: '100%',
  },
  lyricLine: {
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  lyricLineActive: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
  },
  lyricLineInactive: {
    color: '#666666',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  fallbackCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#212121',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  fallbackTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  fallbackText: {
    color: '#9f9f9f',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  plainLyricsScroll: {
    marginTop: 16,
  },
  plainLyricsText: {
    color: '#dddddd',
    fontSize: 15,
    lineHeight: 24,
  },
});
