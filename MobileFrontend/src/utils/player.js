import { getApiBaseUrl } from '../config/api';
import { formatDuration, resolveImageUri } from './media';

const fallbackDuration = 30;

const readStringCandidate = (value) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return '';
};

const timedLrcPattern = /\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?\]/;
const isLoopbackHostname = (value = '') => ['localhost', '127.0.0.1', '::1'].includes(String(value).toLowerCase());
const getApiBaseUrlWithSlash = () => {
  const apiBaseUrl = getApiBaseUrl();
  return apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
};

const readNestedUri = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedValue = readNestedUri(item);

      if (nestedValue) {
        return nestedValue;
      }
    }

    return '';
  }

  return (
    readStringCandidate(value?.uri) ||
    readStringCandidate(value?.url) ||
    readStringCandidate(value?.src) ||
    readStringCandidate(value?.path) ||
    ''
  );
};

const toAbsoluteAudioUri = (value) => {
  const candidate = readNestedUri(value);

  if (!candidate) {
    return '';
  }

  if (/^https?:\/\//i.test(candidate) || /^file:\/\//i.test(candidate) || /^asset:\/\//i.test(candidate)) {
    if (!/^https?:\/\//i.test(candidate)) {
      return candidate;
    }

    try {
      const candidateUrl = new URL(candidate);
      const apiUrl = new URL(getApiBaseUrl());

      if (isLoopbackHostname(candidateUrl.hostname) && !isLoopbackHostname(apiUrl.hostname)) {
        candidateUrl.protocol = apiUrl.protocol;
        candidateUrl.hostname = apiUrl.hostname;
        candidateUrl.port = apiUrl.port;
      }

      return candidateUrl.toString();
    } catch {
      return candidate;
    }
  }

  try {
    return new URL(candidate, getApiBaseUrlWithSlash()).toString();
  } catch {
    return candidate;
  }
};

const shouldAttachAuthHeader = (uri) => {
  if (!uri) {
    return false;
  }

  try {
    const apiBaseUrl = getApiBaseUrl();
    const apiOrigin = new URL(apiBaseUrl).origin;
    const targetOrigin = new URL(uri, apiBaseUrl).origin;

    return apiOrigin === targetOrigin;
  } catch {
    return false;
  }
};

