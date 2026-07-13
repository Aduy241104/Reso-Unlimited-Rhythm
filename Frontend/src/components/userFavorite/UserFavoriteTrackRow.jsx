import { useState } from "react";
import { CheckCircle2, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import TrackTwoLevelMenu from "../trackMenu/TrackTwoLevelMenu";
import { routePaths } from "../../routes/routePaths";
import { formatTrackDuration } from "../../utils/albumDetail";

const UserFavoriteTrackRow = ({
  index,
  title = "",
  artistName = "",
  artistId = "",
  coverImage = "",
  duration,
  trackId = "",
  track = null,
  isFavorite = true,
  onFavoriteChanged,
  isPlaybackActive = false,
  isPlaying = false,
  onPlaybackAction,
}) => {
  const [failedImageSrc, setFailedImageSrc] = useState("");
  const PlaybackIcon = isPlaybackActive && isPlaying ? Pause : Play;
  const playbackLabel = isPlaybackActive && isPlaying ? "Tạm dừng" : "Phát";
  const durationLabel =
    Number.isFinite(Number(duration)) && Number(duration) >= 0
      ? formatTrackDuration(Number(duration))
      : "--:--";
  const shouldShowImage = Boolean(coverImage) && failedImageSrc !== coverImage;

  return (
    <article
      className="
        grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[8px]
        px-0 py-2 transition hover:bg-black/[0.05] dark:hover:bg-white/[0.06]
        sm:grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_3.25rem_2.75rem] sm:px-3 sm:py-2.5
      "
    >
      <div className="flex items-center justify-center text-sm text-[#71717a] dark:text-[#a1a1aa]">
        <span className="sm:group-hover:hidden">{ index }</span>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={ onPlaybackAction }
          className="group/image relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] focus:outline-none"
          aria-label={ `${playbackLabel} ${title}`.trim() }
        >
          { shouldShowImage ? (
            <img
              key={ coverImage }
              src={ coverImage }
              alt={ title || "Ảnh bìa bài hát" }
              className="h-11 w-11 rounded-[10px] object-cover shadow-[0_8px_24px_rgba(15,23,42,0.14)]"
              loading="lazy"
              onError={ () => setFailedImageSrc(coverImage) }
            />
          ) : (
            <div
              className="
                flex h-11 w-11 items-center justify-center rounded-[10px]
                bg-[linear-gradient(135deg,#f43f5e_0%,#ec4899_50%,#8b5cf6_100%)]
                text-sm font-semibold uppercase text-white
              "
            >
              { (title || "N").charAt(0) }
            </div>
          ) }

          <span
            className="
              absolute inset-0 flex items-center justify-center rounded-[10px] bg-black/38
              text-white opacity-100 transition md:opacity-0 md:group-hover/image:opacity-100
            "
          >
            <PlaybackIcon className="h-4 w-4 fill-current" />
          </span>
        </button>

        <div className="min-w-0">
          { trackId ? (
            <Link
              to={ routePaths.trackDetail(trackId) }
              className="block truncate text-sm font-medium text-[#111111] hover:underline dark:text-white sm:text-[15px]"
            >
              { title || "Bài hát chưa có tên" }
            </Link>
          ) : (
            <p className="truncate text-sm font-medium text-[#111111] dark:text-white sm:text-[15px]">
              { title || "Bài hát chưa có tên" }
            </p>
          ) }

          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[#71717a] dark:text-[#a1a1aa] sm:text-sm">
            { artistId ? (
              <Link
                to={ routePaths.artistBrowseProfile(artistId) }
                className="truncate hover:underline"
              >
                { artistName || "Nghệ sĩ không xác định" }
              </Link>
            ) : (
              <span className="truncate">
                { artistName || "Nghệ sĩ không xác định" }
              </span>
            ) }
            { durationLabel ? (
              <span className="shrink-0 sm:hidden">{ durationLabel }</span>
            ) : null }
          </div>
        </div>
      </div>

      <div className="hidden items-center justify-center sm:flex">
        <CheckCircle2 className="h-4.5 w-4.5 fill-current text-[#22c55e]" />
      </div>

      <div className="hidden text-right text-sm text-[#52525b] dark:text-[#a1a1aa] sm:block">
        { durationLabel }
      </div>

      <div className="hidden items-center justify-end sm:flex">
        { trackId ? (
          <TrackTwoLevelMenu
            trackId={ trackId }
            track={ track }
            isFavorite={ isFavorite }
            onFavoriteChanged={ onFavoriteChanged }
          />
        ) : null }
      </div>
    </article>
  );
};

export default UserFavoriteTrackRow;
