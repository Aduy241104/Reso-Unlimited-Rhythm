import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackQueueBottomSheet from '../../components/player/TrackQueueBottomSheet';
import usePlayer from '../../hooks/usePlayer';
import { getInitials } from '../../utils/media';
import { formatPlayerTime, getPlayableDuration } from '../../utils/player';

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

export default function PlayerSheetScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const {
    currentTrack,
    currentError,
    isBuffering,
    queue,
    currentIndex,
    isPlaying,
    progressSeconds,
    progressRatio,
    hasNext,
    hasPrevious,
    togglePlayback,
    playNext,
    playPrevious,
  } = usePlayer();
  const duration = getPlayableDuration(currentTrack);

  if (!currentTrack) {
    return (
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={() => navigation.goBack()} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) + 18 }]}>
          <View style={styles.handle} />
          <Text style={styles.emptyTitle}>No track selected</Text>
          <Text style={styles.emptyText}>Choose a song from a playlist, artist, or chart to show the player here.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.backdropTap} onPress={() => navigation.goBack()} />

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) + 18 }]}>
        <View style={styles.header}>
          <View style={styles.handle} />
          <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-down" size={22} color="#ffffff" />
          </Pressable>
        </View>

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

        <View style={styles.controls}>
          <Pressable
            style={[styles.secondaryButton, !hasPrevious && styles.secondaryButtonDisabled]}
            onPress={playPrevious}
            disabled={!hasPrevious}
          >
            <Ionicons name="play-skip-back" size={24} color={hasPrevious ? '#ffffff' : '#5f5f5f'} />
          </Pressable>

          <Pressable style={styles.primaryButton} onPress={togglePlayback}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color="#000000" />
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, !hasNext && styles.secondaryButtonDisabled]}
            onPress={playNext}
            disabled={!hasNext}
          >
            <Ionicons name="play-skip-forward" size={24} color={hasNext ? '#ffffff' : '#5f5f5f'} />
          </Pressable>
        </View>

        <View style={styles.queuePanel}>
          <View style={styles.queuePanelCopy}>
            <Text style={styles.queuePanelTitle}>Playing Queue</Text>
            <Text style={styles.queuePanelText}>
              {queue.length} tracks queued
              {currentIndex >= 0 ? ` - Track ${currentIndex + 1} selected` : ''}
            </Text>
          </View>

          <Pressable style={styles.queuePanelButton} onPress={() => setIsQueueVisible(true)}>
            <Ionicons name="list" size={16} color="#ffffff" />
            <Text style={styles.queuePanelButtonText}>Open</Text>
          </Pressable>
        </View>
      </View>

      <TrackQueueBottomSheet
        visible={isQueueVisible}
        onClose={() => setIsQueueVisible(false)}
        title="Playing Queue"
        subtitle={`${queue.length} track${queue.length === 1 ? '' : 's'} in this session`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    maxHeight: '92%',
    minHeight: '82%',
    backgroundColor: '#090909',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  header: {
    marginBottom: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#4a4a4a',
    marginBottom: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
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
  controls: {
    marginTop: 22,
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
  queuePanel: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 20,
    backgroundColor: '#131313',
    borderWidth: 1,
    borderColor: '#232323',
  },
  queuePanelCopy: {
    flex: 1,
    marginRight: 12,
  },
  queuePanelTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  queuePanelText: {
    color: '#8c8c8c',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  queuePanelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#1f1f1f',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  queuePanelButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyText: {
    color: '#9d9d9d',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
});
