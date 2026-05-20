import axiosClient from "../axios/axiosClient";

const LYRICS_API_PREFIX = "/api/artist/lyrics";

export const lyricsService = {
  addStaticLyrics: async (trackId, lyricsStatic) => {
    try {
      const response = await axiosClient.patch(
        `${LYRICS_API_PREFIX}/artist/me/${trackId}/lyrics-static`,
        { lyricsStatic }
      );

      const payload = response?.data?.data;
      return payload?.track || response?.data?.track || payload || null;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  updateSyncLyrics: async (trackId, file) => {
    try {
      const formData = new FormData();
      formData.append("lyricsSync", file);

      const response = await axiosClient.patch(
        `${LYRICS_API_PREFIX}/artist/me/${trackId}/lyrics-sync`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const payload = response?.data?.data;
      return payload?.track || response?.data?.track || payload || null;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default lyricsService;
