import { resolveTrackId } from "../helpers";
import TrackInsightsTrackListCard from "./TrackInsightsTrackListCard";

const TrackInsightsSidebar = ({
  onOpenMusicPage,
  onSelectTrack,
  selectedTrack,
  selectedTrackId,
  tracks,
}) => (
  <aside>
    <section className="rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
      <div>
        <h3 className="mt-2 text-xl font-semibold text-[#2f2747]">
          Danh sách bài hát
        </h3>
      </div>

      <div className="mt-4 overflow-hidden rounded-[14px] border border-[#ece8ff] bg-white">
        <div className="max-h-[280px] overflow-y-auto">
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
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece8ff] pt-4">
        <p className="text-[13px] text-neutral-500">
          {selectedTrackId
            ? `Đang xem: ${selectedTrack?.title || "Bài hát đã chọn"}`
            : "Chưa chọn bài hát nào để xem phân tích."}
        </p>

        <button
          type="button"
          onClick={onOpenMusicPage}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6f5cf1] transition hover:text-[#5b4be0]"
        >
          Mở trang Nhạc của tôi
        </button>
      </div>
    </section>
  </aside>
);

export default TrackInsightsSidebar;
