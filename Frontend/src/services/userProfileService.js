import axiosClient from "../axios/axiosClient";

const USER_API_PREFIX = "/api/users";

export const getCurrentUserProfile = async () => {
  const response = await axiosClient.get(`${USER_API_PREFIX}/me`);
  return response?.data?.data?.user ?? null;
};
