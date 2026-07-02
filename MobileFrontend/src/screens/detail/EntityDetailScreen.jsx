import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import usePlayer from '../../hooks/usePlayer';
import albumService from '../../services/albumService';
import artistService from '../../services/artistService';
import playlistService from '../../services/playlistService';
import trackService from '../../services/trackService';
import { getErrorMessage, getInitials, resolveImageUri } from '../../utils/media';
import { buildPlayableQueue, normalizePlayerTrack } from '../../utils/player';

const accentPalette = ['#111111', '#2f2f2f', '#4a4a4a', '#686868', '#8a8a8a'];

const detailFetchers = {
  album: ({ entityId }) => albumService.getAlbumDetail(entityId),
  artist: ({ entityId }) => artistService.getArtistDetail(entityId),
  playlist: ({ entityId }) => playlistService.getPlaylistDetail(entityId),
  track: ({ entityId }) => trackService.getTrackDetail(entityId),
  topTrackCollection: (params) => trackService.getTopTrackCollectionDetail(params),
};

const getDisplayText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value);
    return normalizedValue.trim() ? normalizedValue : fallback;
  }

  if (value && typeof value === 'object') {
    if (typeof value.value === 'string' || typeof value.value === 'number') {
      const normalizedValue = String(value.value);
      return normalizedValue.trim() ? normalizedValue : fallback;
    }

    if (typeof value.label === 'string' || typeof value.label === 'number') {
      const normalizedValue = String(value.label);
      return normalizedValue.trim() ? normalizedValue : fallback;
    }
  }

  return fallback;
};

const Artwork = ({ uri, label, style, textStyle }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={[styles.heroImage, style]} resizeMode="cover" />;
  }

  return (
    <View style={[styles.heroImage, styles.heroImageFallback, style]}>
      <Text style={[styles.heroImageFallbackText, textStyle]}>{getInitials(label)}</Text>
    </View>
  );
};

