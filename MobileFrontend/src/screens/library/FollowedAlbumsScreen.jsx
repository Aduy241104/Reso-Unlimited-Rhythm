import React, { useCallback, useMemo, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import libraryService from '../../services/libraryService';
import { getErrorMessage, getInitials, resolveImageUri } from '../../utils/media';

const accentPalette = ['#243347', '#2f2442', '#2f3e28', '#3f2a30', '#25383d'];
const LOAD_MORE_STEP = 10;

const readText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return fallback;
};

const AlbumArtwork = ({ uri, label, color }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.albumArtwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.albumArtwork, styles.albumArtworkFallback, { backgroundColor: color }]}>
      <Text style={styles.albumArtworkText}>{getInitials(label)}</Text>
    </View>
  );
};

const AlbumRow = ({ album, index, onPress }) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const title = readText(album?.title, 'Album chưa có tên');
  const artistName = readText(album?.artistName, 'Nghệ sĩ không xác định');
  const trackCount = Number(album?.trackCount) || 0;

  return (
    <TouchableOpacity style={styles.albumRow} activeOpacity={0.85} onPress={onPress}>
      <AlbumArtwork uri={album?.coverImage || album?.image} label={title} color={accentColor} />
      <View style={styles.albumContent}>
        <View style={styles.albumTopRow}>
          <Text style={styles.albumTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.albumBadge}>
            <Text style={styles.albumBadgeText}>Album</Text>
          </View>
        </View>
        <Text style={styles.albumMeta} numberOfLines={1}>{artistName}</Text>
        <Text style={styles.albumMetaSecondary} numberOfLines={1}>
          {trackCount > 0 ? `${trackCount} bài hát` : 'Album bạn đã theo dõi'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#7f8894" />
    </TouchableOpacity>
  );
};

export default function FollowedAlbumsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [visibleAlbumsCount, setVisibleAlbumsCount] = useState(LOAD_MORE_STEP);

  const loadFollowedAlbums = useCallback(async ({ refresh = false } = {}) => {
    if (!isAuthenticated) {
      setAlbums([]);
      setErrorMessage('');
      setIsLoading(false);
      setIsRefreshing(false);
      setVisibleAlbumsCount(LOAD_MORE_STEP);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await libraryService.getFollowedAlbums({
        page: 1,
        limit: 50,
      });

      setAlbums(Array.isArray(result?.items) ? result.items : []);
      setVisibleAlbumsCount(LOAD_MORE_STEP);
      setErrorMessage('');
    } catch (error) {
      setAlbums([]);
      setVisibleAlbumsCount(LOAD_MORE_STEP);
      setErrorMessage(getErrorMessage(error, 'Không thể tải danh sách album đang theo dõi lúc này.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void loadFollowedAlbums();
      return undefined;
    }, [loadFollowedAlbums])
  );

  const albumCountLabel = useMemo(() => `${albums.length} album`, [albums.length]);
  const visibleAlbums = useMemo(() => albums.slice(0, visibleAlbumsCount), [albums, visibleAlbumsCount]);
  const canLoadMoreAlbums = visibleAlbums.length < albums.length;

  const handleOpenAlbumDetail = useCallback((album) => {
    const albumId = album?.entityId || album?.id;

    if (!albumId) {
      return;
    }

    navigation.navigate('EntityDetail', {
      entityType: 'album',
      entityId: albumId,
      initialTitle: album?.title || 'Chi tiết album',
    });
  }, [navigation]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050608" />
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Album theo dõi</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Cần đăng nhập</Text>
          <Text style={styles.emptyText}>
            Danh sách album theo dõi được gắn với tài khoản của bạn.
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
        <Text style={styles.topBarTitle}>Album theo dõi</Text>
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
          <AppButton title="Thử lại" onPress={() => loadFollowedAlbums()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollBody, { paddingBottom: 28 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadFollowedAlbums({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
        >
          <LinearGradient colors={['#364827', '#151b22', '#0c0e12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Thư viện của bạn</Text>
            <Text style={styles.heroTitle}>Những album bạn không muốn bỏ lỡ</Text>
            <Text style={styles.heroText}>
              Mở lại nhanh những album đã theo dõi với bố cục tối ưu cho điện thoại và thao tác chạm rõ ràng hơn.
            </Text>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{albumCountLabel}</Text>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tất cả album</Text>
            <Text style={styles.sectionCaption}>Danh sách đã lưu trong thư viện của bạn</Text>
          </View>

          <View style={styles.panel}>
            {albums.length > 0 ? (
              visibleAlbums.map((album, index) => (
                <AlbumRow
                  key={album?.entityId || album?.id || `followed-album-${index}`}
                  album={album}
                  index={index}
                  onPress={() => handleOpenAlbumDetail(album)}
                />
              ))
            ) : (
              <Text style={styles.emptyPanelText}>
                Bạn chưa theo dõi album nào. Hãy theo dõi từ trang chi tiết để chúng xuất hiện ở đây.
              </Text>
            )}
          </View>
          {canLoadMoreAlbums ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setVisibleAlbumsCount((current) => current + LOAD_MORE_STEP)}
              style={styles.loadMoreButton}
            >
              <Text style={styles.loadMoreButtonText}>Hiện thêm 10 album</Text>
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
  heroEyebrow: {
    color: '#b5f09f',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginTop: 10,
  },
  heroText: {
    color: '#bcc4cf',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  heroPill: {
    alignSelf: 'flex-start',
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: {
    color: '#edf2f7',
    fontSize: 11,
    fontWeight: '700',
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
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1b2029',
  },
  albumArtwork: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#1f1f1f',
  },
  albumArtworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArtworkText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  albumContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  albumTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  albumTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  albumBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2b3642',
    backgroundColor: '#171d25',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  albumBadgeText: {
    color: '#dfe6ee',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  albumMeta: {
    color: '#98a3af',
    fontSize: 12,
    marginTop: 6,
  },
  albumMetaSecondary: {
    color: '#7f8894',
    fontSize: 11,
    marginTop: 4,
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
