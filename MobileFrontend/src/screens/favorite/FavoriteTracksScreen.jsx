import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import TrackFavoriteButton from '../../components/detail/TrackFavoriteButton';
import { useAuth } from '../../hooks/useAuth';
import usePlayer from '../../hooks/usePlayer';
import userFavoriteService from '../../services/userFavoriteService';
import {
  formatDuration,
  formatTrackDuration,
  getErrorMessage,
  getInitials,
  resolveImageUri,
} from '../../utils/media';
import { buildPlayableQueue } from '../../utils/player';

const accentPalette = ['#2d2740', '#233744', '#3d2a34', '#2c3b24', '#253043'];
const LOAD_MORE_STEP = 10;

const readText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return fallback;
};

const getTrackId = (item) => String(item?.entityId || item?.id || '');

const Artwork = ({ uri, label, color }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.trackArtwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.trackArtwork, styles.trackArtworkFallback, { backgroundColor: color }]}>
      <Text style={styles.trackArtworkText}>{getInitials(label)}</Text>
    </View>
  );
};

const FavoriteTrackRow = ({
  item,
  index,
  isActive,
  isPlaying,
  isUpdatingFavorite = false,
  onFavoritePress,
  onPlayPress,
  onOpenDetail,
}) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const title = readText(item?.title, 'Bài hát không xác định');
  const subtitle = readText(item?.subtitle, 'Nghệ sĩ không xác định');
  const meta = readText(item?.meta, formatTrackDuration(item?.duration));

  return (
    <View style={styles.trackRow}>
      <TouchableOpacity style={styles.trackMainArea} activeOpacity={0.85} onPress={onPlayPress}>
        <View style={[styles.trackIndex, { backgroundColor: `${accentColor}33` }]}>
          {isActive ? (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={13} color="#1ed760" />
          ) : (
            <Text style={styles.trackIndexText}>{index + 1}</Text>
          )}
        </View>
        <Artwork uri={item?.image} label={title} color={accentColor} />
        <View style={styles.trackContent}>
          <Text style={[styles.trackTitle, isActive ? styles.trackTitleActive : null]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.trackSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Text style={styles.trackMeta}>{meta}</Text>
      </TouchableOpacity>

      <TrackFavoriteButton
        style={styles.trackFavoriteButton}
        isFavorite
        isLoading={isUpdatingFavorite}
        onPress={onFavoritePress}
      />

      <TouchableOpacity style={styles.trackDetailButton} activeOpacity={0.85} onPress={onOpenDetail}>
        <Ionicons name="chevron-forward" size={16} color="#8e98a3" />
      </TouchableOpacity>
    </View>
  );
};

