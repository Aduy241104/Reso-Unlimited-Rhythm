import { routePaths } from "../routes/routePaths";
import { createPlaceholderImage } from "./albumDetail";

export const MONTHLY_TOP_TRACK_LIMIT = 30;

const MONTHLY_TOP_TRACK_PLACEHOLDER_IMAGE = createPlaceholderImage(
  "Top 30",
  "#0ea5e9",
  "#082f49"
);

export const getCurrentMonthValue = () => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

export const formatMonthlyTopTracksDate = (monthValue) => {
  if (!monthValue) {
    return "Unknown month";
  }

  const resolvedMonthValue = (() => {
    if (typeof monthValue !== "string") {
      return monthValue;
    }

    if (/^\d{4}-\d{2}$/.test(monthValue)) {
      return `${monthValue}-01`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(monthValue)) {
      return monthValue;
    }

    return monthValue;
  })();
  const date = new Date(`${resolvedMonthValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return monthValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
};

export const getMonthlyTopTracksHeroImage = (topTracks = []) => {
  const topTrack = topTracks[0]?.track;

  return (
    topTrack?.coverImage ||
    topTrack?.avatar ||
    topTrack?.artist?.avatar ||
    MONTHLY_TOP_TRACK_PLACEHOLDER_IMAGE
  );
};

export const createMonthlyTopTracksCollectionMeta = ({
  month = getCurrentMonthValue(),
  image = MONTHLY_TOP_TRACK_PLACEHOLDER_IMAGE,
} = {}) => ({
  id: `monthly-top-${month}`,
  type: "monthly-top",
  title: `Monthly Top Tracks - ${formatMonthlyTopTracksDate(month)}`,
  image,
  artistName: "Reso Music",
});

export const mapMonthlyTopTracksToContentCards = ({
  topTracks = [],
  meta = {},
  month = getCurrentMonthValue(),
  limit = MONTHLY_TOP_TRACK_LIMIT,
} = {}) => {
  const resolvedMonth = meta?.date || month;
  const image = getMonthlyTopTracksHeroImage(topTracks);

  return [
    {
      id: `monthly-top-${resolvedMonth}`,
      type: "monthly chart",
      image,
      title: "Monthly Top Tracks",
      subtitle: `Top ${limit} tracks - ${formatMonthlyTopTracksDate(resolvedMonth)}`,
      href: routePaths.monthlyTopTracks,
      raw: {
        topTracks,
        meta,
        month: resolvedMonth,
        image,
        limit,
      },
    },
  ];
};
