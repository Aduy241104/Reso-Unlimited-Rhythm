import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import usePlayer from '../../hooks/usePlayer';
import playlistService from '../../services/playlistService';
import { formatDateLabel, formatDuration, getErrorMessage, getInitials, resolveImageUri } from '../../utils/media';
import { buildPlayableQueue } from '../../utils/player';

const accentPalette = ['#111111', '#2f2f2f', '#4a4a4a', '#686868', '#8a8a8a'];

const readText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return fallback;
};

const Artwork = ({ uri, label, style, textStyle }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={[styles.heroImage, style]} resizeMode="cover" />;
  }

  return (
    <View style={[styles.heroImage, styles.heroImageFallback, style]}>
      <Text style={[styles.heroImageFallbackText, textStyle]}>{getInitials(label)}</Text>
    </View>
  );
};

const MetaPill = ({ value, isPrimary = false }) => {
  const text = readText(value);

  if (!text) {
    return null;
  }

  return (
    <View style={[styles.metaPill, isPrimary ? styles.metaPillPrimary : null]}>
      <Text style={[styles.metaPillText, isPrimary ? styles.metaPillTextPrimary : null]}>{text}</Text>
    </View>
  );
};

const TrackRow = ({
  item,
  index,
  isActive,
  isPlaying,
  onPress,
}) => {
  const accentColor = accentPalette[index % accentPalette.length];
  const title = readText(item?.title, 'Unknown track');
  const subtitle = readText(item?.subtitle, item?.artistName || 'Unknown artist');
  const meta = readText(item?.meta, formatDuration(item?.duration));

  return (
    <TouchableOpacity style={styles.trackRow} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.trackIndex, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` }]}>
        {isActive ? (
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={12} color="#1ed760" />
        ) : (
          <Text style={[styles.trackIndexText, { color: accentColor }]}>{index + 1}</Text>
        )}
      </View>
      <Artwork uri={item?.image} label={title} style={styles.trackArtwork} textStyle={styles.trackArtworkText} />
      <View style={styles.trackContent}>
        <Text style={[styles.trackTitle, isActive ? styles.trackTitleActive : null]} numberOfLines={1}>{title}</Text>
        <Text style={styles.trackSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={styles.trackMeta}>{meta}</Text>
    </TouchableOpacity>
  );
};

export default function PlaylistDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const {
    currentTrack,
    isPlaying,
    playQueue,
    togglePlayback,
  } = usePlayer();
  const playlistId = route.params?.playlistId || route.params?.entityId || '';
  const initialTitle = route.params?.initialTitle || 'Playlist Detail';
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPlaylistDetail = useCallback(async () => {
    if (!playlistId) {
      setPlaylist(null);
      setErrorMessage('Playlist information is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await playlistService.getPlaylistDetail(playlistId);
      setPlaylist(result);
    } catch (error) {
      setPlaylist(null);
      setErrorMessage(getErrorMessage(error, 'Unable to load playlist detail right now.'));
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadPlaylistDetail();
  }, [loadPlaylistDetail]);

  const tracks = Array.isArray(playlist?.items) ? playlist.items : [];
  const playableQueue = useMemo(() => buildPlayableQueue(tracks), [tracks]);
  const ownerLabel = readText(
    playlist?.owner?.fullName || playlist?.owner?.name || playlist?.owner?.email || playlist?.subtitle,
    'Reso Music'
  );
  const createdDate = formatDateLabel(playlist?.createdAt);
  const updatedDate = formatDateLabel(playlist?.updatedAt);
  const totalTracks = Number(playlist?.trackCount) || tracks.length;
  const totalDuration = formatDuration(playlist?.totalDuration);
  const visibilityLabel = playlist?.playlistType === 'system'
    ? 'System'
    : playlist?.isPublic
      ? 'Public'
      : 'Private';

  const heroMeta = [
    ownerLabel,
    createdDate,
    totalTracks > 0 ? `${totalTracks} tracks` : '',
    Number(playlist?.totalDuration) > 0 ? totalDuration : '',
    visibilityLabel,
  ].filter(Boolean);

  const stats = [
    { label: 'Tracks', value: `${totalTracks}` },
    { label: 'Duration', value: Number(playlist?.totalDuration) > 0 ? totalDuration : '0s' },
    { label: 'Visibility', value: visibilityLabel },
    { label: 'Updated', value: updatedDate || 'Unknown' },
  ];

  const activeTrackId = String(currentTrack?.entityId || currentTrack?.id || '');

  const handlePlayAll = useCallback(() => {
    if (playableQueue.length === 0) {
      return;
    }

    playQueue(playableQueue, 0);
  }, [playQueue, playableQueue]);

  const handleTrackPress = useCallback((track, index) => {
    const trackId = String(track?.entityId || track?.id || '');

    if (trackId && trackId === activeTrackId) {
      togglePlayback();
      return;
    }

    playQueue(playableQueue, index);
  }, [activeTrackId, playQueue, playableQueue, togglePlayback]);

  const headerTitle = readText(playlist?.title, initialTitle);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={loadPlaylistDetail} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollBody, { paddingBottom: 32 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Artwork uri={playlist?.image} label={playlist?.title} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {playlist?.playlistType === 'system' ? 'SYSTEM PLAYLIST' : 'PLAYLIST DETAIL'}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{readText(playlist?.title, 'Untitled playlist')}</Text>
            {playlist?.description ? (
              <Text style={styles.heroDescription}>{playlist.description}</Text>
            ) : null}

            {heroMeta.length > 0 ? (
              <View style={styles.metaWrap}>
                {heroMeta.map((item, index) => (
                  <MetaPill key={`${item}-${index}`} value={item} isPrimary={index === 0} />
                ))}
              </View>
            ) : null}

            <View style={styles.heroActions}>
              <TouchableOpacity
                style={[styles.playButton, playableQueue.length === 0 ? styles.playButtonDisabled : null]}
                onPress={handlePlayAll}
                activeOpacity={0.85}
                disabled={playableQueue.length === 0}
              >
                <Ionicons name="play" size={16} color="#000000" />
                <Text style={styles.playButtonText}>
                  {playableQueue.length > 0 ? `Play ${playableQueue.length} tracks` : 'No playable tracks'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.statsGrid}>
              {stats.map((item, index) => (
                <View
                  key={`${item.label}-${index}`}
                  style={[
                    styles.statCard,
                    index === stats.length - 1 && stats.length % 2 === 1 ? styles.statCardFull : null,
                  ]}
                >
                  <Text style={styles.statValue} numberOfLines={1}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Curated By</Text>
            <View style={styles.ownerCard}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>{getInitials(ownerLabel)}</Text>
              </View>
              <View style={styles.ownerContent}>
                <Text style={styles.ownerName}>{ownerLabel}</Text>
                <Text style={styles.ownerRole}>
                  {playlist?.playlistType === 'system' ? 'Reso editorial playlist' : 'Personal playlist'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Track List</Text>
            <View style={styles.panel}>
              {tracks.length > 0 ? (
                tracks.map((track, index) => {
                  const trackId = String(track?.entityId || track?.id || '');
                  const isActive = trackId && trackId === activeTrackId;

                  return (
                    <TrackRow
                      key={`${trackId || index}`}
                      item={track}
                      index={index}
                      isActive={Boolean(isActive)}
                      isPlaying={Boolean(isActive && isPlaying)}
                      onPress={() => handleTrackPress(track, index)}
                    />
                  );
                })
              ) : (
                <Text style={styles.emptyPanelText}>This playlist does not have any tracks yet.</Text>
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
  retryButton: {
    marginTop: 18,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollBody: {
    padding: 16,
  },
  heroSection: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#202020',
  },
  heroImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageFallbackText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#1c1c1c',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  heroDescription: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
  },
  metaWrap: {
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
  metaPillPrimary: {
    backgroundColor: '#1ed76022',
    borderColor: '#1ed76044',
  },
  metaPillText: {
    color: '#d4d4d4',
    fontSize: 11,
    fontWeight: '600',
  },
  metaPillTextPrimary: {
    color: '#ffffff',
  },
  heroActions: {
    marginTop: 16,
  },
  playButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1ed760',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  playButtonDisabled: {
    backgroundColor: '#2a2a2a',
  },
  playButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48.5%',
    minHeight: 84,
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  statCardFull: {
    width: '100%',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#8a8a8a',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
  },
  ownerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ownerAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  ownerContent: {
    flex: 1,
  },
  ownerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  ownerRole: {
    color: '#9a9a9a',
    fontSize: 11,
    marginTop: 4,
  },
  panel: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  trackIndex: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  trackIndexText: {
    fontSize: 10,
    fontWeight: '800',
  },
  trackArtwork: {
    width: 42,
    height: 42,
    borderRadius: 10,
    marginRight: 10,
  },
  trackArtworkText: {
    fontSize: 13,
  },
  trackContent: {
    flex: 1,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  trackTitleActive: {
    color: '#1ed760',
  },
  trackSubtitle: {
    color: '#a3a3a3',
    fontSize: 11,
    marginTop: 3,
  },
  trackMeta: {
    color: '#d4d4d4',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyPanelText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 19,
    padding: 14,
  },
});
