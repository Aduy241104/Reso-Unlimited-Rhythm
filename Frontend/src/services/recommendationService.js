import axiosClient from "../axios/axiosClient";

const RECOMMENDATION_API_PREFIX = "/api/recommendations";

export const getDailyMixesService = async () => {
  const response = await axiosClient.get(
    `${RECOMMENDATION_API_PREFIX}/daily-mixes`
  );

  return {
    source: response?.data?.data?.source || "",
    dateKey: response?.data?.data?.dateKey || "",
    mixes: Array.isArray(response?.data?.data?.mixes)
      ? response.data.data.mixes
      : [],
  };
};

export const rebuildDailyMixesService = async () => {
  const response = await axiosClient.post(
    `${RECOMMENDATION_API_PREFIX}/daily-mixes/rebuild`
  );

  return {
    source: response?.data?.data?.source || "",
    dateKey: response?.data?.data?.dateKey || "",
    mixes: Array.isArray(response?.data?.data?.mixes)
      ? response.data.data.mixes
      : [],
  };
};
