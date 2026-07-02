import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createAudioPlayer, setAudioModeAsync, useAudioPlayerStatus } from 'expo-audio';
import AppLoader from '../../components/common/AppLoader';
import AppModal from '../../components/common/AppModal';
import ErrorState from '../../components/common/ErrorState';
import albumService from '../../services/albumService';
import artistService from '../../services/artistService';
import playlistService from '../../services/playlistService';
import trackService from '../../services/trackService';
import {
  formatDateLabel,
  formatDuration,
  getErrorMessage,
  getInitials,
  resolveImageUri,
  resolveTrackAudioUri,
} from '../../utils/media';

const accentPalette = ['#1db954', '#535353', '#b3b3b3', '#2a2a2a', '#6e44ff'];

const detailFetchers = {
  album: ({ entityId }) => albumService.getAlbumDetail(entityId),
  artist: ({ entityId }) => artistService.getArtistDetail(entityId),
  playlist: ({ entityId }) => playlistService.getPlaylistDetail(entityId),
  track: ({ entityId }) => trackService.getTrackDetail(entityId),
  topTrackCollection: (params) => trackService.getTopTrackCollectionDetail(params),
};

const Artwork = ({ uri, label, style, textStyle }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={[styles.artworkBase, style]} resizeMode="cover" />;
  }

  return (
    <View style={[styles.artworkBase, styles.artworkFallback, style]}>
      <Text style={[styles.artworkFallbackText, textStyle]}>{getInitials(label)}</Text>
    </View>
  );
};

const MetaRow = ({ label, value }) => {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
};

