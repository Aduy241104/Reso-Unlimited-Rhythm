import { ArrowRight, CalendarDays, Music2, RefreshCcw } from "lucide-react";
import { formatTrackDuration } from "../../../../utils/albumDetail";
import {
  formatDateLabel,
  formatDateTime,
  formatNumber,
  getTrackImage,
} from "../helpers";

const TrackInfoItem = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-[#eeeaff] bg-[#fbfaff] px-3.5 py-3">
    <div className="flex items-center gap-2 text-xs font-medium text-[#7b7398]">
      { Icon ? <Icon className="h-4 w-4 text-[#6f5cf1]" /> : null }
      { label }
    </div>

    <p className="mt-1.5 truncate text-sm font-semibold text-[#211b35]">
      { value }
    </p>
  </div>
);

const TrackInsightsHero = ({
  analytics,
  displayedTrack,
  onRefresh,
  onViewTrackDetail,
}) => {
  const periodLabel =
    analytics?.period?.from && analytics?.period?.to
      ? `${formatDateLabel(analytics.period.from, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })} - ${formatDateLabel(analytics.period.to, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`
      : "Chưa có khoảng thời gian";

  const trackTitle = displayedTrack?.title || "Bài hát đã chọn";
  const totalPlay = formatNumber(displayedTrack?.stats?.totalPlay || 0);
  const duration = formatTrackDuration(displayedTrack?.duration || 0);
  const lastUpdatedAt = formatDateTime(analytics?.lastUpdatedAt);

  return (
    <section className="rounded-[18px] border border-[#e7e1ff] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <img
            src={ getTrackImage(displayedTrack) }
            alt={ trackTitle }
            className="
              h-20 w-20 shrink-0 rounded-2xl
              border border-black/5 object-cover
              shadow-[0_10px_28px_rgba(28,22,61,0.14)]
            "
          />

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6f5cf1]">
              Phân tích bài hát
            </p>

            <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.03em] text-[#211b35] sm:text-3xl">
              { trackTitle }
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746d8f]">
              Theo dõi lượt phát, người nghe, thời lượng nghe và tỷ lệ bỏ qua
              để đánh giá hiệu suất theo từng khoảng thời gian.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={ onRefresh }
            className="
              inline-flex h-10 items-center justify-center gap-2
              rounded-xl border border-[#ded7ff]
              bg-white px-4 text-sm font-semibold text-[#554ad7]
              transition hover:bg-[#f7f4ff]
            "
          >
            <RefreshCcw className="h-4 w-4" />
            Làm mới
          </button>

          <button
            type="button"
            onClick={ onViewTrackDetail }
            disabled={ !displayedTrack }
            className="
              inline-flex h-10 items-center justify-center gap-2
              rounded-xl bg-[#6f5cf1]
              px-4 text-sm font-semibold text-white
              shadow-[0_10px_24px_rgba(111,92,241,0.22)]
              transition hover:bg-[#5f4fe0]
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            Xem chi tiết
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-[#f0ecff] pt-5 sm:grid-cols-2 xl:grid-cols-4">

        <TrackInfoItem
          label="Cập nhật lần cuối"
          value={ lastUpdatedAt || "Chưa cập nhật" }
        />
      </div>
    </section>
  );
};

export default TrackInsightsHero;