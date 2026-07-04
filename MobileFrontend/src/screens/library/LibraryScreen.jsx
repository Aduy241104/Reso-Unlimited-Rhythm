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
import { useNavigation } from '@react-navigation/native';
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
    return 'SYSTEM';
  }

  if (item?.type === 'user') {
    return item?.isPublic ? 'PUBLIC' : 'PRIVATE';
  }

  return 'PLAYLIST';
};

const PlaylistCard = ({ item, index, onPress }) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const totalTracks = Number(item?.trackCount) || 0;
  const durationLabel = Number(item?.totalDuration) > 0
    ? formatDuration(item.totalDuration)
    : 'Fresh picks';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <Artwork uri={item?.coverImage || item?.image} label={item?.title} color={accentColor} />
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{resolvePlaylistBadgeLabel(item)}</Text>
          </View>
          <Text style={styles.cardMetaText}>
            {totalTracks > 0 ? `${totalTracks} tracks` : 'No tracks yet'}
          </Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item?.title || 'Untitled playlist'}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item?.description || 'A playlist collection ready for your next listening session.'}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>{durationLabel}</Text>
          <Text style={styles.cardFooterAction}>Open playlist</Text>
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

  const displayName = useMemo(
    () =>
      user?.profile?.fullName ||
      user?.fullName ||
      user?.name ||
      user?.email ||
      'your account',
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
      setSystemErrorMessage(getErrorMessage(error, 'Unable to load playlists right now.'));
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
      setMyErrorMessage(getErrorMessage(error, 'Unable to load your playlists right now.'));
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

  const handleOpenPlaylist = useCallback((playlist) => {
    if (!playlist?.id) {
      return;
    }

    navigation.navigate('EntityDetail', {
      entityType: 'playlist',
      entityId: playlist.id,
      initialTitle: playlist.title || 'Playlist Detail',
    });
  }, [navigation]);

  const handleOpenLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

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

      navigation.navigate('EntityDetail', {
        entityType: 'playlist',
        entityId: createdPlaylist.id,
        initialTitle: createdPlaylist.title || 'Playlist Detail',
      });
    } catch (error) {
      setCreatePlaylistError(getErrorMessage(error, 'Unable to create playlist right now.'));
    } finally {
      setIsCreatingPlaylist(false);
    }
  }, [navigation]);

  const showInitialLoader = isSystemLoading && !isRefreshing && systemPlaylists.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <AppHeader title="Playlist Library" />

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
            <Text style={styles.heroEyebrow}>CURATED FOR MOBILE</Text>
            <Text style={styles.heroTitle}>Build your playlist library</Text>
            <Text style={styles.heroText}>
              Create your own playlists, keep them private by default, and still browse system picks in one place.
            </Text>
            <View style={styles.heroActions}>
              <AppButton
                title={isAuthenticated ? 'Create Playlist' : 'Login To Create'}
                onPress={handleOpenCreateModal}
                style={styles.heroPrimaryAction}
              />
            </View>
          </View>

          {isAuthenticated ? (
            <View style={styles.section}>
              <SectionHeader
                title="Your Playlists"
                description={`Manage playlists for ${displayName}.`}
                actionLabel="Create"
                onActionPress={handleOpenCreateModal}
              />

              {isMyLoading ? (
                <View style={styles.sectionCard}>
                  <AppLoader size="small" />
                </View>
              ) : myErrorMessage ? (
                <View style={styles.sectionCard}>
                  <ErrorState message={myErrorMessage} />
                  <AppButton title="Retry" onPress={() => loadMyPlaylists()} style={styles.retryCompactButton} />
                </View>
              ) : myPlaylists.length === 0 ? (
                <View style={styles.sectionCard}>
                  <Text style={styles.emptyTitle}>No playlists created yet</Text>
                  <Text style={styles.emptyText}>
                    Start with your first playlist and it will appear here immediately.
                  </Text>
                  <AppButton title="Create your first playlist" onPress={handleOpenCreateModal} style={styles.emptyActionButton} />
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
          ) : (
            <View style={styles.section}>
              <SectionHeader
                title="Your Playlists"
                description="Sign in to create and manage personal playlists."
              />
              <View style={styles.authCard}>
                <Text style={styles.authCardTitle}>Login required</Text>
                <Text style={styles.authCardText}>
                  Creating playlists is tied to your account, so we need you signed in first.
                </Text>
                <AppButton title="Go to Login" onPress={handleOpenLogin} style={styles.authButton} />
              </View>
            </View>
          )}

          <View style={styles.section}>
            <SectionHeader
              title="Discover Playlists"
              description="System playlists curated by the Reso team."
              actionLabel={systemPlaylists.length > 0 ? 'Refresh' : ''}
              onActionPress={() => loadSystemPlaylists()}
            />

            {systemErrorMessage ? (
              <View style={styles.sectionCard}>
                <ErrorState message={systemErrorMessage} />
                <AppButton title="Try Again" onPress={() => loadSystemPlaylists()} style={styles.retryCompactButton} />
              </View>
            ) : systemPlaylists.length === 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.emptyTitle}>No playlists available</Text>
                <Text style={styles.emptyText}>
                  Pull to refresh or come back later after new playlist data is published.
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
