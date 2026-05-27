import axiosClient from "../../axios/axiosClient";

const ARTIST_TRACK_API_PREFIX = "/api/artist/track/artist/me";

export const getArtistTracksService = async (params = {}) => {
  const response = await axiosClient.get(ARTIST_TRACK_API_PREFIX, { params });
  const payload = response?.data?.data;

  return {
    tracks: payload?.tracks ?? [],
    pagination: response?.data?.pagination ?? null,
  };
};

export const getArtistTrackDetailService = async (trackId) => {
  const response = await axiosClient.get(`${ARTIST_TRACK_API_PREFIX}/${trackId}`);
  return response?.data?.data?.track ?? null;
};
