import React, { useCallback, useEffect, useState } from 'react';
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
import AppButton from '../../components/common/AppButton';
import AppHeader from '../../components/common/AppHeader';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import playlistService from '../../services/playlistService';
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
            <Text style={styles.cardBadgeText}>{item?.type === 'system' ? 'SYSTEM' : 'PLAYLIST'}</Text>
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

export default function LibraryScreen() {
  const navigation = useNavigation();
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPlaylists = useCallback(async (options = {}) => {
    const isRefresh = Boolean(options.refresh);

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await playlistService.getSystemPlaylists({
        page: 1,
        limit: 24,
      });

      setPlaylists(Array.isArray(result?.items) ? result.items : []);
      setErrorMessage('');
    } catch (error) {
      setPlaylists([]);
      setErrorMessage(getErrorMessage(error, 'Unable to load playlists right now.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <AppHeader title="Playlist Library" />

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <AppButton title="Try Again" onPress={() => loadPlaylists()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadPlaylists({ refresh: true })}
              tintColor="#ffffff"
            />
          }
        >
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>CURATED FOR MOBILE</Text>
            <Text style={styles.heroTitle}>View playlists in one place</Text>
            <Text style={styles.heroText}>
              Browse the latest system playlists, open full detail, and jump straight into playback.
            </Text>
          </View>

          {playlists.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No playlists available</Text>
              <Text style={styles.emptyText}>
                Pull to refresh or come back later after new playlist data is published.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {playlists.map((item, index) => (
                <PlaylistCard
                  key={item.id || `playlist-${index}`}
                  item={item}
                  index={index}
                  onPress={() => handleOpenPlaylist(item)}
                />
              ))}
            </View>
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
  emptyCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 18,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});
