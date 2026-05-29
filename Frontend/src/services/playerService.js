import axiosClient from "../axios/axiosClient";
import { API_BASE_URL } from "../constants/auth";

const TRACK_API_PREFIX = "/api/tracks";

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

export const resolveTrackLyricsSyncUrl = (track) => {
  const o3icsSyncUrl =
    track?.playback?.o3icsSyncUrl ||
    track?.o3icsSyncUrl ||
    track?.o3ics?.syncUrl ||
    track?.raw?.playback?.o3icsSyncUrl ||
    track?.raw?.o3icsSyncUrl ||
    track?.raw?.o3ics?.syncUrl;

  if (!o3icsSyncUrl) {
    return "";
  }

  return buildAbsoluteMediaUrl(o3icsSyncUrl);
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

export const getTrackPlaybackService = async (trackId) => {
  const response = await axiosClient.get(`${TRACK_API_PREFIX}/${trackId}/playback`);
  return response?.data?.data?.track ?? null;
};

export const getTrackPlaybackSource = async (trackId) => {
  if (!trackId) {
    throw new Error("Track id is required to resolve playback source.");
  }

  const playbackTrack = await getTrackPlaybackService(trackId);
  const streamUrl = resolveTrackMediaUrl(playbackTrack);

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
  const o3icsSyncUrl =
    typeof trackOrLyricsUrl === "string"
      ? buildAbsoluteMediaUrl(trackOrLyricsUrl)
      : resolveTrackLyricsSyncUrl(trackOrLyricsUrl);

  if (!o3icsSyncUrl) {
    throw new Error("Track playback does not include a synced o3ics URL.");
  }

  const response = await axiosClient.get(o3icsSyncUrl, {
    responseType: "text",
  });

  const o3icsText =
    typeof response?.data === "string"
      ? response.data
      : typeof response?.data?.data === "string"
        ? response.data.data
        : "";

  if (!o3icsText.trim()) {
    throw new Error("The synced o3ics response is empty.");
  }

  return o3icsText;
};

export const recordListenService = async (trackId, duration, skipped = false) => {
  try {
    await axiosClient.post(`${TRACK_API_PREFIX}/${trackId}/listen`, {
      duration: Math.floor(duration),
      skipped,
    });
  } catch (error) {
    console.warn("[ListenTracking] Failed to record listen event:", error);
  }
};
