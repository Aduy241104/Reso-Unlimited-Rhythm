import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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
import AppModal from '../../components/common/AppModal';
import TrackFavoriteButton from '../../components/detail/TrackFavoriteButton';
import TrackActionsBottomSheet from '../../components/detail/TrackActionsBottomSheet';
import ErrorState from '../../components/common/ErrorState';
import EditPlaylistModal from '../../components/library/EditPlaylistModal';
import { useAuth } from '../../hooks/useAuth';
import usePlayer from '../../hooks/usePlayer';
import playlistService from '../../services/playlistService';
import userFavoriteService from '../../services/userFavoriteService';
import userPlaylistService from '../../services/userPlaylistService';
import { formatDateLabel, formatDuration, getErrorMessage, getInitials, resolveImageUri } from '../../utils/media';
import { buildPlayableQueue } from '../../utils/player';

const accentPalette = ['#111111', '#2f2f2f', '#4a4a4a', '#686868', '#8a8a8a'];

const readText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return fallback;
};

const getTrackId = (item) => String(item?.entityId || item?.id || '');

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

const MetaPill = ({ value, isPrimary = false }) => {
  const text = readText(value);

  if (!text) {
    return null;
  }

  return (
    <View style={[styles.metaPill, isPrimary ? styles.metaPillPrimary : null]}>
      <Text style={[styles.metaPillText, isPrimary ? styles.metaPillTextPrimary : null]}>{text}</Text>
    </View>
  );
};

