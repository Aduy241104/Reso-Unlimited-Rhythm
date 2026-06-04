import axiosClient from "../axios/axiosClient";

const normalizeListfollowArtist = (artist) => ({
  id: artist?.id || artist?._id || "",
  name: artist?.name || "Unknown artist",
  avatar: artist?.avatar || "",
  coverImage: artist?.coverImage || "",
  bio: artist?.bio || "",
  followers: Number(artist?.followers) || 0,
  verificationStatus: artist?.verificationStatus || "pending",
  followedAt: artist?.followedAt || null,
  isFollowing: Boolean(artist?.isFollowing),
});

export const getUserListfollowArtistsService = async ({ page = 1, limit = 12 } = {}) => {
  const response = await axiosClient.get("/api/users/list-followed-artists", {
    params: { page, limit },
  });

  const payload = response?.data?.data ?? {};
  const artists = Array.isArray(payload?.artists)
    ? payload.artists.map(normalizeListfollowArtist)
    : [];
  const pagination = response?.data?.meta || payload?.meta || {};

  return {
    artists,
    pagination: {
      page: Number(pagination?.page) || page,
      limit: Number(pagination?.limit) || limit,
      total: Number(pagination?.total) || artists.length,
      totalPages: Number(pagination?.totalPages) || 0,
    },
  };
};
