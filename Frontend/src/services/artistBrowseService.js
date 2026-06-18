import axiosClient from "../axios/axiosClient";
import { getFollowedArtists } from "./libaryService";
import {
  formatCompactNumber,
  formatDuration,
  getMetricValue,
} from "../utils/artistProfile";

const resolveArtistName = (profile) =>
  profile?.stageName ||
  profile?.artistName ||
  profile?.displayName ||
  profile?.fullName ||
  profile?.name ||
  "";

const resolveArtistImage = (profile, fieldNames = []) =>
  fieldNames.map((field) => profile?.[field]).find(Boolean) || "";

const resolveProfileSource = (payload) =>
  payload?.artist || payload?.profile || payload?.user || payload || null;

const normalizeBooleanLikeValue = (candidate) => {
  if (typeof candidate === "boolean") {
    return candidate;
  }

  if (typeof candidate === "number") {
    if (candidate === 1) {
      return true;
    }

    if (candidate === 0) {
      return false;
    }
  }

  if (typeof candidate === "string") {
    const normalizedCandidate = candidate.trim().toLowerCase();

    if (
      [
        "true",
        "1",
        "followed",
        "following",
        "active",
        "enabled",
      ].includes(normalizedCandidate)
    ) {
      return true;
    }

    if (
      [
        "false",
        "0",
        "unfollowed",
        "not_following",
        "not-following",
        "inactive",
        "disabled",
        "none",
      ].includes(normalizedCandidate)
    ) {
      return false;
    }
  }

  return undefined;
};

const resolveIsFollowingValue = (...candidates) => {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeBooleanLikeValue(candidate);

    if (typeof normalizedCandidate === "boolean") {
      return normalizedCandidate;
    }
  }

  return undefined;
};

const extractFollowPayload = (response) =>
  response?.data?.data?.follow ||
  response?.data?.data?.status ||
  response?.data?.data ||
  response?.data?.follow ||
  response?.data ||
  null;

