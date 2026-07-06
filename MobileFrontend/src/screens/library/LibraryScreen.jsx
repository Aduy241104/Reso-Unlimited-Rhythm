import React, { useCallback, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AppButton from '../../components/common/AppButton';
import AppHeader from '../../components/common/AppHeader';
import AppLoader from '../../components/common/AppLoader';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import libraryService from '../../services/libraryService';
import theme from '../../theme';
import { getInitials, resolveImageUri } from '../../utils/media';

function LegacyLibraryScreen() {
  return (
    <View style={styles.container}>
      <AppHeader title="Thư viện" />
      <View style={styles.content}>
        <Text style={styles.text}>Nơi lưu danh sách phát, nghệ sĩ và bài hát của bạn</Text>
      </View>
    </View>
  );
}

const AlbumArtwork = ({ item }) => {
  const imageUri = resolveImageUri(item?.coverImage || item?.image);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.albumArtwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.albumArtwork, styles.albumArtworkFallback]}>
      <Text style={styles.albumArtworkFallbackText}>{getInitials(item?.title)}</Text>
    </View>
  );
};

export default function LibraryScreen() {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadLibrary = useCallback(
    async (options = {}) => {
      if (!isAuthenticated) {
        setAlbums([]);
        setErrorMessage('');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const isRefresh = Boolean(options.refresh);

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await libraryService.getFollowedAlbums({ page: 1, limit: 30 });
        setAlbums(result.items);
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error?.message || 'Unable to load saved albums right now.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAuthenticated]
  );

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [loadLibrary])
  );

  const handleOpenLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const handleOpenAlbumDetail = useCallback(
    (album) => {
      if (!album?.entityId) {
        return;
      }

      navigation.navigate('EntityDetail', {
        entityType: 'album',
        entityId: album.entityId,
        initialTitle: album.title,
      });
    },
    [navigation]
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Thu vien" />

      {!isAuthenticated ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyHeading}>Dang nhap de luu album</Text>
          <Text style={styles.text}>Nhung album ban save se duoc hien tai day.</Text>
          <AppButton title="Login" onPress={handleOpenLogin} style={styles.loginButton} />
        </View>
      ) : isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage && albums.length === 0 ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <AppButton title="Try Again" onPress={() => loadLibrary()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadLibrary({ refresh: true })}
              tintColor="#ffffff"
            />
          }
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saved Albums</Text>
            <Text style={styles.sectionCaption}>{albums.length} album</Text>
          </View>

          {errorMessage ? <ErrorState message={errorMessage} /> : null}

          {albums.length === 0 ? (
            <EmptyState />
          ) : (
            albums.map((album) => (
              <TouchableOpacity
                key={album.id}
                style={styles.albumCard}
                activeOpacity={0.8}
                onPress={() => handleOpenAlbumDetail(album)}
              >
                <AlbumArtwork item={album} />

                <View style={styles.albumContent}>
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {album.title}
                  </Text>
                  <Text style={styles.albumSubtitle} numberOfLines={1}>
                    {album.artistName || 'Unknown artist'}
                  </Text>
                  <Text style={styles.albumMeta}>
                    {album.trackCount ? `${album.trackCount} track` : 'Album'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    color: theme.colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingBottom: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionCaption: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyHeading: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  loginButton: {
    minWidth: 140,
    marginTop: 18,
  },
  retryButton: {
    minWidth: 150,
    marginTop: 18,
  },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  albumArtwork: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#202020',
  },
  albumArtworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArtworkFallbackText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  albumContent: {
    flex: 1,
    marginLeft: 14,
  },
  albumTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  albumSubtitle: {
    color: '#b3b3b3',
    fontSize: 13,
    marginTop: 4,
  },
  albumMeta: {
    color: '#8a8a8a',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
});
