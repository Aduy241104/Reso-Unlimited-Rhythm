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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import libraryService from '../../services/libraryService';
import { getErrorMessage, getInitials, resolveImageUri } from '../../utils/media';

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

const AlbumRow = ({ album, index, onPress }) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const title = readText(album?.title, 'Album không xác định');
  const artistName = readText(album?.artistName, 'Nghệ sĩ không xác định');
  const trackCount = Number(album?.trackCount) || 0;

  return (
    <TouchableOpacity style={styles.albumRow} activeOpacity={0.85} onPress={onPress}>
      <Artwork
        uri={album?.coverImage || album?.image}
        label={title}
        color={accentColor}
        style={styles.albumArtwork}
        textStyle={styles.albumArtworkText}
      />
      <View style={styles.albumContent}>
        <Text style={styles.albumTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.albumMeta} numberOfLines={1}>{artistName}</Text>
        <Text style={styles.albumMetaSecondary} numberOfLines={1}>
          {trackCount > 0 ? `${trackCount} bài hát` : 'Album bạn đang theo dõi'}
        </Text>
      </View>
      <Text style={styles.albumAction}>Mở</Text>
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

  const loadFollowedAlbums = useCallback(async ({ refresh = false } = {}) => {
    if (!isAuthenticated) {
      setAlbums([]);
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
      const result = await libraryService.getFollowedAlbums({
        page: 1,
        limit: 50,
      });

      setAlbums(Array.isArray(result?.items) ? result.items : []);
      setErrorMessage('');
    } catch (error) {
      setAlbums([]);
      setErrorMessage(getErrorMessage(error, 'Không thể tải danh sách album đang theo dõi lúc này.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      loadFollowedAlbums();
      return undefined;
    }, [loadFollowedAlbums])
  );

  const albumCountLabel = useMemo(() => `${albums.length} album`, [albums.length]);

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
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Album đang theo dõi</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Cần đăng nhập</Text>
          <Text style={styles.emptyText}>
            Các album bạn theo dõi được gắn với tài khoản, nên hãy đăng nhập trước.
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
        <Text style={styles.headerTitle}>Album đang theo dõi</Text>
        <View style={styles.headerSpacer} />
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
          contentContainerStyle={[styles.scrollBody, { paddingBottom: 32 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadFollowedAlbums({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>THƯ VIỆN CỦA BẠN</Text>
            <Text style={styles.heroTitle}>Tất cả album bạn đang theo dõi</Text>
            <Text style={styles.heroText}>
              Quay lại nhanh với những album bạn đã lưu theo dõi và mở thẳng vào trang chi tiết bất cứ lúc nào.
            </Text>

            <View style={styles.heroMetaWrap}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{albumCountLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Album đã theo dõi</Text>
            <View style={styles.panel}>
              {albums.length > 0 ? (
                albums.map((album, index) => (
                  <AlbumRow
                    key={album?.entityId || album?.id || `followed-album-${index}`}
                    album={album}
                    index={index}
                    onPress={() => handleOpenAlbumDetail(album)}
                  />
                ))
              ) : (
                <Text style={styles.emptyPanelText}>
                  Bạn chưa theo dõi album nào. Hãy theo dõi album từ màn chi tiết để chúng xuất hiện ở đây.
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
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  artwork: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#202020',
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  albumArtwork: {
    marginRight: 12,
  },
  albumArtworkText: {
    fontSize: 18,
  },
  albumContent: {
    flex: 1,
  },
  albumTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  albumMeta: {
    color: '#a3a3a3',
    fontSize: 11,
    marginTop: 5,
  },
  albumMetaSecondary: {
    color: '#7f7f7f',
    fontSize: 10,
    marginTop: 4,
  },
  albumAction: {
    color: '#1ed760',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 10,
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
