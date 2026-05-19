import axiosClient from "../axios/axiosClient";

const TRACKS_API_PREFIX = "/api/artist/track";
const ALBUMS_API_PREFIX = "/api/albums";

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
const TRACK_API_PREFIX = "/api/tracks";

export const getTrackDetailService = async (trackId) => {
  const response = await axiosClient.get(`${TRACK_API_PREFIX}/${trackId}`);
  const payload = response?.data?.data;

  return payload?.track || response?.data?.track || payload || null;
};
