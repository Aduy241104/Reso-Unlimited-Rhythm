import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { tokenStorage } from '../storage/tokenStorage';
import { getOrCreateGuestId } from '../storage/guestStorage';
import { resolveImageUri } from '../utils/media';

const getPayload = (response) => response?.data || response || {};
const asArray = (value) => (Array.isArray(value) ? value : []);
const pickFirstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const normalizePodcast = (podcast = {}, index = 0) => {
  const creator = podcast?.creator || podcast?.artist || {};
  const id = pickFirstDefined(podcast.id, podcast._id, `podcast-${index}`);

  return {
    ...podcast,
    id,
    entityId: id,
    entityType: 'podcast',
    contentType: 'podcast',
    type: 'podcast',
    title: pickFirstDefined(podcast.title, 'Podcast chưa đặt tên'),
    artistName: pickFirstDefined(creator.name, podcast.artistName, 'Nghệ sĩ'),
    image: resolveImageUri(podcast.coverImageUrl || podcast.coverImage || creator.avatar),
    audioUrl: pickFirstDefined(podcast.audioUrl, podcast.streamUrl, ''),
    duration: Number(podcast.duration) || 0,
    listenSource: 'podcast_detail',
    raw: podcast,
  };
};

const podcastService = {
  async listPublic(params = {}) {
    const response = await axiosClient.get(API_ENDPOINTS.PODCASTS.LIST, { params });
    const payload = getPayload(response);
    const data = payload?.data || payload;
    const podcasts = asArray(data?.podcasts || data?.items || payload?.podcasts);

    return {
      podcasts: podcasts.map(normalizePodcast),
      pagination: payload?.meta || data?.pagination || null,
    };
  },

  async getPublic(id) {
    const response = await axiosClient.get(`${API_ENDPOINTS.PODCASTS.DETAIL}/${id}`);
    const payload = getPayload(response);
    const data = payload?.data || payload;
    const podcast = data?.podcast || payload?.podcast || data;

    return normalizePodcast(podcast);
  },

  async stream(id, listenedDuration, source = 'podcast_detail') {
    const payload = {
      listenedDuration: Math.max(Number(listenedDuration) || 0, 0),
      source,
    };
    const accessToken = await tokenStorage.getAccessToken().catch(() => null);

    if (!accessToken) {
      payload.guestId = await getOrCreateGuestId();
    }

    const response = await axiosClient.post(
      `${API_ENDPOINTS.PODCASTS.STREAM}/${id}/stream`,
      payload
    );

    return response?.data || response || null;
  },
};

export default podcastService;
