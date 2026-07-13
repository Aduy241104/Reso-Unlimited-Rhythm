import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import genreService from '../../services/genreService';
import theme from '../../theme';
import { getInitials, resolveImageUri } from '../../utils/media';

const FALLBACK_GENRE_COLORS = [
  '#E13300',
  '#1E3264',
  '#8D67AB',
  '#148A08',
  '#E8115B',
  '#27856A',
  '#BA5D07',
  '#BC5900',
  '#503750',
  '#777777',
];

const readText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return fallback;
};

const getFallbackColor = (genreId, genreName) => {
  const source = `${genreId || genreName || 'genre'}`;
  const hash = Array.from(source).reduce((total, character) => total + character.charCodeAt(0), 0);

  return FALLBACK_GENRE_COLORS[hash % FALLBACK_GENRE_COLORS.length];
};

const resolveAccentColor = (genreColor, genreId, genreName) => {
  const directColor = typeof genreColor === 'string' ? genreColor.trim() : '';
  return directColor || getFallbackColor(genreId, genreName);
};

const Artwork = ({ uri, label }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.trackArtwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.trackArtwork, styles.trackArtworkFallback]}>
      <Text style={styles.trackArtworkFallbackText}>{getInitials(label)}</Text>
    </View>
  );
};

const HeroArtwork = ({ label, imageUri, accentColor }) => {
  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.heroArtworkImage} resizeMode="cover" />;
  }

  return (
    <View style={[styles.heroArtworkFallback, { backgroundColor: accentColor, borderColor: `${accentColor}AA` }]}>
      <Text style={styles.heroArtworkText}>{getInitials(label)}</Text>
    </View>
  );
};

const TrackRow = ({ item, index, onPress, accentColor }) => {
  const title = readText(item?.title, 'Bài hát không xác định');
  const subtitle = readText(item?.artistName || item?.subtitle, 'Nghệ sĩ không xác định');

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.trackRow}>
      <View style={styles.trackIndexWrap}>
        <Text style={[styles.trackIndex, { color: accentColor }]}>{index + 1}</Text>
      </View>

      <Artwork uri={item?.image || item?.coverImage || item?.avatar} label={title} />

      <View style={styles.trackContent}>
        <Text numberOfLines={1} style={styles.trackTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.trackSubtitle}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.trackArrowWrap, { backgroundColor: `${accentColor}20` }]}>
        <Ionicons color="#ffffff" name="chevron-forward" size={16} />
      </View>
    </TouchableOpacity>
  );
};

export default function GenreDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { genreId, genreName, genreImage, genreColor } = route?.params || {};
  const headerTitle = useMemo(() => readText(genreName, 'Thể loại'), [genreName]);
  const accentColor = useMemo(
    () => resolveAccentColor(genreColor, genreId, genreName),
    [genreColor, genreId, genreName]
  );
  const heroImageUri = useMemo(() => resolveImageUri(genreImage), [genreImage]);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadGenreTracks = useCallback(async () => {
    if (!genreId) {
      setTracks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const data = await genreService.getGenreTracks(genreId);
      const normalizedTracks = data?.tracks || data?.data?.tracks || data?.data?.data || data?.data || [];

      setTracks(Array.isArray(normalizedTracks) ? normalizedTracks : []);
    } catch (error) {
      console.error('Failed to fetch genre tracks:', error);
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  }, [genreId]);

  useEffect(() => {
    loadGenreTracks();
  }, [loadGenreTracks]);

  const trackCountLabel = useMemo(() => `${tracks.length} bài hát`, [tracks.length]);

  const handlePressTrack = useCallback(
    (track) => {
      const trackId = track?.entityId || track?.id;

      if (!trackId) {
        return;
      }

      navigation.navigate('TrackDetail', {
        trackId,
        entityId: trackId,
        entityType: 'track',
        initialTitle: track?.title || 'Chi tiết bài hát',
      });
    },
    [navigation]
  );

  const renderTrack = useCallback(
    ({ item, index }) => (
      <TrackRow
        accentColor={accentColor}
        index={index}
        item={item}
        onPress={() => handlePressTrack(item)}
      />
    ),
    [accentColor, handlePressTrack]
  );

  const renderHeader = useCallback(
    () => (
      <View>
        <View style={styles.heroSection}>
          <View style={[styles.heroGlow, { backgroundColor: `${accentColor}33` }]} />
          <View style={styles.heroContent}>
            <HeroArtwork accentColor={accentColor} imageUri={heroImageUri} label={headerTitle} />

            <View style={styles.heroTextWrap}>
              <View style={[styles.genreBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.genreBadgeText}>GENRE</Text>
              </View>

              <Text numberOfLines={2} style={styles.heroTitle}>
                {headerTitle}
              </Text>

              <Text style={styles.heroMeta}>
                {isLoading ? 'Đang tải danh sách bài hát...' : trackCountLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Các bài hát nổi bật</Text>
          {!isLoading && tracks.length > 0 ? (
            <Text style={[styles.sectionMeta, { color: accentColor }]}>{trackCountLabel}</Text>
          ) : null}
        </View>
      </View>
    ),
    [accentColor, headerTitle, heroImageUri, isLoading, trackCountLabel, tracks.length]
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { borderColor: `${accentColor}66` }]}
        >
          <Ionicons color="#ffffff" name="arrow-back" size={20} />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.topBarTitle}>
          {headerTitle}
        </Text>

        <View style={styles.topBarSpacer} />
      </View>

      <FlatList
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) + 28 },
        ]}
        data={tracks}
        keyExtractor={(item, index) => String(item?.entityId || item?.id || `track-${index}`)}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerState}>
              <AppLoader color="#ffffff" size="large" />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Chưa có bài hát</Text>
              <Text style={styles.emptyText}>Chưa có bài hát trong thể loại này.</Text>
            </View>
          )
        }
        ListHeaderComponent={renderHeader}
        renderItem={renderTrack}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#000000',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    borderWidth: 1,
  },
  topBarTitle: {
    flex: 1,
    marginHorizontal: 12,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
  },
  topBarSpacer: {
    width: 38,
    height: 38,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  heroSection: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    marginTop: 6,
    marginBottom: 22,
    padding: 18,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroArtworkImage: {
    width: 88,
    height: 88,
    borderRadius: 18,
    transform: [{ rotate: '-8deg' }],
  },
  heroArtworkFallback: {
    width: 88,
    height: 88,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
    borderWidth: 1,
  },
  heroArtworkText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    transform: [{ rotate: '8deg' }],
  },
  heroTextWrap: {
    flex: 1,
    marginLeft: 18,
  },
  genreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  genreBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    lineHeight: 34,
  },
  heroMeta: {
    marginTop: 8,
    color: '#a3a3a3',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semibold,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  trackIndexWrap: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },
  trackIndex: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semibold,
  },
  trackArtwork: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#202020',
  },
  trackArtworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackArtworkFallbackText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
  },
  trackContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: theme.typography.weights.semibold,
  },
  trackSubtitle: {
    marginTop: 4,
    color: '#9a9a9a',
    fontSize: 13,
  },
  trackArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerState: {
    paddingTop: 44,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 22,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
  },
  emptyText: {
    marginTop: 8,
    color: '#9f9f9f',
    fontSize: 14,
    textAlign: 'center',
  },
});
