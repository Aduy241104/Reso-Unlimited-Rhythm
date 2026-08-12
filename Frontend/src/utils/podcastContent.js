import { routePaths } from "../routes/routePaths";
import { formatTrackDuration } from "./albumDetail";

export const mapPodcastToContentCard = (
  podcast,
  { includeListenCount = true } = {}
) => {
  const podcastId = podcast?.id || podcast?._id || "";
  const duration = formatTrackDuration(podcast?.duration);
  const listens = Number(podcast?.stats?.totalListen || 0).toLocaleString("vi-VN");
  const subtitle = [podcast?.creator?.name || "Nghệ sĩ", duration];

  if (includeListenCount) {
    subtitle.push(`${listens} lượt nghe`);
  }

  return {
    id: podcastId,
    type: "podcast",
    image: podcast?.coverImageUrl || "",
    title: podcast?.title || "Podcast chưa đặt tên",
    subtitle: subtitle.join(" · "),
    href: podcastId ? routePaths.podcastDetail(podcastId) : undefined,
    raw: podcast,
  };
};

export const mapPodcastsToContentCards = (podcasts = [], options) =>
  podcasts.map((podcast) => mapPodcastToContentCard(podcast, options));
