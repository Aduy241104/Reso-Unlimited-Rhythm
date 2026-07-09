import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import AddTrackToPlaylistModal from '../../components/detail/AddTrackToPlaylistModal';
import ArtistFollowButton from '../../components/detail/ArtistFollowButton';
import TrackFavoriteButton from '../../components/detail/TrackFavoriteButton';
import TrackActionsBottomSheet from '../../components/detail/TrackActionsBottomSheet';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import usePlayer from '../../hooks/usePlayer';
import albumService from '../../services/albumService';
import artistFollowService from '../../services/artistFollowService';
import playlistService from '../../services/playlistService';
import profileArtistService from '../../services/profileArtistService';
import trackService from '../../services/trackService';
import userFavoriteService from '../../services/userFavoriteService';
import userPlaylistService from '../../services/userPlaylistService';
import { formatCompactNumber, getErrorMessage, getInitials } from '../../utils/media';
import { buildPlayableQueue, normalizePlayerTrack } from '../../utils/player';
import { Artwork, TrackListItem } from './EntityDetailComponents';
import styles from './EntityDetailScreen.styles';

const detailFetchers = {
  album: ({ entityId }) => albumService.getAlbumDetail(entityId),
  artist: ({ entityId }) => profileArtistService.getArtistDetail(entityId),
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

const normalizeInfoEntries = (entries = []) =>
  (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const label = getDisplayText(entry.label);
      const value = getDisplayText(entry.value);

      if (!label || !value) {
        return null;
      }

      return {
        label,
        value,
        entityType: entry.entityType || '',
        entityId: entry.entityId || '',
      };
    })
    .filter(Boolean);

