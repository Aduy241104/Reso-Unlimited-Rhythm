import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import CreatePlaylistModal from '../../components/library/CreatePlaylistModal';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import playlistService from '../../services/playlistService';
import userPlaylistService from '../../services/userPlaylistService';
import {
  formatDuration,
  getErrorMessage,
  getInitials,
  resolveImageUri,
} from '../../utils/media';

const accentPalette = ['#20383b', '#31283f', '#2d3f25', '#3b232a', '#1f3145'];
const LOAD_MORE_STEP = 10;

const readText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return fallback;
};

const getPlaylistVisibilityLabel = (item) => {
  if (item?.type === 'system') {
    return 'Hệ thống';
  }

  return item?.isPublic ? 'Công khai' : 'Riêng tư';
};

const Artwork = ({ uri, label, color, size = 62, radius = 16, textSize = 20 }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#1f1f1f' }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.artworkFallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.artworkFallbackText, { fontSize: textSize }]}>
        {getInitials(label)}
      </Text>
    </View>
  );
};

const FilterChip = ({ label, active = false, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={[styles.filterChip, active ? styles.filterChipActive : null]}
  >
    <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const QuickActionCard = ({ title, subtitle, icon, colors, onPress }) => (
  <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.quickActionCard}>
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickActionIconWrap}>
      <Ionicons name={icon} size={20} color="#ffffff" />
    </LinearGradient>
    <View style={styles.quickActionContent}>
      <Text style={styles.quickActionTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.quickActionSubtitle} numberOfLines={2}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#7f8894" />
  </TouchableOpacity>
);

