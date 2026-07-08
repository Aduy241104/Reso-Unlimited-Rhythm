import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
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
import TrackActionsBottomSheet from '../../components/detail/TrackActionsBottomSheet';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import usePlayer from '../../hooks/usePlayer';
import albumService from '../../services/albumService';
import artistService from '../../services/artistService';
import playlistService from '../../services/playlistService';
import trackService from '../../services/trackService';
import { getErrorMessage, getInitials, resolveImageUri } from '../../utils/media';
import { buildPlayableQueue, normalizePlayerTrack } from '../../utils/player';

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

const isExplicitTrack = (item) => {
  return Boolean(
    item?.explicit ||
    item?.isExplicit ||
    item?.isExplicitContent ||
    item?.contentRating === 'explicit'
  );
};

const Artwork = ({ uri, label, style, textStyle, rounded = false }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return (
      <Image
        source={ { uri: imageUri } }
        style={ [styles.artwork, rounded && styles.roundedArtwork, style] }
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={ [styles.artwork, styles.artworkFallback, rounded && styles.roundedArtwork, style] }>
      <Text style={ [styles.artworkFallbackText, textStyle] }>{ getInitials(label) }</Text>
    </View>
  );
};

const TrackListItem = ({ item, index, onMorePress, onPress, showIndex = false }) => {
  const title = getDisplayText(item?.title, 'Unknown item');
  const subtitle = getDisplayText(item?.subtitle || item?.artistName);
  const explicit = isExplicitTrack(item);

  const handleMorePress = (event) => {
    event.stopPropagation?.();
    onMorePress?.();
  };

  return (
    <TouchableOpacity style={ styles.listItem } onPress={ onPress } activeOpacity={ 0.75 }>
      { showIndex ? (
        <Text style={ styles.listIndex }>{ index + 1 }</Text>
      ) : null }

      <View style={ styles.listContent }>
        <Text style={ styles.listTitle } numberOfLines={ 1 }>
          { title }
        </Text>

        <View style={ styles.listSubtitleRow }>
          { explicit ? (
            <View style={ styles.explicitBadge }>
              <Text style={ styles.explicitBadgeText }>E</Text>
            </View>
          ) : null }

          { subtitle ? (
            <Text style={ styles.listSubtitle } numberOfLines={ 1 }>
              { subtitle }
            </Text>
          ) : null }
        </View>
      </View>

      { onMorePress ? (
        <TouchableOpacity
          style={ styles.moreButton }
          activeOpacity={ 0.7 }
          onPress={ handleMorePress }
        >
          <Ionicons name="ellipsis-horizontal" size={ 18 } color="#9f9f9f" />
        </TouchableOpacity>
      ) : null }
    </TouchableOpacity>
  );
};

