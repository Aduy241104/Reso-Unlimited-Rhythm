import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { formatDateLabel, formatDuration, resolveImageUri } from '../utils/media';
import { resolveTrackAudioUri } from '../utils/player';

const getPayload = (response) => response?.data || response || {};
const asObject = (value) => (value && typeof value === 'object' ? value : {});
const asArray = (value) => (Array.isArray(value) ? value : []);
const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const pickNumber = (...values) => {
  for (const value of values) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
};

const normalizeVisibilityLabel = (item) => {
  if (item?.type === 'system') {
    return 'System';
  }

  return item?.isPublic ? 'Public' : 'Private';
};

const normalizePlaylist = (item) => {
  const rawItem = asObject(item);
  const coverImage = pickFirstDefined(
    resolveImageUri(rawItem.coverImage),
    resolveImageUri(rawItem.image),
    rawItem.coverImage,
    rawItem.image,
    ''
  );
  const trackCount = pickNumber(rawItem.trackCount, asArray(rawItem.tracks).length);
  const totalDuration = pickNumber(rawItem.totalDuration, rawItem.duration);

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, ''),
    title: pickFirstDefined(rawItem.title, 'Untitled playlist'),
    description: pickFirstDefined(rawItem.description, ''),
    coverImage,
    image: coverImage,
    type: pickFirstDefined(rawItem.type, 'system'),
    trackCount,
    totalDuration,
    isPublic: typeof rawItem.isPublic === 'boolean' ? rawItem.isPublic : Boolean(rawItem.isPublic),
    createdAt: pickFirstDefined(rawItem.createdAt, null),
    subtitle: trackCount > 0 ? `${trackCount} tracks` : 'Playlist collection',
    primaryMeta: trackCount > 0 ? `${trackCount} tracks` : 'No tracks yet',
    secondaryMeta: totalDuration > 0 ? formatDuration(totalDuration) : normalizeVisibilityLabel(rawItem),
  };
};

const normalizePlaylistTrack = (item, index = 0) => {
  const rawItem = asObject(item);
  const track = asObject(item?.track || item?.trackId || item);
  const artist = track?.artist || track?.artist_artistId || {};
  const album = track?.album || track?.album_albumId || {};

  return {
    ...track,
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, track?.id, track?._id, rawItem?.trackId, `track-${index}`),
    title: pickFirstDefined(rawItem.title, track?.title, 'Unknown track'),
    subtitle: pickFirstDefined(rawItem.subtitle, rawItem.artistName, artist?.name, 'Unknown artist'),
    artistName: pickFirstDefined(rawItem.artistName, artist?.name, 'Unknown artist'),
    image: pickFirstDefined(
      rawItem.image,
      rawItem.coverImage,
      resolveImageUri(track?.coverImage || track?.avatar || album?.coverImage || artist?.avatar),
      ''
    ),
    entityType: pickFirstDefined(rawItem.entityType, 'track'),
    entityId: pickFirstDefined(rawItem.entityId, track?.id, track?._id, ''),
    duration: pickNumber(rawItem.duration, track?.duration),
    audioUri: pickFirstDefined(rawItem.audioUri, resolveTrackAudioUri(rawItem), resolveTrackAudioUri(track), ''),
    meta: pickFirstDefined(rawItem.meta, formatDuration(pickNumber(rawItem.duration, track?.duration))),
    order: pickNumber(rawItem.order, index + 1),
    addedAt: pickFirstDefined(rawItem.addedAt, null),
  };
};

const normalizeOwner = (item) => {
  const owner = item?.owner || item?.userId || item?.createdBy || {};

  return owner?.fullName || owner?.profile?.fullName || owner?.name || owner?.email || 'Reso Music';
};

const normalizePlaylistDetail = (item) => {
  const rawItem = asObject(item);
  const tracks = asArray(rawItem?.tracks)
    .slice()
    .sort((firstTrack, secondTrack) => pickNumber(firstTrack?.order) - pickNumber(secondTrack?.order))
    .map(normalizePlaylistTrack);
  const ownerLabel = normalizeOwner(rawItem);
  const visibilityLabel = normalizeVisibilityLabel(rawItem);
  const createdDate = formatDateLabel(rawItem?.createdAt);
  const updatedDate = formatDateLabel(rawItem?.updatedAt);
  const totalDuration = pickNumber(rawItem?.totalDuration, rawItem?.duration);
  const coverImage = pickFirstDefined(
    resolveImageUri(rawItem?.coverImage),
    resolveImageUri(rawItem?.image),
    rawItem?.coverImage,
    rawItem?.image,
    ''
  );

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem?.id, rawItem?._id, ''),
    type: 'playlist',
    playlistType: pickFirstDefined(rawItem?.type, 'playlist'),
    badgeLabel: rawItem?.type === 'system' ? 'SYSTEM PLAYLIST' : 'PLAYLIST',
    title: pickFirstDefined(rawItem?.title, 'Untitled playlist'),
    subtitle: pickFirstDefined(rawItem?.subtitle, ownerLabel),
    image: coverImage,
    description: pickFirstDefined(rawItem?.description, rawItem?.type === 'system' ? 'Curated by the Reso team.' : ''),
    stats: asArray(rawItem?.stats).length > 0
      ? rawItem.stats
      : [
          { label: 'Tracks', value: `${pickNumber(rawItem?.trackCount, tracks.length)}` },
          { label: 'Duration', value: formatDuration(totalDuration) },
          { label: 'Visibility', value: visibilityLabel },
        ],
    meta: asArray(rawItem?.meta).length > 0
      ? rawItem.meta
      : [
          { label: 'Owner', value: ownerLabel },
          { label: 'Created', value: createdDate || 'Unknown' },
          { label: 'Updated', value: updatedDate || 'Unknown' },
          { label: 'Type', value: pickFirstDefined(rawItem?.type, 'system') },
        ],
    tags: asArray(rawItem?.tags),
    owner: asObject(rawItem?.owner),
    extraTitle: pickFirstDefined(rawItem?.extraTitle, rawItem?.aiPrompt ? 'AI Prompt' : ''),
    extraText: pickFirstDefined(rawItem?.extraText, rawItem?.aiPrompt, ''),
    itemsTitle: pickFirstDefined(rawItem?.itemsTitle, 'Tracks in this playlist'),
    items: tracks,
  };
};

export const playlistService = {
  async getSystemPlaylists(params) {
    const response = await axiosClient.get(API_ENDPOINTS.PLAYLISTS.SYSTEM, { params });
    const payload = getPayload(response);
    const rawItems = asArray(payload.playlists || payload.items || payload.data);

    return {
      items: rawItems.map(normalizePlaylist),
      meta: response?.meta || payload?.meta || null,
    };
  },

  async getPlaylistDetail(playlistId) {
    const endpoints = [
      `${API_ENDPOINTS.PLAYLISTS.SYSTEM_DETAIL}/${playlistId}`,
      `${API_ENDPOINTS.PLAYLISTS.DETAIL}/${playlistId}`,
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await axiosClient.get(endpoint);
        const payload = getPayload(response);

        return normalizePlaylistDetail(payload?.playlist || payload?.data || payload);
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;

        if (status !== 404 && status !== 405) {
          throw error;
        }
      }
    }

    throw lastError;
  },
};

export default playlistService;