export default function FavoriteTracksScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { currentTrack, isPlaying, playQueue, togglePlayback } = usePlayer();
  const [favoriteTracks, setFavoriteTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [favoriteUpdatingMap, setFavoriteUpdatingMap] = useState({});
  const [visibleFavoriteTracksCount, setVisibleFavoriteTracksCount] = useState(LOAD_MORE_STEP);

  const loadFavoriteTracks = useCallback(async ({ refresh = false } = {}) => {
    if (!isAuthenticated) {
      setFavoriteTracks([]);
      setErrorMessage('');
      setIsLoading(false);
      setIsRefreshing(false);
      setVisibleFavoriteTracksCount(LOAD_MORE_STEP);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await userFavoriteService.getFavoriteTracks({
        page: 1,
        limit: 50,
      });

      setFavoriteTracks(Array.isArray(result?.items) ? result.items : []);
      setVisibleFavoriteTracksCount(LOAD_MORE_STEP);
      setErrorMessage('');
    } catch (error) {
      setFavoriteTracks([]);
      setVisibleFavoriteTracksCount(LOAD_MORE_STEP);
      setErrorMessage(getErrorMessage(error, 'Không thể tải danh sách bài hát yêu thích lúc này.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadFavoriteTracks();
  }, [loadFavoriteTracks]);

  const playableQueue = useMemo(() => buildPlayableQueue(favoriteTracks), [favoriteTracks]);
  const activeTrackId = String(currentTrack?.entityId || currentTrack?.id || '');
  const totalDuration = favoriteTracks.reduce((sum, track) => sum + Number(track?.duration || 0), 0);
  const visibleFavoriteTracks = useMemo(
    () => favoriteTracks.slice(0, visibleFavoriteTracksCount),
    [favoriteTracks, visibleFavoriteTracksCount]
  );
  const canLoadMoreFavoriteTracks = visibleFavoriteTracks.length < favoriteTracks.length;

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

  const handleOpenTrackDetail = useCallback((track) => {
    const trackId = track?.entityId || track?.id;

    if (!trackId) {
      return;
    }

    navigation.navigate('EntityDetail', {
      entityType: 'track',
      entityId: trackId,
      initialTitle: track?.title || 'Chi tiết bài hát',
    });
  }, [navigation]);

  const handleRemoveTrackFromFavorite = useCallback(async (track) => {
    const trackId = getTrackId(track);

    if (!trackId || favoriteUpdatingMap[trackId]) {
      return;
    }

    Alert.alert(
      'Xóa khỏi yêu thích',
      'Bạn có muốn xóa bài hát này khỏi danh sách yêu thích không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const previousTracks = favoriteTracks;

            setFavoriteUpdatingMap((previousMap) => ({
              ...previousMap,
              [trackId]: true,
            }));
            setFavoriteTracks((previousItems) =>
              previousItems.filter((item) => getTrackId(item) !== trackId)
            );

            try {
              await userFavoriteService.removeTrackFromFavorite(trackId);
            } catch (error) {
              setFavoriteTracks(previousTracks);
              Alert.alert(
                'Xóa khỏi yêu thích thất bại',
                getErrorMessage(error, 'Không thể xóa bài hát này khỏi danh sách yêu thích lúc này.')
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
  }, [favoriteTracks, favoriteUpdatingMap]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050608" />
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Bài hát đã thích</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Cần đăng nhập</Text>
          <Text style={styles.emptyText}>
            Danh sách bài hát đã thích được gắn với tài khoản của bạn.
          </Text>
          <AppButton title="Đi đến đăng nhập" onPress={() => navigation.navigate('Login')} style={styles.primaryButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Bài hát đã thích</Text>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => navigation.navigate('Search')}>
          <Ionicons name="search" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <AppButton title="Thử lại" onPress={() => loadFavoriteTracks()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollBody, { paddingBottom: 28 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadFavoriteTracks({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
        >
          <LinearGradient colors={['#7c2d92', '#be185d', '#11161f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={styles.heroArtwork}>
              <Ionicons name="heart" size={36} color="#ffffff" />
            </View>

            <Text style={styles.heroEyebrow}>Playlist</Text>
            <Text style={styles.heroTitle}>Bài hát đã thích</Text>
            <Text style={styles.heroText}>
              Gom những bài hát bạn yêu thích nhất vào một nơi và phát lại ngay trên điện thoại.
            </Text>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{favoriteTracks.length} bài hát</Text>
              </View>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{formatDuration(totalDuration)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.playButton, playableQueue.length === 0 ? styles.playButtonDisabled : null]}
              onPress={handlePlayAll}
              activeOpacity={0.85}
              disabled={playableQueue.length === 0}
            >
              <Ionicons name="play" size={16} color="#08110a" />
              <Text style={styles.playButtonText}>
                {playableQueue.length > 0 ? `Phát ${playableQueue.length} bài hát` : 'Chưa có bài hát yêu thích'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Danh sách bài hát</Text>
            <Text style={styles.sectionCaption}>Nhấn để phát hoặc mở chi tiết</Text>
          </View>

          <View style={styles.panel}>
            {favoriteTracks.length > 0 ? (
              visibleFavoriteTracks.map((track, index) => {
                const trackId = String(track?.entityId || track?.id || '');
                const isActive = trackId && trackId === activeTrackId;

                return (
                  <FavoriteTrackRow
                    key={trackId || `favorite-${index}`}
                    item={track}
                    index={index}
                    isActive={Boolean(isActive)}
                    isPlaying={Boolean(isActive && isPlaying)}
                    isUpdatingFavorite={Boolean(favoriteUpdatingMap[trackId])}
                    onFavoritePress={() => handleRemoveTrackFromFavorite(track)}
                    onPlayPress={() => handleTrackPress(track, index)}
                    onOpenDetail={() => handleOpenTrackDetail(track)}
                  />
                );
              })
            ) : (
              <Text style={styles.emptyPanelText}>
                Bạn chưa thích bài hát nào. Hãy lưu bài hát từ trang chi tiết để chúng xuất hiện ở đây.
              </Text>
            )}
          </View>
          {canLoadMoreFavoriteTracks ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setVisibleFavoriteTracksCount((current) => current + LOAD_MORE_STEP)}
              style={styles.loadMoreButton}
            >
              <Text style={styles.loadMoreButtonText}>Hiện thêm 10 bài hát</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#212530',
    backgroundColor: '#101319',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollBody: {
    paddingHorizontal: 16,
  },
  heroCard: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
  },
  heroArtwork: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroEyebrow: {
    color: '#f6d4f6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 10,
  },
  heroText: {
    color: '#f1dfea',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  heroPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  heroPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  playButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1ed760',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  playButtonDisabled: {
    backgroundColor: '#43515a',
  },
  playButtonText: {
    color: '#08110a',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCaption: {
    color: '#93a0ae',
    fontSize: 12,
    marginTop: 4,
  },
  panel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f232d',
    backgroundColor: '#101319',
    overflow: 'hidden',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#1b2029',
  },
  trackMainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  trackIndex: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  trackIndexText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  trackArtwork: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1f1f1f',
  },
  trackArtworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackArtworkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  trackContent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  trackTitleActive: {
    color: '#1ed760',
  },
  trackSubtitle: {
    color: '#98a3af',
    fontSize: 11,
    marginTop: 4,
  },
  trackMeta: {
    color: '#d9dee5',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 8,
  },
  trackFavoriteButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackDetailButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPanelText: {
    color: '#98a3af',
    fontSize: 12,
    lineHeight: 19,
    padding: 16,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#98a3af',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    minWidth: 160,
    marginTop: 16,
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: '#252b36',
  },
  primaryButton: {
    minWidth: 180,
    marginTop: 16,
    backgroundColor: '#1ed760',
  },
  loadMoreButton: {
    marginTop: 10,
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2a313d',
    backgroundColor: '#101319',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loadMoreButtonText: {
    color: '#dfe6ee',
    fontSize: 12,
    fontWeight: '800',
  },
});