const getTrackId = (item) => String(item?.entityId || item?.id || '');

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
  const [isArtistFollowing, setIsArtistFollowing] = useState(false);
  const [isArtistFollowUpdating, setIsArtistFollowUpdating] = useState(false);
  const [selectedTrackAction, setSelectedTrackAction] = useState({
    index: 0,
    track: null,
  });
  const [isPlaylistPickerVisible, setIsPlaylistPickerVisible] = useState(false);
  const [isPlaylistPickerLoading, setIsPlaylistPickerLoading] = useState(false);
  const [playlistPickerError, setPlaylistPickerError] = useState('');
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [submittingPlaylistId, setSubmittingPlaylistId] = useState('');
  const [favoriteStatusMap, setFavoriteStatusMap] = useState({});
  const [favoriteUpdatingMap, setFavoriteUpdatingMap] = useState({});

  const applyArtistFollowSnapshot = useCallback((nextIsFollowing, nextFollowers) => {
    setDetail((previousDetail) => {
      if (!previousDetail || previousDetail.type !== 'artist') {
        return previousDetail;
      }

      const safeFollowers = Math.max(0, Number(nextFollowers) || 0);
      const safeTrackCount = Math.max(
        0,
        Number(previousDetail?.trackCount) || (Array.isArray(previousDetail?.items) ? previousDetail.items.length : 0)
      );
      const nextDescription = safeFollowers > 0
        ? `${formatCompactNumber(safeFollowers)} người theo dõi`
        : safeTrackCount > 0
          ? `${safeTrackCount} bài hát`
          : 'Hồ sơ nghệ sĩ';

      return {
        ...previousDetail,
        isFollowing: nextIsFollowing,
        followersCount: safeFollowers,
        description: nextDescription,
        stats: Array.isArray(previousDetail?.stats)
          ? previousDetail.stats.map((item) =>
            item?.label === 'Người theo dõi'
              ? {
                ...item,
                value: formatCompactNumber(safeFollowers),
              }
              : item
          )
          : previousDetail?.stats,
      };
    });
  }, []);

  const loadDetail = useCallback(async () => {
    if (!entityId || !entityType || !detailFetchers[entityType]) {
      setDetail(null);
      setErrorMessage('Thiếu thông tin chi tiết.');
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
      const shouldLoadArtistFollowState =
        (entityType === 'artist' || result?.type === 'artist') && isAuthenticated;

      if (shouldLoadAlbumFollowState) {
        try {
          const followState = await albumService.getAlbumFollowStatus(entityId);
          setIsAlbumFollowing(Boolean(followState?.isFollowing));
        } catch (followError) {
          if (followError?.status === 401) {
            setIsAlbumFollowing(false);
          } else {
            console.log('Không thể tải trạng thái theo dõi album.', followError?.message || followError);
          }
        }
      } else {
        setIsAlbumFollowing(false);
      }
      if (shouldLoadArtistFollowState) {
        try {
          const followState = await artistFollowService.getArtistFollowStatus(result?.id || entityId);
          const nextIsFollowing = Boolean(followState?.isFollowing);

          setIsArtistFollowing(nextIsFollowing);
          applyArtistFollowSnapshot(
            nextIsFollowing,
            Number(result?.followersCount) || Number(followState?.followers) || 0
          );
        } catch (followError) {
          if (followError?.status === 401) {
            setIsArtistFollowing(false);
          } else {
            console.log('KhĂ´ng thá»ƒ táº£i tráº¡ng thĂ¡i theo dĂµi nghá»‡ sÄ©.', followError?.message || followError);
          }
        }
      } else {
        setIsArtistFollowing(false);
      }
    } catch (error) {
      setDetail(null);
      setIsAlbumFollowing(false);
      setIsArtistFollowing(false);
      setIsArtistFollowUpdating(false);
      setErrorMessage(getErrorMessage(error, 'Không thể tải nội dung chi tiết lúc này.'));
    } finally {
      setIsLoading(false);
    }
  }, [applyArtistFollowSnapshot, date, entityId, entityType, isAuthenticated, limit, month, period]);

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

  const detailStats = useMemo(() => normalizeInfoEntries(detail?.stats), [detail?.stats]);
  const detailMeta = useMemo(() => normalizeInfoEntries(detail?.meta), [detail?.meta]);
  const favoriteTrackIds = useMemo(() => {
    const uniqueTrackIds = new Set();

    if (detail?.type === 'track') {
      const detailTrackId = getTrackId(detail);

      if (detailTrackId) {
        uniqueTrackIds.add(detailTrackId);
      }
    }

    if (Array.isArray(detail?.items)) {
      detail.items.forEach((item) => {
        if (item?.entityType !== 'track') {
          return;
        }

        const trackId = getTrackId(item);

        if (trackId) {
          uniqueTrackIds.add(trackId);
        }
      });
    }

    return Array.from(uniqueTrackIds);
  }, [detail]);

  const handleOpenNestedDetail = useCallback(
    (nextType, nextId, nextTitle) => {
      if (!nextType || !nextId) {
        return;
      }

      if (nextType === 'playlist') {
        navigation.push('PlaylistDetail', {
          playlistId: nextId,
          initialTitle: nextTitle,
        });
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

  const loadMyPlaylists = useCallback(async () => {
    setIsPlaylistPickerLoading(true);
    setPlaylistPickerError('');

    try {
      const result = await userPlaylistService.getMyPlaylists({
        page: 1,
        limit: 50,
      });

      setMyPlaylists(Array.isArray(result?.items) ? result.items : []);
    } catch (error) {
      setMyPlaylists([]);
      setPlaylistPickerError(getErrorMessage(error, 'Không thể tải playlist của bạn lúc này.'));
    } finally {
      setIsPlaylistPickerLoading(false);
    }
  }, []);

  const loadFavoriteStatuses = useCallback(async (trackIds = []) => {
    if (!isAuthenticated || trackIds.length === 0) {
      setFavoriteStatusMap({});
      return;
    }

    const results = await Promise.allSettled(
      trackIds.map(async (trackId) => {
        const status = await userFavoriteService.getTrackFavoriteStatus(trackId);

        return {
          trackId,
          isFavorite: Boolean(status?.isFavorite),
        };
      })
    );

    setFavoriteStatusMap((previousMap) => {
      const nextMap = {};

      trackIds.forEach((trackId) => {
        nextMap[trackId] = previousMap[trackId] || false;
      });

      results.forEach((result) => {
        if (result.status !== 'fulfilled') {
          return;
        }

        nextMap[result.value.trackId] = result.value.isFavorite;
      });

      return nextMap;
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteStatusMap({});
      setFavoriteUpdatingMap({});
      return;
    }

    if (favoriteTrackIds.length === 0) {
      return;
    }

    loadFavoriteStatuses(favoriteTrackIds).catch(() => {});
  }, [favoriteTrackIds, isAuthenticated, loadFavoriteStatuses]);

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

  const handleClosePlaylistPicker = useCallback(() => {
    if (submittingPlaylistId) {
      return;
    }

    setIsPlaylistPickerVisible(false);
    setPlaylistPickerError('');
  }, [submittingPlaylistId]);

  const handleOpenAddToPlaylist = useCallback(async () => {
    const targetTrack = selectedTrackAction.track;
    const targetTrackId = targetTrack?.entityId || targetTrack?.id || '';

    if (!targetTrackId) {
      Alert.alert('Bài hát không khả dụng', 'Không thể thêm bài hát này vào playlist lúc này.');
      return;
    }

    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    setIsPlaylistPickerVisible(true);
    await loadMyPlaylists();
  }, [isAuthenticated, loadMyPlaylists, navigation, selectedTrackAction.track]);

  const handleAddTrackToPlaylist = useCallback(async (playlist) => {
    const targetTrack = selectedTrackAction.track;
    const playlistId = String(playlist?.id || playlist?._id || '');
    const targetTrackId = targetTrack?.entityId || targetTrack?.id || '';

    if (!playlistId || !targetTrackId) {
      return;
    }

    Alert.alert(
      'Thêm vào playlist',
      `Bạn có muốn thêm "${getDisplayText(targetTrack?.title, 'bài hát này')}" vào "${getDisplayText(playlist?.title, 'playlist của bạn')}" không?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Thêm',
          onPress: async () => {
            setSubmittingPlaylistId(playlistId);

            try {
              await userPlaylistService.addTrackToMyPlaylist(playlistId, targetTrackId);
              setIsPlaylistPickerVisible(false);
              Alert.alert(
                'Đã thêm vào playlist',
                `"${getDisplayText(targetTrack?.title, 'Bài hát này')}" đã được thêm vào "${getDisplayText(playlist?.title, 'playlist của bạn')}".`
              );
            } catch (error) {
              Alert.alert('Thêm vào playlist thất bại', getErrorMessage(error, 'Không thể thêm bài hát này lúc này.'));
            } finally {
              setSubmittingPlaylistId('');
            }
          },
        },
      ]
    );
  }, [selectedTrackAction.track]);

  const handleToggleTrackFavorite = useCallback(async (track) => {
    const trackId = getTrackId(track);

    if (!trackId) {
      Alert.alert('Bài hát không khả dụng', 'Không thể cập nhật bài hát yêu thích lúc này.');
      return;
    }

    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    if (favoriteUpdatingMap[trackId]) {
      return;
    }

    const previousValue = Boolean(favoriteStatusMap[trackId]);
    const nextValue = !previousValue;

    Alert.alert(
      previousValue ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích',
      previousValue
        ? 'Bạn có muốn xóa bài hát này khỏi danh sách yêu thích không?'
        : 'Bạn có muốn thêm bài hát này vào danh sách yêu thích không?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: previousValue ? 'Xóa' : 'Thêm',
          onPress: async () => {
            setFavoriteUpdatingMap((previousMap) => ({
              ...previousMap,
              [trackId]: true,
            }));
            setFavoriteStatusMap((previousMap) => ({
              ...previousMap,
              [trackId]: nextValue,
            }));

            try {
              const result = previousValue
                ? await userFavoriteService.removeTrackFromFavorite(trackId)
                : await userFavoriteService.addTrackToFavorite(trackId);

              setFavoriteStatusMap((previousMap) => ({
                ...previousMap,
                [trackId]: Boolean(result?.isFavorite),
              }));
            } catch (error) {
              setFavoriteStatusMap((previousMap) => ({
                ...previousMap,
                [trackId]: previousValue,
              }));
              Alert.alert(
                'Cập nhật yêu thích thất bại',
                getErrorMessage(
                  error,
                  previousValue
                    ? 'Không thể xóa bài hát này khỏi danh sách yêu thích lúc này.'
                    : 'Không thể thêm bài hát này vào danh sách yêu thích lúc này.'
                )
              );
            } finally {
              setFavoriteUpdatingMap((previousMap) => ({
                ...previousMap,
                [trackId]: false,
              }));
            }
          },
        },
      ]
    );
  }, [favoriteStatusMap, favoriteUpdatingMap, isAuthenticated, navigation]);

  const handleMetaItemPress = useCallback((item) => {
    if (!item?.entityType || !item?.entityId) {
      return;
    }

    handleOpenNestedDetail(item.entityType, item.entityId, item.value);
  }, [handleOpenNestedDetail]);

  const headerTitle = getDisplayText(detail?.title, getDisplayText(initialTitle, 'Chi tiết'));
  const detailTitle = getDisplayText(detail?.title, headerTitle);
  const detailSubtitle = getDisplayText(detail?.subtitle);
  const detailDescription = getDisplayText(detail?.description);
  const detailExtraText = getDisplayText(detail?.extraText);
  const ownerName = getDisplayText(
    detail?.owner?.fullName || detail?.owner?.name || detail?.owner?.email,
    ''
  );
  const ownerRole = getDisplayText(detail?.owner?.role, detail?.type === 'playlist' ? 'Chủ playlist' : '');

  const selectedTrack = selectedTrackAction.track;
  const selectedTrackId = selectedTrack?.entityId || selectedTrack?.id || '';
  const currentDetailTrackId = detail?.entityId || detail?.id || '';

  const isCurrentTrackDetail =
    detail?.type === 'track' && selectedTrackId && selectedTrackId === currentDetailTrackId;

  const canOpenHeroTrackActions = detail?.type === 'track';
  const heroTrackId = getTrackId(detail);
  const isHeroTrackFavorite = Boolean(heroTrackId && favoriteStatusMap[heroTrackId]);
  const isHeroTrackFavoriteUpdating = Boolean(heroTrackId && favoriteUpdatingMap[heroTrackId]);

  const trackActionItems = useMemo(
    () => [
      {
        key: 'play-now',
        label: 'Phát ngay',
        icon: 'play',
        description: 'Bắt đầu phát từ bài hát này.',
        onPress: handleTrackActionPlayNow,
      },
      {
        key: 'add-to-playlist',
        label: isAuthenticated ? 'Thêm vào playlist' : 'Đăng nhập để thêm vào playlist',
        icon: 'add-circle-outline',
        description: isAuthenticated
          ? 'Chọn một playlist cá nhân để thêm bài hát này.'
          : 'Hãy đăng nhập trước để lưu bài hát này vào playlist.',
        onPress: handleOpenAddToPlaylist,
      },
      !isCurrentTrackDetail && selectedTrackId
        ? {
          key: 'open-track-detail',
          label: 'Mở chi tiết bài hát',
          icon: 'disc-outline',
          description: 'Xem trang chi tiết đầy đủ của bài hát này.',
          onPress: handleTrackActionOpenTrackDetail,
        }
        : null,
      selectedTrack?.artistId
        ? {
          key: 'open-artist-detail',
          label: 'Mở chi tiết nghệ sĩ',
          icon: 'person-outline',
          description: 'Chuyển đến trang chi tiết nghệ sĩ.',
          onPress: handleTrackActionOpenArtistDetail,
        }
        : null,
      selectedTrack?.albumId
        ? {
          key: 'open-album-detail',
          label: 'Mở chi tiết album',
          icon: 'albums-outline',
          description: 'Chuyển đến trang chi tiết album.',
          onPress: handleTrackActionOpenAlbumDetail,
        }
        : null,
    ].filter(Boolean),
    [
      handleTrackActionOpenAlbumDetail,
      handleTrackActionOpenArtistDetail,
      handleTrackActionOpenTrackDetail,
      handleOpenAddToPlaylist,
      handleTrackActionPlayNow,
      isAuthenticated,
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
        ? 'Nghệ sĩ'
        : entityType === 'playlist'
          ? 'Playlist'
          : entityType === 'topTrackCollection'
            ? 'BXH'
            : 'Bài hát');

  const isAlbum = detail?.type === 'album' || entityType === 'album';
  const isArtist = detail?.type === 'artist' || entityType === 'artist';
  const isTrackDetail = detail?.type === 'track' || entityType === 'track';
  const shouldShowDetailStats = !isAlbum && detailStats.length > 0;
  const shouldShowDetailMeta = !isAlbum && detailMeta.length > 0;
  const albumTrackCount = Number(detail?.trackCount) || (Array.isArray(detail?.items) ? detail.items.length : 0);
  const albumTrackLabel = isAlbum && albumTrackCount > 0 ? `${albumTrackCount} bài hát` : '';

  const artistName = detailSubtitle || detail?.artistName || detail?.artist?.name || '';
  const artistImage =
    detail?.artistImage ||
    detail?.artistAvatar ||
    detail?.artist?.avatar ||
    detail?.artist?.image;

  const metaLineParts = [
    badgeLabel,
    albumTrackLabel,
    detailDescription || detailExtraText || '',
  ].filter(Boolean);

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

    Alert.alert(
      previousValue ? 'Bỏ lưu album' : 'Lưu album',
      previousValue
        ? 'Bạn có muốn bỏ lưu album này không?'
        : 'Bạn có muốn lưu album này vào thư viện không?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: previousValue ? 'Bỏ lưu' : 'Lưu',
          onPress: async () => {
            setIsAlbumFollowing(!previousValue);
            setIsAlbumFollowUpdating(true);

            try {
              const followState = await albumService.toggleAlbumFollow(targetAlbumId);
              setIsAlbumFollowing(Boolean(followState?.isFollowing));
            } catch (error) {
              setIsAlbumFollowing(previousValue);
              Alert.alert('Lưu album thất bại', getErrorMessage(error, 'Không thể cập nhật album đã lưu lúc này.'));
            } finally {
              setIsAlbumFollowUpdating(false);
            }
          },
        },
      ]
    );
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

  const handleToggleArtistFollow = useCallback(async () => {
    const targetArtistId = detail?.entityId || detail?.id || entityId;

    if (!isArtist || !targetArtistId || isArtistFollowUpdating) {
      return;
    }

    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    const previousValue = isArtistFollowing;
    const previousFollowers = Math.max(0, Number(detail?.followersCount) || 0);

    Alert.alert(
      previousValue ? 'Bỏ theo dõi nghệ sĩ' : 'Theo dõi nghệ sĩ',
      previousValue
        ? 'Bạn có muốn bỏ theo dõi nghệ sĩ này không?'
        : 'Bạn có muốn theo dõi nghệ sĩ này để lưu lại trong thư viện không?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: previousValue ? 'Bỏ theo dõi' : 'Theo dõi',
          onPress: async () => {
            const optimisticValue = !previousValue;
            const optimisticFollowers = Math.max(previousFollowers + (previousValue ? -1 : 1), 0);

            setIsArtistFollowing(optimisticValue);
            setIsArtistFollowUpdating(true);
            applyArtistFollowSnapshot(optimisticValue, optimisticFollowers);

            try {
              const followState = await artistFollowService.toggleArtistFollow(targetArtistId);
              const resolvedFollowers = Number(followState?.followers) || optimisticFollowers;
              const resolvedValue = Boolean(followState?.isFollowing);

              setIsArtistFollowing(resolvedValue);
              applyArtistFollowSnapshot(resolvedValue, resolvedFollowers);
            } catch (error) {
              setIsArtistFollowing(previousValue);
              applyArtistFollowSnapshot(previousValue, previousFollowers);
              Alert.alert(
                previousValue ? 'Bỏ theo dõi thất bại' : 'Theo dõi thất bại',
                getErrorMessage(
                  error,
                  previousValue
                    ? 'Không thể bỏ theo dõi nghệ sĩ này lúc này.'
                    : 'Không thể theo dõi nghệ sĩ này lúc này.'
                )
              );
            } finally {
              setIsArtistFollowUpdating(false);
            }
          },
        },
      ]
    );
  }, [
    applyArtistFollowSnapshot,
    detail?.entityId,
    detail?.followersCount,
    detail?.id,
    entityId,
    isArtist,
    isArtistFollowUpdating,
    isArtistFollowing,
    isAuthenticated,
    navigation,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#d9272b" />

      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + (isOpenedFromPlayer ? 2 : 8) }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.75}
      >
        <Ionicons name="chevron-back" size={25} color="#ffffff" />
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />

          <TouchableOpacity style={styles.retryButton} onPress={loadDetail} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingBottom: 40 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroSection, { paddingTop: insets.top + (isOpenedFromPlayer ? 12 : 48) }]}>
            <View style={styles.heroRedLayer} />
            <View style={styles.heroDarkLayer} />
            <View style={styles.heroBlackLayer} />

            <Artwork
              uri={detail?.image}
              label={detailTitle}
              rounded={isArtist}
              style={[styles.heroImage, isArtist && styles.heroArtistImage]}
              textStyle={styles.heroFallbackText}
            />

            <Text style={styles.heroTitle} numberOfLines={2}>
              {detailTitle}
            </Text>

            {artistName ? (
              <View style={styles.artistRow}>
                <Artwork
                  uri={artistImage}
                  label={artistName}
                  rounded
                  style={styles.artistAvatar}
                  textStyle={styles.artistAvatarText}
                />

                <Text style={styles.artistName} numberOfLines={1}>
                  {artistName}
                </Text>
              </View>
            ) : null}

            <Text style={styles.metaLine} numberOfLines={2}>
              {metaLineParts.join(' - ')}
            </Text>

            <View style={styles.actionRow}>
              {!isAlbum && !isArtist ? (
                <TouchableOpacity style={styles.deviceButton} activeOpacity={0.75}>
                  <Ionicons name="phone-portrait-outline" size={23} color="#d6d6d6" />
                </TouchableOpacity>
              ) : null}

              {isAlbum ? (
                <TouchableOpacity
                  style={[
                    styles.iconActionButton,
                    isAlbumFollowUpdating && styles.iconActionButtonDisabled,
                  ]}
                  activeOpacity={0.75}
                  onPress={handleToggleAlbumFollow}
                  disabled={isAlbumFollowUpdating}
                >
                  <Ionicons
                    name={isAlbumFollowing ? 'checkmark-circle' : 'add-circle-outline'}
                    size={25}
                    color={isAlbumFollowing ? '#1ed760' : '#b3b3b3'}
                  />
                </TouchableOpacity>
              ) : null}

              {isArtist ? (
                <ArtistFollowButton
                  isFollowing={isArtistFollowing}
                  isLoading={isArtistFollowUpdating}
                  onPress={handleToggleArtistFollow}
                />
              ) : null}

              <TouchableOpacity style={styles.iconActionButton} activeOpacity={0.75}>
                <Ionicons name="arrow-down-circle-outline" size={25} color="#b3b3b3" />
              </TouchableOpacity>

              {canOpenHeroTrackActions ? (
                <TrackFavoriteButton
                  style={styles.iconActionButton}
                  size={24}
                  isFavorite={isHeroTrackFavorite}
                  isLoading={isHeroTrackFavoriteUpdating}
                  onPress={() => handleToggleTrackFavorite(detail)}
                />
              ) : null}

              <TouchableOpacity
                style={styles.iconActionButton}
                activeOpacity={0.75}
                onPress={canOpenHeroTrackActions ? () => openTrackActions(detail, 0) : undefined}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color="#b3b3b3" />
              </TouchableOpacity>

              <View style={styles.actionSpacer} />

              <TouchableOpacity style={styles.shuffleButton} activeOpacity={0.75}>
                <Ionicons name="shuffle" size={26} color="#1ed760" />
              </TouchableOpacity>

              {playableQueue.length > 0 ? (
                <TouchableOpacity
                  style={styles.playCircleButton}
                  onPress={() => handlePlayAll()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="play" size={30} color="#000000" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {shouldShowDetailStats ? (
            <View style={[styles.section, isTrackDetail ? styles.trackSectionCompact : null]}>
              <View style={styles.statsGrid}>
                {detailStats.map((item, index) => (
                  <View
                    key={`${item.label}-${index}`}
                    style={[
                      styles.statCard,
                      isTrackDetail ? styles.trackStatCardPlain : null,
                      index === detailStats.length - 1 && detailStats.length % 2 === 1
                        ? styles.statCardFull
                        : null,
                    ]}
                  >
                    <Text style={styles.statValue} numberOfLines={1}>{item.value}</Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {shouldShowDetailMeta ? (
            <View style={[styles.section, isTrackDetail ? styles.trackSectionCompact : null]}>
              <Text style={styles.sectionTitle}>Thông tin</Text>
              <View style={[styles.panel, isTrackDetail ? styles.trackPanelPlain : null]}>
                {detailMeta.map((item, index) => {
                  const isPressable = Boolean(item.entityType && item.entityId);
                  const RowComponent = isPressable ? TouchableOpacity : View;

                  return (
                    <RowComponent
                      key={`${item.label}-${index}`}
                      style={[
                        styles.metaRow,
                        isTrackDetail ? styles.trackMetaRowPlain : null,
                        index === detailMeta.length - 1 ? styles.metaRowLast : null,
                      ]}
                      onPress={isPressable ? () => handleMetaItemPress(item) : undefined}
                      activeOpacity={isPressable ? 0.8 : undefined}
                    >
                      <Text style={styles.metaLabel}>{item.label}</Text>
                      <View style={styles.metaValueWrap}>
                        <Text style={styles.metaValue}>{item.value}</Text>
                        {isPressable ? (
                          <Ionicons name="chevron-forward" size={14} color="#7d7d7d" />
                        ) : null}
                      </View>
                    </RowComponent>
                  );
                })}
              </View>
            </View>
          ) : null}

          {detail?.type === 'playlist' && ownerName ? (
            <View style={[styles.section, isTrackDetail ? styles.trackSectionCompact : null]}>
              <Text style={styles.sectionTitle}>Tạo bởi</Text>
              <View style={styles.ownerCard}>
                <View style={styles.ownerAvatar}>
                  <Text style={styles.ownerAvatarText}>{getInitials(ownerName)}</Text>
                </View>
                <View style={styles.ownerContent}>
                  <Text style={styles.ownerName}>{ownerName}</Text>
                  {ownerRole ? <Text style={styles.ownerRole}>{ownerRole}</Text> : null}
                </View>
              </View>
            </View>
          ) : null}

          {Array.isArray(detail?.tags) && detail.tags.length > 0 ? (
            <View style={[styles.section, isTrackDetail ? styles.trackSectionCompact : null]}>
              <Text style={styles.sectionTitle}>Thẻ</Text>

              <View style={styles.tagsWrap}>
                {detail.tags.map((tag, index) => (
                  <View
                    key={`${getDisplayText(tag, 'tag')}-${index}`}
                    style={[
                      styles.tagPill,
                      isAlbum ? styles.albumTagPlain : null,
                      isTrackDetail ? styles.trackTagPlain : null,
                    ]}
                  >
                    <Text style={styles.tagText}>{getDisplayText(tag)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {detail?.extraTitle && detailExtraText ? (
            <View style={[styles.section, isTrackDetail ? styles.trackSectionCompact : null]}>
              <Text style={styles.sectionTitle}>{getDisplayText(detail.extraTitle)}</Text>

              <View
                style={[
                  styles.infoPanel,
                  isAlbum ? styles.albumInfoPlain : null,
                  isTrackDetail ? styles.trackInfoPlain : null,
                ]}
              >
                <Text style={styles.extraText}>{detailExtraText}</Text>
              </View>
            </View>
          ) : null}

          {Array.isArray(detail?.items) && detail.items.length > 0 ? (
            <View style={[styles.section, isTrackDetail ? styles.trackSectionCompact : null]}>
              <Text style={styles.sectionTitle}>{getDisplayText(detail.itemsTitle, 'Danh sách')}</Text>
              <View
                style={
                  detail?.type === 'topTrackCollection'
                    ? styles.trackList
                    : [
                      styles.panel,
                      isAlbum ? styles.albumSurfacePlain : null,
                      isTrackDetail ? styles.trackPanelPlain : null,
                    ]
                }
              >
                {detail.items.map((item, index) => (
                  <TrackListItem
                    key={`${item.entityId || item.id}-${index}`}
                    item={item}
                    index={index}
                    showIndex={detail?.type === 'topTrackCollection'}
                    isFavorite={Boolean(favoriteStatusMap[getTrackId(item)])}
                    isFavoriteLoading={Boolean(favoriteUpdatingMap[getTrackId(item)])}
                    onFavoritePress={
                      item?.entityType === 'track'
                        ? () => handleToggleTrackFavorite(item)
                        : undefined
                    }
                    onMorePress={
                      item?.entityType === 'track'
                        ? () => openTrackActions(item, index)
                        : undefined
                    }
                    onPress={() => handleListItemPress(item, index)}
                  />
                ))}
              </View>
            </View>
          ) : detail?.type === 'playlist' ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{getDisplayText(detail.itemsTitle, 'Danh sách')}</Text>
              <View style={styles.panel}>
                <Text style={styles.emptyPanelText}>Playlist này chưa có bài hát nào.</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      <TrackActionsBottomSheet
        visible={isTrackActionsVisible}
        track={selectedTrack}
        actions={trackActionItems}
        onClose={closeTrackActions}
      />

      <AddTrackToPlaylistModal
        visible={isPlaylistPickerVisible}
        trackTitle={selectedTrack?.title}
        playlists={myPlaylists}
        isLoading={isPlaylistPickerLoading}
        errorMessage={playlistPickerError}
        submittingPlaylistId={submittingPlaylistId}
        onClose={handleClosePlaylistPicker}
        onRetry={loadMyPlaylists}
        onSelectPlaylist={handleAddTrackToPlaylist}
      />
    </View>
  );
}
