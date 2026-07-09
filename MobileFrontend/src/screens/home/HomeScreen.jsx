import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppAvatar from '../../components/common/AppAvatar';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import FeaturedCollectionCard from '../../components/home/FeaturedCollectionCard';
import { useAuth } from '../../hooks/useAuth';
import homeService from '../../services/homeService';
import { formatDateLabel, getInitials, resolveImageUri } from '../../utils/media';

const initialHomeState = {
  topTrackCollections: [],
  monthlyTopArtists: [],
  systemPlaylists: [],
  recentAlbums: [],
  sectionErrors: {},
  query: {
    date: '',
    month: '',
  },
};

const accentPalette = ['#111111', '#2f2f2f', '#4a4a4a', '#686868', '#8a8a8a'];

const resolveUserDisplayName = (user) =>
  user?.fullName || user?.name || user?.username || user?.displayName || user?.email || 'Người yêu nhạc';

const resolveUserAvatar = (user) =>
  resolveImageUri(
    user?.avatar ||
    user?.profileImage ||
    user?.image ||
    user?.photoUrl ||
    user?.photoURL ||
    user?.picture
  );

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

const SectionState = ({ message, isError = false }) => (
  <View style={[styles.sectionState, isError && styles.sectionStateError]}>
    <Text style={[styles.sectionStateText, isError && styles.sectionStateTextError]}>{message}</Text>
  </View>
);

