import axiosClient from "../axios/axiosClient";

const USER_API_PREFIX = "/api/users";

export const getUsersService = async (params) => {
  const filteredParams = Object.fromEntries(
    Object.entries(params || {}).filter(
      ([, value]) => value !== null && value !== undefined && value !== ""
    )
  );

  const config = {};
  if (Object.keys(filteredParams).length > 0) {
    config.params = filteredParams;
  }

  const response = await axiosClient.get(USER_API_PREFIX, config);
  return response?.data?.data ?? [];
};

export const getUserService = async (id) => {
  const response = await axiosClient.get(`${USER_API_PREFIX}/${id}`);
  return response?.data?.data ?? null;
};

export const updateUserService = async (id, payload) => {
  const response = await axiosClient.patch(`${USER_API_PREFIX}/${id}`, payload);
  return response?.data?.data ?? null;
};

export const getUserTransactionsService = async (id) => {
  const response = await axiosClient.get(`${USER_API_PREFIX}/${id}/transactions`);
  return response?.data?.data ?? [];
};
