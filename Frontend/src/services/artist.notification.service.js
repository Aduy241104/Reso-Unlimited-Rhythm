import axiosClient from "../axios/axiosClient";

export const getMyArtistNotificationsService = async (params = {}) => {
  const response = await axiosClient.get("/api/artist/notifications", {
    params,
  });

  return {
    notifications: response?.data?.data?.notifications || [],
    meta: response?.data?.meta || {},
  };
};

export default {
  getMyArtistNotificationsService,
};
