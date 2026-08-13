import axiosClient from "../axios/axiosClient";

const unwrap = (response, key) => response?.data?.data?.[key] ?? response?.data?.[key] ?? null;
const unwrapError = (error) => error?.response?.data || error;

const podcastService = {
  async list(params = {}) {
    try {
      const response = await axiosClient.get("/api/admin/podcasts", { params });
      return { podcasts: unwrap(response, "podcasts") || [], pagination: response.data?.meta || null };
    } catch (error) { throw unwrapError(error); }
  },
  async get(id) {
    try { return unwrap(await axiosClient.get(`/api/admin/podcasts/${id}`), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async approve(id, payload = {}) {
    try { return unwrap(await axiosClient.post(`/api/admin/podcasts/${id}/approve`, payload), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async startReviewSession(id) {
    try { return unwrap(await axiosClient.post(`/api/admin/podcasts/${id}/review/session`), "review"); }
    catch (error) { throw unwrapError(error); }
  },
  async recordReviewEvent(id, payload = {}) {
    try { return unwrap(await axiosClient.post(`/api/admin/podcasts/${id}/review/events`, payload), "review"); }
    catch (error) { throw unwrapError(error); }
  },
  async reject(id, reason) {
    try { return unwrap(await axiosClient.post(`/api/admin/podcasts/${id}/reject`, { reason }), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async block(id, reason) {
    try { return unwrap(await axiosClient.post(`/api/admin/podcasts/${id}/block`, { reason }), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
  async unblock(id) {
    try { return unwrap(await axiosClient.post(`/api/admin/podcasts/${id}/unblock`), "podcast"); }
    catch (error) { throw unwrapError(error); }
  },
};

export default podcastService;
