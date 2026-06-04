import axiosClient from "../axios/axiosClient";

const normalizeListfollowAlbum = (album) => ({
  id: album?.id || album?._id || "",
  title: album?.title || "Untitled Album",
  coverImage: album?.coverImage || "",
  releaseDate: album?.releaseDate || null,
  totalDuration: Number(album?.totalDuration) || 0,
  trackCount: Number(album?.trackCount) || 0,
  artist: album?.artist || null,
  status: album?.status || "active",
  followedAt: album?.followedAt || null,
  isFollowing: Boolean(album?.isFollowing),
});

export const getUserListfollowAlbumsService = async ({ page = 1, limit = 12 } = {}) => {
  const response = await axiosClient.get("/api/users/list-followed-albums", {
    params: { page, limit },
  });

  const payload = response?.data?.data ?? {};
  const albums = Array.isArray(payload?.albums)
    ? payload.albums.map(normalizeListfollowAlbum)
    : [];
  const pagination = response?.data?.meta || payload?.meta || {};

  return {
    albums,
    pagination: {
      page: Number(pagination?.page) || page,
      limit: Number(pagination?.limit) || limit,
      total: Number(pagination?.total) || albums.length,
      totalPages: Number(pagination?.totalPages) || 0,
    },
  };
};

export const unfollowAlbumService = async ({ albumId } = {}) => {
  const encodedAlbumId = encodeURIComponent(albumId);
  await axiosClient.delete(`/api/users/list-followed-albums/${encodedAlbumId}/unfollow`);

  return {
    albumId,
    isFollowing: false,
  };
};
