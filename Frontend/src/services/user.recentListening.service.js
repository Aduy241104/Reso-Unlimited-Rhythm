import axiosClient from "../axios/axiosClient";

const USER_API_PREFIX = "/api/users";

export const getCurrentUserRecentListeningActivity = async () => {
  const response = await axiosClient.get(
    `${USER_API_PREFIX}/me/recent-listening-activity`
  );

  return response?.data?.data?.activity ?? null;
};

export default {
  getCurrentUserRecentListeningActivity,
};
