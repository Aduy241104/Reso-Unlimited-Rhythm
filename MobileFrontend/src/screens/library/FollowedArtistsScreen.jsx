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
import { formatDateLabel, getErrorMessage, getInitials, resolveImageUri } from '../../utils/media';

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

const ArtistRow = ({ artist, index, onPress }) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const artistName = readText(artist?.name, 'Nghệ sĩ không xác định');
  const followedLabel = readText(
    artist?.followedAtLabel,
    artist?.followedAt ? formatDateLabel(artist.followedAt) : ''
  );

  return (
    <TouchableOpacity style={styles.artistRow} activeOpacity={0.85} onPress={onPress}>
      <Artwork
        uri={artist?.avatar || artist?.image}
        label={artistName}
        color={accentColor}
        style={styles.artistArtwork}
        textStyle={styles.artistArtworkText}
      />
      <View style={styles.artistContent}>
        <Text style={styles.artistName} numberOfLines={1}>{artistName}</Text>
        <Text style={styles.artistMeta} numberOfLines={1}>
          {followedLabel ? `Theo dõi từ ${followedLabel}` : 'Nghệ sĩ bạn đang theo dõi'}
        </Text>
      </View>
      <Text style={styles.artistAction}>Mở</Text>
    </TouchableOpacity>
  );
};

export default function FollowedArtistsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [artists, setArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadFollowedArtists = useCallback(async ({ refresh = false } = {}) => {
    if (!isAuthenticated) {
      setArtists([]);
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
      const result = await libraryService.getFollowedArtists({
        page: 1,
        limit: 50,
      });

      setArtists(Array.isArray(result?.items) ? result.items : []);
      setErrorMessage('');
    } catch (error) {
      setArtists([]);
      setErrorMessage(getErrorMessage(error, 'Không thể tải danh sách nghệ sĩ đang theo dõi lúc này.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      loadFollowedArtists();
      return undefined;
    }, [loadFollowedArtists])
  );

  const artistCountLabel = useMemo(() => `${artists.length} nghệ sĩ`, [artists.length]);

  const handleOpenArtistDetail = useCallback((artist) => {
    const artistId = artist?.entityId || artist?.id;

    if (!artistId) {
      return;
    }

    navigation.navigate('EntityDetail', {
      entityType: 'artist',
      entityId: artistId,
      initialTitle: artist?.name || 'Chi tiết nghệ sĩ',
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
          <Text style={styles.headerTitle}>Nghệ sĩ đang theo dõi</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Cần đăng nhập</Text>
          <Text style={styles.emptyText}>
            Các nghệ sĩ bạn theo dõi được gắn với tài khoản, nên hãy đăng nhập trước.
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
        <Text style={styles.headerTitle}>Nghệ sĩ đang theo dõi</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <AppButton title="Thử lại" onPress={() => loadFollowedArtists()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollBody, { paddingBottom: 32 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadFollowedArtists({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>THƯ VIỆN CỦA BẠN</Text>
            <Text style={styles.heroTitle}>Tất cả nghệ sĩ bạn đang theo dõi</Text>
            <Text style={styles.heroText}>
              Quay lại nhanh với những nghệ sĩ bạn quan tâm nhất và mở thẳng vào trang chi tiết bất cứ lúc nào.
            </Text>

            <View style={styles.heroMetaWrap}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{artistCountLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nghệ sĩ đã theo dõi</Text>
            <View style={styles.panel}>
              {artists.length > 0 ? (
                artists.map((artist, index) => (
                  <ArtistRow
                    key={artist?.entityId || artist?.id || `followed-artist-${index}`}
                    artist={artist}
                    index={index}
                    onPress={() => handleOpenArtistDetail(artist)}
                  />
                ))
              ) : (
                <Text style={styles.emptyPanelText}>
                  Bạn chưa theo dõi nghệ sĩ nào. Hãy theo dõi nghệ sĩ từ màn chi tiết để họ xuất hiện ở đây.
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
  artistRow: {
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
    borderRadius: 999,
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
  artistArtwork: {
    marginRight: 12,
  },
  artistArtworkText: {
    fontSize: 18,
  },
  artistContent: {
    flex: 1,
  },
  artistName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  artistMeta: {
    color: '#a3a3a3',
    fontSize: 11,
    marginTop: 5,
  },
  artistAction: {
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
