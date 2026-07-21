import { routePaths } from "../routes/routePaths.js";

export const HOME_RANKING_PREVIEW_LIMIT = 5;

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

export const mapTopTracksToRankingCards = (
  items = [],
  { period = "daily", limit = HOME_RANKING_PREVIEW_LIMIT } = {}
) =>
  items.slice(0, limit).map((item, index) => {
    const track = item?.track || {};
    const rank = Number(item?.rank) || index + 1;
    const trackId = track?.id || track?._id || "";
    const artistName = track?.artist?.name || "Nghệ sĩ không xác định";

    return {
      id: `${period}-top-track-${trackId || rank}`,
      type: "Bài hát",
      image:
        track?.coverImage ||
        track?.avatar ||
        track?.artist?.avatar ||
        track?.artist?.coverImage ||
        "",
      title: track?.title || "Bài hát chưa có tên",
      subtitle: `${artistName} · ${formatNumber(item?.playCount)} lượt phát`,
      href: trackId ? routePaths.trackDetail(trackId) : undefined,
      rank,
      raw: {
        ...item,
        contentType: "track",
        period,
      },
    };
  });

export const mapTopArtistsToRankingCards = (
  items = [],
  { period = "daily", limit = HOME_RANKING_PREVIEW_LIMIT } = {}
) =>
  items.slice(0, limit).map((item, index) => {
    const artist = item?.artist || {};
    const rank = Number(item?.rank) || index + 1;
    const artistId = artist?.id || artist?._id || "";

    return {
      id: `${period}-top-artist-${artistId || rank}`,
      type: "Nghệ sĩ",
      image: artist?.avatar || artist?.coverImage || "",
      title: artist?.name || "Nghệ sĩ không xác định",
      subtitle: `${formatNumber(item?.playCount)} lượt phát · ${formatNumber(
        item?.uniqueListeners
      )} người nghe`,
      href: artistId ? routePaths.artistBrowseProfile(artistId) : undefined,
      rank,
      raw: {
        ...item,
        contentType: "artist",
        period,
      },
    };
  });
