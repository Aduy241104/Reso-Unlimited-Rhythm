import {
  displayRawValue,
  formatDateLabel,
  formatDateTime,
  formatNumber,
} from "../helpers";
import TrackInsightsInsightRow from "./TrackInsightsInsightRow";

const TrackInsightsSidebar = ({
  analytics,
  dailyChartLength,
  lastActiveDay,
  quickInsights,
}) => (
  <aside className="space-y-4">
    <div className="rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
        Chỉ số nhanh
      </p>
      <h3 className="mt-2 text-xl font-semibold text-[#2f2747]">Chất lượng nghe</h3>
      <p className="mt-2 text-[13px] leading-5 text-[#7c7891]">
        Nhóm chỉ số tóm lược giúp bạn đánh giá nhanh mức độ hấp dẫn của bài hát.
      </p>

      <div className="mt-4 space-y-2.5">
        {quickInsights.map((item) => (
          <TrackInsightsInsightRow
            key={item.label}
            label={item.label}
            value={
              item.label === "Ngày tốt nhất" && item.value !== "Chưa có dữ liệu"
                ? `${formatDateLabel(item.value, {
                    day: "2-digit",
                    month: "short",
                  })} | ${formatNumber(
                    analytics?.dailyChart?.find((day) => day.date === item.value)?.playCount
                  )} lượt phát`
                : item.value
            }
            helper={item.helper}
            accentClassName={item.accentClassName}
          />
        ))}
      </div>
    </div>

    <div className="rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">Tóm tắt</p>
      <h3 className="mt-2 text-xl font-semibold text-[#2f2747]">
        Hoạt động gần nhất
      </h3>

      <div className="mt-4 rounded-[16px] border border-[#e7e1ff] bg-[#f8f6ff] p-3.5">
        <p className="text-sm font-medium text-[#6b6682]">
          Ngày gần nhất có phát sinh nghe
        </p>
        <p className="mt-2 text-lg font-semibold text-[#2f2747]">
          {lastActiveDay
            ? formatDateLabel(lastActiveDay.date, {
                weekday: "short",
                day: "2-digit",
                month: "short",
              })
            : "Chưa có ngày hoạt động"}
        </p>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          {lastActiveDay
            ? `${formatNumber(lastActiveDay.playCount)} lượt phát, ${formatNumber(
                lastActiveDay.uniqueListeners
              )} người nghe, thời lượng nghe trung bình ${displayRawValue(
                lastActiveDay.averageListenDuration
              )}.`
            : "Bài hát này chưa ghi nhận lượt nghe trong dữ liệu hiện tại."}
        </p>
      </div>

      <div className="mt-3.5 rounded-[16px] border border-[#d8d0ff] bg-[#6f5cf1] p-3.5 text-white">
        <p className="text-sm font-medium text-white/65">Khoảng thời gian</p>
        <p className="mt-2 text-2xl font-semibold">
          {analytics?.period?.range === "custom"
            ? "Tùy chỉnh"
            : analytics?.period?.range?.toUpperCase() || `${dailyChartLength} ngày`}
        </p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {analytics?.period?.from && analytics?.period?.to
            ? `Từ ${formatDateLabel(analytics.period.from, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })} đến ${formatDateLabel(analytics.period.to, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}. Có ${dailyChartLength} mốc dữ liệu theo ngày.${
                analytics?.lastUpdatedAt
                  ? ` Cập nhật lần cuối ${formatDateTime(analytics.lastUpdatedAt)}.`
                  : ""
              }`
            : `Tập hiện tại có ${dailyChartLength} mốc dữ liệu theo ngày cho bài hát này.`}
        </p>
      </div>
    </div>
  </aside>
);

export default TrackInsightsSidebar;