const getArtistIdentityCandidates = (artist) =>
  [
    artist?.artistId,
    artist?.id,
    artist?._id,
    artist?.slug,
    artist?.artistSlug,
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .map((value) => String(value).trim().toLowerCase());

const isSameArtist = (artist, artistId) => {
  if (!artistId) {
    return false;
  }

  const normalizedArtistId = String(artistId).trim().toLowerCase();
  return getArtistIdentityCandidates(artist).includes(normalizedArtistId);
};

const normalizeReleaseType = (item) =>
  item?.type || item?.releaseType || item?.category || item?.format || "Release";

const normalizeReleaseYear = (item) => {
  if (item?.releaseYear || item?.year) {
    return String(item.releaseYear || item.year);
  }

  if (!item?.releaseDate) {
    return "";
  }

  const releaseDate = new Date(item.releaseDate);
  return Number.isNaN(releaseDate.getTime()) ? "" : String(releaseDate.getFullYear());
};

const resolveComingReleaseImage = (releaseItem) => {
  const coverImage = releaseItem?.coverImage;

  if (typeof coverImage === "string") {
    return coverImage;
  }

  if (Array.isArray(coverImage)) {
    return coverImage.find(Boolean) || "";
  }

  return releaseItem?.avatar || "";
};

const normalizeProfile = (payload) => {
  const profile = resolveProfileSource(payload);

  if (!profile) {
    return null;
  }

  const artistName = resolveArtistName(profile);

  if (!artistName) {
    return null;
  }

  return {
    id: profile?.id || profile?.artistId || profile?._id || profile?.slug || "",
    slug: profile?.slug || profile?.artistSlug || "",
    name: artistName,
    verified:
      Boolean(profile?.verified) ||
      Boolean(profile?.isVerified) ||
      profile?.role === "artist",
    monthlyListeners: getMetricValue(
      profile?.monthlyListeners ||
        profile?.metrics?.monthlyListeners ||
        profile?.stats?.monthlyListeners,
      0
    ),
    followers: getMetricValue(
      profile?.followers ||
        profile?.followersCount ||
        profile?.metrics?.followers ||
        profile?.stats?.followers ||
        profile?.stats?.totalFollowers,
      0
    ),
    avatar: resolveArtistImage(profile, [
      "avatar",
      "avatarUrl",
      "image",
      "imageUrl",
      "profileImage",
    ]),
    banner: resolveArtistImage(profile, [
      "banner",
      "bannerImage",
      "coverImage",
      "heroImage",
      "backdropImage",
    ]),
    aboutImage: resolveArtistImage(profile, [
      "aboutImage",
      "photo",
      "portraitImage",
      "coverImage",
      "bannerImage",
    ]),
    bio: profile?.bio || profile?.about || profile?.description || "",
    role: profile?.role || "artist",
    location: profile?.location || profile?.country || profile?.city || "",
    isFollowing:
      resolveIsFollowingValue(
        payload?.isFollowing,
        payload?.following,
        payload?.followed,
        payload?.isFollowed,
        payload?.hasFollowed,
        payload?.followStatus,
        payload?.follow?.isFollowing,
        payload?.follow?.following,
        payload?.follow?.followed,
        payload?.follow?.isFollowed,
        payload?.follow?.hasFollowed,
        payload?.follow?.followStatus,
        profile?.isFollowing,
        profile?.following,
        profile?.followed,
        profile?.isFollowed,
        profile?.hasFollowed,
        profile?.followStatus,
        profile?.follow?.isFollowing,
        profile?.follow?.following,
        profile?.follow?.followed,
        profile?.follow?.isFollowed,
        profile?.follow?.hasFollowed,
        profile?.follow?.followStatus
      ),
  };
};

const normalizeFollowState = (payload, fallback = {}) => ({
  artistId:
    payload?.artistId || payload?.id || payload?._id || fallback.artistId || "",
  isFollowing:
    resolveIsFollowingValue(
      payload?.isFollowing,
      payload?.following,
      payload?.followed,
      payload?.isFollowed,
      payload?.hasFollowed,
      payload?.followStatus,
      payload?.follow?.isFollowing,
      payload?.follow?.following,
      payload?.follow?.followed,
      payload?.follow?.isFollowed,
      payload?.follow?.hasFollowed,
      payload?.follow?.followStatus,
      fallback.isFollowing
    ),
  followers: getMetricValue(
    payload?.followers ??
      payload?.followersCount ??
      payload?.stats?.followers ??
      fallback.followers,
    fallback.followers ?? 0
  ),
});

const buildDiscography = (albums = []) =>
  albums
    .slice(0, 10)
    .map((album, index) => ({
      id: album?.id || `release-${index}`,
      image: album?.coverImage || album?.image || "",
      title: album?.title || "Untitled release",
      subtitle: [normalizeReleaseYear(album), normalizeReleaseType(album)]
        .filter(Boolean)
        .join(" - "),
      year: normalizeReleaseYear(album),
      type: normalizeReleaseType(album),
      href: album?.id ? `/albums/${album.id}` : undefined,
    }));

const buildPopularTracksFromApi = (tracks = []) =>
  tracks
    .map((track, index) => {
      const totalPlays =
        track?.stats?.totalPlay ||
        track?.playCount ||
        track?.plays ||
        track?.streamCount ||
        0;

      return {
        id: track?.id || `track-${index}`,
        title: track?.title || "Untitled track",
        image: track?.coverImage || track?.album?.coverImage || track?.avatar || "",
        plays: formatCompactNumber(totalPlays),
        duration: formatDuration(track?.duration),
        totalPlays,
      };
    })
    .sort((trackA, trackB) => trackB.totalPlays - trackA.totalPlays)
    .slice(0, 5)
    .map((track) => ({
      id: track.id,
      title: track.title,
      image: track.image,
      plays: track.plays,
      duration: track.duration,
    }));

const buildComingReleasesFromApi = (comingReleases = []) =>
  comingReleases
    .map((release, index) => ({
      id: release?.id || `coming-release-${index}`,
      trackId:
        release?.trackId ||
        release?.item?.trackId ||
        release?.item?.id ||
        "",
      type: release?.type === "single" ? "Single" : "Album",
      sourceType: release?.sourceType || release?.type || "release",
      scheduledAt: release?.scheduledAt || null,
      status: release?.status || "scheduled",
      title: release?.item?.title || "Untitled release",
      image: resolveComingReleaseImage(release?.item),
      trackCount: release?.item?.trackCount || 0,
      duration: release?.item?.duration || 0,
    }))
    .filter((release) => release.scheduledAt)
    .sort(
      (releaseA, releaseB) =>
        new Date(releaseA.scheduledAt).getTime() - new Date(releaseB.scheduledAt).getTime()
    );

const normalizeDailyTopArtistItem = (item) => ({
  artist: {
    id: item.artist.id,
    name: item.artist.name,
    avatar: item.artist.avatar,
  },
  rank: item.rank,
  date: item.date,
  score: item.score,
  uniqueListeners: item.uniqueListeners,
  playCount: item.playCount,
  completedPlayCount: item.completedPlayCount,
});

const normalizeMonthlyTopArtistItem = (item) => ({
  artist: {
    id: item?.artist?.id || item?.artist?._id || "",
    name: item?.artist?.name || "Unknown artist",
    avatar: item?.artist?.avatar || "",
  },
  rank: Number(item?.rank) || 0,
  month: item?.month || "",
  score: Number(item?.score) || 0,
  uniqueListeners: Number(item?.uniqueListeners) || 0,
  playCount: Number(item?.playCount) || 0,
  completedPlayCount: Number(item?.completedPlayCount) || 0,
});

const getPublicArtistProfileService = async (artistId) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const endpoints = [`/api/browse/artists/${encodedArtistId}/profile`];

  for (const endpoint of endpoints) {
    try {
      const response = await axiosClient.get(endpoint);
      const payload = response?.data?.data ?? response?.data ?? null;

      if (payload) {
        return payload;
      }
    } catch {
      // Allow the profile section to be empty without affecting other sections.
    }
  }

  return null;
};

