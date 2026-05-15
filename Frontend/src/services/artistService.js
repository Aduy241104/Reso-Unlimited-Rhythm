import axiosClient from "../axios/axiosClient";
import { getAlbumDetailService, getAlbumsService } from "./albumService";
import {
  createPlaceholderImage,
  createProfileFallbacks,
  defaultArtistMetrics,
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
  "Unknown Artist";

const resolveArtistImage = (profile, fieldNames = []) =>
  fieldNames.map((field) => profile?.[field]).find(Boolean) || "";

const normalizeReleaseType = (item) =>
  item?.type || item?.releaseType || item?.category || item?.format || "Release";

const normalizeProfile = (profile) => {
  const artistName = resolveArtistName(profile);
  const fallbacks = createProfileFallbacks(artistName);

  return {
    id: profile?.id || profile?.artistId || profile?.slug || "artist-featured",
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
      defaultArtistMetrics.monthlyListeners
    ),
    followers: getMetricValue(
      profile?.followers ||
        profile?.followersCount ||
        profile?.metrics?.followers ||
        profile?.stats?.followers,
      defaultArtistMetrics.followers
    ),
    avatar:
      resolveArtistImage(profile, [
        "avatar",
        "avatarUrl",
        "image",
        "imageUrl",
        "profileImage",
      ]) || fallbacks.avatar,
    banner:
      resolveArtistImage(profile, [
        "banner",
        "bannerImage",
        "coverImage",
        "heroImage",
        "backdropImage",
      ]) || fallbacks.banner,
    aboutImage:
      resolveArtistImage(profile, [
        "aboutImage",
        "photo",
        "portraitImage",
        "coverImage",
        "bannerImage",
      ]) || fallbacks.aboutImage,
    bio:
      profile?.bio ||
      profile?.about ||
      profile?.description ||
      "A meticulously built artist world with late-night textures, wide-screen melodies, and a premium sonic identity shaped for modern listeners.",
    role: profile?.role || "artist",
    location:
      profile?.location || profile?.country || profile?.city || "Global release",
  };
};

const matchesArtistIdentifier = (candidate, artistId) => {
  const normalizedTarget = String(artistId || "").trim().toLowerCase();

  if (!normalizedTarget || normalizedTarget === "featured") {
    return true;
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

const isMatchingArtistAlbum = (album, artistProfile) => {
  if (!album || !artistProfile) {
    return false;
  }

  return matchesArtistIdentifier(
    {
      ...album?.artist,
      artistId: album?.artistId,
      artistName: album?.artist?.name || album?.artistName,
    },
    artistProfile.id || artistProfile.slug || artistProfile.name
  );
};

const buildDiscography = (albums, artistProfile) => {
  const matchedAlbums = albums.filter((album) => isMatchingArtistAlbum(album, artistProfile));
  const sourceAlbums = matchedAlbums.length > 0 ? matchedAlbums : albums;

  return sourceAlbums.slice(0, 10).map((album, index) => ({
    id: album?.id || `release-${index}`,
    image:
      album?.coverImage ||
      album?.image ||
      createPlaceholderImage(album?.title || "Release", "#2f2f2f", "#0f0f0f"),
    title: album?.title || "Untitled release",
    subtitle: `${album?.releaseYear || album?.year || "2026"} • ${normalizeReleaseType(album)}`,
    year: album?.releaseYear || album?.year || "2026",
    type: normalizeReleaseType(album),
    href: album?.id ? `/albums/${album.id}` : undefined,
    raw: album,
  }));
};

const buildPopularTracksFromApi = (tracks = [], artistProfile) =>
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
        image:
          track?.coverImage ||
          track?.album?.coverImage ||
          track?.avatar ||
          artistProfile.avatar,
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

const buildPopularTracks = (albumDetails, artistProfile) => {
  const tracks = albumDetails
    .flatMap((album) => album?.tracks ?? [])
    .map((trackItem, index) => {
      const track = trackItem?.track || trackItem;

      return {
        id: track?.id || `track-${index}`,
        title: track?.title || "Untitled track",
        image:
          track?.coverImage ||
          track?.thumbnail ||
          track?.artist?.avatar ||
          artistProfile.avatar,
        plays:
          track?.playCount ||
          track?.plays ||
          track?.streamCount ||
          Math.max(947000 - index * 74000, 185000),
        duration: formatDuration(track?.duration),
      };
    });

  return tracks.slice(0, 5);
};

const normalizeArtistCandidateFromAlbum = (album) => {
  if (!album) {
    return null;
  }

  const artist = album?.artist ?? {};

  if (!artist?.id && !artist?.name && !album?.artistId && !album?.artistName) {
    return null;
  }

  return {
    id: artist?.id || album?.artistId || "",
    slug: artist?.slug || album?.artistSlug || "",
    name: artist?.name || album?.artistName || "",
    artistName: artist?.name || album?.artistName || "",
    avatar: artist?.avatar || album?.artistAvatar || album?.coverImage || "",
    image: artist?.avatar || album?.artistAvatar || album?.coverImage || "",
    coverImage: album?.coverImage || "",
    bannerImage: album?.coverImage || "",
    aboutImage: album?.coverImage || "",
    verified: artist?.verified || false,
    role: "artist",
  };
};

const getPublicArtistProfileService = async (artistId) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const endpoints = [
    `/api/artists/${encodedArtistId}/profile`,
    `/api/artists/${encodedArtistId}`,
    `/api/artist/${encodedArtistId}`,
    `/api/artists/profile/${encodedArtistId}`,
    `/api/users/${encodedArtistId}`,
  ];

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
      // Try the next likely public artist endpoint.
    }
  }

  return null;
};

const getArtistTracksService = async (artistId, params = {}) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const response = await axiosClient.get(`/api/artists/${encodedArtistId}/tracks`, {
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

  const albumArtistMatch = albumsPayload.find((album) =>
    matchesArtistIdentifier(
      {
        ...album?.artist,
        artistId: album?.artistId,
        artistName: album?.artist?.name || album?.artistName,
      },
      normalizedArtistId
    )
  );

  const inferredArtistProfile =
    normalizeArtistCandidateFromAlbum(albumArtistMatch) ||
    normalizeArtistCandidateFromAlbum(albumsPayload[0]);

  const artistProfile = normalizeProfile(profilePayload || inferredArtistProfile || {});
  const discography = buildDiscography(albumsPayload, artistProfile);

  const detailRequests = discography
    .slice(0, 4)
    .filter((item) => item.raw?.id)
    .map((item) => getAlbumDetailService(item.raw.id));

  const detailResults = await Promise.allSettled(detailRequests);
  const popularTracks =
    artistTracksPayload.length > 0
      ? buildPopularTracksFromApi(artistTracksPayload, artistProfile)
      : buildPopularTracks(
          detailResults
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value),
          artistProfile
        );

  return {
    profile: artistProfile,
    popularTracks,
    discography,
  };
};
