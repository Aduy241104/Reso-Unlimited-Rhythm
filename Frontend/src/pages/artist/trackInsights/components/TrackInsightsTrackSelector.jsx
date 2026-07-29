import { ArrowRight } from "lucide-react";
import { formatNumber, resolveTrackId } from "../helpers";
import TrackInsightsTrackListCard from "./TrackInsightsTrackListCard";

const TrackInsightsTrackSelector = ({
  selectedTrack,
  selectedTrackId,
  trackSummary,
  tracks,
  onOpenMusicPage,
  onSelectTrack,
}) => (
  <div className="rounded-[18px] border border-[#ece8ff] bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-[#7c6cf2]">
          Bảng điều khiển nghệ sĩ
        </p>
        <h2 className="mt-2.5 text-[28px] font-semibold tracking-tight text-[#2f2747]">
          Danh sách bài hát
        </h2>
        <p className="mt-2.5 max-w-2xl text-[13px] leading-5 text-[#7c7891]">
          Chọn một bài hát bên dưới để xem bức tranh hiệu suất gồm lượt phát,
          người nghe, thời lượng nghe và tỉ lệ bỏ qua theo từng giai đoạn.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-[12px] border border-[#ece8ff] bg-[#faf8ff] px-3.5 py-2.5">
          <p className="text-sm text-[#6b6682]">Tổng số bài hát</p>
          <p className="mt-1 text-lg font-semibold text-[#2f2747]">
            {formatNumber(trackSummary.totalTracks)}
          </p>
        </div>
        <div className="rounded-[12px] border border-[#ece8ff] bg-[#faf8ff] px-3.5 py-2.5">
          <p className="text-sm text-[#6b6682]">Tổng lượt phát hiện có</p>
          <p className="mt-1 text-lg font-semibold text-[#2f2747]">
            {formatNumber(trackSummary.totalPlays)}
          </p>
        </div>
      </div>
    </div>

    <div className="mt-5 overflow-hidden rounded-[14px] border border-[#ece8ff] bg-white">
      {tracks.map((track) => {
        const trackId = resolveTrackId(track);

        return (
          <TrackInsightsTrackListCard
            key={trackId}
            track={track}
            isActive={trackId === selectedTrackId}
            onSelect={() => onSelectTrack(trackId)}
          />
        );
      })}
    </div>

    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece8ff] pt-4">
      <p className="text-[13px] text-neutral-500">
        {selectedTrackId
          ? `Đang xem phân tích cho: ${selectedTrack?.title || "Bài hát đã chọn"}`
          : "Chưa chọn bài hát nào để xem phân tích."}
      </p>

      <button
        type="button"
        onClick={onOpenMusicPage}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6f5cf1] transition hover:text-[#5b4be0]"
      >
        Mở trang Nhạc của tôi
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default TrackInsightsTrackSelector;
