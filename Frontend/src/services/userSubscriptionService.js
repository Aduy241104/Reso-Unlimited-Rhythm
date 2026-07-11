import axiosClient from "../axios/axiosClient";

const USER_SUBSCRIPTION_API_PREFIX = "/api/users/subscription";

export const getMySubscriptionStatus = async () => {
  const response = await axiosClient.get(
    `${USER_SUBSCRIPTION_API_PREFIX}/status`
  );

  return response?.data?.data ?? null;
};
