import axiosClient from "../axios/axiosClient";

const TRACKS_API_PREFIX = "/api/artist/track";
const ALBUMS_API_PREFIX = "/api/albums";
const PUBLIC_TRACK_API_PREFIX = "/api/tracks";

const normalizeTrackArtist = (artist) => {
  if (!artist) {
    return null;
  }

  return {
    id: artist?.id || artist?._id || "",
    name: artist?.name || "Unknown artist",
    avatar: artist?.avatar || "",
    coverImage: artist?.coverImage || "",
  };
};

const normalizeTopTrackItem = (item, index) => {
  const rawTrack = item?.track || {};
  const normalizedTrack = {
    id: rawTrack?.id || rawTrack?._id || "",
    title: rawTrack?.title || "Untitled track",
    duration: Number(rawTrack?.duration) || 0,
    avatar: rawTrack?.avatar || "",
    coverImage: rawTrack?.coverImage || rawTrack?.avatar || "",
    artist: normalizeTrackArtist(rawTrack?.artist),
    stats: rawTrack?.stats || {},
    activeStatus: rawTrack?.activeStatus || "",
    approvalStatus: rawTrack?.approvalStatus || "",
  };
  const numericRank = Number(item?.rank);
  const numericPreviousRank = Number(item?.previousRank);
  const numericRankChange = Number(item?.rankChange);
  const normalizedRankTrend =
    typeof item?.rankTrend === "string" ? item.rankTrend.trim().toLowerCase() : "";

  return {
    rank: numericRank > 0 ? numericRank : index + 1,
    date: item?.date || "",
    previousRank:
      item?.previousRank === null || item?.previousRank === undefined
        ? null
        : (numericPreviousRank > 0 ? numericPreviousRank : null),
    rankChange: Number.isFinite(numericRankChange) ? numericRankChange : 0,
    rankTrend: normalizedRankTrend || "same",
    playCount: Number(item?.playCount) || 0,
    uniqueListeners: Number(item?.uniqueListeners) || 0,
    averageListenDuration: Number(item?.averageListenDuration) || 0,
    skipCount: Number(item?.skipCount) || 0,
    track: normalizedTrack,
  };
};

export const trackService = {
  uploadFiles: async (audioFile, avatar, coverImages, lyricsSyncFile) => {
    try {
      const formData = new FormData();

      if (audioFile) {
        formData.append("audioFiles", audioFile);
      }

      // Append avatar
      if (avatar) {
        formData.append("avatar", avatar);
      }

      // Append cover images
      if (coverImages && coverImages.length > 0) {
        coverImages.forEach((file) => {
          formData.append("coverImages", file);
        });
      }

      if (lyricsSyncFile) {
        formData.append("lyricsSync", lyricsSyncFile);
      }

      const response = await axiosClient.post(
        `${TRACKS_API_PREFIX}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  createTrack: async (trackData) => {
    try {
      const response = await axiosClient.post(`${TRACKS_API_PREFIX}/`, trackData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getArtistTracks: async (params = {}) => {
    try {
      const response = await axiosClient.get(`${TRACKS_API_PREFIX}/artist/me`, {
        params,
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getArtistTrackDetail: async (trackId) => {
    try {
      const response = await axiosClient.get(
        `${TRACKS_API_PREFIX}/artist/me/${trackId}`
      );

      const payload = response?.data?.data;
      return payload?.track || response?.data?.track || payload || null;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getArtistTrackAnalytics: async (trackId, params = {}) => {
    try {
      const response = await axiosClient.get(
        `/api/artist/tracks/${trackId}/analytics`,
        {
          params,
        }
      );

      return response?.data?.data || null;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateArtistTrack: async (trackId, trackData) => {
    try {
      const response = await axiosClient.patch(
        `${TRACKS_API_PREFIX}/artist/me/${trackId}`,
        trackData
      );

      const payload = response?.data?.data;
      return payload?.track || response?.data?.track || payload || null;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  submitForApproval: async (trackId) => {
    try {
      const response = await axiosClient.patch(
        `${TRACKS_API_PREFIX}/artist/me/${trackId}/submit`
      );

      const payload = response?.data?.data;
      return payload?.track || response?.data?.track || payload || null;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  hideArtistTrack: async (trackId, reason = "") => {
    try {
      const response = await axiosClient.patch(
        `${TRACKS_API_PREFIX}/artist/me/${trackId}/hide`,
        { reason }
      );

      const payload = response?.data?.data;
      return payload?.track || response?.data?.track || payload || null;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deleteArtistTrack: async (trackId) => {
    try {
      const response = await axiosClient.delete(
        `${TRACKS_API_PREFIX}/artist/me/${trackId}`
      );

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getArtistAlbums: async () => {
    try {
      const response = await axiosClient.get(`${ALBUMS_API_PREFIX}/artist/me`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default trackService;

export const getTrackDetailService = async (trackId) => {
  const response = await axiosClient.get(`${PUBLIC_TRACK_API_PREFIX}/${trackId}`);
  const payload = response?.data?.data;

  return payload?.track || response?.data?.track || payload || null;
};

export const getDailyTopTracksService = async ({ date, limit = 30 }) => {
  const response = await axiosClient.get(`${PUBLIC_TRACK_API_PREFIX}/top/daily`, {
    params: {
      date,
      limit,
    },
  });

  const payload = response?.data?.data;
  const topTracks = Array.isArray(payload?.topTracks)
    ? payload.topTracks.map(normalizeTopTrackItem)
    : [];

  return {
    topTracks,
    meta: response?.data?.meta || {},
  };
};

export const getMonthlyTopTracksService = async ({ year, month, limit = 30 }) => {
  const rawMonthValue = String(month || "").trim();
  const resolvedYear = String(year || "").trim();
  const requestMonthKey = /^\d{4}-\d{2}$/.test(rawMonthValue)
    ? rawMonthValue
    : resolvedYear && rawMonthValue
      ? `${resolvedYear}-${String(rawMonthValue).padStart(2, "0")}`
      : "";

  const requestCandidates = [
    `${PUBLIC_TRACK_API_PREFIX}/top/monthly`,
    `${PUBLIC_TRACK_API_PREFIX}/top/month`,
  ];

  let lastError = null;

  for (const endpoint of requestCandidates) {
    try {
      const response = await axiosClient.get(endpoint, {
        params: {
          month: requestMonthKey,
          limit,
        },
      });

      const payload = response?.data?.data;
      const topTracks = Array.isArray(payload?.topTracks)
        ? payload.topTracks.map(normalizeTopTrackItem)
        : [];

      return {
        topTracks,
        meta: {
          ...(response?.data?.meta || {}),
          date:
            response?.data?.meta?.date ||
            requestMonthKey,
        },
      };
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;

      if (status !== 404 && status !== 405) {
        throw error.response?.data || error;
      }
    }
  }

  throw lastError?.response?.data || lastError;
};