export const formatPlayerTime = (value) => {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const normalizePlayerTrack = (item, index = 0) => {
  const duration = Math.max(0, Number(item?.duration) || 0);
  const audioUri = resolveTrackAudioUri(item);

  return {
    ...(item && typeof item === 'object' ? item : {}),
    id: item?.id || item?.entityId || `track-${index}`,
    title: item?.title || 'Bài hát không xác định',
    artistName: item?.artistName || item?.subtitle || item?.artist?.name || item?.artist || 'Nghệ sĩ không xác định',
    image: resolveImageUri(item?.image || item?.coverImage || item?.avatar),
    duration,
    durationLabel:
      item?.durationLabel ||
      (typeof item?.meta === 'string' ? item.meta : '') ||
      formatDuration(duration || fallbackDuration),
    description: item?.description || '',
    lyrics: item?.lyrics ?? resolveTrackStaticLyrics(item),
    lrc: item?.lrc || resolveTrackLrc(item),
    lyricsSyncUrl: item?.lyricsSyncUrl || resolveTrackLyricsSyncUrl(item),
    entityId: item?.entityId || item?.id || '',
    entityType: item?.entityType || 'track',
    audioUri: item?.audioUri || audioUri,
    audioHeaders: item?.audioHeaders || null,
    raw: item?.raw || item,
  };
};

export const buildPlayableQueue = (items = []) =>
  items
    .map((item, index) => normalizePlayerTrack(item, index))
    .filter((item) => Boolean(item.id));

export const getPlayableDuration = (track) => {
  const duration = Math.max(0, Number(track?.duration) || 0);

  return duration || fallbackDuration;
};

export const resolveTrackAudioUri = (item) => {
  if (!item) {
    return '';
  }

  const audioFiles = Array.isArray(item.playback?.audioFiles)
    ? item.playback.audioFiles
    : Array.isArray(item.audioFiles)
      ? item.audioFiles
      : Array.isArray(item.raw?.playback?.audioFiles)
        ? item.raw.playback.audioFiles
        : Array.isArray(item.raw?.audioFiles)
          ? item.raw.audioFiles
          : [];

  const candidates = [
    item.audioUri,
    item.audioUrl,
    item.streamUrl,
    item.streamUri,
    item.mediaUrl,
    item.playbackUrl,
    item.previewUrl,
    item.defaultAudio?.url,
    item.playback?.defaultAudio?.url,
    item.fileUrl,
    item.filePath,
    item.sourceUrl,
    item.audio,
    item.stream,
    item.media,
    item.file,
    item.source,
    item.audioFile,
    item.trackUrl,
    item.trackUri,
    item.track?.audioUrl,
    item.track?.streamUrl,
    item.track?.mediaUrl,
    item.track?.fileUrl,
    item.track?.audio,
    item.track?.stream,
    item.track?.media,
    item.track?.file,
    item.playback?.url,
    ...audioFiles,
    item.preview?.url,
    item.urls,
    item.assets,
    item.files,
    item.sources,
  ];

  for (const candidate of candidates) {
    const resolvedValue = toAbsoluteAudioUri(candidate);

    if (resolvedValue) {
      return resolvedValue;
    }
  }

  return '';
};

export const resolveTrackStaticLyrics = (item) => {
  if (!item) {
    return '';
  }

  return (
    readStringCandidate(item?.lyrics) ||
    readStringCandidate(item?.extraText) ||
    readStringCandidate(item?.lyrics?.static) ||
    readStringCandidate(item?.lyricsStatic) ||
    readStringCandidate(item?.raw?.lyrics?.static) ||
    readStringCandidate(item?.raw?.lyricsStatic) ||
    ''
  );
};

export const resolveTrackLyricsSyncUrl = (item) => {
  if (!item) {
    return '';
  }

  return (
    toAbsoluteAudioUri(item?.lyricsSyncUrl) ||
    toAbsoluteAudioUri(item?.o3icsSyncUrl) ||
    toAbsoluteAudioUri(item?.lyrics?.syncUrl) ||
    toAbsoluteAudioUri(item?.o3ics?.syncUrl) ||
    toAbsoluteAudioUri(item?.playback?.lyricsSyncUrl) ||
    toAbsoluteAudioUri(item?.playback?.o3icsSyncUrl) ||
    toAbsoluteAudioUri(item?.playback?.lyrics?.syncUrl) ||
    toAbsoluteAudioUri(item?.playback?.o3ics?.syncUrl) ||
    toAbsoluteAudioUri(item?.raw?.lyricsSyncUrl) ||
    toAbsoluteAudioUri(item?.raw?.o3icsSyncUrl) ||
    toAbsoluteAudioUri(item?.raw?.lyrics?.syncUrl) ||
    toAbsoluteAudioUri(item?.raw?.o3ics?.syncUrl) ||
    ''
  );
};

export const resolveTrackLrc = (item) => {
  if (!item) {
    return '';
  }

  return (
    readStringCandidate(item?.lrc) ||
    readStringCandidate(item?.lrcText) ||
    readStringCandidate(item?.lyricsLrc) ||
    readStringCandidate(item?.syncedLyrics) ||
    readStringCandidate(item?.lyrics?.lrc) ||
    readStringCandidate(item?.lyrics?.sync) ||
    readStringCandidate(item?.lyrics?.synced) ||
    readStringCandidate(item?.playback?.lrc) ||
    readStringCandidate(item?.playback?.lyrics?.lrc) ||
    readStringCandidate(item?.raw?.lrc) ||
    readStringCandidate(item?.raw?.lyrics?.lrc) ||
    ''
  );
};

export const hasSyncedLrc = (value) => {
  const lrc = typeof value === 'string' ? value : resolveTrackLrc(value);
  return timedLrcPattern.test(lrc);
};

export const buildExpoAudioSource = (track, accessToken) => {
  const uri = resolveTrackAudioUri(track);

  if (!uri) {
    return null;
  }

  if (!accessToken || !shouldAttachAuthHeader(uri)) {
    return uri;
  }

  return {
    uri,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
};
