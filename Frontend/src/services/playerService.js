import axios from "axios";
import axiosClient from "../axios/axiosClient";
import { API_BASE_URL } from "../constants/auth";
import { getStoredAccessToken } from "./authStorage";

const TRACK_API_PREFIX = "/api/tracks";
const LISTEN_EVENT_API_PREFIX = "/api/listen-events";
const VALID_LISTEN_SOURCES = new Set([
  "track_detail",
  "album",
  "playlist",
  "search",
  "artist_profile",
  "unknown",
]);

const normalizeAudioQualityLabel = (value) => {
  const normalizedValue =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  return normalizedValue || "original";
};

const looksLikeResolvableMediaReference = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return true;
  }

  if (
    trimmedValue.startsWith("/") ||
    trimmedValue.startsWith("./") ||
    trimmedValue.startsWith("../")
  ) {
    return true;
  }

  if (trimmedValue.includes("/")) {
    return true;
  }

  // Allow bare filenames such as "track.lrc" or "audio.mp3", but reject
  // placeholder values like "dfgh" that would become invalid GET requests.
  return /^[^\\/\s]+\.[a-z0-9]+(?:[?#].*)?$/i.test(trimmedValue);
};

const buildAbsoluteMediaUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!looksLikeResolvableMediaReference(trimmedValue)) {
    return "";
  }

  try {
    return new URL(trimmedValue).toString();
  } catch {
    const base =
      API_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    if (!base) {
      return trimmedValue;
    }

    return new URL(trimmedValue, base).toString();
  }
};

const getFirstAudioFile = (track) =>
  track?.playback?.audioFiles?.find((audioFile) => audioFile?.url) ||
  track?.audioFiles?.find((audioFile) => audioFile?.url) ||
  null;

const getTrackAudioFiles = (track) => {
  const playbackFiles = Array.isArray(track?.playback?.audioFiles)
    ? track.playback.audioFiles
    : [];
  const directFiles = Array.isArray(track?.audioFiles) ? track.audioFiles : [];
  const rawPlaybackFiles = Array.isArray(track?.raw?.playback?.audioFiles)
    ? track.raw.playback.audioFiles
    : [];
  const rawFiles = Array.isArray(track?.raw?.audioFiles) ? track.raw.audioFiles : [];

  return [...playbackFiles, ...directFiles, ...rawPlaybackFiles, ...rawFiles];
};

const resolveLyricsSyncReference = (track) =>
  track?.playback?.lyricsSyncUrl ||
  track?.playback?.o3icsSyncUrl ||
  track?.lyricsSyncUrl ||
  track?.lyrics?.syncUrl ||
  track?.o3icsSyncUrl ||
  track?.o3ics?.syncUrl ||
  track?.raw?.playback?.lyricsSyncUrl ||
  track?.raw?.playback?.o3icsSyncUrl ||
  track?.raw?.lyricsSyncUrl ||
  track?.raw?.lyrics?.syncUrl ||
  track?.raw?.o3icsSyncUrl ||
  track?.raw?.o3ics?.syncUrl;

export const resolveTrackLyricsSyncUrl = (track) => {
  const lyricsSyncReference = resolveLyricsSyncReference(track);

  if (!lyricsSyncReference) {
    return "";
  }

  return buildAbsoluteMediaUrl(lyricsSyncReference);
};

export const resolveTrackMediaUrl = (track) => {
  const playbackDefaultAudio = track?.playback?.defaultAudio;
  const mediaUrl =
    playbackDefaultAudio?.url ||
    track?.defaultAudio?.url ||
    getFirstAudioFile(track)?.url ||
    track?.streamUrl ||
    track?.audioUrl ||
    track?.playbackUrl ||
    track?.url ||
    track?.mediaUrl;

  if (!mediaUrl) {
    return "";
  }

  return buildAbsoluteMediaUrl(mediaUrl);
};

export const resolveTrackAudioQualityOptions = (track) => {
  const audioFiles = getTrackAudioFiles(track);
  const qualityOptions = [];
  const seenKeys = new Set();

  audioFiles.forEach((audioFile, index) => {
    const url = buildAbsoluteMediaUrl(audioFile?.url);

    if (!url) {
      return;
    }

    const label = normalizeAudioQualityLabel(audioFile?.label);
    const key = `${label}:${url}`;

    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    qualityOptions.push({
      label,
      bitrate: Number(audioFile?.bitrate) || 0,
      priority: Number(audioFile?.priority) || 0,
      url,
      isDefault:
        buildAbsoluteMediaUrl(track?.playback?.defaultAudio?.url) === url ||
        buildAbsoluteMediaUrl(track?.defaultAudio?.url) === url,
      index,
    });
  });

  return qualityOptions.sort((left, right) => {
    if ((right.priority || 0) !== (left.priority || 0)) {
      return (right.priority || 0) - (left.priority || 0);
    }

    if ((right.bitrate || 0) !== (left.bitrate || 0)) {
      return (right.bitrate || 0) - (left.bitrate || 0);
    }

    return left.index - right.index;
  });
};

