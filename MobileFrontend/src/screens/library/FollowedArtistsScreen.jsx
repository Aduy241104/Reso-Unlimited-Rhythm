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
import {
  formatDateLabel,
  getErrorMessage,
  getInitials,
  resolveImageUri,
} from '../../utils/media';

const accentPalette = ['#22343b', '#26354c', '#3a2e47', '#233624', '#3f2a30'];
const LOAD_MORE_STEP = 10;

const readText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return fallback;
};

const ArtistArtwork = ({ uri, label, color }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.artistArtwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.artistArtwork, styles.artistArtworkFallback, { backgroundColor: color }]}>
      <Text style={styles.artistArtworkText}>{getInitials(label)}</Text>
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
      <ArtistArtwork uri={artist?.avatar || artist?.image} label={artistName} color={accentColor} />
      <View style={styles.artistContent}>
        <View style={styles.artistTopRow}>
          <Text style={styles.artistName} numberOfLines={1}>{artistName}</Text>
          <View style={styles.artistBadge}>
            <Text style={styles.artistBadgeText}>Artist</Text>
          </View>
        </View>
        <Text style={styles.artistMeta} numberOfLines={2}>
          {followedLabel ? `Theo dõi từ ${followedLabel}` : 'Nghệ sĩ bạn đã lưu trong thư viện'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#7f8894" />
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
  const [visibleArtistsCount, setVisibleArtistsCount] = useState(LOAD_MORE_STEP);

  const loadFollowedArtists = useCallback(async ({ refresh = false } = {}) => {
    if (!isAuthenticated) {
      setArtists([]);
      setErrorMessage('');
      setIsLoading(false);
      setIsRefreshing(false);
      setVisibleArtistsCount(LOAD_MORE_STEP);
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
      setVisibleArtistsCount(LOAD_MORE_STEP);
      setErrorMessage('');
    } catch (error) {
      setArtists([]);
      setVisibleArtistsCount(LOAD_MORE_STEP);
      setErrorMessage(getErrorMessage(error, 'Không thể tải danh sách nghệ sĩ đang theo dõi lúc này.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void loadFollowedArtists();
      return undefined;
    }, [loadFollowedArtists])
  );

  const artistCountLabel = useMemo(() => `${artists.length} nghệ sĩ`, [artists.length]);
  const visibleArtists = useMemo(() => artists.slice(0, visibleArtistsCount), [artists, visibleArtistsCount]);
  const canLoadMoreArtists = visibleArtists.length < artists.length;

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
        <StatusBar barStyle="light-content" backgroundColor="#050608" />
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Nghệ sĩ theo dõi</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Cần đăng nhập</Text>
          <Text style={styles.emptyText}>
            Danh sách nghệ sĩ theo dõi được gắn với tài khoản của bạn.
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
        <Text style={styles.topBarTitle}>Nghệ sĩ theo dõi</Text>
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
          <AppButton title="Thử lại" onPress={() => loadFollowedArtists()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollBody, { paddingBottom: 28 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadFollowedArtists({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
        >
          <LinearGradient colors={['#1f4340', '#151b22', '#0c0e12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Thư viện của bạn</Text>
            <Text style={styles.heroTitle}>Giữ nghệ sĩ bạn quan tâm ở thật gần</Text>
            <Text style={styles.heroText}>
              Quay lại nhanh với các nghệ sĩ bạn đã theo dõi và mở thẳng trang chi tiết chỉ bằng một chạm.
            </Text>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{artistCountLabel}</Text>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tất cả nghệ sĩ</Text>
            <Text style={styles.sectionCaption}>Danh sách đồng bộ với tài khoản của bạn</Text>
          </View>

          <View style={styles.panel}>
            {artists.length > 0 ? (
              visibleArtists.map((artist, index) => (
                <ArtistRow
                  key={artist?.entityId || artist?.id || `followed-artist-${index}`}
                  artist={artist}
                  index={index}
                  onPress={() => handleOpenArtistDetail(artist)}
                />
              ))
            ) : (
              <Text style={styles.emptyPanelText}>
                Bạn chưa theo dõi nghệ sĩ nào. Hãy theo dõi từ trang chi tiết để chúng xuất hiện ở đây.
              </Text>
            )}
          </View>
          {canLoadMoreArtists ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setVisibleArtistsCount((current) => current + LOAD_MORE_STEP)}
              style={styles.loadMoreButton}
            >
              <Text style={styles.loadMoreButtonText}>Hiện thêm 10 nghệ sĩ</Text>
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
    color: '#7ddcac',
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
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1b2029',
  },
  artistArtwork: {
    width: 62,
    height: 62,
    borderRadius: 999,
    backgroundColor: '#1f1f1f',
  },
  artistArtworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistArtworkText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  artistContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  artistTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artistName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  artistBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#243543',
    backgroundColor: '#151d26',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  artistBadgeText: {
    color: '#dfe6ee',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  artistMeta: {
    color: '#98a3af',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
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
