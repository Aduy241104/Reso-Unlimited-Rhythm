import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import usePlayer from '../../hooks/usePlayer';
import { getInitials } from '../../utils/media';

const Artwork = ({ track }) => {
  if (track?.image) {
    return <Image source={{ uri: track.image }} style={styles.artwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.artwork, styles.artworkFallback]}>
      <Text style={styles.artworkFallbackText}>{getInitials(track?.title)}</Text>
    </View>
  );
};

export default function MiniPlayer({ onPress }) {
  const {
    currentTrack,
    currentError,
    isBuffering,
    isPlaying,
    progressRatio,
    togglePlayback,
    playNext,
    hasNext,
  } = usePlayer();

  if (!currentTrack) {
    return null;
  }

  const handleTogglePlayback = (event) => {
    event.stopPropagation();
    togglePlayback();
  };

  const handlePlayNext = (event) => {
    event.stopPropagation();
    playNext();
  };

  return (
    <View style={styles.outer}>
      <View style={styles.shadowContainer}>
        <Pressable style={styles.container} onPress={onPress}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(progressRatio, 0.04) * 100}%` }]} />
          </View>

          <Artwork track={currentTrack} />

          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {currentError || (isBuffering ? 'Đang tải âm thanh...' : currentTrack.artistName)}
            </Text>
          </View>

          <Pressable style={styles.iconButton} onPress={handleTogglePlayback} hitSlop={8}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#ffffff" />
          </Pressable>

          <Pressable
            style={[styles.iconButton, !hasNext && styles.iconButtonDisabled]}
            onPress={handlePlayNext}
            hitSlop={8}
            disabled={!hasNext}
          >
            <Ionicons name="play-skip-forward" size={18} color={hasNext ? '#ffffff' : '#5f5f5f'} />
          </Pressable>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  shadowContainer: {
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 12,
  },
  container: {
    minHeight: 64,
    borderRadius: 10,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#292929',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: '#262626',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#1ed760',
  },
  artwork: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#242424',
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkFallbackText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    color: '#a3a3a3',
    fontSize: 11,
    marginTop: 3,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.6,
  },
});
