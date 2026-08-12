import axiosClient from "../axios/axiosClient";

const unwrap = (response, key) => response?.data?.data?.[key] ?? response?.data?.[key] ?? null;
const unwrapError = (error) => error?.response?.data || error;

const podcastService = {
  async uploadFiles({ audio, coverImage } = {}) {
    const formData = new FormData();
    if (audio) formData.append("audio", audio);
    if (coverImage) formData.append("coverImage", coverImage);
    try {
      const response = await axiosClient.post("/api/artist/podcasts/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data?.data ?? {};
    } catch (error) { throw unwrapError(error); }
  },
  async create(payload) {
    try { return unwrap(await axiosClient.post("/api/artist/podcasts", payload), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async listArtist(params = {}) {
    try {
      const response = await axiosClient.get("/api/artist/podcasts", { params });
      return { podcasts: unwrap(response, "podcasts") || [], pagination: response.data?.meta || null };
    } catch (error) { throw unwrapError(error); }
  },
  async getArtist(id) {
    try { return unwrap(await axiosClient.get(`/api/artist/podcasts/${id}`), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async update(id, payload) {
    try { return unwrap(await axiosClient.patch(`/api/artist/podcasts/${id}`, payload), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async submit(id) {
    try { return unwrap(await axiosClient.post(`/api/artist/podcasts/${id}/submit`), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async remove(id) {
    try { return unwrap(await axiosClient.delete(`/api/artist/podcasts/${id}`), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async setVisibility(id, visibility) {
    try { return unwrap(await axiosClient.patch(`/api/artist/podcasts/${id}/visibility`, { visibility }), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async listPublic(params = {}) {
    try {
      const response = await axiosClient.get("/api/podcasts", { params });
      return { podcasts: unwrap(response, "podcasts") || [], pagination: response.data?.meta || null };
    } catch (error) { throw unwrapError(error); }
  },
  async getPublic(id) {
    try { return unwrap(await axiosClient.get(`/api/podcasts/${id}`), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async listen(id, listenedDuration, sessionId) {
    try {
      const response = await axiosClient.post(`/api/podcasts/${id}/listen`, { listenedDuration, sessionId });
      return response.data?.data ?? {};
    } catch (error) { throw unwrapError(error); }
  },
};

export default podcastService;