const PlaylistRow = ({ item, index, onPress }) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const title = readText(item?.title, 'Playlist chưa có tên');
  const trackCount = Number(item?.trackCount) || 0;
  const subtitle = item?.type === 'system'
    ? readText(item?.description, 'Playlist tuyển chọn bởi Reso.')
    : `${getPlaylistVisibilityLabel(item)} • ${trackCount > 0 ? `${trackCount} bài hát` : 'Chưa có bài hát'}`;
  const footerLabel = Number(item?.totalDuration) > 0
    ? formatDuration(item.totalDuration)
    : item?.type === 'system'
      ? 'Mở ngay'
      : 'Thư viện của bạn';

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={styles.playlistRow}>
      <Artwork uri={item?.coverImage || item?.image} label={title} color={accentColor} />
      <View style={styles.playlistContent}>
        <View style={styles.playlistMetaRow}>
          <View style={styles.playlistTypePill}>
            <Text style={styles.playlistTypePillText}>
              {item?.type === 'system' ? 'Playlist' : 'Của bạn'}
            </Text>
          </View>
          <Text style={styles.playlistFooterLabel}>{footerLabel}</Text>
        </View>
        <Text style={styles.playlistTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.playlistSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

const SectionHeader = ({ title, actionLabel, onActionPress, disabled = false }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionLabel ? (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onActionPress}
        disabled={disabled}
        style={[styles.sectionAction, disabled ? styles.sectionActionDisabled : null]}
      >
        <Text style={styles.sectionActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export default function LibraryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [systemPlaylists, setSystemPlaylists] = useState([]);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [isSystemLoading, setIsSystemLoading] = useState(true);
  const [isMyLoading, setIsMyLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [systemErrorMessage, setSystemErrorMessage] = useState('');
  const [myErrorMessage, setMyErrorMessage] = useState('');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [createPlaylistError, setCreatePlaylistError] = useState('');
  const [visibleMyPlaylistsCount, setVisibleMyPlaylistsCount] = useState(LOAD_MORE_STEP);
  const [visibleSystemPlaylistsCount, setVisibleSystemPlaylistsCount] = useState(LOAD_MORE_STEP);
  const skipNextFocusRefreshRef = useRef(true);

  const displayName = useMemo(
    () =>
      user?.profile?.fullName ||
      user?.fullName ||
      user?.name ||
      user?.email ||
      'tài khoản của bạn',
    [user]
  );

  const loadSystemPlaylists = useCallback(async ({ refresh = false } = {}) => {
    if (!refresh) {
      setIsSystemLoading(true);
    }

    try {
      const result = await playlistService.getSystemPlaylists({
        page: 1,
        limit: 24,
      });

      setSystemPlaylists(Array.isArray(result?.items) ? result.items : []);
      setVisibleSystemPlaylistsCount(LOAD_MORE_STEP);
      setSystemErrorMessage('');
    } catch (error) {
      setSystemPlaylists([]);
      setVisibleSystemPlaylistsCount(LOAD_MORE_STEP);
      setSystemErrorMessage(getErrorMessage(error, 'Không thể tải playlist lúc này.'));
    } finally {
      if (!refresh) {
        setIsSystemLoading(false);
      }
    }
  }, []);

  const loadMyPlaylists = useCallback(async ({ refresh = false } = {}) => {
    if (!isAuthenticated) {
      setMyPlaylists([]);
      setMyErrorMessage('');
      setIsMyLoading(false);
      setVisibleMyPlaylistsCount(LOAD_MORE_STEP);
      return;
    }

    if (!refresh) {
      setIsMyLoading(true);
    }

    try {
      const result = await userPlaylistService.getMyPlaylists({
        page: 1,
        limit: 20,
      });

      setMyPlaylists(Array.isArray(result?.items) ? result.items : []);
      setVisibleMyPlaylistsCount(LOAD_MORE_STEP);
      setMyErrorMessage('');
    } catch (error) {
      setMyPlaylists([]);
      setVisibleMyPlaylistsCount(LOAD_MORE_STEP);
      setMyErrorMessage(getErrorMessage(error, 'Không thể tải playlist của bạn lúc này.'));
    } finally {
      if (!refresh) {
        setIsMyLoading(false);
      }
    }
  }, [isAuthenticated]);

  const loadLibraryData = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) {
      setIsRefreshing(true);
    }

    try {
      await Promise.allSettled([
        loadSystemPlaylists({ refresh }),
        loadMyPlaylists({ refresh }),
      ]);
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      }
    }
  }, [loadMyPlaylists, loadSystemPlaylists]);

  useEffect(() => {
    void loadLibraryData();
  }, [loadLibraryData]);

  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusRefreshRef.current) {
        skipNextFocusRefreshRef.current = false;
        return undefined;
      }

      if (isAuthenticated) {
        void loadMyPlaylists({ refresh: true });
      }

      return undefined;
    }, [isAuthenticated, loadMyPlaylists])
  );

  const handleOpenPlaylist = useCallback((playlist) => {
    if (!playlist?.id) {
      return;
    }

    navigation.navigate('PlaylistDetail', {
      playlistId: playlist.id,
      initialTitle: playlist.title || 'Chi tiết playlist',
    });
  }, [navigation]);

  const handleOpenLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const handleOpenFavoriteTracks = useCallback(() => {
    if (!isAuthenticated) {
      handleOpenLogin();
      return;
    }

    navigation.navigate('FavoriteTracks');
  }, [handleOpenLogin, isAuthenticated, navigation]);

  const handleOpenFollowedArtists = useCallback(() => {
    if (!isAuthenticated) {
      handleOpenLogin();
      return;
    }

    navigation.navigate('FollowedArtists');
  }, [handleOpenLogin, isAuthenticated, navigation]);

  const handleOpenFollowedAlbums = useCallback(() => {
    if (!isAuthenticated) {
      handleOpenLogin();
      return;
    }

    navigation.navigate('FollowedAlbums');
  }, [handleOpenLogin, isAuthenticated, navigation]);

  const handleOpenCreateModal = useCallback(() => {
    if (!isAuthenticated) {
      handleOpenLogin();
      return;
    }

    setCreatePlaylistError('');
    setIsCreateModalVisible(true);
  }, [handleOpenLogin, isAuthenticated]);

  const handleCloseCreateModal = useCallback(() => {
    if (isCreatingPlaylist) {
      return;
    }

    setCreatePlaylistError('');
    setIsCreateModalVisible(false);
  }, [isCreatingPlaylist]);

  const handleCreatePlaylist = useCallback(async (payload) => {
    setIsCreatingPlaylist(true);
    setCreatePlaylistError('');

    try {
      const createdPlaylist = await userPlaylistService.createMyPlaylist(payload);

      setMyPlaylists((prevPlaylists) => [createdPlaylist, ...prevPlaylists]);
      setVisibleMyPlaylistsCount(LOAD_MORE_STEP);
      setIsCreateModalVisible(false);

      navigation.navigate('PlaylistDetail', {
        playlistId: createdPlaylist.id,
        initialTitle: createdPlaylist.title || 'Chi tiết playlist',
      });
    } catch (error) {
      setCreatePlaylistError(getErrorMessage(error, 'Không thể tạo playlist lúc này.'));
    } finally {
      setIsCreatingPlaylist(false);
    }
  }, [navigation]);

  const showInitialLoader = isSystemLoading && !isRefreshing && systemPlaylists.length === 0;
  const recentLibraryItems = isAuthenticated ? myPlaylists.slice(0, 4) : systemPlaylists.slice(0, 4);
  const visibleMyPlaylists = myPlaylists.slice(0, visibleMyPlaylistsCount);
  const visibleSystemPlaylists = systemPlaylists.slice(0, visibleSystemPlaylistsCount);
  const canLoadMoreMyPlaylists = visibleMyPlaylists.length < myPlaylists.length;
  const canLoadMoreSystemPlaylists = visibleSystemPlaylists.length < systemPlaylists.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />

      {showInitialLoader ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingTop: insets.top + 12, paddingBottom: 28 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadLibraryData({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
        >
          <View style={styles.topBar}>
            <View style={styles.topBarIdentity}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
              </View>
              <Text style={styles.screenTitle}>Thư viện của bạn</Text>
            </View>

            <View style={styles.topBarActions}>
              <TouchableOpacity activeOpacity={0.82} onPress={() => navigation.navigate('Search')} style={styles.iconButton}>
                <Ionicons name="search" size={18} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.82} onPress={handleOpenCreateModal} style={styles.iconButton}>
                <Ionicons name="add" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <FilterChip label="Tất cả" active />
            <FilterChip label="Playlist" onPress={handleOpenCreateModal} />
            <FilterChip label="Nghệ sĩ" onPress={handleOpenFollowedArtists} />
            <FilterChip label="Album" onPress={handleOpenFollowedAlbums} />
          </ScrollView>

          <LinearGradient colors={['#1b302f', '#11161f', '#0c0e12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Mobile Library</Text>
            <Text style={styles.heroTitle}>Mọi thứ bạn lưu trong một nơi</Text>
            <Text style={styles.heroText}>
              Mở nhanh bài hát đã thích, nghệ sĩ theo dõi, album theo dõi và playlist của riêng bạn theo đúng flow điện thoại.
            </Text>

            <View style={styles.heroMetrics}>
              <View style={styles.metricPill}>
                <Text style={styles.metricPillText}>
                  {isAuthenticated ? `${myPlaylists.length} playlist của bạn` : 'Đăng nhập để đồng bộ'}
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricPillText}>{systemPlaylists.length} playlist gợi ý</Text>
              </View>
            </View>

            {isAuthenticated ? (
              <TouchableOpacity activeOpacity={0.86} onPress={handleOpenCreateModal} style={styles.heroAction}>
                <Ionicons name="add-circle" size={18} color="#08110a" />
                <Text style={styles.heroActionText}>Tạo playlist mới</Text>
              </TouchableOpacity>
            ) : null}
          </LinearGradient>

          {!isAuthenticated ? (
            <View style={styles.loginPanel}>
              <Text style={styles.loginPanelTitle}>Đăng nhập để mở thư viện cá nhân</Text>
              <Text style={styles.loginPanelText}>
                Sau khi đăng nhập, bạn sẽ thấy playlist, bài hát yêu thích, nghệ sĩ và album đã lưu ngay tại đây.
              </Text>
              <AppButton title="Đi đến đăng nhập" onPress={handleOpenLogin} style={styles.loginPanelButton} />
            </View>
          ) : (
            <>
              <View style={styles.quickSection}>
                <QuickActionCard
                  title="Bài hát đã thích"
                  subtitle="Phát lại danh sách yêu thích của bạn."
                  icon="heart"
                  colors={['#6d28d9', '#db2777']}
                  onPress={handleOpenFavoriteTracks}
                />
                <QuickActionCard
                  title="Nghệ sĩ theo dõi"
                  subtitle="Quay lại các nghệ sĩ bạn quan tâm."
                  icon="people"
                  colors={['#0f766e', '#1d4ed8']}
                  onPress={handleOpenFollowedArtists}
                />
                <QuickActionCard
                  title="Album theo dõi"
                  subtitle="Mở nhanh bộ sưu tập album bạn đã lưu."
                  icon="albums"
                  colors={['#365314', '#166534']}
                  onPress={handleOpenFollowedAlbums}
                />
              </View>

              {recentLibraryItems.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title="Đã nghe gần đây" />
                  <View style={styles.sectionPanel}>
                    {recentLibraryItems.map((item, index) => (
                      <PlaylistRow
                        key={item.id || `recent-library-${index}`}
                        item={item}
                        index={index}
                        onPress={() => handleOpenPlaylist(item)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.section}>
                <SectionHeader title="Playlist của bạn" actionLabel="Tạo" onActionPress={handleOpenCreateModal} />

                {isMyLoading ? (
                  <View style={styles.feedbackPanel}>
                    <AppLoader size="small" />
                  </View>
                ) : myErrorMessage ? (
                  <View style={styles.feedbackPanel}>
                    <ErrorState message={myErrorMessage} />
                    <AppButton title="Thử lại" onPress={() => loadMyPlaylists()} style={styles.retryCompactButton} />
                  </View>
                ) : myPlaylists.length === 0 ? (
                  <View style={styles.feedbackPanel}>
                    <Text style={styles.feedbackTitle}>Bạn chưa tạo playlist nào</Text>
                    <Text style={styles.feedbackText}>
                      Bắt đầu với playlist đầu tiên để nó xuất hiện ngay trong thư viện này.
                    </Text>
                    <AppButton title="Tạo playlist đầu tiên" onPress={handleOpenCreateModal} style={styles.createFirstButton} />
                  </View>
                ) : (
                  <>
                    <View style={styles.sectionPanel}>
                      {visibleMyPlaylists.map((item, index) => (
                        <PlaylistRow
                          key={item.id || `my-playlist-${index}`}
                          item={item}
                          index={index}
                          onPress={() => handleOpenPlaylist(item)}
                        />
                      ))}
                    </View>
                    {canLoadMoreMyPlaylists ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setVisibleMyPlaylistsCount((current) => current + LOAD_MORE_STEP)}
                        style={styles.loadMoreButton}
                      >
                        <Text style={styles.loadMoreButtonText}>Hiện thêm 10 playlist</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}
              </View>
            </>
          )}

          <View style={styles.section}>
            <SectionHeader
              title="Playlist gợi ý"
              actionLabel={systemPlaylists.length > 0 ? 'Làm mới' : ''}
              onActionPress={() => loadSystemPlaylists()}
            />

            {systemErrorMessage ? (
              <View style={styles.feedbackPanel}>
                <ErrorState message={systemErrorMessage} />
                <AppButton title="Thử lại" onPress={() => loadSystemPlaylists()} style={styles.retryCompactButton} />
              </View>
            ) : systemPlaylists.length === 0 ? (
              <View style={styles.feedbackPanel}>
                <Text style={styles.feedbackTitle}>Chưa có playlist nào</Text>
                <Text style={styles.feedbackText}>
                  Hãy kéo để làm mới hoặc quay lại sau khi hệ thống có gợi ý mới.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sectionPanel}>
                  {visibleSystemPlaylists.map((item, index) => (
                    <PlaylistRow
                      key={item.id || `system-playlist-${index}`}
                      item={item}
                      index={index}
                      onPress={() => handleOpenPlaylist(item)}
                    />
                  ))}
                </View>
                {canLoadMoreSystemPlaylists ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setVisibleSystemPlaylistsCount((current) => current + LOAD_MORE_STEP)}
                    style={styles.loadMoreButton}
                  >
                    <Text style={styles.loadMoreButtonText}>Hiện thêm 10 playlist</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      )}

      <CreatePlaylistModal
        visible={isCreateModalVisible}
        existingPlaylists={myPlaylists}
        isSubmitting={isCreatingPlaylist}
        submitError={createPlaylistError}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreatePlaylist}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topBarIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#1ed760',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#08110a',
    fontSize: 14,
    fontWeight: '800',
  },
  screenTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#242832',
    backgroundColor: '#101319',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  filterRow: {
    paddingBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#101319',
    borderWidth: 1,
    borderColor: '#222630',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  filterChipText: {
    color: '#d0d4db',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#101319',
  },
  heroCard: {
    borderRadius: 28,
    padding: 18,
    marginTop: 10,
    marginBottom: 18,
    overflow: 'hidden',
  },
  heroEyebrow: {
    color: '#7ddcac',
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
    lineHeight: 34,
  },
  heroText: {
    color: '#bac3cd',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  heroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  metricPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  metricPillText: {
    color: '#edf2f7',
    fontSize: 11,
    fontWeight: '700',
  },
  heroAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1ed760',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
  },
  heroActionText: {
    color: '#08110a',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  loginPanel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f232d',
    backgroundColor: '#101319',
    padding: 18,
    marginBottom: 18,
  },
  loginPanelTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  loginPanelText: {
    color: '#a7b0bb',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  loginPanelButton: {
    marginTop: 16,
    backgroundColor: '#1ed760',
  },
  quickSection: {
    marginBottom: 18,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1f232d',
    backgroundColor: '#101319',
    padding: 14,
    marginBottom: 10,
  },
  quickActionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickActionContent: {
    flex: 1,
    marginRight: 12,
  },
  quickActionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  quickActionSubtitle: {
    color: '#98a3af',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionAction: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#101319',
    borderWidth: 1,
    borderColor: '#222630',
  },
  sectionActionDisabled: {
    opacity: 0.55,
  },
  sectionActionText: {
    color: '#d0d4db',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionPanel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f232d',
    backgroundColor: '#101319',
    overflow: 'hidden',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1b2029',
  },
  playlistContent: {
    flex: 1,
    marginLeft: 12,
  },
  playlistMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  playlistTypePill: {
    borderRadius: 999,
    backgroundColor: '#171b22',
    borderWidth: 1,
    borderColor: '#232a35',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  playlistTypePillText: {
    color: '#e3e8ef',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  playlistFooterLabel: {
    color: '#7f8894',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 10,
  },
  playlistTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  playlistSubtitle: {
    color: '#98a3af',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  feedbackPanel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f232d',
    backgroundColor: '#101319',
    padding: 18,
    alignItems: 'center',
  },
  feedbackTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    alignSelf: 'flex-start',
  },
  feedbackText: {
    color: '#98a3af',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  retryCompactButton: {
    minWidth: 140,
    marginTop: 16,
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: '#252b36',
  },
  createFirstButton: {
    width: '100%',
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
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkFallbackText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
