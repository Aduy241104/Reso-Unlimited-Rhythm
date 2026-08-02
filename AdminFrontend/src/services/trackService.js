import axiosClient from "../axios/axiosClient";

const ADMIN_TRACK_API_PREFIX = "/api/admin/tracks";

export const searchAdminTracksService = async (params = {}) => {
  const response = await axiosClient.get(`${ADMIN_TRACK_API_PREFIX}`, {
    params,
  });

  return {
    tracks: response?.data?.data?.tracks ?? [],
    pagination: response?.data?.meta ?? null,
  };
};

export const getAdminArtistTracksService = async ({
  artistId,
  artistName,
} = {}) => {
  const normalizedArtistId = String(artistId || "");
  const normalizedArtistName = artistName?.trim();

  if (!normalizedArtistId || !normalizedArtistName) {
    return [];
  }

  const limit = 50;
  const firstPage = await searchAdminTracksService({
    q: normalizedArtistName,
    page: 1,
    limit,
  });
  const totalPages = firstPage.pagination?.totalPages ?? 1;

  const remainingPages =
    totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            searchAdminTracksService({
              q: normalizedArtistName,
              page: index + 2,
              limit,
            })
          )
        )
      : [];

  return [firstPage, ...remainingPages]
    .flatMap((result) => result.tracks ?? [])
    .filter(
      (track) => String(track.artist?.id || track.artist?._id || "") === normalizedArtistId
    );
};

export const updateAdminTrackApprovalStatusService = async (
  trackId,
  payload = {}
) => {
  const response = await axiosClient.patch(
    `${ADMIN_TRACK_API_PREFIX}/${trackId}/approval`,
    payload
  );

  return response?.data?.data?.track ?? null;
};

export const getAdminTrackDetailService = async (trackId) => {
  const response = await axiosClient.get(`${ADMIN_TRACK_API_PREFIX}/${trackId}`);
  return response?.data?.data?.track ?? null;
};

export const updateAdminTrackVisibilityService = async (
  trackId,
  payload = {}
) => {
  const response = await axiosClient.patch(
    `${ADMIN_TRACK_API_PREFIX}/${trackId}/visibility`,
    payload
  );

  return response?.data?.data?.track ?? null;
};
