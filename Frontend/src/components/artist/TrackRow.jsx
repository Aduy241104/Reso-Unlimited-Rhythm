import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { isPlayableTrack } from "../../utils/trackStatus";
import { formatTrackTitle } from "../../utils/trackTitle";

const TrackRow = ({
  index,
  image,
  title,
  artistName = "Unknown Artist",
  plays,
  duration,
  track = null,
  trackId,
  menu = null,
}) => {
  const navigate = useNavigate();

  if (track && !isPlayableTrack(track)) {
    return null;
  }

  const resolvedTrackId = useMemo(
    () => track?._id || track?.id || trackId || "",
    [track?._id, track?.id, trackId]
  );
  const displayTitle = formatTrackTitle(title, track?.versionTitle);

  const handleTrackClick = () => {
    if (!resolvedTrackId) {
      return;
    }

    navigate(routePaths.trackDetail(resolvedTrackId));
  };

  return (
    <div
      className="
        group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3
        px-3 py-3 transition duration-300 hover:bg-white/[0.045]
        sm:grid-cols-[2.25rem_minmax(0,1.2fr)_minmax(0,0.8fr)_4rem_2.5rem]
      "
    >
      <span className="text-sm font-medium text-white/42">{ index }</span>

      <div className="flex min-w-0 items-center gap-4">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-[#242424]">
          { image ? (
            <img
              src={ image }
              alt={ displayTitle }
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.08]"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,#343434,#161616)]" />
          ) }
        </div>

        <div className="min-w-0">
          <button
            type="button"
            onClick={ handleTrackClick }
            disabled={ !resolvedTrackId }
            className="truncate text-left text-sm font-semibold text-white transition-colors duration-200 hover:text-[#1DB954] disabled:cursor-default disabled:hover:text-white sm:text-[15px]"
          >
            { displayTitle }
          </button>
        </div>
      </div>

      <span className="hidden truncate text-sm text-white/48 sm:block">{ plays }</span>
      <span className="text-right text-sm text-white/44">{ duration }</span>
      <div className="hidden items-center justify-end sm:flex">{ menu }</div>
    </div>
  );
};

export default TrackRow;
