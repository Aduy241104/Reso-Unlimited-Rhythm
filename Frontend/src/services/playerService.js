import axiosClient from "../axios/axiosClient";
import { API_BASE_URL } from "../constants/auth";

const TRACK_API_PREFIX = "/api/tracks";

const buildAbsoluteMediaUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  try {
    return new URL(value).toString();
  } catch {
    const base =
      API_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    if (!base) {
      return value;
    }

    return new URL(value, base).toString();
  }
};

const getFirstAudioFile = (track) =>
  track?.playback?.audioFiles?.find((audioFile) => audioFile?.url) ||
  track?.audioFiles?.find((audioFile) => audioFile?.url) ||
  null;

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
