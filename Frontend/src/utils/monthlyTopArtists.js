import { routePaths } from "../routes/routePaths";
import { createPlaceholderImage } from "./artistProfile";
import {
  formatMonthlyTopTracksDate,
  getCurrentMonthValue,
} from "./monthlyTopTracks";

export const MONTHLY_TOP_ARTISTS_LIMIT = 9;

const MONTHLY_TOP_ARTISTS_PLACEHOLDER_IMAGE = createPlaceholderImage(
  "Top Nghe Si",
  "#22c55e",
  "#14532d"
);

export const getMonthlyTopArtistsHeroImage = (topArtists = []) =>
  topArtists[0]?.artist?.avatar || MONTHLY_TOP_ARTISTS_PLACEHOLDER_IMAGE;

export const mapMonthlyTopArtistsToContentCards = ({
  topArtists = [],
  meta = {},
  month = getCurrentMonthValue(),
  limit = MONTHLY_TOP_ARTISTS_LIMIT,
} = {}) => {
  const resolvedMonth = meta?.month || month;
  const champion = topArtists[0];
  const image = getMonthlyTopArtistsHeroImage(topArtists);
  const championName = champion?.artist?.name || "";

  return [
    {
      id: `monthly-top-artists-${resolvedMonth}`,
      type: "bxh nghệ sĩ",
      image,
      title: "Top nghệ sĩ tháng",
      subtitle: championName
        ? `#1 ${championName} - ${formatMonthlyTopTracksDate(resolvedMonth)}`
        : `Top ${limit} nghệ sĩ - ${formatMonthlyTopTracksDate(resolvedMonth)}`,
      href: champion?.artist?.id
        ? routePaths.artistBrowseProfile(champion.artist.id)
        : undefined,
      raw: {
        topArtists,
        meta,
        month: resolvedMonth,
        image,
        limit,
      },
    },
  ];
};
