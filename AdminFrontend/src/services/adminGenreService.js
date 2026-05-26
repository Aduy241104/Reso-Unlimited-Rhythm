import axiosClient from "../axios/axiosClient";

export const getAdminGenresService = async (filters = {}) => {
  const params = {};
  if (filters.search) params.q = filters.search;
 if (typeof filters.isActive !== "undefined") params.isActive = filters.isActive;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;

  const res = await axiosClient.get("/api/admin/genres", { params });
  const data = res.data?.data ?? {};
  return { genres: data.genres ?? [], meta: res.data?.meta ?? null };
};

export default { getAdminGenresService };
