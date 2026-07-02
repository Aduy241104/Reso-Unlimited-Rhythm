import { formatDuration, resolveImageUri } from './media';

const fallbackDuration = 30;
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.248:8080/api';
const apiBaseUrlWithSlash = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;

const readStringCandidate = (value) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return '';
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
    return candidate;
  }

  try {
    return new URL(candidate, apiBaseUrlWithSlash).toString();
  } catch {
    return candidate;
  }
};

const shouldAttachAuthHeader = (uri) => {
  if (!uri) {
    return false;
  }

  try {
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
    id: item?.id || item?.entityId || `track-${index}`,
    title: item?.title || 'Unknown track',
    artistName: item?.artistName || item?.subtitle || item?.artist || 'Unknown artist',
    image: resolveImageUri(item?.image || item?.coverImage || item?.avatar),
    duration,
    durationLabel: item?.meta || formatDuration(duration || fallbackDuration),
    description: item?.description || '',
    lyrics: item?.lyrics || item?.extraText || '',
    entityId: item?.entityId || item?.id || '',
    entityType: item?.entityType || 'track',
    audioUri,
    audioHeaders: item?.audioHeaders || null,
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