const HomeSection = ({ title, data, errorMessage, renderItem, emptyMessage }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>

    {errorMessage ? (
      <SectionState message={errorMessage} isError />
    ) : data.length === 0 ? (
      <SectionState message={emptyMessage || 'Không có dữ liệu.'} />
    ) : (
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || item._id || `${title}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />
    )}
  </View>
);

const TopTrackSection = ({ data, errorMessage, onPressItem }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>BXH bài hát nổi bật</Text>

    {errorMessage ? (
      <SectionState message={errorMessage} isError />
    ) : data.length === 0 ? (
      <SectionState message="Chưa có bảng xếp hạng bài hát nổi bật." />
    ) : (
      <View style={styles.topTrackGrid}>
        {data.slice(0, 2).map((item) => (
          <FeaturedCollectionCard
            key={item.id || item._id}
            title={item.title}
            description={item.description}
            image={item.image}
            style={styles.topTrackCard}
            onPress={() => onPressItem(item)}
          />
        ))}
      </View>
    )}
  </View>
);

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, logout, user } = useAuth();
  const [homeData, setHomeData] = useState(initialHomeState);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contentError, setContentError] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const loadHomepage = useCallback(async (options = {}) => {
    const isRefresh = Boolean(options.refresh);

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsContentLoading(true);
    }

    try {
      const data = await homeService.getHomepageData({
        topTrackPreviewLimit: 1,
        topArtistLimit: 10,
        playlistLimit: 10,
        albumLimit: 10,
      });

      setHomeData(data);
      setContentError(null);
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);
    } catch (error) {
      if (!hasLoadedOnceRef.current) {
        setContentError(error.message || 'Không thể tải dữ liệu trang chủ.');
      }
    } finally {
      setIsContentLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomepage();
  }, [loadHomepage]);

  const handleOpenDetail = useCallback(
    (params) => {
      if (!params?.entityType || !params?.entityId) {
        return;
      }

      navigation.navigate('EntityDetail', params);
    },
    [navigation]
  );

  const handleOpenTopTrackCollection = useCallback(
    (item) => {
      if (!item?.id) {
        return;
      }

      handleOpenDetail({
        entityType: item.entityType,
        entityId: item.id,
        initialTitle: item.title,
        period: item.period,
        date: item.date,
        month: item.month,
      });
    },
    [handleOpenDetail]
  );

  const handleOpenPlaylistDetail = useCallback((playlist) => {
    if (!playlist?.id) {
      return;
    }

    navigation.navigate('PlaylistDetail', {
      playlistId: playlist.id,
      initialTitle: playlist.title || 'Chi tiết playlist',
    });
  }, [navigation]);

  const handleHeaderAction = async () => {
    if (isAuthenticated) {
      await logout();
      return;
    }

    navigation.navigate('Login');
  };

  const displayName = resolveUserDisplayName(user);
  const avatarUri = resolveUserAvatar(user);

  const renderArtistCard = ({ item, index }) => {
    const accentColor = accentPalette[index % accentPalette.length];

    return (
      <TouchableOpacity
        style={styles.cardItem}
        activeOpacity={0.8}
        onPress={() =>
          handleOpenDetail({
            entityType: 'artist',
            entityId: item.id,
            initialTitle: item.name || 'Chi tiết nghệ sĩ',
          })
        }
      >
        <Artwork
          uri={item.avatar}
          label={item.name}
          color={accentColor}
          style={styles.artistArtwork}
          textStyle={styles.artistArtworkText}
        />
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSubTitle} numberOfLines={2}>
          Nghệ sĩ nổi bật trong bảng xếp hạng tháng.
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPlaylistCard = ({ item, index }) => {
    const accentColor = accentPalette[index % accentPalette.length];
    const playlistId = item?._id || item?.id;

    return (
      <TouchableOpacity
        style={styles.cardItem}
        activeOpacity={0.8}
        onPress={() => handleOpenPlaylistDetail(item)}
      >
        <Artwork uri={item.coverImage} label={item.title} color={accentColor} />
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardSubTitle} numberOfLines={2}>
          {item.description || 'Playlist tuyển chọn từ hệ thống'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderAlbumCard = ({ item, index }) => {
    const accentColor = accentPalette[index % accentPalette.length];
    const artistName = item?.artist?.name || 'Nghệ sĩ không xác định';
    const releaseLabel = formatDateLabel(item?.releaseDate);

    return (
      <TouchableOpacity
        style={styles.cardItem}
        activeOpacity={0.8}
        onPress={() =>
          handleOpenDetail({
            entityType: 'album',
            entityId: item.id,
            initialTitle: item.title || 'Chi tiết album',
          })
        }
      >
        <Artwork uri={item.coverImage} label={item.title} color={accentColor} />
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardSubTitle} numberOfLines={2}>
          {releaseLabel ? `${artistName} - ${releaseLabel}` : artistName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerIdentity}>
          {isAuthenticated ? <AppAvatar uri={avatarUri} label={displayName} size={44} /> : null}
          <View style={[styles.headerTextGroup, !isAuthenticated && { marginLeft: 0 }]}>
            <Text style={styles.brandText}>RESO UNLIMITED RHYTHM</Text>
            <Text style={styles.welcomeText} numberOfLines={1}>
              {isAuthenticated ? displayName : 'Đăng nhập để cá nhân hóa âm nhạc'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBadge} onPress={handleHeaderAction} activeOpacity={0.7}>
          <Text style={styles.logoutText}>{isAuthenticated ? 'Đăng xuất' : 'Đăng nhập'}</Text>
        </TouchableOpacity>
      </View>

      {isContentLoading && !hasLoadedOnce ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : contentError && !hasLoadedOnce ? (
        <View style={styles.centerState}>
          <ErrorState message={contentError} />
          <AppButton title="Thử lại" onPress={() => loadHomepage()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadHomepage({ refresh: true })}
              tintColor="#ffffff"
            />
          }
        >
          <TopTrackSection
            data={homeData.topTrackCollections}
            errorMessage={homeData.sectionErrors.topTrackCollections}
            onPressItem={handleOpenTopTrackCollection}
          />

          <HomeSection
            title="Nghệ sĩ nổi bật tháng"
            data={homeData.monthlyTopArtists}
            errorMessage={homeData.sectionErrors.monthlyTopArtists}
            renderItem={renderArtistCard}
            emptyMessage="Chưa có nghệ sĩ nổi bật theo tháng."
          />

          <HomeSection
            title="Playlist hệ thống"
            data={homeData.systemPlaylists}
            errorMessage={homeData.sectionErrors.systemPlaylists}
            renderItem={renderPlaylistCard}
            emptyMessage="Chưa có playlist hệ thống."
          />

          <HomeSection
            title="Album mới phát hành"
            data={homeData.recentAlbums}
            errorMessage={homeData.sectionErrors.recentAlbums}
            renderItem={renderAlbumCard}
            emptyMessage="Chưa có album mới phát hành."
          />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#1f1f1f',
    backgroundColor: '#000000',
  },
  headerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  headerGuestSpacer: {
    flex: 1,
  },
  headerTextGroup: {
    flex: 1,
    marginLeft: 12,
  },
  brandText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 3,
  },
  logoutBadge: {
    backgroundColor: '#111111',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    minWidth: 160,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  scrollBody: {
    paddingVertical: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  horizontalList: {
    paddingHorizontal: 15,
  },
  topTrackGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  topTrackCard: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 0,
  },
  cardItem: {
    width: 102,
    marginHorizontal: 5,
    padding: 0,
    backgroundColor: 'transparent',
  },
  artwork: {
    width: 102,
    height: 102,
    borderRadius: 8,
    backgroundColor: '#202020',
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  artistArtwork: {
    borderRadius: 51,
  },
  artistArtworkText: {
    fontSize: 18,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  cardSubTitle: {
    color: '#9a9a9a',
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
    minHeight: 26,
  },
  sectionState: {
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#252525',
  },
  sectionStateError: {
    backgroundColor: '#111111',
    borderColor: '#3a3a3a',
  },
  sectionStateText: {
    color: '#d0d0d0',
    fontSize: 12,
  },
  sectionStateTextError: {
    color: '#ffffff',
  },
});