const getArtistFollowStateFromLibraryService = async ({ artistId } = {}) => {
  if (!artistId) {
    return null;
  }

  const limit = 100;
  const maxPages = 20;
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    const response = await getFollowedArtists({ page, limit });
    const artists = Array.isArray(response?.artists) ? response.artists : [];

    if (artists.some((artist) => isSameArtist(artist, artistId))) {
      return {
        artistId,
        isFollowing: true,
      };
    }

    const pagination = response?.pagination ?? {};
    const resolvedTotalPages = Number(
      pagination.totalPages ?? pagination.pages ?? pagination.totalPage ?? totalPages
    );
    const nextTotalPages = Number.isFinite(resolvedTotalPages)
      ? resolvedTotalPages
      : artists.length === limit
        ? page + 1
        : page;

    if (!artists.length || !Number.isFinite(nextTotalPages) || nextTotalPages <= page) {
      break;
    }

    totalPages = nextTotalPages;
    page += 1;
  }

  return {
    artistId,
    isFollowing: false,
  };
};

export const getArtistFollowStatusService = async ({ artistId } = {}) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const endpoints = [
    `/api/browse/artists/${encodedArtistId}/follow`,
    `/api/browse/artists/${encodedArtistId}/follow/status`,
    `/api/browse/artists/${encodedArtistId}/follow-state`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axiosClient.get(endpoint);
      const followState = normalizeFollowState(extractFollowPayload(response), {
        artistId,
      });

      if (typeof followState.isFollowing === "boolean") {
        return followState;
      }
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401) {
        throw error;
      }

      if (status !== 404 && status !== 405) {
        throw error;
      }
    }
  }

  return getArtistFollowStateFromLibraryService({ artistId });
};

export const followArtistService = async ({ artistId } = {}) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const response = await axiosClient.post(`/api/browse/artists/${encodedArtistId}/follow`);

  return normalizeFollowState(extractFollowPayload(response), {
    artistId,
    isFollowing: true,
  });
};

export const unfollowArtistService = async ({ artistId } = {}) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const response = await axiosClient.delete(`/api/browse/artists/${encodedArtistId}/follow`);

  return normalizeFollowState(extractFollowPayload(response), {
    artistId,
    isFollowing: false,
  });
};

const getArtistAlbumsService = async (artistId, params = {}) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const response = await axiosClient.get(`/api/browse/artists/${encodedArtistId}/albums`, {
    params,
  });

  return {
    albums: response?.data?.data?.albums ?? response?.data?.albums ?? [],
    pagination: response?.data?.pagination ?? null,
  };
};

const getArtistTracksService = async (artistId, params = {}) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const response = await axiosClient.get(`/api/browse/artists/${encodedArtistId}/tracks`, {
    params,
  });

  return {
    tracks: response?.data?.data?.tracks ?? response?.data?.tracks ?? [],
    pagination: response?.data?.pagination ?? null,
  };
};

const getArtistComingReleasesService = async (artistId, params = {}) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const response = await axiosClient.get(
    `/api/browse/artists/${encodedArtistId}/coming-releases`,
    {
      params,
    }
  );

  return {
    comingReleases:
      response?.data?.data?.comingReleases ?? response?.data?.comingReleases ?? [],
    pagination: response?.data?.pagination ?? null,
  };
};

export const getArtistExperienceService = async ({ artistId } = {}) => {
  const normalizedArtistId = artistId || "featured";
  const [profileResult, albumsResult, tracksResult, comingReleasesResult] =
    await Promise.allSettled([
      getPublicArtistProfileService(normalizedArtistId),
      getArtistAlbumsService(normalizedArtistId, { limit: 24 }),
      getArtistTracksService(normalizedArtistId, { limit: 50 }),
      getArtistComingReleasesService(normalizedArtistId, { limit: 12 }),
    ]);

  const profilePayload =
    profileResult.status === "fulfilled" ? profileResult.value : null;
  const albumsPayload =
    albumsResult.status === "fulfilled" ? albumsResult.value?.albums ?? [] : [];
  const artistTracksPayload =
    tracksResult.status === "fulfilled" ? tracksResult.value?.tracks ?? [] : [];
  const comingReleasesPayload =
    comingReleasesResult.status === "fulfilled"
      ? comingReleasesResult.value?.comingReleases ?? []
      : [];

  return {
    profile: normalizeProfile(profilePayload),
    popularTracks: buildPopularTracksFromApi(artistTracksPayload),
    discography: buildDiscography(albumsPayload),
    comingReleases: buildComingReleasesFromApi(comingReleasesPayload),
  };
};

export const getDailyTopArtistsService = async ({ date, limit = 9 }) => {
  const response = await axiosClient.get("/api/browse/artists/top/daily", {
    params: {
      date,
      limit,
    },
  });

  return {
    topArtists: response.data.data.topArtists.map(normalizeDailyTopArtistItem),
    meta: response.data.meta,
  };
};

export const getMonthlyTopArtistsService = async ({ month, limit = 9 }) => {
  const response = await axiosClient.get("/api/browse/artists/top/monthly", {
    params: {
      month,
      limit,
    },
  });

  return {
    topArtists: response.data.data.topArtists.map(normalizeMonthlyTopArtistItem),
    meta: response.data.meta,
  };
};