export const resolveTrackMediaUrlForQuality = (track, preferredQuality = "") => {
  const preferredQualityLabel =
    typeof preferredQuality === "string"
      ? preferredQuality
      : preferredQuality?.label || "";
  const preferredQualityUrl =
    typeof preferredQuality === "string" ? "" : preferredQuality?.url || "";
  const preferredQualityBitrate =
    typeof preferredQuality === "string"
      ? 0
      : Number(preferredQuality?.bitrate) || 0;
  const normalizedPreferredLabel = normalizeAudioQualityLabel(preferredQualityLabel);
  const qualityOptions = resolveTrackAudioQualityOptions(track);
  const matchingQuality =
    qualityOptions.find(
      (quality) =>
        preferredQualityBitrate > 0 &&
        quality.bitrate === preferredQualityBitrate
    ) ||
    qualityOptions.find((quality) => quality.url === preferredQualityUrl) ||
    qualityOptions.find((quality) => quality.label === normalizedPreferredLabel);

  if (matchingQuality?.url) {
    return matchingQuality.url;
  }

  const playbackDefaultAudio = track?.playback?.defaultAudio;
  const mediaUrl =
    playbackDefaultAudio?.url ||
    track?.defaultAudio?.url ||
    getFirstAudioFile(track)?.url ||
    track?.streamUrl ||
    track?.audioUrl ||
    track?.playbackUrl ||
    track?.url ||
    track?.mediaUrl;

  if (!mediaUrl) {
    return "";
  }

  return buildAbsoluteMediaUrl(mediaUrl);
};

export const getTrackPlaybackService = async (trackId) => {
  const normalizedTrackId =
    trackId === null || trackId === undefined ? "" : String(trackId).trim();
  const playbackEndpoint = normalizedTrackId
    ? `${TRACK_API_PREFIX}/${normalizedTrackId}/playback`
    : `${TRACK_API_PREFIX}/playback`;
  const response = await axiosClient.get(playbackEndpoint);
  return response?.data?.data?.track ?? null;
};

export const getTrackPlaybackSource = async (
  trackId,
  {
    preferredQualityLabel = "",
    preferredQualityUrl = "",
    preferredQualityBitrate = 0,
  } = {}
) => {
  const playbackTrack = await getTrackPlaybackService(trackId);
  const streamUrl = preferredQualityLabel || preferredQualityUrl || preferredQualityBitrate
    ? resolveTrackMediaUrlForQuality(playbackTrack, {
        label: preferredQualityLabel,
        url: preferredQualityUrl,
        bitrate: preferredQualityBitrate,
      })
    : resolveTrackMediaUrl(playbackTrack);

  if (!streamUrl) {
    throw new Error("Track playback does not include a playable audio URL.");
  }

  return {
    url: streamUrl,
    revokeOnChange: false,
    track: playbackTrack,
  };
};

export const getTrackLyricsSyncTextService = async (trackOrLyricsUrl) => {
  const lyricsSyncUrl =
    typeof trackOrLyricsUrl === "string"
      ? buildAbsoluteMediaUrl(trackOrLyricsUrl)
      : resolveTrackLyricsSyncUrl(trackOrLyricsUrl);

  if (!lyricsSyncUrl) {
    throw new Error("Track playback does not include a synced lyrics URL.");
  }

  // Synced lyric files are often served from public third-party hosts such as
  // Cloudinary. Use a plain request here so auth interceptors do not attach an
  // Authorization header and trigger a CORS preflight/network error.
  const response = await axios.get(lyricsSyncUrl, {
    responseType: "text",
  });

  const lyricsSyncText =
    typeof response?.data === "string"
      ? response.data
      : typeof response?.data?.data === "string"
        ? response.data.data
        : "";

  if (!lyricsSyncText.trim()) {
    throw new Error("The synced lyrics response is empty.");
  }

  return lyricsSyncText;
};

const normalizeListenSource = (source = "unknown") =>
  VALID_LISTEN_SOURCES.has(source) ? source : "unknown";

export const recordListenService = async ({
  trackId,
  listenedDuration,
  source = "unknown",
} = {}) => {
  const accessToken = getStoredAccessToken();
  const normalizedListenedDuration = Math.max(
    Math.floor(Number(listenedDuration) || 0),
    0
  );

  if (!accessToken || !trackId || normalizedListenedDuration <= 0) {
    return null;
  }

  try {
    return await axiosClient.post(`${LISTEN_EVENT_API_PREFIX}/complete`, {
      trackId,
      listenedDuration: normalizedListenedDuration,
      source: normalizeListenSource(source),
    });
  } catch (error) {
    if (error?.response?.status !== 401) {
      console.warn("[ListenTracking] Failed to record listen event:", error);
    }

    return null;
  }
};
