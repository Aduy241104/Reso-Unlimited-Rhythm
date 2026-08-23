import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/common/AppHeader';
import AppLoader from '../../components/common/AppLoader';
import { usePlayQueue } from '../../hooks/usePlayer';
import podcastService from '../../services/podcastService';
import theme from '../../theme';
import { formatCompactNumber, formatTrackDuration, getInitials } from '../../utils/media';

const PodcastArtwork = ({ podcast }) => {
  if (podcast.image) {
    return (
      <Image
        source={podcast.image}
        style={styles.artwork}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <View style={[styles.artwork, styles.artworkFallback]}>
      <Text style={styles.artworkInitials}>{getInitials(podcast.title)}</Text>
    </View>
  );
};

const PodcastCard = ({ podcast, onPress, onPlayPress }) => {
  const listenCount = Number(podcast.stats?.totalListen || 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Phát ${podcast.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <PodcastArtwork podcast={podcast} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{podcast.title}</Text>
        <Text style={styles.creator} numberOfLines={1}>{podcast.artistName}</Text>
        <Text style={styles.metadata} numberOfLines={1}>
          {formatTrackDuration(podcast.duration)} · {formatCompactNumber(listenCount)} lượt nghe
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Phát ${podcast.title}`}
        hitSlop={8}
        onPress={onPlayPress}
        style={({ pressed }) => [styles.playButton, pressed && styles.cardPressed]}
      >
        <Ionicons name="play" size={18} color={theme.colors.background} />
      </Pressable>
    </Pressable>
  );
};

const mergePodcasts = (current, incoming) => {
  const merged = [...current, ...incoming];
  const seen = new Set();

  return merged.filter((podcast) => {
    const id = String(podcast?.id || '');
    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
};

export default function PodcastScreen() {
  const navigation = useNavigation();
  const playQueue = usePlayQueue();
  const [podcasts, setPodcasts] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const pageRef = useRef(1);
  const paginationRef = useRef(null);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const hasMore = page < Number(pagination?.totalPages || 0);

  const loadPodcasts = useCallback(async ({ refresh = false, loadMore = false } = {}) => {
    if (loadMore && (
      loadingRef.current ||
      loadingMoreRef.current ||
      pageRef.current >= Number(paginationRef.current?.totalPages || 0)
    )) {
      return;
    }

    const nextPage = loadMore ? pageRef.current + 1 : 1;

    if (refresh) {
      setIsRefreshing(true);
      loadingRef.current = true;
    } else if (loadMore) {
      setIsLoadingMore(true);
      loadingMoreRef.current = true;
    } else {
      setIsLoading(true);
      loadingRef.current = true;
    }

    try {
      const result = await podcastService.listPublic({ page: nextPage, limit: 20 });
      const nextPodcasts = result.podcasts || [];

      setPodcasts((current) => (loadMore ? mergePodcasts(current, nextPodcasts) : nextPodcasts));
      setPage(nextPage);
      pageRef.current = nextPage;
      setPagination(result.pagination || null);
      paginationRef.current = result.pagination || null;
      setErrorMessage('');
    } catch (error) {
      if (!loadMore) {
        setErrorMessage(error?.message || 'Không thể tải danh sách Podcast lúc này.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
      loadingRef.current = false;
      loadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadPodcasts();
  }, [loadPodcasts]);

  const handleOpenPodcast = useCallback((podcast) => {
    navigation.navigate('PodcastDetail', {
      podcastId: podcast.id,
      initialTitle: podcast.title,
    });
  }, [navigation]);

  const handlePlayPodcast = useCallback((_, index) => {
    playQueue(podcasts, index, { collectionType: 'podcast', shuffle: false });
  }, [playQueue, podcasts]);

  return (
    <View style={styles.container}>
      <AppHeader title="Podcast" />
      <FlatList
        data={podcasts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <PodcastCard
            podcast={item}
            onPress={() => handleOpenPodcast(item)}
            onPlayPress={() => handlePlayPodcast(item, index)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadPodcasts({ refresh: true })}
            tintColor={theme.colors.primaryLight}
          />
        )}
        ListHeaderComponent={(
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="mic" size={24} color={theme.colors.primaryLight} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>RESO ORIGINALS</Text>
              <Text style={styles.heroTitle}>Khám phá Podcast</Text>
              <Text style={styles.heroDescription}>
                Những câu chuyện và nội dung âm thanh mới nhất từ cộng đồng Reso.
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            {isLoading ? <AppLoader /> : (
              <>
                <Ionicons name={errorMessage ? 'cloud-offline-outline' : 'mic-outline'} size={36} color="#8f8994" />
                <Text style={styles.emptyTitle}>{errorMessage ? 'Không thể tải Podcast' : 'Chưa có Podcast'}</Text>
                <Text style={styles.emptyDescription}>
                  {errorMessage || 'Các Podcast công khai sẽ xuất hiện ở đây.'}
                </Text>
                {errorMessage ? (
                  <Pressable onPress={() => loadPodcasts()} style={styles.retryButton}>
                    <Text style={styles.retryText}>Thử lại</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        )}
        ListFooterComponent={hasMore || isLoadingMore ? (
          <View style={styles.footer}>
            {isLoadingMore ? (
              <ActivityIndicator color={theme.colors.primaryLight} />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem thêm Podcast"
                onPress={() => loadPodcasts({ loadMore: true })}
                style={({ pressed }) => [styles.loadMoreButton, pressed && styles.cardPressed]}
              >
                <Text style={styles.loadMoreText}>Xem thêm</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: {
    paddingHorizontal: theme.spacing.containerPadding,
    paddingTop: 18,
    paddingBottom: 120,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#211b35',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.28)',
  },
  heroIcon: {
    width: 52,
    height: 52,
    marginRight: 14,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
  },
  heroCopy: { flex: 1 },
  eyebrow: {
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: '800',
  },
  heroDescription: {
    marginTop: 5,
    color: '#b8b2c0',
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  artwork: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#302b39' },
  artworkFallback: { alignItems: 'center', justifyContent: 'center' },
  artworkInitials: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  cardContent: { flex: 1, minWidth: 0, marginHorizontal: 12 },
  cardTitle: { color: theme.colors.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  creator: { marginTop: 4, color: '#c4bcc9', fontSize: 12 },
  metadata: { marginTop: 5, color: '#8f8994', fontSize: 11 },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  emptyState: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 14, color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  emptyDescription: { marginTop: 7, color: '#a39aa8', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  retryButton: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.colors.primary },
  retryText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  footer: { alignItems: 'center', paddingTop: 8, paddingBottom: 18 },
  loadMoreButton: {
    minWidth: 132,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.45)',
  },
  loadMoreText: { color: theme.colors.primaryLight, fontSize: 13, fontWeight: '800' },
});