const StatChip = ({ label, value }) => {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

const SectionHeading = ({ title, caption }) => (
  <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
  </View>
);

const MenuActionButton = ({ label, sublabel, onPress, isDestructive = false }) => (
  <TouchableOpacity style={styles.menuActionButton} onPress={onPress} activeOpacity={0.82}>
    <Text style={[styles.menuActionLabel, isDestructive && styles.menuActionLabelDestructive]}>{label}</Text>
    {sublabel ? <Text style={styles.menuActionSublabel}>{sublabel}</Text> : null}
  </TouchableOpacity>
);

const TrackListItem = ({ item, index, onPress, onOpenMenu, showIndex = true, isActive = false, isPlaying = false }) => {
  const accentColor = accentPalette[index % accentPalette.length];

  return (
    <View style={[styles.listItem, isActive && styles.listItemActive]}>
      {showIndex ? (
        <View style={styles.listIndexWrap}>
          <Text style={[styles.listIndexText, { color: accentColor }]}>{index + 1}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.listMainButton} onPress={onPress} activeOpacity={0.82}>
        <Artwork uri={item.image} label={item.title} style={styles.listArtwork} textStyle={styles.listArtworkText} />
        <View style={styles.listContent}>
          <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.listSubtitle} numberOfLines={1}>{item.subtitle || 'Unknown'}</Text>
          {isActive ? (
            <Text style={styles.listStatusText} numberOfLines={1}>{isPlaying ? 'Now playing' : 'Selected track'}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <View style={styles.listAside}>
        {item.meta ? <Text style={styles.listMeta}>{item.meta}</Text> : null}
        {onOpenMenu ? (
          <TouchableOpacity style={styles.listMenuButton} onPress={onOpenMenu} activeOpacity={0.82}>
            <Text style={styles.listMenuButtonText}>...</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const toPlayableTrackItem = (item) => {
  if (!item) {
    return null;
  }

  return {
    key: item.key || item.entityId || item.id || item.title || 'track',
    id: item.id || item.entityId || '',
    title: item.title || 'Unknown track',
    subtitle: item.subtitle || item.artistName || 'Unknown artist',
    artistId: item.artistId || '',
    artistName: item.artistName || item.subtitle || 'Unknown artist',
    albumTitle: item.albumTitle || '',
    image: item.image || '',
    entityType: item.entityType || 'track',
    entityId: item.entityId || item.id || '',
    audioSource: item.audioSource || '',
    meta: item.meta || '',
    showIndex: item.showIndex,
  };
};

const resolveRawTrack = (item) => item?.track || item?.trackId || null;

const resolvePlaylistOwnerName = (playlist) =>
  playlist?.owner?.fullName || playlist?.owner?.email || playlist?.owner?.role || 'Reso Music';

const resolveRawTrackItem = (entry, index, sourceType) => {
  const track = resolveRawTrack(entry);

  if (!track) {
    return null;
  }

  return {
    key: `${track.id || entry?.trackId || index}`,
    title: track.title || 'Unknown track',
    subtitle: track?.artist?.name || 'Unknown artist',
    artistId: track?.artist?.id || track?.artist?._id || '',
    artistName: track?.artist?.name || 'Unknown artist',
    albumTitle: track?.album?.title || '',
    image: track.coverImage || track.avatar || track?.album?.coverImage || track?.artist?.avatar || '',
    entityType: 'track',
    entityId: track.id || '',
    audioSource: resolveTrackAudioUri(track),
    meta: formatDuration(track.duration),
    showIndex: sourceType !== 'topTrackCollection',
  };
};

const resolveComingReleaseDetailTarget = (entry) => {
  if (!entry?.item?.id) {
    return null;
  }

  return {
    entityType: entry?.type === 'album' ? 'album' : 'track',
    entityId: entry.item.id,
    title: entry.item.title || 'Detail',
  };
};

const resolveComingReleaseListItem = (entry, index = 0) => {
  if (!entry?.item) {
    return null;
  }

  const releaseType = entry?.type === 'album' ? 'Album' : 'Single';
  const releaseDate = formatDateLabel(entry?.scheduledAt) || formatDateLabel(entry?.item?.releaseDate) || 'TBA';
  const secondaryLine =
    entry?.type === 'album'
      ? `${releaseType} | ${entry?.item?.trackCount || 0} tracks | ${releaseDate}`
      : `${releaseType} | ${formatDuration(entry?.item?.duration)} | ${releaseDate}`;

  return {
    key: `${entry?.id || entry?.item?.id || index}`,
    title: entry?.item?.title || 'Untitled release',
    subtitle: secondaryLine,
    image: entry?.item?.coverImage || entry?.item?.avatar || '',
    meta: String(entry?.status || '').toUpperCase(),
  };
};

const compactStatsToChips = (stats = []) =>
  stats
    .filter((item) => item?.label && item?.value)
    .slice(0, 3)
    .map((item) => ({
      label: item.label,
      value: item.value,
    }));

const resolveModelForRawDetail = (detail, entityType) => {
  const isAlbum = entityType === 'album';
  const subtitle = isAlbum ? detail?.artist?.name || 'Unknown artist' : resolvePlaylistOwnerName(detail);
  const trackCount = detail?.trackCount || detail?.tracks?.length || 0;
  const duration = formatDuration(detail?.totalDuration);
  const dateLabel = formatDateLabel(isAlbum ? detail?.releaseDate : detail?.createdAt);
  const items = Array.isArray(detail?.tracks)
    ? detail.tracks
        .map((entry, index) => resolveRawTrackItem(entry, index, entityType))
        .filter(Boolean)
    : [];

  return {
    artwork: detail?.coverImage,
    badgeLabel: isAlbum ? 'ALBUM' : 'PLAYLIST',
    title: detail?.title || 'Detail',
    subtitle,
    metaLine: [trackCount ? `${trackCount} songs` : '', duration, dateLabel].filter(Boolean).join(' | '),
    description: isAlbum ? '' : detail?.description || '',
    stats: [],
    overview: [
      { label: isAlbum ? 'Artist' : 'Owner', value: subtitle },
      { label: 'Tracks', value: `${trackCount}` },
      { label: 'Duration', value: duration || '0s' },
      { label: isAlbum ? 'Released' : 'Created', value: dateLabel || 'Unknown' },
    ],
    tags: [],
    extraTitle: '',
    extraText: '',
    itemsTitle: 'Songs',
    itemsCaption: isAlbum ? 'Tap any song to open the full track detail.' : 'Playlist sequence',
    items,
    comingReleases: [],
    primaryTarget: items[0]
      ? {
          entityType: items[0].entityType,
          entityId: items[0].entityId,
          title: items[0].title,
        }
      : null,
    playHint: items[0] ? `Starts with ${items[0].title}` : 'No songs available',
  };
};

const resolveMetaValue = (meta = [], label) =>
  meta.find((item) => String(item?.label).toLowerCase() === String(label).toLowerCase())?.value || '';

const resolveStatValue = (stats = [], label) =>
  stats.find((item) => String(item?.label).toLowerCase() === String(label).toLowerCase())?.value || '';

const resolveModelForNormalizedDetail = (detail, entityType, artistComingReleaseItems) => {
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const primaryTarget =
    entityType === 'track'
      ? null
      : items[0]
        ? {
            entityType: items[0].entityType,
            entityId: items[0].entityId,
            title: items[0].title,
          }
        : null;

  if (entityType === 'track') {
    const albumName = resolveMetaValue(detail?.meta, 'Album');
    const released = resolveMetaValue(detail?.meta, 'Released');
    const durationValue = resolveStatValue(detail?.stats, 'Duration');
    const selfTrack = toPlayableTrackItem({
      ...detail,
      subtitle: detail?.subtitle || '',
      artistName: detail?.artistName || detail?.subtitle || '',
      albumTitle: detail?.albumTitle || albumName,
      meta: durationValue,
    });

    return {
      artwork: detail?.image,
      badgeLabel: 'SONG',
      title: detail?.title || 'Track',
      subtitle: detail?.subtitle || '',
      metaLine: [albumName, durationValue, released].filter(Boolean).join(' | '),
      description: detail?.description || '',
      stats: compactStatsToChips(detail?.stats),
      overview: detail?.meta || [],
      tags: detail?.tags || [],
      extraTitle: detail?.extraTitle || '',
      extraText: detail?.extraText || '',
      itemsTitle: '',
      itemsCaption: '',
      items: [],
      comingReleases: [],
      primaryTarget: selfTrack,
      playHint: selfTrack?.audioSource ? `Play ${selfTrack.title}` : 'Audio source unavailable',
    };
  }

  if (entityType === 'artist') {
    const statSummary = Array.isArray(detail?.stats)
      ? detail.stats
          .filter((item) => item?.value)
          .map((item) => `${item.value} ${String(item.label || '').toLowerCase()}`)
          .slice(0, 3)
          .join(' | ')
      : '';

    return {
      artwork: detail?.image,
      badgeLabel: 'ARTIST',
      title: detail?.title || 'Artist',
      subtitle: detail?.subtitle || 'Artist',
      metaLine: statSummary,
      description: detail?.description || '',
      stats: compactStatsToChips(detail?.stats),
      overview: detail?.meta || [],
      tags: detail?.tags || [],
      extraTitle: detail?.extraTitle || '',
      extraText: detail?.extraText || '',
      itemsTitle: detail?.itemsTitle || 'Popular',
      itemsCaption: 'Most listened songs from this artist',
      items,
      comingReleases: artistComingReleaseItems,
      primaryTarget,
      playHint: primaryTarget ? `Starts with ${primaryTarget.title}` : 'No songs available',
    };
  }

  if (entityType === 'topTrackCollection') {
    const leaderMeta = resolveMetaValue(detail?.meta, 'Leading Track');

    return {
      artwork: detail?.image,
      badgeLabel: detail?.badgeLabel || 'CHART',
      title: detail?.title || 'Chart',
      subtitle: detail?.subtitle || '',
      metaLine: leaderMeta || detail?.description || '',
      description: detail?.description || '',
      stats: compactStatsToChips(detail?.stats),
      overview: detail?.meta || [],
      tags: [],
      extraTitle: '',
      extraText: '',
      itemsTitle: detail?.itemsTitle || 'Songs',
      itemsCaption: 'Updated ranking snapshot',
      items,
      comingReleases: [],
      primaryTarget,
      playHint: primaryTarget ? `Top song: ${primaryTarget.title}` : 'No ranking items available',
    };
  }

  return {
    artwork: detail?.image,
    badgeLabel: detail?.badgeLabel || 'DETAIL',
    title: detail?.title || 'Detail',
    subtitle: detail?.subtitle || '',
    metaLine: detail?.description || '',
    description: detail?.description || '',
    stats: compactStatsToChips(detail?.stats),
    overview: detail?.meta || [],
    tags: detail?.tags || [],
    extraTitle: detail?.extraTitle || '',
    extraText: detail?.extraText || '',
    itemsTitle: detail?.itemsTitle || 'Items',
    itemsCaption: '',
    items,
    comingReleases: [],
    primaryTarget,
    playHint: primaryTarget ? `Starts with ${primaryTarget.title}` : '',
  };
};

const DetailHero = ({ model, onPrimaryAction }) => (
  <View style={styles.heroSection}>
    <View style={styles.heroGlow} />
    <Artwork uri={model.artwork} label={model.title} style={styles.heroArtwork} textStyle={styles.heroArtworkText} />
    <View style={styles.heroTextBlock}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{model.badgeLabel}</Text>
      </View>
      <Text style={styles.heroTitle}>{model.title}</Text>
      {model.subtitle ? <Text style={styles.heroSubtitle}>{model.subtitle}</Text> : null}
      {model.metaLine ? <Text style={styles.heroMetaLine}>{model.metaLine}</Text> : null}
      {model.description ? <Text style={styles.heroDescription}>{model.description}</Text> : null}
    </View>

    {model.stats.length > 0 ? (
      <View style={styles.statsRow}>
        {model.stats.map((item) => (
          <StatChip key={item.label} label={item.label} value={item.value} />
        ))}
      </View>
    ) : null}

    <View style={styles.actionRow}>
      <TouchableOpacity
        style={[styles.playButton, !model.primaryTarget && styles.playButtonDisabled]}
        activeOpacity={0.85}
        onPress={onPrimaryAction}
        disabled={!model.primaryTarget}
      >
        <Text style={styles.playButtonText}>Play</Text>
      </TouchableOpacity>
      <Text style={styles.playHint} numberOfLines={2}>{model.playHint}</Text>
    </View>
  </View>
);

export default function EntityDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const player = useMemo(() => createAudioPlayer(null, { updateInterval: 250 }), []);
  const playbackStatus = useAudioPlayerStatus(player);
  const { entityId, entityType, initialTitle, period, date, month, limit } = route.params || {};
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDetailMenuVisible, setIsDetailMenuVisible] = useState(false);
  const [isTrackMenuVisible, setIsTrackMenuVisible] = useState(false);
  const [selectedTrackMenuItem, setSelectedTrackMenuItem] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const currentTrackRef = useRef(null);
  const pendingTrackSourceRef = useRef('');

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    }).catch(() => null);

    return () => {
      player.pause();
      player.clearLockScreenControls();
      player.remove();
    };
  }, [player]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    if (!playbackStatus.isLoaded || !pendingTrackSourceRef.current) {
      return;
    }

    const activeSource = currentTrackRef.current?.audioSource || '';

    if (!activeSource || activeSource !== pendingTrackSourceRef.current) {
      return;
    }

    player.play();
    pendingTrackSourceRef.current = '';
  }, [playbackStatus.isLoaded, player]);

  const loadDetail = useCallback(async () => {
    if (!entityId || !entityType || !detailFetchers[entityType]) {
      setDetail(null);
      setErrorMessage('Detail information is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await detailFetchers[entityType]({ entityId, period, date, month, limit });
      setDetail(result);
    } catch (error) {
      setDetail(null);
      setErrorMessage(getErrorMessage(error, 'Unable to load detail right now.'));
    } finally {
      setIsLoading(false);
    }
  }, [date, entityId, entityType, limit, month, period]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleOpenNestedDetail = useCallback(
    (nextType, nextId, nextTitle) => {
      if (!nextType || !nextId) {
        return;
      }

      navigation.push('EntityDetail', {
        entityType: nextType,
        entityId: nextId,
        initialTitle: nextTitle,
      });
    },
    [navigation]
  );

  const artistComingReleaseItems = useMemo(
    () =>
      entityType === 'artist' && Array.isArray(detail?.comingReleases)
        ? detail.comingReleases
            .map((entry, index) => ({
              listItem: resolveComingReleaseListItem(entry, index),
              target: resolveComingReleaseDetailTarget(entry),
            }))
            .filter((entry) => entry.listItem && entry.target)
        : [],
    [detail?.comingReleases, entityType]
  );

  const model = useMemo(() => {
    if (!detail) {
      return null;
    }

    return entityType === 'album' || entityType === 'playlist'
      ? resolveModelForRawDetail(detail, entityType)
      : resolveModelForNormalizedDetail(detail, entityType, artistComingReleaseItems);
  }, [artistComingReleaseItems, detail, entityType]);

  const startTrackPlayback = useCallback(
    async (item) => {
      const playableTrack = toPlayableTrackItem(item);

      if (!playableTrack?.audioSource) {
        return false;
      }

      const activeSource = currentTrackRef.current?.audioSource || '';
      const isSameTrack = activeSource && activeSource === playableTrack.audioSource;

      setCurrentTrack(playableTrack);
      currentTrackRef.current = playableTrack;
      pendingTrackSourceRef.current = playableTrack.audioSource;
      player.setActiveForLockScreen(true, {
        title: playableTrack.title,
        artist: playableTrack.artistName || playableTrack.subtitle || '',
        albumTitle: playableTrack.albumTitle || undefined,
        artworkUrl: resolveImageUri(playableTrack.image) || undefined,
      });

      if (isSameTrack) {
        try {
          await player.seekTo(0);
        } catch (error) {
          // Ignore seek errors and still attempt playback.
        }

        player.play();
        pendingTrackSourceRef.current = '';
        return true;
      }

      player.replace({ uri: playableTrack.audioSource });
      return true;
    },
    [player]
  );

  const resolvePlayableTrack = useCallback(async (item) => {
    const playableTrack = toPlayableTrackItem(item);

    if (!playableTrack || playableTrack.entityType !== 'track' || playableTrack.audioSource || !playableTrack.entityId) {
      return playableTrack;
    }

    try {
      const trackDetail = await trackService.getTrackDetail(playableTrack.entityId);

      return toPlayableTrackItem({
        ...playableTrack,
        ...trackDetail,
        entityType: 'track',
        entityId: trackDetail?.entityId || trackDetail?.id || playableTrack.entityId,
        artistId: trackDetail?.artistId || playableTrack.artistId,
        artistName: trackDetail?.artistName || playableTrack.artistName,
        albumTitle: trackDetail?.albumTitle || playableTrack.albumTitle,
        audioSource: trackDetail?.audioSource || playableTrack.audioSource,
      });
    } catch (error) {
      return playableTrack;
    }
  }, []);

  const handleTrackPress = useCallback(
    async (item, options = {}) => {
      const { fallbackToDetail = true } = options;
      const playableTrack = await resolvePlayableTrack(item);

      if (playableTrack?.audioSource) {
        await startTrackPlayback(playableTrack);
        return;
      }

      if (fallbackToDetail && playableTrack?.entityType && playableTrack?.entityId) {
        handleOpenNestedDetail(playableTrack.entityType, playableTrack.entityId, playableTrack.title);
      }
    },
    [handleOpenNestedDetail, resolvePlayableTrack, startTrackPlayback]
  );

  const handlePrimaryAction = useCallback(() => {
    if (!model?.primaryTarget) {
      return;
    }

    handleTrackPress(model.primaryTarget);
  }, [handleTrackPress, model]);

  const handleOpenTrackMenu = useCallback((item) => {
    const playableTrack = toPlayableTrackItem(item);

    if (!playableTrack) {
      return;
    }

    setSelectedTrackMenuItem(playableTrack);
    setIsTrackMenuVisible(true);
  }, []);

  const isTrackActive = useCallback(
    (item) => {
      const playableTrack = toPlayableTrackItem(item);
      const activeTrack = currentTrackRef.current;

      if (!playableTrack || !activeTrack) {
        return false;
      }

      if (playableTrack.audioSource && activeTrack.audioSource) {
        return playableTrack.audioSource === activeTrack.audioSource;
      }

      return Boolean(playableTrack.entityId && activeTrack.entityId && playableTrack.entityId === activeTrack.entityId);
    },
    []
  );

  const trackMenuActions = useMemo(() => {
    const playableTrack = toPlayableTrackItem(selectedTrackMenuItem);

    if (!playableTrack) {
      return [];
    }

    const actions = [];
    const isActive = isTrackActive(playableTrack);

    if (playableTrack.entityId || playableTrack.audioSource) {
      actions.push({
        key: 'track-play',
        label: isActive && playbackStatus.playing ? 'Replay track' : 'Play track',
        sublabel: isActive && playbackStatus.playing ? 'Restart this song from the beginning' : 'Play this song now',
        onPress: () => {
          setIsTrackMenuVisible(false);
          handleTrackPress(playableTrack, { fallbackToDetail: false });
        },
      });
    }

    if (playableTrack.entityId) {
      actions.push({
        key: 'track-detail',
        label: 'View track detail',
        sublabel: 'Open the full song detail screen',
        onPress: () => {
          setIsTrackMenuVisible(false);
          handleOpenNestedDetail('track', playableTrack.entityId, playableTrack.title);
        },
      });
    }

    if (playableTrack.artistId) {
      actions.push({
        key: 'track-artist',
        label: 'Go to artist',
        sublabel: playableTrack.artistName || 'Artist detail',
        onPress: () => {
          setIsTrackMenuVisible(false);
          handleOpenNestedDetail('artist', playableTrack.artistId, playableTrack.artistName);
        },
      });
    }

    actions.push({
      key: 'track-close',
      label: 'Close',
      onPress: () => setIsTrackMenuVisible(false),
      isDestructive: true,
    });

    return actions;
  }, [handleOpenNestedDetail, handleTrackPress, isTrackActive, playbackStatus.playing, selectedTrackMenuItem]);

  const menuActions = useMemo(() => {
    if (!model) {
      return [];
    }

    const actions = [];

    if (model.primaryTarget) {
      actions.push({
        key: 'play',
        label: 'Play',
        sublabel: model.playHint,
        onPress: () => {
          setIsDetailMenuVisible(false);
          handlePrimaryAction();
        },
      });
    }

    if (entityType === 'album' && detail?.artist?.id) {
      actions.push({
        key: 'artist',
        label: 'Go to artist',
        sublabel: detail?.artist?.name || 'Artist detail',
        onPress: () => {
          setIsDetailMenuVisible(false);
          handleOpenNestedDetail('artist', detail.artist.id, detail.artist.name);
        },
      });
    }

    if (entityType === 'track') {
      const artistMeta = Array.isArray(detail?.meta)
        ? detail.meta.find((item) => item?.entityType === 'artist' && item?.entityId)
        : null;

      if (artistMeta?.entityId) {
        actions.push({
          key: 'track-artist',
          label: 'Go to artist',
          sublabel: artistMeta.value || 'Artist detail',
          onPress: () => {
            setIsDetailMenuVisible(false);
            handleOpenNestedDetail('artist', artistMeta.entityId, artistMeta.value);
          },
        });
      }
    }

    actions.push({
      key: 'close',
      label: 'Close',
      onPress: () => setIsDetailMenuVisible(false),
      isDestructive: true,
    });

    return actions;
  }, [detail, entityType, handleOpenNestedDetail, handlePrimaryAction, model]);

  const headerTitle = model?.title || detail?.title || initialTitle || 'Detail';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsDetailMenuVisible(true)}
          activeOpacity={0.82}
        >
          <Text style={styles.menuButtonText}>...</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={loadDetail} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : !model ? null : (
        <>
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <DetailHero model={model} onPrimaryAction={handlePrimaryAction} />

            {Array.isArray(model.tags) && model.tags.length > 0 ? (
              <View style={styles.section}>
                <SectionHeading title="Tags" />
                <View style={styles.tagsWrap}>
                  {model.tags.map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {model.extraTitle && model.extraText ? (
              <View style={styles.section}>
                <SectionHeading title={model.extraTitle} />
                <View style={styles.panel}>
                  <Text style={styles.extraText}>{model.extraText}</Text>
                </View>
              </View>
            ) : null}

            {entityType === 'artist' ? (
              <View style={styles.section}>
                <SectionHeading title="Upcoming Releases" caption="Singles and albums" />
                <View style={styles.panel}>
                  {model.comingReleases.length > 0 ? (
                    model.comingReleases.map(({ listItem, target }, index) => (
                      <TrackListItem
                        key={listItem.key}
                        item={listItem}
                        index={index}
                        showIndex={false}
                        onPress={() => handleOpenNestedDetail(target.entityType, target.entityId, target.title)}
                      />
                    ))
                  ) : (
                    <Text style={styles.emptyPanelText}>No upcoming single or album releases available.</Text>
                  )}
                </View>
              </View>
            ) : null}

            {Array.isArray(model.items) && model.items.length > 0 ? (
              <View style={styles.section}>
                <SectionHeading title={model.itemsTitle || 'Songs'} caption={model.itemsCaption} />
                <View style={styles.panel}>
                  {model.items.map((item, index) => (
                    <TrackListItem
                      key={`${item.entityId || item.id || item.key}-${index}`}
                      item={item}
                      index={index}
                      showIndex={entityType !== 'artist' ? item.showIndex !== false : true}
                      isActive={isTrackActive(item)}
                      isPlaying={isTrackActive(item) && playbackStatus.playing}
                      onPress={() => handleTrackPress(item)}
                      onOpenMenu={() => handleOpenTrackMenu(item)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <AppModal visible={isDetailMenuVisible} onClose={() => setIsDetailMenuVisible(false)} position="bottom">
            <View style={styles.bottomSheetHandle} />
            <View style={styles.bottomSheetHeader}>
              <Artwork
                uri={model.artwork}
                label={model.title}
                style={styles.bottomSheetArtwork}
                textStyle={styles.bottomSheetArtworkText}
              />
              <View style={styles.bottomSheetHeaderText}>
                <Text style={styles.bottomSheetTitle} numberOfLines={2}>{model.title}</Text>
                {model.subtitle ? <Text style={styles.bottomSheetSubtitle} numberOfLines={1}>{model.subtitle}</Text> : null}
              </View>
            </View>
            <View style={styles.bottomSheetActions}>
              {menuActions.map((action) => (
                <MenuActionButton
                  key={action.key}
                  label={action.label}
                  sublabel={action.sublabel}
                  onPress={action.onPress}
                  isDestructive={action.isDestructive}
                />
              ))}
            </View>
            {Array.isArray(model.overview) && model.overview.length > 0 ? (
              <View style={styles.bottomSheetMetaSection}>
                <Text style={styles.bottomSheetMetaTitle}>Details</Text>
                <View style={styles.bottomSheetMetaPanel}>
                  {model.overview.map((item) => (
                    <MetaRow key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
                  ))}
                </View>
              </View>
            ) : null}
          </AppModal>

          <AppModal visible={isTrackMenuVisible} onClose={() => setIsTrackMenuVisible(false)} position="bottom">
            <View style={styles.bottomSheetHandle} />
            <View style={styles.bottomSheetHeader}>
              <Artwork
                uri={selectedTrackMenuItem?.image}
                label={selectedTrackMenuItem?.title}
                style={styles.bottomSheetArtwork}
                textStyle={styles.bottomSheetArtworkText}
              />
              <View style={styles.bottomSheetHeaderText}>
                <Text style={styles.bottomSheetTitle} numberOfLines={2}>{selectedTrackMenuItem?.title || 'Track'}</Text>
                {selectedTrackMenuItem?.subtitle ? (
                  <Text style={styles.bottomSheetSubtitle} numberOfLines={1}>{selectedTrackMenuItem.subtitle}</Text>
                ) : null}
                {isTrackActive(selectedTrackMenuItem) ? (
                  <Text style={styles.bottomSheetNowPlaying}>{playbackStatus.playing ? 'Now playing' : 'Selected for playback'}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.bottomSheetActions}>
              {trackMenuActions.map((action) => (
                <MenuActionButton
                  key={action.key}
                  label={action.label}
                  sublabel={action.sublabel}
                  onPress={action.onPress}
                  isDestructive={action.isDestructive}
                />
              ))}
            </View>
          </AppModal>
        </>
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
    borderBottomColor: '#141414',
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
  menuButton: {
    minWidth: 56,
    alignItems: 'flex-end',
    paddingVertical: 4,
  },
  menuButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 22,
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
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  heroGlow: {
    position: 'absolute',
    top: 34,
    alignSelf: 'center',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#10361f',
    opacity: 0.75,
  },
  artworkBase: {
    backgroundColor: '#202020',
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkFallbackText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  heroArtwork: {
    width: 280,
    height: 280,
    borderRadius: 12,
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 18,
  },
  heroArtworkText: {
    fontSize: 36,
  },
  heroTextBlock: {
    marginTop: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#181818',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 31,
    fontWeight: '900',
    marginTop: 14,
    lineHeight: 36,
  },
  heroSubtitle: {
    color: '#f4f4f4',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  heroMetaLine: {
    color: '#b3b3b3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  heroDescription: {
    color: '#9a9a9a',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  statChip: {
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222222',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    color: '#9a9a9a',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    gap: 14,
  },
  playButton: {
    backgroundColor: '#1db954',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  playButtonDisabled: {
    backgroundColor: '#1d5f35',
    opacity: 0.5,
  },
  playButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  playHint: {
    flex: 1,
    color: '#b3b3b3',
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionHeading: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionCaption: {
    color: '#8d8d8d',
    fontSize: 12,
    marginTop: 4,
  },
  panel: {
    backgroundColor: '#121212',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#202020',
    overflow: 'hidden',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#151515',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  tagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  extraText: {
    color: '#d0d0d0',
    fontSize: 12,
    lineHeight: 19,
    padding: 16,
  },
  emptyPanelText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
    gap: 12,
  },
  metaLabel: {
    color: '#8f8f8f',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  metaValue: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  listItemActive: {
    backgroundColor: '#171f1a',
  },
  listIndexWrap: {
    width: 24,
    marginRight: 8,
    alignItems: 'flex-start',
  },
  listIndexText: {
    fontSize: 15,
    fontWeight: '700',
  },
  listMainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  listArtwork: {
    width: 46,
    height: 46,
    borderRadius: 6,
    marginRight: 12,
  },
  listArtworkText: {
    fontSize: 14,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listSubtitle: {
    color: '#9a9a9a',
    fontSize: 11,
    marginTop: 4,
  },
  listStatusText: {
    color: '#1db954',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
    letterSpacing: 0.4,
  },
  listAside: {
    alignItems: 'flex-end',
    marginLeft: 12,
    gap: 6,
  },
  listMeta: {
    color: '#b3b3b3',
    fontSize: 10,
    fontWeight: '700',
  },
  listMenuButton: {
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  listMenuButtonText: {
    color: '#d9d9d9',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 18,
  },
  bottomSheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#4a4a4a',
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  bottomSheetArtwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 14,
  },
  bottomSheetArtworkText: {
    fontSize: 16,
  },
  bottomSheetHeaderText: {
    flex: 1,
  },
  bottomSheetTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  bottomSheetSubtitle: {
    color: '#a3a3a3',
    fontSize: 12,
    marginTop: 4,
  },
  bottomSheetNowPlaying: {
    color: '#1db954',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  bottomSheetActions: {
    paddingTop: 10,
  },
  bottomSheetMetaSection: {
    marginTop: 18,
  },
  bottomSheetMetaTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  bottomSheetMetaPanel: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252525',
    overflow: 'hidden',
  },
  menuActionButton: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#202020',
  },
  menuActionLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  menuActionLabelDestructive: {
    color: '#ff8c8c',
  },
  menuActionSublabel: {
    color: '#9a9a9a',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
});
