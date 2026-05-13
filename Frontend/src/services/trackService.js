import axiosClient from "../axios/axiosClient";

const TRACKS_API_PREFIX = "/api/tracks";
const ALBUMS_API_PREFIX = "/api/albums";

export const trackService = {
  uploadFiles: async (audioFiles, avatar, coverImages) => {
    try {
      const formData = new FormData();

      // Append audio files
      if (audioFiles && audioFiles.length > 0) {
        audioFiles.forEach((file) => {
          formData.append("audioFiles", file);
        });
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
