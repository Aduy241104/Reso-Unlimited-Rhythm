import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppAvatar from '../../components/common/AppAvatar';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import ProfileSidebarMenu from '../../components/common/ProfileSidebarMenu';
import FeaturedCollectionCard from '../../components/home/FeaturedCollectionCard';
import { useAuth } from '../../hooks/useAuth';
import { usePlayer } from '../../hooks/usePlayer';
import homeService from '../../services/homeService';
import { formatCompactNumber, formatDateLabel, resolveImageUri } from '../../utils/media';

const SIDEBAR_CLOSE_DELAY = 180;

const initialHomeState = {
  dailyTopTracks: [],
  monthlyTopTracks: [],
  dailyTopArtists: [],
  monthlyTopArtists: [],
  systemPlaylists: [],
  recommendedPlaylists: [],
  recentAlbums: [],
  sectionErrors: {},
  query: {
    date: '',
    month: '',
  },
};

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

const SectionState = ({ message, isError = false }) => (
  <View style={[styles.sectionState, isError && styles.sectionStateError]}>
    <Text style={[styles.sectionStateText, isError && styles.sectionStateTextError]}>{message}</Text>
  </View>
);

const CardSeparator = () => <View style={styles.cardSeparator} />;

const HomeSection = ({
  title,
  data,
  errorMessage,
  renderItem,
  emptyMessage,
  actionLabel,
  onActionPress,
}) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeadingRow}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {actionLabel && onActionPress ? (
        <TouchableOpacity
          style={styles.sectionAction}
          activeOpacity={0.7}
          onPress={onActionPress}
        >
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color="#ffffff" />
        </TouchableOpacity>
      ) : null}
    </View>

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
        style={styles.horizontalListViewport}
        ItemSeparatorComponent={CardSeparator}
        showsHorizontalScrollIndicator={false}
      />
    )}
  </View>
);

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, logout } = useAuth();
  const { playQueue } = usePlayer();
  const [homeData, setHomeData] = useState(initialHomeState);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contentError, setContentError] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const sidebarActionTimeoutRef = useRef(null);

  useEffect(
    () => () => {
      if (sidebarActionTimeoutRef.current) {
        clearTimeout(sidebarActionTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setIsSidebarVisible(false);
    }
  }, [isAuthenticated]);

  const loadHomepage = useCallback(async (options = {}) => {
    const isRefresh = Boolean(options.refresh);

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsContentLoading(true);
    }

    try {
      const data = await homeService.getHomepageData({
        includeRecommendations: isAuthenticated,
        topTrackLimit: 5,
        topArtistLimit: 5,
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
  }, [isAuthenticated]);

  useEffect(() => {
    loadHomepage();
  }, [loadHomepage]);

  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  const runAfterSidebarClose = useCallback(
    (callback) => {
      closeSidebar();

      if (sidebarActionTimeoutRef.current) {
        clearTimeout(sidebarActionTimeoutRef.current);
      }

      sidebarActionTimeoutRef.current = setTimeout(() => {
        sidebarActionTimeoutRef.current = null;
        callback?.();
      }, SIDEBAR_CLOSE_DELAY);
    },
    [closeSidebar]
  );

  const handleOpenDetail = useCallback(
    (params) => {
      if (!params?.entityType || !params?.entityId) {
        return;
      }

      navigation.navigate('EntityDetail', params);
    },
    [navigation]
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

  const handleOpenRanking = useCallback((contentType, period) => {
    navigation.navigate('RankingList', {
      contentType,
      period,
      date: homeData.query.date,
      month: homeData.query.month,
    });
  }, [homeData.query.date, homeData.query.month, navigation]);

  const handlePlayRecommendation = useCallback((mix) => {
    if (!Array.isArray(mix?.tracks) || mix.tracks.length === 0) {
      return;
    }

    playQueue(mix.tracks, 0);
    navigation.navigate('PlayerSheet');
  }, [navigation, playQueue]);

  const handleOpenSidebar = useCallback(() => {
    if (isAuthenticated) {
      setIsSidebarVisible(true);
      return;
    }

    navigation.navigate('Login');
  }, [isAuthenticated, navigation]);

  const handleLogout = useCallback(() => {
    runAfterSidebarClose(() => {
      logout();
    });
  }, [logout, runAfterSidebarClose]);

  const handleOpenNotifications = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    navigation.navigate('Notifications');
  };

  const displayName = resolveUserDisplayName(user);
  const avatarUri = resolveUserAvatar(user);
  const userSubtitle = user?.email || 'Tài khoản đã đăng nhập';
  const sidebarMenuItems = useMemo(
    () => [
      {
        key: 'user-profile',
        label: 'Hồ sơ của bạn',
        icon: 'person-circle-outline',
        onPress: () => runAfterSidebarClose(() => navigation.navigate('UserProfile')),
      },
      {
        key: 'subscription-status',
        label: 'Trạng thái đăng ký',
        icon: 'diamond-outline',
        onPress: () =>
          runAfterSidebarClose(() =>
            navigation.navigate('SubscriptionStatus')
          ),
      },
      {
        key: 'artist-registration',
        label: 'Danh sách yêu cầu nghệ sĩ',
        icon: 'document-text-outline',
        onPress: () => runAfterSidebarClose(() => navigation.navigate('ArtistRegistrationRequest', { initialView: 'history' })),
      },
      {
        key: 'artist-registration-form',
        label: 'Đăng ký trở thành nghệ sĩ',
        icon: 'mic-outline',
        onPress: () => runAfterSidebarClose(() => navigation.navigate('ArtistRegistrationRequest', { initialView: 'form' })),
      },
      ['user', 'artist'].includes(user?.role)
        ? {
          key: 'report-list',
          label: 'Danh sách báo cáo',
          icon: 'flag-outline',
          onPress: () => runAfterSidebarClose(() => navigation.navigate('ReportList')),
        }
        : null,
      {
        key: 'add-account',
        label: 'Thêm tài khoản',
        icon: 'add-circle-outline',
        onPress: () => { },
      },
      {
        key: 'listening-stats',
        label: 'Số liệu hoạt động nghe',
        icon: 'analytics-outline',
        onPress: () => { },
      },
      {
        key: 'recent',
        label: 'Gần đây',
        icon: 'time-outline',
        onPress: () => { },
      },
      {
        key: 'updates',
        label: 'Tin cập nhật',
        icon: 'megaphone-outline',
        onPress: () => { },
      },
      {
        key: 'settings-privacy',
        label: 'Cài đặt và quyền riêng tư',
        icon: 'settings-outline',
        onPress: () => { },
      },
    ].filter(Boolean),
    [navigation, runAfterSidebarClose, user?.role]
  );

  const renderTrackCard = ({ item }) => (
    <FeaturedCollectionCard
      title={item.title}
      description={`#${item.rank || '-'} · ${item.artistName} · ${formatCompactNumber(item.playCount)} lượt phát`}
      image={item.image}
      style={styles.cardItem}
      onPress={() =>
        handleOpenDetail({
          entityType: 'track',
          entityId: item.entityId || item.id,
          initialTitle: item.title || 'Chi tiết bài hát',
        })
      }
    />
  );

  const renderArtistCard = ({ item }) => (
    <FeaturedCollectionCard
      title={item.name}
      description={`#${item.rank || '-'} · ${formatCompactNumber(item.playCount)} lượt phát · ${formatCompactNumber(item.uniqueListeners)} người nghe`}
      image={item.avatar}
      style={styles.cardItem}
      onPress={() =>
        handleOpenDetail({
          entityType: 'artist',
          entityId: item.id,
          initialTitle: item.name || 'Chi tiết nghệ sĩ',
        })
      }
    />
  );

  const renderPlaylistCard = ({ item }) => (
    <FeaturedCollectionCard
      title={item.title}
      description={item.description || 'Playlist tuyển chọn từ hệ thống'}
      image={item.coverImage}
      style={styles.cardItem}
      onPress={() => handleOpenPlaylistDetail(item)}
    />
  );

  const renderRecommendationCard = ({ item }) => (
    <FeaturedCollectionCard
      title={item.title}
      description={item.description || item.subtitle || 'Daily Mix dành riêng cho bạn.'}
      image={item.coverImage}
      style={styles.cardItem}
      onPress={() => handlePlayRecommendation(item)}
    />
  );

  const renderAlbumCard = ({ item }) => {
    const artistName = item?.artist?.name || 'Nghệ sĩ không xác định';
    const releaseLabel = formatDateLabel(item?.releaseDate);

    return (
      <FeaturedCollectionCard
        title={item.title}
        description={releaseLabel ? `${artistName} · ${releaseLabel}` : artistName}
        image={item.coverImage}
        style={styles.cardItem}
        onPress={() =>
          handleOpenDetail({
            entityType: 'album',
            entityId: item.id,
            initialTitle: item.title || 'Chi tiết album',
          })
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerIdentity}>
          {isAuthenticated ? (
            <Pressable style={styles.avatarButton} onPress={handleOpenSidebar} hitSlop={8}>
              <AppAvatar uri={avatarUri} label={displayName} size={44} />
            </Pressable>
          ) : null}

          <View style={styles.headerTextGroup}>
            <Text style={styles.brandText}>RESO MUSIC</Text>
            <Text style={styles.welcomeText} numberOfLines={1}>
              {isAuthenticated ? displayName : 'Trang chủ'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBadge}
            onPress={handleOpenNotifications}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={18} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logoutBadge, !isAuthenticated && styles.loginBadge]}
            onPress={handleOpenSidebar}
            activeOpacity={0.8}
          >
            <Text style={[styles.logoutText, !isAuthenticated && styles.loginText]}>
              {isAuthenticated ? 'Tài khoản' : 'Đăng nhập'}
            </Text>
          </TouchableOpacity>
        </View>
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
          <HomeSection
            title="Top bài hát theo ngày"
            data={homeData.dailyTopTracks}
            errorMessage={homeData.sectionErrors.dailyTopTracks}
            renderItem={renderTrackCard}
            emptyMessage="Hiện chưa có dữ liệu bảng xếp hạng bài hát theo ngày."
            actionLabel="Xem thêm"
            onActionPress={() => handleOpenRanking('track', 'daily')}
          />

          <HomeSection
            title="Top bài hát theo tháng"
            data={homeData.monthlyTopTracks}
            errorMessage={homeData.sectionErrors.monthlyTopTracks}
            renderItem={renderTrackCard}
            emptyMessage="Hiện chưa có dữ liệu bảng xếp hạng bài hát theo tháng."
            actionLabel="Xem thêm"
            onActionPress={() => handleOpenRanking('track', 'monthly')}
          />

          <HomeSection
            title="Top nghệ sĩ theo ngày"
            data={homeData.dailyTopArtists}
            errorMessage={homeData.sectionErrors.dailyTopArtists}
            renderItem={renderArtistCard}
            emptyMessage="Hiện chưa có dữ liệu bảng xếp hạng nghệ sĩ theo ngày."
            actionLabel="Xem thêm"
            onActionPress={() => handleOpenRanking('artist', 'daily')}
          />

          <HomeSection
            title="Top nghệ sĩ theo tháng"
            data={homeData.monthlyTopArtists}
            errorMessage={homeData.sectionErrors.monthlyTopArtists}
            renderItem={renderArtistCard}
            emptyMessage="Hiện chưa có dữ liệu bảng xếp hạng nghệ sĩ theo tháng."
            actionLabel="Xem thêm"
            onActionPress={() => handleOpenRanking('artist', 'monthly')}
          />

          <HomeSection
            title="Playlist hệ thống"
            data={homeData.systemPlaylists}
            errorMessage={homeData.sectionErrors.systemPlaylists}
            renderItem={renderPlaylistCard}
            emptyMessage="Chưa có playlist hệ thống."
          />

          {isAuthenticated ? (
            <HomeSection
              title={`Dành cho ${displayName}`}
              data={homeData.recommendedPlaylists}
              errorMessage={homeData.sectionErrors.recommendedPlaylists}
              renderItem={renderRecommendationCard}
              emptyMessage="Hôm nay chưa có playlist gợi ý cá nhân nào sẵn sàng."
            />
          ) : null}

          <HomeSection
            title="Album nổi bật"
            data={homeData.recentAlbums}
            errorMessage={homeData.sectionErrors.recentAlbums}
            renderItem={renderAlbumCard}
            emptyMessage="Hiện chưa có dữ liệu album."
          />
        </ScrollView>
      )}

      <ProfileSidebarMenu
        visible={isSidebarVisible}
        onClose={closeSidebar}
        displayName={displayName}
        subtitle={userSubtitle}
        avatarUri={avatarUri}
        menuItems={sidebarMenuItems}
        footerItem={{
          icon: 'log-out-outline',
          label: 'Đăng xuất',
          onPress: handleLogout,
          tone: 'danger',
        }}
      />
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 12,
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
  avatarButton: {
    borderRadius: 999,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  loginBadge: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  loginText: {
    color: '#000000',
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
    paddingVertical: 20,
  },
  sectionContainer: {
    marginBottom: 36,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  sectionHeadingCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sectionActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  horizontalListViewport: {
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  cardItem: {
    width: 104,
    marginHorizontal: 0,
  },
  cardSeparator: {
    width: 16,
  },
  sectionState: {
    marginHorizontal: 12,
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