export default function EntityDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { playQueue } = usePlayer();

  const { entityId, entityType, initialTitle, period, date, month, limit } = route.params || {};
  const navigationState = navigation.getState?.();
  const currentRouteIndex = navigationState?.routes?.findIndex?.((item) => item.key === route.key) ?? -1;
  const previousRoute = currentRouteIndex > 0 ? navigationState?.routes?.[currentRouteIndex - 1] : null;
  const isOpenedFromPlayer = route.params?.source === 'player' || previousRoute?.name === 'PlayerSheet';

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTrackActionsVisible, setIsTrackActionsVisible] = useState(false);
  const [isAlbumFollowing, setIsAlbumFollowing] = useState(false);
  const [isAlbumFollowUpdating, setIsAlbumFollowUpdating] = useState(false);
  const [selectedTrackAction, setSelectedTrackAction] = useState({
    index: 0,
    track: null,
  });

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
      const result = await detailFetchers[entityType]({
        entityId,
        period,
        date,
        month,
        limit,
      });

      setDetail(result);

      const shouldLoadAlbumFollowState =
        (entityType === 'album' || result?.type === 'album') && isAuthenticated;

      if (shouldLoadAlbumFollowState) {
        try {
          const followState = await albumService.getAlbumFollowStatus(entityId);
          setIsAlbumFollowing(Boolean(followState?.isFollowing));
        } catch (followError) {
          if (followError?.status === 401) {
            setIsAlbumFollowing(false);
          } else {
            console.log('Unable to load album follow status.', followError?.message || followError);
          }
        }
      } else {
        setIsAlbumFollowing(false);
      }
    } catch (error) {
      setDetail(null);
      setIsAlbumFollowing(false);
      setErrorMessage(getErrorMessage(error, 'Unable to load detail right now.'));
    } finally {
      setIsLoading(false);
    }
  }, [date, entityId, entityType, isAuthenticated, limit, month, period]);

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
        source: isOpenedFromPlayer ? 'player' : undefined,
      });
    },
    [isOpenedFromPlayer, navigation]
  );

  const handlePlayAll = useCallback(
    (startIndex = 0) => {
      if (playableQueue.length === 0) {
        return;
      }

      playQueue(playableQueue, startIndex);
    },
    [playQueue, playableQueue]
  );

  const openTrackActions = useCallback((track, index = 0) => {
    if (!track) {
      return;
    }

    setSelectedTrackAction({
      index,
      track,
    });
    setIsTrackActionsVisible(true);
  }, []);

  const closeTrackActions = useCallback(() => {
    setIsTrackActionsVisible(false);
  }, []);

  const handleListItemPress = useCallback(
    (item, index) => {
      if (item?.entityType === 'track') {
        handlePlayAll(index);
        return;
      }

      handleOpenNestedDetail(item?.entityType, item?.entityId, item?.title);
    },
    [handleOpenNestedDetail, handlePlayAll]
  );

  const handleTrackActionPlayNow = useCallback(
    (track) => {
      if (!track) {
        return;
      }

      const startIndex = Number.isInteger(selectedTrackAction.index)
        ? selectedTrackAction.index
        : -1;

      if (startIndex >= 0 && startIndex < playableQueue.length) {
        handlePlayAll(startIndex);
        return;
      }

      playQueue([normalizePlayerTrack(track)], 0);
    },
    [handlePlayAll, playableQueue.length, playQueue, selectedTrackAction.index]
  );

  const handleTrackActionOpenTrackDetail = useCallback(
    (track) => {
      handleOpenNestedDetail('track', track?.entityId || track?.id, track?.title);
    },
    [handleOpenNestedDetail]
  );

  const handleTrackActionOpenArtistDetail = useCallback(
    (track) => {
      handleOpenNestedDetail('artist', track?.artistId, track?.artistName || track?.subtitle);
    },
    [handleOpenNestedDetail]
  );

  const handleTrackActionOpenAlbumDetail = useCallback(
    (track) => {
      handleOpenNestedDetail('album', track?.albumId, track?.albumTitle);
    },
    [handleOpenNestedDetail]
  );

  const headerTitle = getDisplayText(detail?.title, getDisplayText(initialTitle, 'Detail'));
  const detailTitle = getDisplayText(detail?.title, headerTitle);
  const detailSubtitle = getDisplayText(detail?.subtitle);
  const detailDescription = getDisplayText(detail?.description);
  const detailExtraText = getDisplayText(detail?.extraText);

  const selectedTrack = selectedTrackAction.track;
  const selectedTrackId = selectedTrack?.entityId || selectedTrack?.id || '';
  const currentDetailTrackId = detail?.entityId || detail?.id || '';

  const isCurrentTrackDetail =
    detail?.type === 'track' && selectedTrackId && selectedTrackId === currentDetailTrackId;

  const canOpenHeroTrackActions = detail?.type === 'track';

  const trackActionItems = useMemo(
    () => [
      {
        key: 'play-now',
        label: 'Play now',
        icon: 'play',
        description: 'Start playback from this track.',
        onPress: handleTrackActionPlayNow,
      },
      !isCurrentTrackDetail && selectedTrackId
        ? {
          key: 'open-track-detail',
          label: 'Open track detail',
          icon: 'disc-outline',
          description: 'View the full detail page for this track.',
          onPress: handleTrackActionOpenTrackDetail,
        }
        : null,
      selectedTrack?.artistId
        ? {
          key: 'open-artist-detail',
          label: 'Open artist detail',
          icon: 'person-outline',
          description: 'Jump to the artist detail page.',
          onPress: handleTrackActionOpenArtistDetail,
        }
        : null,
      selectedTrack?.albumId
        ? {
          key: 'open-album-detail',
          label: 'Open album detail',
          icon: 'albums-outline',
          description: 'Jump to the album detail page.',
          onPress: handleTrackActionOpenAlbumDetail,
        }
        : null,
    ].filter(Boolean),
    [
      handleTrackActionOpenAlbumDetail,
      handleTrackActionOpenArtistDetail,
      handleTrackActionOpenTrackDetail,
      handleTrackActionPlayNow,
      isCurrentTrackDetail,
      selectedTrack?.albumId,
      selectedTrack?.artistId,
      selectedTrackId,
    ]
  );

  const badgeLabel =
    detail?.badgeLabel ||
    (entityType === 'album'
      ? 'Album'
      : entityType === 'artist'
        ? 'Artist'
        : entityType === 'playlist'
          ? 'Playlist'
          : entityType === 'topTrackCollection'
            ? 'Chart'
            : 'Track');

  const isAlbum = detail?.type === 'album' || entityType === 'album';
  const isArtist = detail?.type === 'artist' || entityType === 'artist';

  const artistName = detailSubtitle || detail?.artistName || detail?.artist?.name || '';
  const artistImage =
    detail?.artistImage ||
    detail?.artistAvatar ||
    detail?.artist?.avatar ||
    detail?.artist?.image;

  const metaText = detailDescription || detailExtraText || '';

  const handleToggleAlbumFollow = useCallback(async () => {
    const targetAlbumId = detail?.entityId || detail?.id || entityId;

    if (!isAlbum || !targetAlbumId || isAlbumFollowUpdating) {
      return;
    }

    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    const previousValue = isAlbumFollowing;
    setIsAlbumFollowing(!previousValue);
    setIsAlbumFollowUpdating(true);

    try {
      const followState = await albumService.toggleAlbumFollow(targetAlbumId);
      setIsAlbumFollowing(Boolean(followState?.isFollowing));
    } catch (error) {
      setIsAlbumFollowing(previousValue);
      Alert.alert('Save album failed', getErrorMessage(error, 'Unable to update saved album right now.'));
    } finally {
      setIsAlbumFollowUpdating(false);
    }
  }, [
    detail?.entityId,
    detail?.id,
    entityId,
    isAlbum,
    isAlbumFollowUpdating,
    isAlbumFollowing,
    isAuthenticated,
    navigation,
  ]);

  return (
    <View style={ styles.container }>
      <StatusBar barStyle="light-content" backgroundColor="#d9272b" />

      <TouchableOpacity
        style={ [styles.backButton, { top: insets.top + (isOpenedFromPlayer ? 2 : 8) }] }
        onPress={ () => navigation.goBack() }
        activeOpacity={ 0.75 }
      >
        <Ionicons name="chevron-back" size={ 25 } color="#ffffff" />
      </TouchableOpacity>

      { isLoading ? (
        <View style={ styles.centerState }>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={ styles.centerState }>
          <ErrorState message={ errorMessage } />

          <TouchableOpacity style={ styles.retryButton } onPress={ loadDetail } activeOpacity={ 0.8 }>
            <Text style={ styles.retryButtonText }>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={ [
            styles.scrollBody,
            { paddingBottom: 40 + insets.bottom },
          ] }
          showsVerticalScrollIndicator={ false }
        >
          <View style={ [styles.heroSection, { paddingTop: insets.top + (isOpenedFromPlayer ? 12 : 48) }] }>
            <View style={ styles.heroRedLayer } />
            <View style={ styles.heroDarkLayer } />
            <View style={ styles.heroBlackLayer } />

            <Artwork
              uri={ detail?.image }
              label={ detailTitle }
              rounded={ isArtist }
              style={ [styles.heroImage, isArtist && styles.heroArtistImage] }
              textStyle={ styles.heroFallbackText }
            />

            <Text style={ styles.heroTitle } numberOfLines={ 2 }>
              { detailTitle }
            </Text>

            { artistName ? (
              <View style={ styles.artistRow }>
                <Artwork
                  uri={ artistImage }
                  label={ artistName }
                  rounded
                  style={ styles.artistAvatar }
                  textStyle={ styles.artistAvatarText }
                />

                <Text style={ styles.artistName } numberOfLines={ 1 }>
                  { artistName }
                </Text>
              </View>
            ) : null }

            <Text style={ styles.metaLine } numberOfLines={ 2 }>
              { badgeLabel }
              { metaText ? ` • ${metaText}` : '' }
            </Text>

            <View style={ styles.actionRow }>
              <TouchableOpacity style={ styles.deviceButton } activeOpacity={ 0.75 }>
                <Ionicons name="phone-portrait-outline" size={ 23 } color="#d6d6d6" />
              </TouchableOpacity>

              { isAlbum ? (
                <TouchableOpacity
                  style={ [
                    styles.iconActionButton,
                    isAlbumFollowUpdating && styles.iconActionButtonDisabled,
                  ] }
                  activeOpacity={ 0.75 }
                  onPress={ handleToggleAlbumFollow }
                  disabled={ isAlbumFollowUpdating }
                >
                  <Ionicons
                    name={ isAlbumFollowing ? 'checkmark-circle' : 'add-circle-outline' }
                    size={ 25 }
                    color={ isAlbumFollowing ? '#1ed760' : '#b3b3b3' }
                  />
                </TouchableOpacity>
              ) : null }

              <TouchableOpacity style={ styles.iconActionButton } activeOpacity={ 0.75 }>
                <Ionicons name="arrow-down-circle-outline" size={ 25 } color="#b3b3b3" />
              </TouchableOpacity>

              <TouchableOpacity
                style={ styles.iconActionButton }
                activeOpacity={ 0.75 }
                onPress={ canOpenHeroTrackActions ? () => openTrackActions(detail, 0) : undefined }
              >
                <Ionicons name="ellipsis-horizontal" size={ 24 } color="#b3b3b3" />
              </TouchableOpacity>

              <View style={ styles.actionSpacer } />

              <TouchableOpacity style={ styles.shuffleButton } activeOpacity={ 0.75 }>
                <Ionicons name="shuffle" size={ 26 } color="#1ed760" />
              </TouchableOpacity>

              { playableQueue.length > 0 ? (
                <TouchableOpacity
                  style={ styles.playCircleButton }
                  onPress={ () => handlePlayAll() }
                  activeOpacity={ 0.85 }
                >
                  <Ionicons name="play" size={ 30 } color="#000000" />
                </TouchableOpacity>
              ) : null }
            </View>
          </View>

          { Array.isArray(detail?.items) && detail.items.length > 0 ? (
            <View style={ styles.trackList }>
              { detail.items.map((item, index) => (
                <TrackListItem
                  key={ `${item.entityId || item.id}-${index}` }
                  item={ item }
                  index={ index }
                  showIndex={ detail?.type === 'topTrackCollection' }
                  onMorePress={
                    item?.entityType === 'track'
                      ? () => openTrackActions(item, index)
                      : undefined
                  }
                  onPress={ () => handleListItemPress(item, index) }
                />
              )) }
            </View>
          ) : null }

          { detail?.extraTitle && detailExtraText ? (
            <View style={ styles.section }>
              <Text style={ styles.sectionTitle }>{ getDisplayText(detail.extraTitle) }</Text>

              <View style={ styles.infoPanel }>
                <Text style={ styles.extraText }>{ detailExtraText }</Text>
              </View>
            </View>
          ) : null }

          { Array.isArray(detail?.tags) && detail.tags.length > 0 ? (
            <View style={ styles.section }>
              <Text style={ styles.sectionTitle }>Tags</Text>

              <View style={ styles.tagsWrap }>
                { detail.tags.map((tag, index) => (
                  <View key={ `${getDisplayText(tag, 'tag')}-${index}` } style={ styles.tagPill }>
                    <Text style={ styles.tagText }>{ getDisplayText(tag) }</Text>
                  </View>
                )) }
              </View>
            </View>
          ) : null }
        </ScrollView>
      ) }

      <TrackActionsBottomSheet
        visible={ isTrackActionsVisible }
        track={ selectedTrack }
        actions={ trackActionItems }
        onClose={ closeTrackActions }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#121212',
  },

  retryButton: {
    marginTop: 18,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 11,
    backgroundColor: '#ffffff',
  },

  retryButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },

  backButton: {
    position: 'absolute',
    left: 8,
    zIndex: 30,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollBody: {
    backgroundColor: '#121212',
  },

  heroSection: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#121212',
  },

  heroRedLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: '#d9272b',
  },

  heroDarkLayer: {
    position: 'absolute',
    top: 185,
    left: 0,
    right: 0,
    height: 170,
    backgroundColor: '#3a1f1f',
    opacity: 0.92,
  },

  heroBlackLayer: {
    position: 'absolute',
    top: 320,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#121212',
  },

  artwork: {
    backgroundColor: '#282828',
  },

  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  roundedArtwork: {
    borderRadius: 999,
  },

  artworkFallbackText: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 1,
  },

  heroImage: {
    alignSelf: 'center',
    width: 224,
    height: 224,
    borderRadius: 4,
    marginBottom: 14,
    backgroundColor: '#282828',

    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 12 },
      },
      android: {
        elevation: 12,
      },
    }),
  },

  heroArtistImage: {
    borderRadius: 112,
  },

  heroFallbackText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
  },

  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 2,
  },

  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },

  artistAvatar: {
    width: 23,
    height: 23,
    borderRadius: 12,
    marginRight: 8,
  },

  artistAvatarText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '900',
  },

  artistName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  metaLine: {
    color: '#b7b7b7',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 8,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  deviceButton: {
    width: 34,
    height: 34,
    borderRadius: 4,
    borderWidth: 1.4,
    borderColor: '#bdbdbd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  iconActionButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  iconActionButtonDisabled: {
    opacity: 0.6,
  },

  actionSpacer: {
    flex: 1,
  },

  shuffleButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  playCircleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1ed760',

    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.28,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 7 },
      },
      android: {
        elevation: 8,
      },
    }),
  },

  trackList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#121212',
  },

  listItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },

  listIndex: {
    width: 24,
    marginRight: 8,
    color: '#b3b3b3',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  listContent: {
    flex: 1,
    justifyContent: 'center',
  },

  listTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  listSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  explicitBadge: {
    width: 13,
    height: 13,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b3b3b3',
    marginRight: 5,
  },

  explicitBadgeText: {
    color: '#121212',
    fontSize: 8,
    fontWeight: '900',
  },

  listSubtitle: {
    flexShrink: 1,
    color: '#b3b3b3',
    fontSize: 13,
    fontWeight: '500',
  },

  moreButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  section: {
    paddingHorizontal: 16,
    marginTop: 18,
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  infoPanel: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#181818',
  },

  extraText: {
    color: '#d0d0d0',
    fontSize: 13,
    lineHeight: 20,
  },

  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#242424',
  },

  tagText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