const TrackListItem = ({ item, index, onPress, showIndex = true }) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const title = getDisplayText(item?.title, 'Unknown item');
  const subtitle = getDisplayText(item?.subtitle);
  const metaText = getDisplayText(item?.meta);

  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.8}>
      {showIndex ? (
        <View style={[styles.listIndex, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` }]}>
          <Text style={[styles.listIndexText, { color: accentColor }]}>{index + 1}</Text>
        </View>
      ) : null}
      <Artwork uri={item.image} label={title} style={styles.listArtwork} textStyle={styles.listArtworkText} />
      <View style={styles.listContent}>
        <Text style={styles.listTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.listSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={styles.listMeta}>{metaText}</Text>
    </TouchableOpacity>
  );
};

export default function EntityDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { playQueue } = usePlayer();
  const { entityId, entityType, initialTitle, period, date, month, limit } = route.params || {};
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDetail = useCallback(async () => {
    if (!entityId || !entityType || !detailFetchers[entityType]) {
      setDetail(null);
      setErrorMessage('Detail information is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await detailFetchers[entityType]({ entityId, period, date, month, limit });
      setDetail(result);
    } catch (error) {
      setDetail(null);
      setErrorMessage(getErrorMessage(error, 'Unable to load detail right now.'));
    } finally {
      setIsLoading(false);
    }
  }, [date, entityId, entityType, limit, month, period]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const playableQueue = useMemo(() => {
    if (!detail) {
      return [];
    }

    if (detail.type === 'track') {
      return [normalizePlayerTrack(detail)];
    }

    return buildPlayableQueue(detail.items);
  }, [detail]);

  const handleOpenNestedDetail = useCallback(
    (nextType, nextId, nextTitle) => {
      if (!nextType || !nextId) {
        return;
      }

      navigation.push('EntityDetail', {
        entityType: nextType,
        entityId: nextId,
        initialTitle: nextTitle,
      });
    },
    [navigation]
  );

  const handlePlayAll = useCallback((startIndex = 0) => {
    if (playableQueue.length === 0) {
      return;
    }

    playQueue(playableQueue, startIndex);
  }, [playQueue, playableQueue]);

  const handleListItemPress = useCallback((item, index) => {
    if (item?.entityType === 'track') {
      handlePlayAll(index);
      return;
    }

    handleOpenNestedDetail(item?.entityType, item?.entityId, item?.title);
  }, [handleOpenNestedDetail, handlePlayAll]);

  const headerTitle = getDisplayText(detail?.title, getDisplayText(initialTitle, 'Detail'));
  const detailTitle = getDisplayText(detail?.title, headerTitle);
  const detailSubtitle = getDisplayText(detail?.subtitle);
  const detailDescription = getDisplayText(detail?.description);
  const detailExtraText = getDisplayText(detail?.extraText);
  const badgeLabel = detail?.badgeLabel || (
    entityType === 'album'
      ? 'ALBUM'
      : entityType === 'artist'
      ? 'ARTIST'
      : entityType === 'playlist'
        ? 'PLAYLIST'
        : entityType === 'topTrackCollection'
          ? 'CHART'
          : 'TRACK'
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={loadDetail} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingBottom: 32 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Artwork uri={detail?.image} label={detailTitle} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
            <Text style={styles.heroTitle}>{detailTitle}</Text>
            {detailSubtitle ? <Text style={styles.heroSubtitle}>{detailSubtitle}</Text> : null}
            {detailDescription ? (
              <Text style={styles.heroDescription}>
                {detailDescription}
              </Text>
            ) : null}

            {playableQueue.length > 0 ? (
              <TouchableOpacity style={styles.playAction} onPress={() => handlePlayAll()} activeOpacity={0.85}>
                <Ionicons name="play" size={16} color="#000000" />
                <Text style={styles.playActionText}>
                  {detail?.type === 'track' ? 'Play now' : `Play ${playableQueue.length} tracks`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {Array.isArray(detail?.tags) && detail.tags.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsWrap}>
                {detail.tags.map((tag, index) => (
                  <View key={`${getDisplayText(tag, 'tag')}-${index}`} style={styles.tagPill}>
                    <Text style={styles.tagText}>{getDisplayText(tag)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {detail?.extraTitle && detailExtraText ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{getDisplayText(detail.extraTitle)}</Text>
              <View style={styles.panel}>
                <Text style={styles.extraText}>{detailExtraText}</Text>
              </View>
            </View>
          ) : null}

          {Array.isArray(detail?.items) && detail.items.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{getDisplayText(detail.itemsTitle, 'Items')}</Text>
              <View style={styles.panel}>
                {detail.items.map((item, index) => (
                  <TrackListItem
                    key={`${item.entityId || item.id}-${index}`}
                    item={item}
                    index={index}
                    showIndex={detail?.type !== 'topTrackCollection'}
                    onPress={() => handleListItemPress(item, index)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
    backgroundColor: '#000000',
  },
  backButton: {
    minWidth: 56,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 56,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  heroImage: {
    width: '100%',
    height: 210,
    borderRadius: 12,
    backgroundColor: '#202020',
  },
  heroImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageFallbackText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#1c1c1c',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 12,
  },
  heroSubtitle: {
    color: '#d4d4d4',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 5,
  },
  heroDescription: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
  },
  playAction: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1ed760',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  playActionText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  panel: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#141414',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  tagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  extraText: {
    color: '#cfcfcf',
    fontSize: 12,
    lineHeight: 19,
    padding: 14,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  listIndex: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  listIndexText: {
    fontSize: 10,
    fontWeight: '800',
  },
  listArtwork: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 10,
  },
  listArtworkText: {
    fontSize: 13,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  listSubtitle: {
    color: '#a3a3a3',
    fontSize: 11,
    marginTop: 3,
  },
  listMeta: {
    color: '#d4d4d4',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 8,
  },
});
