import { routePaths } from "../routes/routePaths";

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

export const getRecommendationUserDisplayName = (user) => {
  const candidates = [
    user?.profile?.fullName,
    user?.fullName,
    user?.name,
    user?.email ? String(user.email).split("@")[0] : "",
  ];

  return candidates.map(normalizeText).find(Boolean) || "ban";
};

export const getRecommendationMixId = (mix) => mix?.id || mix?._id || "";

export const getRecommendationTrackImage = (track, fallbackImage = "") => {
  const coverImage = Array.isArray(track?.coverImage)
    ? track.coverImage[0]
    : track?.coverImage;

  return (
    coverImage ||
    track?.avatar ||
    track?.artist?.avatar ||
    fallbackImage ||
    ""
  );
};

export const getRecommendationMixCoverImage = (mix) => {
  const directCoverImage = Array.isArray(mix?.coverImage)
    ? mix.coverImage[0]
    : mix?.coverImage;

  if (directCoverImage) {
    return directCoverImage;
  }

  const firstTrack = Array.isArray(mix?.tracks) ? mix.tracks[0] : null;

  return getRecommendationTrackImage(firstTrack);
};

export const getRecommendationMixTasteTags = (mix) => {
  const artistNames = Array.isArray(mix?.basedOn?.artists)
    ? mix.basedOn.artists
        .map((artist) => normalizeText(artist?.name))
        .filter(Boolean)
    : [];
  const genreNames = Array.isArray(mix?.basedOn?.genres)
    ? mix.basedOn.genres
        .map((genre) => normalizeText(genre?.name))
        .filter(Boolean)
    : [];

  return [...artistNames, ...genreNames];
};

export const getRecommendationMixSubtitle = (mix) => {
  const description = normalizeText(mix?.description);

  if (description) {
    return description;
  }

  const tags = getRecommendationMixTasteTags(mix).slice(0, 3);

  if (tags.length > 0) {
    return `Dua tren ${tags.join(", ")}`;
  }

  return "Goi y danh rieng cho gu nghe nhac cua ban.";
};

export const getRecommendationMixTrackCount = (mix) =>
  Array.isArray(mix?.tracks) ? mix.tracks.length : 0;

export const formatRecommendationDateTime = (value) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const createRecommendationMixCollectionMeta = (
  mix,
  userDisplayName = ""
) => ({
  id: getRecommendationMixId(mix),
  type: "playlist",
  title: mix?.title || "Daily Mix",
  image: getRecommendationMixCoverImage(mix),
  artistName: userDisplayName ? `D\u00e0nh cho ${userDisplayName}` : "",
});

export const mapRecommendationMixesToContentCards = (
  mixes = [],
  userDisplayName = ""
) =>
  mixes.map((mix) => {
    const mixId = getRecommendationMixId(mix);

    return {
      id: mixId,
      type: "playlist",
      image: getRecommendationMixCoverImage(mix),
      title: mix?.title || "Daily Mix",
      subtitle: getRecommendationMixSubtitle(mix),
      href: mixId ? routePaths.recommendationMixDetail(mixId) : undefined,
      raw: {
        ...mix,
        _sectionOwnerName: userDisplayName,
      },
    };
  });
