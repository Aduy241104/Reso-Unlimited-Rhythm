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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CreatePlaylistModal from '../../components/library/CreatePlaylistModal';
import AppButton from '../../components/common/AppButton';
import AppHeader from '../../components/common/AppHeader';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import playlistService from '../../services/playlistService';
import userPlaylistService from '../../services/userPlaylistService';
import theme from '../../theme';
import { formatDuration, getErrorMessage, getInitials, resolveImageUri } from '../../utils/media';

const accentPalette = ['#111111', '#2f2f2f', '#4a4a4a', '#686868', '#8a8a8a'];

const Artwork = ({ uri, label, color }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.artwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.artwork, styles.artworkFallback, { backgroundColor: color }]}>
      <Text style={styles.artworkFallbackText}>{getInitials(label)}</Text>
    </View>
  );
};

const resolvePlaylistBadgeLabel = (item) => {
  if (item?.type === 'system') {
    return 'HỆ THỐNG';
  }

  if (item?.type === 'user') {
    return item?.isPublic ? 'CÔNG KHAI' : 'RIÊNG TƯ';
  }

  return 'PLAYLIST';
};

const PlaylistCard = ({ item, index, onPress }) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const totalTracks = Number(item?.trackCount) || 0;
  const durationLabel = Number(item?.totalDuration) > 0
    ? formatDuration(item.totalDuration)
    : 'Tuyển chọn mới';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <Artwork uri={item?.coverImage || item?.image} label={item?.title} color={accentColor} />
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{resolvePlaylistBadgeLabel(item)}</Text>
          </View>
          <Text style={styles.cardMetaText}>
            {totalTracks > 0 ? `${totalTracks} bài hát` : 'Chưa có bài hát'}
          </Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item?.title || 'Playlist chưa có tên'}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item?.description || 'Một playlist sẵn sàng cho lần nghe tiếp theo của bạn.'}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>{durationLabel}</Text>
          <Text style={styles.cardFooterAction}>Mở playlist</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SectionHeader = ({ title, description, actionLabel, onActionPress, actionDisabled = false }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderContent}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
    </View>
    {actionLabel ? (
      <TouchableOpacity
        onPress={onActionPress}
        disabled={actionDisabled}
        activeOpacity={0.85}
        style={[styles.inlineAction, actionDisabled ? styles.inlineActionDisabled : null]}
      >
        <Text style={styles.inlineActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export default function LibraryScreen() {
  const navigation = useNavigation();
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
      setSystemErrorMessage('');
    } catch (error) {
      setSystemPlaylists([]);
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
      setMyErrorMessage('');
    } catch (error) {
      setMyPlaylists([]);
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
    loadLibraryData();
  }, [loadLibraryData]);

  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusRefreshRef.current) {
        skipNextFocusRefreshRef.current = false;
        return undefined;
      }

      if (isAuthenticated) {
        loadMyPlaylists({ refresh: true });
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <AppHeader title="Thư viện playlist" />

      {showInitialLoader ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadLibraryData({ refresh: true })}
              tintColor="#ffffff"
            />
          }
        >
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>DÀNH CHO MOBILE</Text>
            <Text style={styles.heroTitle}>Xây dựng thư viện playlist</Text>
            <Text style={styles.heroText}>
              Tạo playlist của riêng bạn, mặc định để riêng tư và vẫn khám phá playlist hệ thống ngay tại một nơi.
            </Text>
            {isAuthenticated ? (
              <View style={styles.heroActions}>
                <AppButton
                  title="Tạo playlist"
                  onPress={handleOpenCreateModal}
                  style={styles.heroPrimaryAction}
                />
              </View>
            ) : null}
          </View>

          {!isAuthenticated ? (
            <View style={styles.section}>
              <View style={styles.authCard}>
                <Text style={styles.authCardTitle}>Đăng nhập để mở thư viện cá nhân</Text>
                <Text style={styles.authCardText}>
                  Sau khi đăng nhập, bạn sẽ xem được bài hát yêu thích, nghệ sĩ theo dõi, album theo dõi và playlist của riêng mình tại một nơi.
                </Text>
                <AppButton title="Đi đến đăng nhập" onPress={handleOpenLogin} style={styles.authButton} />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <SectionHeader
                  title="Bài hát yêu thích"
                  description="Mở các bài hát bạn đã thích và phát lại bất cứ lúc nào."
                  actionLabel="Xem tất cả"
                  onActionPress={handleOpenFavoriteTracks}
                />

                <TouchableOpacity style={styles.favoriteCard} activeOpacity={0.85} onPress={handleOpenFavoriteTracks}>
                  <View style={styles.favoriteCardContent}>
                    <Text style={styles.favoriteCardEyebrow}>BỘ SƯU TẬP CÁ NHÂN</Text>
                    <Text style={styles.favoriteCardTitle}>Bài hát yêu thích</Text>
                    <Text style={styles.favoriteCardText}>
                      Những bài bạn đã thích sẽ nằm ở đây, sẵn sàng phát ngay hoặc mở xem chi tiết.
                    </Text>
                  </View>
                  <View style={styles.favoriteCardAction}>
                    <Text style={styles.favoriteCardActionText}>Mở</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Nghệ sĩ đang theo dõi"
                  description="Mở nhanh danh sách nghệ sĩ bạn đang theo dõi và quay lại trang chi tiết của họ."
                  actionLabel="Xem tất cả"
                  onActionPress={handleOpenFollowedArtists}
                />

                <TouchableOpacity style={styles.followedArtistCard} activeOpacity={0.85} onPress={handleOpenFollowedArtists}>
                  <View style={styles.followedArtistVisual}>
                    <View style={[styles.followedArtistOrb, styles.followedArtistOrbPrimary]} />
                    <View style={[styles.followedArtistOrb, styles.followedArtistOrbSecondary]} />
                    <View style={[styles.followedArtistOrb, styles.followedArtistOrbAccent]} />
                  </View>
                  <View style={styles.followedArtistCardContent}>
                    <Text style={styles.followedArtistCardEyebrow}>NGHỆ SĨ BẠN QUAN TÂM</Text>
                    <Text style={styles.followedArtistCardTitle}>Nghệ sĩ đang theo dõi</Text>
                    <Text style={styles.followedArtistCardText}>
                      Tất cả nghệ sĩ bạn đã theo dõi sẽ nằm ở đây, sẵn sàng mở xem chi tiết bất cứ lúc nào.
                    </Text>
                  </View>
                  <View style={styles.followedArtistCardAction}>
                    <Text style={styles.followedArtistCardActionText}>Mở</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Album đang theo dõi"
                  description="Mở nhanh những album bạn đang theo dõi và quay lại chi tiết từng album."
                  actionLabel="Xem tất cả"
                  onActionPress={handleOpenFollowedAlbums}
                />

                <TouchableOpacity style={styles.followedAlbumCard} activeOpacity={0.85} onPress={handleOpenFollowedAlbums}>
                  <View style={styles.followedAlbumVisual}>
                    <View style={styles.followedAlbumCoverBack} />
                    <View style={styles.followedAlbumCoverFront} />
                    <View style={styles.followedAlbumBadge} />
                  </View>
                  <View style={styles.followedAlbumCardContent}>
                    <Text style={styles.followedAlbumCardEyebrow}>BỘ SƯU TẬP ALBUM</Text>
                    <Text style={styles.followedAlbumCardTitle}>Album đang theo dõi</Text>
                    <Text style={styles.followedAlbumCardText}>
                      Các album bạn đã theo dõi sẽ nằm ở đây, sẵn sàng mở xem chi tiết bất cứ lúc nào.
                    </Text>
                  </View>
                  <View style={styles.followedAlbumCardAction}>
                    <Text style={styles.followedAlbumCardActionText}>Mở</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Playlist của bạn"
                  description={`Quản lý playlist của ${displayName}.`}
                  actionLabel="Tạo"
                  onActionPress={handleOpenCreateModal}
                />

                {isMyLoading ? (
                  <View style={styles.sectionCard}>
                    <AppLoader size="small" />
                  </View>
                ) : myErrorMessage ? (
                  <View style={styles.sectionCard}>
                    <ErrorState message={myErrorMessage} />
                    <AppButton title="Thử lại" onPress={() => loadMyPlaylists()} style={styles.retryCompactButton} />
                  </View>
                ) : myPlaylists.length === 0 ? (
                  <View style={styles.sectionCard}>
                    <Text style={styles.emptyTitle}>Bạn chưa tạo playlist nào</Text>
                    <Text style={styles.emptyText}>
                      Hãy bắt đầu với playlist đầu tiên, nó sẽ xuất hiện ngay tại đây.
                    </Text>
                    <AppButton title="Tạo playlist đầu tiên" onPress={handleOpenCreateModal} style={styles.emptyActionButton} />
                  </View>
                ) : (
                  <View style={styles.list}>
                    {myPlaylists.map((item, index) => (
                      <PlaylistCard
                        key={item.id || `my-playlist-${index}`}
                        item={item}
                        index={index}
                        onPress={() => handleOpenPlaylist(item)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          <View style={styles.section}>
            <SectionHeader
              title="Khám phá playlist"
              description="Các playlist hệ thống được đội ngũ Reso tuyển chọn."
              actionLabel={systemPlaylists.length > 0 ? 'Làm mới' : ''}
              onActionPress={() => loadSystemPlaylists()}
            />

            {systemErrorMessage ? (
              <View style={styles.sectionCard}>
                <ErrorState message={systemErrorMessage} />
                <AppButton title="Thử lại" onPress={() => loadSystemPlaylists()} style={styles.retryCompactButton} />
              </View>
            ) : systemPlaylists.length === 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.emptyTitle}>Chưa có playlist nào</Text>
                <Text style={styles.emptyText}>
                  Hãy kéo để làm mới hoặc quay lại sau khi có dữ liệu playlist mới.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {systemPlaylists.map((item, index) => (
                  <PlaylistCard
                    key={item.id || `playlist-${index}`}
                    item={item}
                    index={index}
                    onPress={() => handleOpenPlaylist(item)}
                  />
                ))}
              </View>
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
    backgroundColor: theme.colors.background,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: '#141414',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
    marginBottom: 18,
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
  heroActions: {
    marginTop: 16,
  },
  heroPrimaryAction: {
    backgroundColor: '#1ed760',
  },
  section: {
    marginTop: 4,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionDescription: {
    color: '#9a9a9a',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  inlineAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    backgroundColor: '#151515',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineActionDisabled: {
    opacity: 0.5,
  },
  inlineActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#111111',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#252525',
    overflow: 'hidden',
  },
  artwork: {
    width: 118,
    backgroundColor: '#202020',
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkFallbackText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardBadge: {
    backgroundColor: '#1d1d1d',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardMetaText: {
    color: '#8f8f8f',
    fontSize: 10,
    fontWeight: '600',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  cardDescription: {
    color: '#b3b3b3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  cardFooterText: {
    color: '#d1d1d1',
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooterAction: {
    color: '#1ed760',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 18,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    alignSelf: 'flex-start',
  },
  emptyText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  emptyActionButton: {
    width: '100%',
    marginTop: 16,
    backgroundColor: '#1ed760',
  },
  retryCompactButton: {
    minWidth: 140,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  authCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 18,
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#111111',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 18,
  },
  favoriteCardContent: {
    flex: 1,
  },
  favoriteCardEyebrow: {
    color: '#8a8a8a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  favoriteCardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  favoriteCardText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  favoriteCardAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    backgroundColor: '#161616',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  favoriteCardActionText: {
    color: '#1ed760',
    fontSize: 11,
    fontWeight: '800',
  },
  followedArtistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#111111',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 18,
  },
  followedArtistVisual: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  followedArtistOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  followedArtistOrbPrimary: {
    width: 44,
    height: 44,
    left: 8,
    top: 14,
    backgroundColor: '#1ed76055',
  },
  followedArtistOrbSecondary: {
    width: 30,
    height: 30,
    right: 10,
    top: 12,
    backgroundColor: '#ffffff22',
  },
  followedArtistOrbAccent: {
    width: 20,
    height: 20,
    right: 14,
    bottom: 12,
    backgroundColor: '#1ed760',
  },
  followedArtistCardContent: {
    flex: 1,
  },
  followedArtistCardEyebrow: {
    color: '#8a8a8a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  followedArtistCardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  followedArtistCardText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  followedArtistCardAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    backgroundColor: '#161616',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  followedArtistCardActionText: {
    color: '#1ed760',
    fontSize: 11,
    fontWeight: '800',
  },
  followedAlbumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#111111',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 18,
  },
  followedAlbumVisual: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  followedAlbumCoverBack: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    transform: [{ rotate: '-10deg' }, { translateX: -10 }],
  },
  followedAlbumCoverFront: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1ed76044',
    borderWidth: 1,
    borderColor: '#1ed76077',
    transform: [{ rotate: '8deg' }, { translateX: 8 }],
  },
  followedAlbumBadge: {
    position: 'absolute',
    right: 6,
    bottom: 10,
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#1ed760',
  },
  followedAlbumCardContent: {
    flex: 1,
  },
  followedAlbumCardEyebrow: {
    color: '#8a8a8a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  followedAlbumCardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  followedAlbumCardText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  followedAlbumCardAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    backgroundColor: '#161616',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  followedAlbumCardActionText: {
    color: '#1ed760',
    fontSize: 11,
    fontWeight: '800',
  },
  authCardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  authCardText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  authButton: {
    marginTop: 16,
    backgroundColor: '#1ed760',
  },
});