const TrackRow = ({
  item,
  index,
  isFavorite = false,
  isFavoriteLoading = false,
  isActive,
  isPlaying,
  onFavoritePress,
  onMorePress,
  onPress,
}) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const title = readText(item?.title, 'Bài hát không xác định');
  const subtitle = readText(item?.subtitle, item?.artistName || 'Nghệ sĩ không xác định');
  const meta = readText(item?.meta, formatDuration(item?.duration));

  return (
    <TouchableOpacity style={styles.trackRow} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.trackIndex, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` }]}>
        {isActive ? (
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={12} color="#1ed760" />
        ) : (
          <Text style={[styles.trackIndexText, { color: accentColor }]}>{index + 1}</Text>
        )}
      </View>
      <Artwork uri={item?.image} label={title} style={styles.trackArtwork} textStyle={styles.trackArtworkText} />
      <View style={styles.trackContent}>
        <Text style={[styles.trackTitle, isActive ? styles.trackTitleActive : null]} numberOfLines={1}>{title}</Text>
        <Text style={styles.trackSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={styles.trackMeta}>{meta}</Text>
      {onFavoritePress || onMorePress ? (
        <View style={styles.trackActions}>
          {onFavoritePress ? (
            <TrackFavoriteButton
              style={styles.favoriteButton}
              isFavorite={isFavorite}
              isLoading={isFavoriteLoading}
              onPress={(event) => {
                event.stopPropagation?.();
                onFavoritePress();
              }}
            />
          ) : null}
          {onMorePress ? (
            <TouchableOpacity
              style={styles.moreButton}
              activeOpacity={0.75}
              onPress={(event) => {
                event.stopPropagation?.();
                onMorePress();
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#9f9f9f" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

export default function PlaylistDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const {
    currentTrack,
    isPlaying,
    playQueue,
    togglePlayback,
  } = usePlayer();
  const playlistId = route.params?.playlistId || route.params?.entityId || '';
  const initialTitle = route.params?.initialTitle || 'Chi tiết playlist';
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isUpdatingPlaylist, setIsUpdatingPlaylist] = useState(false);
  const [updatePlaylistError, setUpdatePlaylistError] = useState('');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);
  const [deletePlaylistError, setDeletePlaylistError] = useState('');
  const [isTrackActionsVisible, setIsTrackActionsVisible] = useState(false);
  const [selectedTrackAction, setSelectedTrackAction] = useState({
    index: 0,
    track: null,
  });
  const [isRemovingTrack, setIsRemovingTrack] = useState(false);
  const [favoriteStatusMap, setFavoriteStatusMap] = useState({});
  const [favoriteUpdatingMap, setFavoriteUpdatingMap] = useState({});

  const loadPlaylistDetail = useCallback(async () => {
    if (!playlistId) {
      setPlaylist(null);
      setErrorMessage('Thiếu thông tin playlist.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await playlistService.getPlaylistDetail(playlistId);
      setPlaylist(result);
    } catch (error) {
      setPlaylist(null);
      setErrorMessage(getErrorMessage(error, 'Không thể tải chi tiết playlist lúc này.'));
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadPlaylistDetail();
  }, [loadPlaylistDetail]);

  const tracks = Array.isArray(playlist?.items) ? playlist.items : [];
  const playableQueue = useMemo(() => buildPlayableQueue(tracks), [tracks]);
  const ownerLabel = readText(
    playlist?.owner?.fullName || playlist?.owner?.name || playlist?.owner?.email || playlist?.subtitle,
    'Reso Music'
  );
  const createdDate = formatDateLabel(playlist?.createdAt);
  const updatedDate = formatDateLabel(playlist?.updatedAt);
  const totalTracks = Number(playlist?.trackCount) || tracks.length;
  const totalDuration = formatDuration(playlist?.totalDuration);
  const visibilityLabel = playlist?.playlistType === 'system'
    ? 'Hệ thống'
    : playlist?.isPublic
      ? 'Công khai'
      : 'Riêng tư';
  const currentUserId = String(user?.id || user?._id || user?.user?.id || user?.user?._id || '');
  const ownerId = String(playlist?.owner?.id || playlist?.owner?._id || '');
  const canEditPlaylist = Boolean(
    isAuthenticated &&
    playlist?.playlistType !== 'system' &&
    currentUserId &&
    ownerId &&
    currentUserId === ownerId
  );

  const heroMeta = [
    ownerLabel,
    createdDate,
    totalTracks > 0 ? `${totalTracks} bài hát` : '',
    Number(playlist?.totalDuration) > 0 ? totalDuration : '',
    visibilityLabel,
  ].filter(Boolean);

  const stats = [
    { label: 'Bài hát', value: `${totalTracks}` },
    { label: 'Thời lượng', value: Number(playlist?.totalDuration) > 0 ? totalDuration : '0s' },
    { label: 'Hiển thị', value: visibilityLabel },
    { label: 'Cập nhật', value: updatedDate || 'Không xác định' },
  ];

  const activeTrackId = String(currentTrack?.entityId || currentTrack?.id || '');
  const favoriteTrackIds = useMemo(
    () => Array.from(new Set(tracks.map(getTrackId).filter(Boolean))),
    [tracks]
  );

  const handlePlayAll = useCallback(() => {
    if (playableQueue.length === 0) {
      return;
    }

    playQueue(playableQueue, 0);
  }, [playQueue, playableQueue]);

  const handleTrackPress = useCallback((track, index) => {
    const trackId = String(track?.entityId || track?.id || '');

    if (trackId && trackId === activeTrackId) {
      togglePlayback();
      return;
    }

    playQueue(playableQueue, index);
  }, [activeTrackId, playQueue, playableQueue, togglePlayback]);

  const handleOpenNestedDetail = useCallback((nextType, nextId, nextTitle) => {
    if (!nextType || !nextId) {
      return;
    }

    navigation.push('EntityDetail', {
      entityType: nextType,
      entityId: nextId,
      initialTitle: nextTitle,
    });
  }, [navigation]);

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

  const handleTrackActionPlayNow = useCallback((track) => {
    if (!track) {
      return;
    }

    const startIndex = Number.isInteger(selectedTrackAction.index)
      ? selectedTrackAction.index
      : -1;

    if (startIndex >= 0 && startIndex < playableQueue.length) {
      playQueue(playableQueue, startIndex);
      return;
    }

    playQueue(buildPlayableQueue([track]), 0);
  }, [playQueue, playableQueue, selectedTrackAction.index]);

  const handleTrackActionOpenTrackDetail = useCallback((track) => {
    handleOpenNestedDetail('track', track?.entityId || track?.id, track?.title);
  }, [handleOpenNestedDetail]);

  const handleTrackActionOpenArtistDetail = useCallback((track) => {
    handleOpenNestedDetail('artist', track?.artistId, track?.artistName || track?.subtitle);
  }, [handleOpenNestedDetail]);

  const handleTrackActionOpenAlbumDetail = useCallback((track) => {
    handleOpenNestedDetail('album', track?.albumId, track?.albumTitle);
  }, [handleOpenNestedDetail]);

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

  const handleOpenEditModal = useCallback(() => {
    setUpdatePlaylistError('');
    setIsEditModalVisible(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    if (isUpdatingPlaylist) {
      return;
    }

    setUpdatePlaylistError('');
    setIsEditModalVisible(false);
  }, [isUpdatingPlaylist]);

  const handleOpenDeleteModal = useCallback(() => {
    setDeletePlaylistError('');
    setIsDeleteModalVisible(true);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    if (isDeletingPlaylist) {
      return;
    }

    setDeletePlaylistError('');
    setIsDeleteModalVisible(false);
  }, [isDeletingPlaylist]);

  const handleUpdatePlaylist = useCallback(async (payload) => {
    if (!playlistId) {
      setUpdatePlaylistError('Thiếu thông tin playlist.');
      return;
    }

    setIsUpdatingPlaylist(true);
    setUpdatePlaylistError('');

    try {
      await userPlaylistService.updateMyPlaylist(playlistId, payload);
      await loadPlaylistDetail();
      setIsEditModalVisible(false);
    } catch (error) {
      setUpdatePlaylistError(getErrorMessage(error, 'Không thể cập nhật playlist này lúc này.'));
    } finally {
      setIsUpdatingPlaylist(false);
    }
  }, [loadPlaylistDetail, playlistId]);

  const handleDeletePlaylist = useCallback(async () => {
    if (!playlistId) {
      setDeletePlaylistError('Thiếu thông tin playlist.');
      return;
    }

    setIsDeletingPlaylist(true);
    setDeletePlaylistError('');

    try {
      await userPlaylistService.deleteMyPlaylist(playlistId);
      setIsDeleteModalVisible(false);
      navigation.goBack();
    } catch (error) {
      setDeletePlaylistError(getErrorMessage(error, 'Không thể xóa playlist này lúc này.'));
    } finally {
      setIsDeletingPlaylist(false);
    }
  }, [navigation, playlistId]);

  const handleRemoveTrackFromPlaylist = useCallback((track) => {
    const targetTrackId = String(track?.entityId || track?.id || '');

    if (!playlistId || !targetTrackId || !canEditPlaylist || isRemovingTrack) {
      return;
    }

    Alert.alert(
      'Xóa bài hát',
      `Xóa "${readText(track?.title, 'bài hát này')}" khỏi playlist này?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setIsRemovingTrack(true);

            try {
              await userPlaylistService.removeTrackFromMyPlaylist(playlistId, targetTrackId);
              await loadPlaylistDetail();
            } catch (error) {
              Alert.alert(
                'Xóa thất bại',
                getErrorMessage(error, 'Không thể xóa bài hát này khỏi playlist lúc này.')
              );
            } finally {
              setIsRemovingTrack(false);
            }
          },
        },
      ]
    );
  }, [canEditPlaylist, isRemovingTrack, loadPlaylistDetail, playlistId]);

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

  const headerTitle = readText(playlist?.title, initialTitle);
  const selectedTrack = selectedTrackAction.track;
  const selectedTrackId = String(selectedTrack?.entityId || selectedTrack?.id || '');
  const activeSelectedTrackId = String(currentTrack?.entityId || currentTrack?.id || '');
  const isCurrentSelectedTrack = selectedTrackId && selectedTrackId === activeSelectedTrackId;

  const trackActionItems = useMemo(
    () => [
      {
        key: 'play-now',
        label: 'Phát ngay',
        icon: 'play',
        description: 'Bắt đầu phát từ bài hát này.',
        onPress: handleTrackActionPlayNow,
      },
      !isCurrentSelectedTrack && selectedTrackId
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
      canEditPlaylist
        ? {
            key: 'remove-from-playlist',
            label: 'Xóa khỏi playlist',
            icon: 'trash-outline',
            tintColor: '#ffb4b4',
            description: 'Xóa bài hát này khỏi playlist cá nhân của bạn.',
            disabled: isRemovingTrack,
            onPress: handleRemoveTrackFromPlaylist,
          }
        : null,
    ].filter(Boolean),
    [
      canEditPlaylist,
      handleRemoveTrackFromPlaylist,
      handleTrackActionOpenAlbumDetail,
      handleTrackActionOpenArtistDetail,
      handleTrackActionOpenTrackDetail,
      handleTrackActionPlayNow,
      isCurrentSelectedTrack,
      isRemovingTrack,
      selectedTrack?.albumId,
      selectedTrack?.artistId,
      selectedTrackId,
    ]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Quay lại</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={loadPlaylistDetail} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollBody, { paddingBottom: 32 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Artwork uri={playlist?.image} label={playlist?.title} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {playlist?.playlistType === 'system' ? 'PLAYLIST HỆ THỐNG' : 'CHI TIẾT PLAYLIST'}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{readText(playlist?.title, 'Playlist chưa có tên')}</Text>
            {playlist?.description ? (
              <Text style={styles.heroDescription}>{playlist.description}</Text>
            ) : null}

            {heroMeta.length > 0 ? (
              <View style={styles.metaWrap}>
                {heroMeta.map((item, index) => (
                  <MetaPill key={`${item}-${index}`} value={item} isPrimary={index === 0} />
                ))}
              </View>
            ) : null}

            <View style={styles.heroActions}>
              <TouchableOpacity
                style={[styles.playButton, playableQueue.length === 0 ? styles.playButtonDisabled : null]}
                onPress={handlePlayAll}
                activeOpacity={0.85}
                disabled={playableQueue.length === 0}
              >
                <Ionicons name="play" size={16} color="#000000" />
                <Text style={styles.playButtonText}>
                  {playableQueue.length > 0 ? `Phát ${playableQueue.length} bài hát` : 'Không có bài hát có thể phát'}
                </Text>
              </TouchableOpacity>
              {canEditPlaylist ? (
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleOpenEditModal}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={15} color="#ffffff" />
                  <Text style={styles.secondaryActionText}>Chỉnh sửa playlist</Text>
                </TouchableOpacity>
              ) : null}
              {canEditPlaylist ? (
                <TouchableOpacity
                  style={styles.dangerAction}
                  onPress={handleOpenDeleteModal}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={15} color="#ffb4b4" />
                  <Text style={styles.dangerActionText}>Xóa</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.statsGrid}>
              {stats.map((item, index) => (
                <View
                  key={`${item.label}-${index}`}
                  style={[
                    styles.statCard,
                    index === stats.length - 1 && stats.length % 2 === 1 ? styles.statCardFull : null,
                  ]}
                >
                  <Text style={styles.statValue} numberOfLines={1}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tạo bởi</Text>
            <View style={styles.ownerCard}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>{getInitials(ownerLabel)}</Text>
              </View>
              <View style={styles.ownerContent}>
                <Text style={styles.ownerName}>{ownerLabel}</Text>
                <Text style={styles.ownerRole}>
                  {playlist?.playlistType === 'system' ? 'Playlist biên tập bởi Reso' : 'Playlist cá nhân'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danh sách bài hát</Text>
            <View style={styles.panel}>
              {tracks.length > 0 ? (
                tracks.map((track, index) => {
                  const trackId = String(track?.entityId || track?.id || '');
                  const isActive = trackId && trackId === activeTrackId;

                  return (
                    <TrackRow
                      key={`${trackId || index}`}
                      item={track}
                      index={index}
                      isFavorite={Boolean(favoriteStatusMap[trackId])}
                      isFavoriteLoading={Boolean(favoriteUpdatingMap[trackId])}
                      isActive={Boolean(isActive)}
                      isPlaying={Boolean(isActive && isPlaying)}
                      onFavoritePress={() => handleToggleTrackFavorite(track)}
                      onMorePress={canEditPlaylist ? () => openTrackActions(track, index) : undefined}
                      onPress={() => handleTrackPress(track, index)}
                    />
                  );
                })
              ) : (
                <Text style={styles.emptyPanelText}>Playlist này chưa có bài hát nào.</Text>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      <EditPlaylistModal
        visible={isEditModalVisible}
        playlist={playlist}
        isSubmitting={isUpdatingPlaylist}
        submitError={updatePlaylistError}
        onClose={handleCloseEditModal}
        onSubmit={handleUpdatePlaylist}
      />

      <TrackActionsBottomSheet
        visible={isTrackActionsVisible}
        track={selectedTrack}
        actions={trackActionItems}
        onClose={closeTrackActions}
      />

      <AppModal visible={isDeleteModalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalEyebrow}>XÓA PLAYLIST</Text>
              <Text style={styles.modalTitle}>Xóa playlist này?</Text>
              <Text style={styles.modalText}>
                {`"${readText(playlist?.title, 'Playlist này')}" sẽ bị xóa vĩnh viễn khỏi thư viện của bạn.`}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCloseDeleteModal} activeOpacity={0.8} disabled={isDeletingPlaylist}>
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>

          {deletePlaylistError ? (
            <Text style={styles.modalErrorText}>{deletePlaylistError}</Text>
          ) : null}

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={handleCloseDeleteModal}
              activeOpacity={0.85}
              disabled={isDeletingPlaylist}
            >
              <Text style={styles.modalCancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalDeleteButton, isDeletingPlaylist ? styles.modalDeleteButtonDisabled : null]}
              onPress={handleDeletePlaylist}
              activeOpacity={0.85}
              disabled={isDeletingPlaylist}
            >
              <Text style={styles.modalDeleteButtonText}>
                {isDeletingPlaylist ? 'Đang xóa...' : 'Xóa playlist'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </AppModal>
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
  },
  heroSection: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  heroImage: {
    width: '100%',
    height: 220,
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
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  heroDescription: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metaPill: {
    backgroundColor: '#171717',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaPillPrimary: {
    backgroundColor: '#1ed76022',
    borderColor: '#1ed76044',
  },
  metaPillText: {
    color: '#d4d4d4',
    fontSize: 11,
    fontWeight: '600',
  },
  metaPillTextPrimary: {
    color: '#ffffff',
  },
  heroActions: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  playButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1ed760',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  playButtonDisabled: {
    backgroundColor: '#2a2a2a',
  },
  playButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  dangerAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#251414',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4a2424',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dangerActionText: {
    color: '#ffb4b4',
    fontSize: 12,
    fontWeight: '700',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48.5%',
    minHeight: 84,
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  statCardFull: {
    width: '100%',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#8a8a8a',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
  },
  ownerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ownerAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  ownerContent: {
    flex: 1,
  },
  ownerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  ownerRole: {
    color: '#9a9a9a',
    fontSize: 11,
    marginTop: 4,
  },
  panel: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  trackIndex: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  trackIndexText: {
    fontSize: 10,
    fontWeight: '800',
  },
  trackArtwork: {
    width: 42,
    height: 42,
    borderRadius: 10,
    marginRight: 10,
  },
  trackArtworkText: {
    fontSize: 13,
  },
  trackContent: {
    flex: 1,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  trackTitleActive: {
    color: '#1ed760',
  },
  trackSubtitle: {
    color: '#a3a3a3',
    fontSize: 11,
    marginTop: 3,
  },
  trackMeta: {
    color: '#d4d4d4',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 8,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPanelText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 19,
    padding: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalEyebrow: {
    color: '#ffb4b4',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  modalText: {
    color: '#a3a3a3',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalErrorText: {
    color: '#ef4444',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalDeleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#b91c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteButtonDisabled: {
    opacity: 0.7,
  },
  modalDeleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
