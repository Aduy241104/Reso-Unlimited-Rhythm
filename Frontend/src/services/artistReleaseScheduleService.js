import axiosClient from "../axios/axiosClient";

export const getMyReleaseSchedulesService = async (params = {}) => {
  const response = await axiosClient.get("/api/artist/release-schedules", {
    params,
  });

  return {
    artist: response?.data?.data?.artist ?? null,
    releaseSchedules:
      response?.data?.data?.releaseSchedules ??
      response?.data?.releaseSchedules ??
      [],
    filters: response?.data?.data?.filters ?? null,
    pagination: response?.data?.pagination ?? null,
  };
};

export const createMyReleaseScheduleService = async (payload) => {
  const response = await axiosClient.post("/api/artist/release-schedules", payload);

  return {
    artist: response?.data?.data?.artist ?? null,
    releaseSchedule: response?.data?.data?.releaseSchedule ?? null,
    message: response?.data?.message ?? "",
  };
};

export const getMyReleaseScheduleDetailService = async (scheduleId) => {
  const response = await axiosClient.get(`/api/artist/release-schedules/${scheduleId}`);

  return {
    artist: response?.data?.data?.artist ?? null,
    releaseSchedule: response?.data?.data?.releaseSchedule ?? null,
    message: response?.data?.message ?? "",
  };
};

export const cancelMyReleaseScheduleService = async (scheduleId) => {
  const response = await axiosClient.patch(
    `/api/artist/release-schedules/${scheduleId}/cancel`
  );

  return {
    artist: response?.data?.data?.artist ?? null,
    releaseSchedule: response?.data?.data?.releaseSchedule ?? null,
    message: response?.data?.message ?? "",
  };
};

export default {
  cancelMyReleaseScheduleService,
  createMyReleaseScheduleService,
  getMyReleaseScheduleDetailService,
  getMyReleaseSchedulesService,
};
