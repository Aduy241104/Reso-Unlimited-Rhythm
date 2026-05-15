import axiosClient from "../axios/axiosClient";
import { getAlbumsService } from "./albumService";
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

const normalizeProfile = (profile) => {
  if (!profile) {
    return null;
  }

  const artistName = resolveArtistName(profile);

  if (!artistName) {
    return null;
  }

  return {
    id: profile?.id || profile?.artistId || profile?.slug || "",
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
        profile?.stats?.followers,
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
  };
};

const matchesArtistIdentifier = (candidate, artistId) => {
  const normalizedTarget = String(artistId || "").trim().toLowerCase();

  if (!normalizedTarget) {
    return false;
  }

  const candidateValues = [
    candidate?.id,
    candidate?.artistId,
    candidate?.slug,
    candidate?.artistSlug,
    candidate?.stageName,
    candidate?.artistName,
    candidate?.displayName,
    candidate?.fullName,
    candidate?.name,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  return candidateValues.includes(normalizedTarget);
};

const buildDiscography = (albums = [], artistId) =>
  albums
    .filter((album) =>
      matchesArtistIdentifier(
        {
          ...album?.artist,
          artistId: album?.artistId,
          artistName: album?.artist?.name || album?.artistName,
        },
        artistId
      )
    )
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

const getPublicArtistProfileService = async (artistId) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const endpoints = [`/api/browse/artists/${encodedArtistId}/profile`];

  for (const endpoint of endpoints) {
    try {
      const response = await axiosClient.get(endpoint);
      const payload =
        response?.data?.data?.artist ||
        response?.data?.data?.user ||
        response?.data?.data ||
        response?.data?.artist ||
        response?.data ||
        null;

      if (payload) {
        return payload;
      }
    } catch {
      // Allow the profile section to be empty without affecting other sections.
    }
  }

  return null;
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

export const getArtistExperienceService = async ({ artistId } = {}) => {
  const normalizedArtistId = artistId || "featured";
  const [profileResult, albumsResult, tracksResult] = await Promise.allSettled([
    getPublicArtistProfileService(normalizedArtistId),
    getAlbumsService({ limit: 24 }),
    getArtistTracksService(normalizedArtistId, { limit: 50 }),
  ]);

  const profilePayload =
    profileResult.status === "fulfilled" ? profileResult.value : null;
  const albumsPayload =
    albumsResult.status === "fulfilled" ? albumsResult.value?.albums ?? [] : [];
  const artistTracksPayload =
    tracksResult.status === "fulfilled" ? tracksResult.value?.tracks ?? [] : [];

  return {
    profile: normalizeProfile(profilePayload),
    popularTracks: buildPopularTracksFromApi(artistTracksPayload),
    discography: buildDiscography(albumsPayload, normalizedArtistId),
  };
};
