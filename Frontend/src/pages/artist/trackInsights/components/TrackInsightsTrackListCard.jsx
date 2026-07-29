import { ArrowRight } from "lucide-react";
import { formatTrackDuration } from "../../../../utils/albumDetail";
import { formatNumber, getTrackImage } from "../helpers";

const TrackInsightsTrackListCard = ({ track, isActive, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={[
      "flex w-full items-center gap-2.5 border-b border-[#ece8ff] px-3 py-2 text-left transition last:border-b-0",
      isActive
        ? "bg-[#f3f0ff] text-[#2f2747]"
        : "bg-white text-[#2f2747] hover:bg-[#faf8ff]",
    ].join(" ")}
  >
    <img
      src={getTrackImage(track)}
      alt={track?.title || "Ảnh bìa bài hát"}
      className="h-[38px] w-[38px] rounded-[8px] object-cover"
    />

    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold">
            {track?.title || "Chưa có tên bài hát"}
          </p>
          <p className="mt-0.5 text-[10px] text-[#7c7891]">
            {track?.album?.title || "Chưa thuộc album nào"}
          </p>
        </div>
        <ArrowRight className="h-3 w-3 shrink-0 text-[#9a93b8]" />
      </div>

      <div className="mt-1 flex flex-wrap gap-2.5 text-[10px] text-[#7c7891]">
        <span
          className={[
            "font-medium",
            isActive ? "text-[#5f4fe0]" : "text-[#645d86]",
          ].join(" ")}
        >
          {formatTrackDuration(track?.duration)}
        </span>
        <span
          className={[
            "font-medium",
            isActive ? "text-[#5f4fe0]" : "text-[#6a56eb]",
          ].join(" ")}
        >
          {formatNumber(track?.stats?.totalPlay || 0)} lượt phát
        </span>
      </div>
    </div>
  </button>
);

export default TrackInsightsTrackListCard;
