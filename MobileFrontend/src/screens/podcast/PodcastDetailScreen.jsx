import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AppHeader from '../../components/common/AppHeader';
import AppLoader from '../../components/common/AppLoader';
import { usePlayQueue } from '../../hooks/usePlayer';
import podcastService from '../../services/podcastService';
import theme from '../../theme';
import {
  formatCompactNumber,
  formatDateLabel,
  formatTrackDuration,
  getInitials,
} from '../../utils/media';

const PodcastArtwork = ({ podcast }) => (
  podcast?.image ? (
    <Image source={{ uri: podcast.image }} style={styles.artwork} />
  ) : (
    <View style={[styles.artwork, styles.artworkFallback]}>
      <Text style={styles.artworkInitials}>{getInitials(podcast?.title)}</Text>
    </View>
  )
);

export default function PodcastDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const playQueue = usePlayQueue();
  const { podcastId, initialTitle } = route.params || {};
  const [podcast, setPodcast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPodcast = useCallback(async () => {
    if (!podcastId) {
      setErrorMessage('Không tìm thấy Podcast cần xem.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await podcastService.getPublic(podcastId);
      setPodcast(result);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error?.message || 'Không thể tải chi tiết Podcast lúc này.');
    } finally {
      setIsLoading(false);
    }
  }, [podcastId]);

  useEffect(() => {
    loadPodcast();
  }, [loadPodcast]);

  const handlePlay = useCallback(() => {
    if (!podcast?.audioUrl) {
      return;
    }

    playQueue([podcast], 0, { collectionType: 'podcast', shuffle: false });
  }, [playQueue, podcast]);

  return (
    <View style={styles.container}>
      <AppHeader
        title={podcast?.title || initialTitle || 'Chi tiết Podcast'}
        onBack={() => navigation.goBack()}
      />

      {isLoading && !podcast ? (
        <View style={styles.loader}>
          <AppLoader />
        </View>
      ) : errorMessage && !podcast ? (
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={38} color="#8f8994" />
          <Text style={styles.errorTitle}>Không thể tải Podcast</Text>
          <Text style={styles.errorDescription}>{errorMessage}</Text>
          <Pressable onPress={loadPodcast} style={styles.retryButton}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PodcastArtwork podcast={podcast} />
          <Text style={styles.eyebrow}>RESO PODCAST</Text>
          <Text style={styles.title}>{podcast.title}</Text>
          <Text style={styles.creator}>{podcast.artistName}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatTrackDuration(podcast.duration)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>
              {formatCompactNumber(podcast.stats?.totalListen)} lượt nghe
            </Text>
            {podcast.releaseDate ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{formatDateLabel(podcast.releaseDate)}</Text>
              </>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Phát ${podcast.title}`}
            disabled={!podcast.audioUrl}
            onPress={handlePlay}
            style={({ pressed }) => [
              styles.playButton,
              !podcast.audioUrl && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="play" size={21} color={theme.colors.background} />
            <Text style={styles.playButtonText}>Phát Podcast</Text>
          </Pressable>

          {podcast.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Giới thiệu</Text>
              <Text style={styles.description}>{podcast.description}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.containerPadding,
    paddingTop: 28,
    paddingBottom: 120,
  },
  artwork: {
    width: 236,
    height: 236,
    borderRadius: 22,
    backgroundColor: '#302b39',
  },
  artworkFallback: { alignItems: 'center', justifyContent: 'center' },
  artworkInitials: { color: theme.colors.text, fontSize: 54, fontWeight: '800' },
  eyebrow: {
    marginTop: 24,
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    marginTop: 8,
    color: theme.colors.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
  },
  creator: { marginTop: 7, color: '#c4bcc9', fontSize: 14 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  metaText: { color: '#8f8994', fontSize: 12 },
  metaDot: { marginHorizontal: 7, color: '#8f8994', fontSize: 12 },
  playButton: {
    minWidth: 178,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
  },
  playButtonText: { color: theme.colors.background, fontSize: 14, fontWeight: '800' },
  disabledButton: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }] },
  descriptionSection: {
    width: '100%',
    marginTop: 34,
    padding: 18,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  description: { marginTop: 9, color: '#b8b2c0', fontSize: 13, lineHeight: 21 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errorTitle: { marginTop: 14, color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  errorDescription: { marginTop: 7, color: '#a39aa8', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
