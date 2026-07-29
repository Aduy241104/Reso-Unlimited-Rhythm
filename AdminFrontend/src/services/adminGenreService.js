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

export const createAdminGenreService = async (payload) => {
  const res = await axiosClient.post("/api/admin/genres", payload);
  return res.data?.data?.genre ?? null;
};

export const getAdminGenreService = async (id) => {
  const res = await axiosClient.get(`/api/admin/genres/${id}`);
  return res.data?.data?.genre ?? null;
};

export const updateAdminGenreService = async (id, payload) => {
  const res = await axiosClient.patch(`/api/admin/genres/${id}`, payload);
  return res.data?.data?.genre ?? null;
};

export const uploadAdminGenreImageService = async (file) => {
  const formData = new FormData();
  formData.append("coverImage", file);

  const res = await axiosClient.post("/api/admin/genres/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data?.data?.url ?? null;
};
export const deleteAdminGenreService = async (id) => {
  const res = await axiosClient.delete(`/api/admin/genres/${id}`);
  // Trả về data giống format cấu trúc chung của bạn
  return res.data; 
};
export default { getAdminGenresService, createAdminGenreService, getAdminGenreService, updateAdminGenreService, uploadAdminGenreImageService, deleteAdminGenreService };
