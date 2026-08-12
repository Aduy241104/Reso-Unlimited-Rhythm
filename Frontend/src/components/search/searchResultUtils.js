import { ListMusic } from "lucide-react";
import { routePaths } from "../../routes/routePaths";
import { createPlaceholderImage } from "../../utils/albumDetail";
import { getTrackDisplayTitle } from "../../utils/trackTitle";

export const SEARCH_RESULT_TYPES = {
  song: "song",
  artist: "artist",
  album: "album",
  podcast: "podcast",
  playlist: "playlist",
};

const resolveImageCandidate = (candidate) => {
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  if (Array.isArray(candidate)) {
    const firstImage = candidate.find(
      (item) => typeof item === "string" && item.trim()
    );

    return firstImage ? firstImage.trim() : "";
  }

  return "";
};

const resolveItemId = (item) =>
  item?._id || item?.id || item?.trackId || item?.artistId || item?.albumId || "";

const collectArtistNames = (candidate) => {
  if (Array.isArray(candidate)) {
    return candidate
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        return (
          item?.stageName ||
          item?.artistName ||
          item?.displayName ||
          item?.name ||
          item?.fullName ||
          ""
        ).trim();
      })
      .filter(Boolean);
  }

  if (typeof candidate === "string") {
    return candidate
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  }

  if (candidate && typeof candidate === "object") {
    return collectArtistNames([candidate]);
  }

  return [];
};

export const resolveSearchItemPrimaryText = (item, type) => {
  if (type === SEARCH_RESULT_TYPES.artist) {
    return (
      item?.stageName ||
      item?.artistName ||
      item?.displayName ||
      item?.name ||
      item?.fullName ||
      "Nghệ sĩ chưa đặt tên"
    );
  }

  if (type === SEARCH_RESULT_TYPES.album) {
    return item?.title || item?.name || item?.albumName || "Album chưa đặt tên";
  }

  if (type === SEARCH_RESULT_TYPES.podcast) {
    return item?.title || "Podcast chưa đặt tên";
  }

  if (type === SEARCH_RESULT_TYPES.playlist) {
    return item?.title || "Playlist chưa đặt tên";
  }

  return getTrackDisplayTitle(item, "Bài hát chưa đặt tên");
};

export const resolveSearchItemTypeLabel = (type) => {
  if (type === SEARCH_RESULT_TYPES.artist) {
    return "Nghệ sĩ";
  }

  if (type === SEARCH_RESULT_TYPES.album) {
    return "Album";
  }

  if (type === SEARCH_RESULT_TYPES.podcast) {
    return "Podcast";
  }

  if (type === SEARCH_RESULT_TYPES.playlist) {
    return "Playlist";
  }

  return "Bài hát";
};

export const resolveSearchItemSecondaryText = (item, type) => {
  const typeLabel = resolveSearchItemTypeLabel(type);
  const artistNames = collectArtistNames(
    item?.artists ||
      item?.artistNames ||
      item?.artistName ||
      item?.artist ||
      item?.artist_artistId ||
      item?.artistId ||
      item?.creator
  );

  if (
    [
      SEARCH_RESULT_TYPES.song,
      SEARCH_RESULT_TYPES.podcast,
      SEARCH_RESULT_TYPES.album,
    ].includes(type) &&
    artistNames.length > 0
  ) {
    return `${typeLabel} • ${artistNames.join(", ")}`;
  }

  return typeLabel;
};

export const resolveSearchItemImage = (item, type) => {
  if (type === SEARCH_RESULT_TYPES.song) {
    return (
      resolveImageCandidate(item?.avatar) ||
      resolveImageCandidate(item?.coverImage) ||
      resolveImageCandidate(item?.image) ||
      resolveImageCandidate(item?.album?.coverImage) ||
      resolveImageCandidate(item?.album?.image) ||
      createPlaceholderImage(resolveSearchItemPrimaryText(item, type), "#f59e0b", "#111827")
    );
  }

  if (type === SEARCH_RESULT_TYPES.artist) {
    return (
      resolveImageCandidate(item?.avatar) ||
      resolveImageCandidate(item?.image) ||
      resolveImageCandidate(item?.photo) ||
      createPlaceholderImage(resolveSearchItemPrimaryText(item, type), "#10b981", "#111827")
    );
  }

  if (type === SEARCH_RESULT_TYPES.podcast) {
    return (
      resolveImageCandidate(item?.coverImageUrl) ||
      resolveImageCandidate(item?.coverImage) ||
      resolveImageCandidate(item?.image) ||
      createPlaceholderImage(resolveSearchItemPrimaryText(item, type), "#8b5cf6", "#111827")
    );
  }

  if (type === SEARCH_RESULT_TYPES.playlist) {
    return (
      resolveImageCandidate(item?.coverImage) ||
      resolveImageCandidate(item?.image) ||
      createPlaceholderImage(resolveSearchItemPrimaryText(item, type), "#334155", "#111827")
    );
  }

  return (
    resolveImageCandidate(item?.coverImage) ||
    resolveImageCandidate(item?.image) ||
    resolveImageCandidate(item?.thumbnail) ||
    createPlaceholderImage(resolveSearchItemPrimaryText(item, type), "#3b82f6", "#111827")
  );
};

export const resolveSearchItemPath = (item, type) => {
  const itemId = resolveItemId(item);

  if (!itemId) {
    return "";
  }

  if (type === SEARCH_RESULT_TYPES.artist) {
    return routePaths.artistBrowseProfile(itemId);
  }

  if (type === SEARCH_RESULT_TYPES.album) {
    return routePaths.albumDetail(itemId);
  }

  if (type === SEARCH_RESULT_TYPES.podcast) {
    return routePaths.podcastDetail(itemId);
  }

  if (type === SEARCH_RESULT_TYPES.playlist) {
    return routePaths.playlistDetail(itemId);
  }

  return routePaths.trackDetail(itemId);
};
