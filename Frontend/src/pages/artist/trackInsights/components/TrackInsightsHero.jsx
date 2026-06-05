import { ArrowRight, CalendarDays, Music2, RefreshCcw } from "lucide-react";
import { formatTrackDuration } from "../../../../utils/albumDetail";
import {
  formatDateLabel,
  formatDateTime,
  formatNumber,
  getTrackImage,
} from "../helpers";

const TrackInsightsHero = ({
  analytics,
  displayedTrack,
  draftFrom,
  draftTo,
  onApplyCustomRange,
  onChangeDraftFrom,
  onChangeDraftTo,
  onChangeRange,
  onRefresh,
  onViewTrackDetail,
  rangeOptions,
  selectedRange,
}) => (
  <div className="relative overflow-hidden rounded-[20px] bg-[#6658d9] text-white shadow-[0_20px_60px_rgba(124,108,242,0.20)]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(227,221,255,0.22),_transparent_30%)]" />
    <div className="relative grid gap-6 p-5 lg:p-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-[#efeaff]">
          Phân tích chi tiết
        </p>
        <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {displayedTrack?.title || "Bài hát đã chọn"}
        </h3>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-[15px]">
          Theo dõi hiệu suất phát, khả năng giữ chân người nghe và xu hướng bỏ
          qua để đánh giá sức hút của bài hát trong từng khoảng thời gian.
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChangeRange(option.value)}
              className={[
                "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
                selectedRange === option.value
                  ? "border-white bg-white text-[#4b3fb5]"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>

        {selectedRange === "custom" ? (
          <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/5 p-3.5 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="text-xs uppercase tracking-[0.24em] text-white/55">
                Từ ngày
              </span>
              <input
                type="date"
                value={draftFrom}
                onChange={(event) => onChangeDraftFrom(event.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-black/10 px-4 text-sm text-white outline-none transition focus:border-[#f0cfa8]"
              />
            </label>
            <label className="flex-1">
              <span className="text-xs uppercase tracking-[0.24em] text-white/55">
                Đến ngày
              </span>
              <input
                type="date"
                value={draftTo}
                onChange={(event) => onChangeDraftTo(event.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-black/10 px-4 text-sm text-white outline-none transition focus:border-[#f0cfa8]"
              />
            </label>
            <button
              type="button"
              onClick={onApplyCustomRange}
              className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-[#241b15] transition hover:brightness-95"
            >
              Áp dụng
            </button>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/65">
          <div className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#efeaff]" />
            {analytics?.period?.from && analytics?.period?.to
              ? `${formatDateLabel(analytics.period.from, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })} - ${formatDateLabel(analytics.period.to, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}`
              : "Chọn khoảng thời gian để xem dữ liệu"}
          </div>
          <div className="inline-flex items-center gap-2">
            <Music2 className="h-4 w-4 text-[#efeaff]" />
            Thời lượng {formatTrackDuration(displayedTrack?.duration)}
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-white/12 bg-white/[0.10] p-4 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <img
            src={getTrackImage(displayedTrack)}
            alt={displayedTrack?.title || "Ảnh bìa bài hát"}
            className="h-16 w-16 rounded-[14px] object-cover shadow-lg shadow-black/20"
          />

          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">
              Bài hát đang chọn
            </p>
            <h3 className="mt-2 truncate text-xl font-semibold">
              {displayedTrack?.title || "Bài hát đã chọn"}
            </h3>
            <p className="mt-2 text-sm text-white/60">
              Lượt phát hiện có {formatNumber(displayedTrack?.stats?.totalPlay || 0)}
            </p>
            <p className="mt-2 text-sm text-white/60">
              Cập nhật lần cuối {formatDateTime(analytics?.lastUpdatedAt)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={onViewTrackDetail}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#241b15] transition hover:brightness-95"
          >
            Xem chi tiết
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <RefreshCcw className="h-4 w-4" />
            Làm mới
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default TrackInsightsHero;
