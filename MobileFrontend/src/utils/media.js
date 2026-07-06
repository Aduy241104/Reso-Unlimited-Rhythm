export const formatCompactNumber = (value) => {
  const numericValue = Number(value || 0);

  if (numericValue >= 1000000) {
    return `${(numericValue / 1000000).toFixed(1).replace('.0', '')}M`;
  }

  if (numericValue >= 1000) {
    return `${(numericValue / 1000).toFixed(1).replace('.0', '')}K`;
  }

  return `${numericValue}`;
};

export const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${remainingSeconds}s`;
};

export const formatDateLabel = (value) => {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatMonthLabel = (value) => {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(`${value}-01T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
};

export const getInitials = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || 'RS';

const resolveMediaUri = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolvedValue = resolveMediaUri(entry);

      if (resolvedValue) {
        return resolvedValue;
      }
    }
  }

  if (value && typeof value === 'object') {
    const candidates = [value.uri, value.url, value.secureUrl, value.secure_url, value.href];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return '';
};

export const resolveImageUri = (value) => resolveMediaUri(value);

export const resolveTrackAudioUri = (track) => {
  if (!track || typeof track !== 'object') {
    return '';
  }

  const candidates = [
    track.audioUrl,
    track.audioURI,
    track.audioUri,
    track.streamUrl,
    track.streamingUrl,
    track.trackUrl,
    track.previewUrl,
    track.fileUrl,
    track.sourceUrl,
    track.audio,
    track.audioFile,
    track.audioFiles,
    track.audioSource,
    track.stream,
    track.streaming,
    track.source,
    track.file,
    track.media?.audio,
    track.media?.source,
    track.media?.file,
    track.playback?.audio,
    track.playback?.source,
    track.asset?.audio,
    track.assets?.audio,
  ];

  for (const candidate of candidates) {
    const resolvedValue = resolveMediaUri(candidate);

    if (resolvedValue) {
      return resolvedValue;
    }
  }

  return '';
};

export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;
