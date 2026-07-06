import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import usePlayer from '../../hooks/usePlayer';
import userFavoriteService from '../../services/userFavoriteService';
import { formatDuration, getErrorMessage, getInitials, resolveImageUri } from '../../utils/media';
import { buildPlayableQueue } from '../../utils/player';

const accentPalette = ['#111111', '#2f2f2f', '#4a4a4a', '#686868', '#8a8a8a'];

const readText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return fallback;
};

const Artwork = ({ uri, label, color, style, textStyle }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={[styles.artwork, style]} resizeMode="cover" />;
  }

  return (
    <View style={[styles.artwork, styles.artworkFallback, { backgroundColor: color }, style]}>
      <Text style={[styles.artworkText, textStyle]}>{getInitials(label)}</Text>
    </View>
  );
};

const FavoriteTrackRow = ({ item, index, isActive, isPlaying, onPlayPress, onOpenDetail }) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const title = readText(item?.title, 'Bài hát không xác định');
  const subtitle = readText(item?.subtitle, 'Nghệ sĩ không xác định');
  const meta = readText(item?.meta, formatDuration(item?.duration));

  return (
    <View style={styles.trackRow}>
      <TouchableOpacity style={styles.trackMainArea} activeOpacity={0.85} onPress={onPlayPress}>
        <View style={[styles.trackIndex, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` }]}>
          {isActive ? (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={12} color="#1ed760" />
          ) : (
            <Text style={[styles.trackIndexText, { color: accentColor }]}>{index + 1}</Text>
          )}
        </View>
        <Artwork uri={item?.image} label={title} color={accentColor} style={styles.trackArtwork} textStyle={styles.trackArtworkText} />
        <View style={styles.trackContent}>
          <Text style={[styles.trackTitle, isActive ? styles.trackTitleActive : null]} numberOfLines={1}>{title}</Text>
          <Text style={styles.trackSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Text style={styles.trackMeta}>{meta}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.trackDetailButton} activeOpacity={0.85} onPress={onOpenDetail}>
        <Ionicons name="chevron-forward" size={16} color="#9d9d9d" />
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

  const loadFavoriteTracks = useCallback(async ({ refresh = false } = {}) => {
    if (!isAuthenticated) {
      setFavoriteTracks([]);
      setErrorMessage('');
      setIsLoading(false);
      setIsRefreshing(false);
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
      setErrorMessage('');
    } catch (error) {
      setFavoriteTracks([]);
      setErrorMessage(getErrorMessage(error, 'Không thể tải danh sách bài hát yêu thích lúc này.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadFavoriteTracks();
  }, [loadFavoriteTracks]);

  const playableQueue = useMemo(() => buildPlayableQueue(favoriteTracks), [favoriteTracks]);
  const activeTrackId = String(currentTrack?.entityId || currentTrack?.id || '');

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

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bài hát yêu thích</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Cần đăng nhập</Text>
          <Text style={styles.emptyText}>
            Các bài hát bạn đã thích được gắn với tài khoản, nên hãy đăng nhập trước.
          </Text>
          <AppButton title="Đi đến đăng nhập" onPress={() => navigation.navigate('Login')} style={styles.loginButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bài hát yêu thích</Text>
        <View style={styles.headerSpacer} />
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
          contentContainerStyle={[styles.scrollBody, { paddingBottom: 32 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadFavoriteTracks({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>ÂM NHẠC CỦA BẠN</Text>
            <Text style={styles.heroTitle}>Gom bài hát yêu thích vào một nơi</Text>
            <Text style={styles.heroText}>
              Phát lại những bài bạn yêu thích nhất, quay lại trình phát ngay và mở chi tiết bất cứ lúc nào.
            </Text>

            <View style={styles.heroMetaWrap}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{favoriteTracks.length} bài hát</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.playButton, playableQueue.length === 0 ? styles.playButtonDisabled : null]}
              onPress={handlePlayAll}
              activeOpacity={0.85}
              disabled={playableQueue.length === 0}
            >
              <Ionicons name="play" size={16} color="#000000" />
              <Text style={styles.playButtonText}>
                {playableQueue.length > 0 ? `Phát ${playableQueue.length} bài hát` : 'Chưa có bài hát yêu thích'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bài hát đã thích</Text>
            <View style={styles.panel}>
              {favoriteTracks.length > 0 ? (
                favoriteTracks.map((track, index) => {
                  const trackId = String(track?.entityId || track?.id || '');
                  const isActive = trackId && trackId === activeTrackId;

                  return (
                    <FavoriteTrackRow
                      key={trackId || `favorite-${index}`}
                      item={track}
                      index={index}
                      isActive={Boolean(isActive)}
                      isPlaying={Boolean(isActive && isPlaying)}
                      onPlayPress={() => handleTrackPress(track, index)}
                      onOpenDetail={() => handleOpenTrackDetail(track)}
                    />
                  );
                })
              ) : (
                <Text style={styles.emptyPanelText}>
                  Bạn chưa thích bài hát nào. Hãy thích bài hát từ màn chi tiết để xây dựng danh sách yêu thích ở đây.
                </Text>
              )}
            </View>
          </View>
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
  scrollBody: {
    padding: 16,
  },
  heroCard: {
    backgroundColor: '#141414',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
  },
  heroEyebrow: {
    color: '#8a8a8a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
  },
  heroText: {
    color: '#b5b5b5',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  heroMetaWrap: {
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
  metaPillText: {
    color: '#d4d4d4',
    fontSize: 11,
    fontWeight: '600',
  },
  playButton: {
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
  playButtonDisabled: {
    backgroundColor: '#2a2a2a',
  },
  playButtonText: {
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
  trackRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  trackMainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  artwork: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#202020',
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  trackArtwork: {
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
  trackDetailButton: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPanelText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 19,
    padding: 14,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    minWidth: 160,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  loginButton: {
    minWidth: 180,
    marginTop: 16,
    backgroundColor: '#1ed760',
  },
});
