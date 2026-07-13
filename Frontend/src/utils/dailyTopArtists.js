import { routePaths } from "../routes/routePaths";
import { formatDailyTopTracksDate } from "./dailyTopTracks";
import { createPlaceholderImage } from "./artistProfile";

export const DAILY_TOP_ARTISTS_LIMIT = 9;

const DAILY_TOP_ARTISTS_PLACEHOLDER_IMAGE = createPlaceholderImage(
  "Top Nghe Si",
  "#8b5cf6",
  "#312e81"
);

export const getDailyTopArtistsHeroImage = (topArtists = []) =>
  topArtists[0]?.artist?.avatar || DAILY_TOP_ARTISTS_PLACEHOLDER_IMAGE;

export const mapDailyTopArtistsToContentCards = ({
  topArtists = [],
  date = "",
  limit = DAILY_TOP_ARTISTS_LIMIT,
} = {}) => {
  const resolvedDate = topArtists[0]?.date || date;
  const champion = topArtists[0];
  const image = getDailyTopArtistsHeroImage(topArtists);
  const championName = champion?.artist?.name || "";
  const resolvedLimit = limit > 0 ? limit : DAILY_TOP_ARTISTS_LIMIT;

  return [
    {
      id: `daily-top-artists-${resolvedDate || "latest"}`,
      type: "BXH nghệ sĩ ngày",
      image,
      title: "Top nghệ sĩ theo ngày",
      subtitle: championName
        ? `#1 ${championName} · ${formatDailyTopTracksDate(resolvedDate)}`
        : resolvedDate
          ? `Top ${resolvedLimit} nghệ sĩ · ${formatDailyTopTracksDate(resolvedDate)}`
          : "Đang cập nhật bảng xếp hạng hôm nay",
      href: champion?.artist?.id
        ? routePaths.artistBrowseProfile(champion.artist.id)
        : undefined,
      raw: {
        topArtists,
        date: resolvedDate,
        image,
        limit,
      },
    },
  ];
};
