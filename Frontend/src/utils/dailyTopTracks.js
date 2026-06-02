import { routePaths } from "../routes/routePaths";
import { createPlaceholderImage } from "./albumDetail";

export const DAILY_TOP_TRACK_LIMIT = 30;

const DAILY_TOP_TRACK_PLACEHOLDER_IMAGE = createPlaceholderImage(
  "Top 30",
  "#f59e0b",
  "#7c2d12"
);

export const getPreviousDateValue = () => {
  const previousDate = new Date();
  previousDate.setDate(previousDate.getDate() - 1);
  const year = previousDate.getFullYear();
  const month = String(previousDate.getMonth() + 1).padStart(2, "0");
  const day = String(previousDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatDailyTopTracksDate = (dateValue) => {
  if (!dateValue) {
    return "Ngày không xác định";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

export const getDailyTopTracksHeroImage = (topTracks = []) => {
  const topTrack = topTracks[0]?.track;

  return (
    topTrack?.coverImage ||
    topTrack?.avatar ||
    topTrack?.artist?.avatar ||
    DAILY_TOP_TRACK_PLACEHOLDER_IMAGE
  );
};

export const createDailyTopTracksCollectionMeta = ({
  date = getPreviousDateValue(),
  image = DAILY_TOP_TRACK_PLACEHOLDER_IMAGE,
} = {}) => ({
  id: `daily-top-${date}`,
  type: "daily-top",
  title: `Top bài hát ngày - ${date}`,
  image,
  artistName: "Reso Music",
});

export const mapDailyTopTracksToContentCards = ({
  topTracks = [],
  meta = {},
  date = getPreviousDateValue(),
  limit = DAILY_TOP_TRACK_LIMIT,
} = {}) => {
  const resolvedDate = meta?.date || date;
  const image = getDailyTopTracksHeroImage(topTracks);

  return [
    {
      id: `daily-top-${resolvedDate}`,
      type: "bxh ngày",
      image,
      title: "Top bài hát ngày",
      subtitle: `Top ${limit} bài hát - ${formatDailyTopTracksDate(resolvedDate)}`,
      href: routePaths.dailyTopTracks,
      raw: {
        topTracks,
        meta,
        date: resolvedDate,
        image,
        limit,
      },
    },
  ];
};
