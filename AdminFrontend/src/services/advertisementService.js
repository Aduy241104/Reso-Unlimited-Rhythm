import axiosClient from "../axios/axiosClient";

const unwrap = (response, key) => response?.data?.data?.[key] ?? null;

const advertisementService = {
  async list(params = {}) {
    const response = await axiosClient.get("/api/admin/advertisements", { params });
    return { advertisements: unwrap(response, "advertisements") || [], pagination: response?.data?.meta || null };
  },
  async get(id) { return unwrap(await axiosClient.get(`/api/admin/advertisements/${id}`), "advertisement"); },
  async create(payload) { return unwrap(await axiosClient.post("/api/admin/advertisements", payload), "advertisement"); },
  async update(id, payload) { return unwrap(await axiosClient.patch(`/api/admin/advertisements/${id}`, payload), "advertisement"); },
  async archive(id) { return unwrap(await axiosClient.delete(`/api/admin/advertisements/${id}`), "advertisement"); },
  async upload(file, type) {
    const form = new FormData();
    form.append("media", file);
    form.append("type", type);
    return unwrap(await axiosClient.post("/api/admin/advertisements/upload", form), "media");
  },
};

export default advertisementService;
