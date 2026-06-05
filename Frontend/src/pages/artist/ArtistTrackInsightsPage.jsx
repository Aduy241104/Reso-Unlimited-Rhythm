import { ArrowRight, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import {
  CHART_METRICS,
  MONTHLY_CHART_METRICS,
  RANGE_OPTIONS,
  formatDateLabel,
  formatMonthLabel,
} from "./trackInsights/helpers";
import TrackInsightsChartPanel from "./trackInsights/components/TrackInsightsChartPanel";
import TrackInsightsDailyTable from "./trackInsights/components/TrackInsightsDailyTable";
import TrackInsightsHero from "./trackInsights/components/TrackInsightsHero";
import TrackInsightsSidebar from "./trackInsights/components/TrackInsightsSidebar";
import TrackInsightsSummaryGrid from "./trackInsights/components/TrackInsightsSummaryGrid";
import TrackInsightsTrackSelector from "./trackInsights/components/TrackInsightsTrackSelector";
import { useArtistTrackInsights } from "./trackInsights/useArtistTrackInsights";

const ArtistTrackInsightsPage = () => {
  const navigate = useNavigate();
  const {
    analytics,
    analyticsError,
    chartIsEmpty,
    chartMeta,
    chartMetric,
    dailyChart,
    displayedTrack,
    draftFrom,
    draftTo,
    handleApplyCustomRange,
    handleRangeChange,
    isAnalyticsLoading,
    isTracksLoading,
    lastActiveDay,
    latestMetricValue,
    latestMonthlyMetricValue,
    maxMetricValue,
    maxMonthlyMetricValue,
    monthlyChart,
    monthlyChartIsEmpty,
    monthlyChartMeta,
    monthlyChartMetric,
    quickInsights,
    rangeHint,
    selectedRange,
    selectedTrack,
    selectedTrackId,
    setChartMetric,
    setDraftFrom,
    setDraftTo,
    setMonthlyChartMetric,
    setReloadNonce,
    summaryCards,
    trackSummary,
    tracks,
    tracksError,
    updateQuery,
  } = useArtistTrackInsights();

  if (isTracksLoading) {
    return (
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-7 text-sm text-[#6b6682] shadow-sm">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#8b5e3c]" />
          Đang tải danh sách bài hát...
        </div>
      </section>
    );
  }

  if (tracks.length === 0) {
    return (
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-7 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
          Bảng điều khiển nghệ sĩ
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#2f2747]">
          Phân tích bài hát
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7c7891]">
          Bạn cần có ít nhất một bài hát để xem số liệu phân tích. Hãy tạo bài
          hát mới rồi quay lại trang này.
        </p>

        {tracksError ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {tracksError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => navigate(routePaths.artistCreateTrack)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#7c6cf2] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6857eb]"
        >
          Tạo bài hát mới
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <TrackInsightsTrackSelector
        selectedTrack={selectedTrack}
        selectedTrackId={selectedTrackId}
        trackSummary={trackSummary}
        tracks={tracks}
        onOpenMusicPage={() => navigate(routePaths.artistMusic)}
        onSelectTrack={(trackId) => updateQuery({ trackId })}
      />

      {tracksError ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {tracksError}
        </div>
      ) : null}

      {!selectedTrackId ? (
        <section className="rounded-[20px] border border-dashed border-[#d8d0ff] bg-white p-8 text-center shadow-sm sm:p-9">
          <p className="text-lg font-semibold text-[#2f2747]">
            Chọn một bài hát để xem phân tích
          </p>
          <p className="mt-3 text-[13px] leading-5 text-[#7c7891]">
            Sau khi chọn, hệ thống sẽ hiển thị các chỉ số cốt lõi, biểu đồ theo
            ngày và diễn biến hiệu suất của bài hát tương ứng.
          </p>
        </section>
      ) : (
        <>
          <TrackInsightsHero
            analytics={analytics}
            displayedTrack={displayedTrack}
            draftFrom={draftFrom}
            draftTo={draftTo}
            onApplyCustomRange={handleApplyCustomRange}
            onChangeDraftFrom={setDraftFrom}
            onChangeDraftTo={setDraftTo}
            onChangeRange={handleRangeChange}
            onRefresh={() => setReloadNonce((value) => value + 1)}
            onViewTrackDetail={() =>
              navigate(routePaths.artistTrackDetail(selectedTrackId))
            }
            rangeOptions={RANGE_OPTIONS}
            selectedRange={selectedRange}
          />

          {rangeHint ? (
            <div className="rounded-[24px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {rangeHint}
            </div>
          ) : null}

          {analyticsError ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {analyticsError}
            </div>
          ) : null}

          <TrackInsightsSummaryGrid summaryCards={summaryCards} />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.9fr)]">
            <TrackInsightsChartPanel
              chartIsEmpty={chartIsEmpty}
              chartMeta={chartMeta}
              chartMetric={chartMetric}
              items={dailyChart}
              isAnalyticsLoading={isAnalyticsLoading}
              latestMetricValue={latestMetricValue}
              maxMetricValue={maxMetricValue}
              metricOptions={CHART_METRICS}
              onChangeMetric={setChartMetric}
              sectionEyebrow="Xu hướng theo ngày"
              sectionTitle="Biểu đồ hiệu suất"
              sectionDescription="Chọn chỉ số cần theo dõi để so sánh diễn biến lượt phát, quy mô người nghe, thời lượng nghe trung bình và số lượt bỏ qua."
              tooltipLabelFormatter={(value) =>
                formatDateLabel(value, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              }
              xAxisLabelFormatter={(value) => formatDateLabel(value)}
            />

            <TrackInsightsSidebar
              analytics={analytics}
              dailyChartLength={dailyChart.length}
              lastActiveDay={lastActiveDay}
              quickInsights={quickInsights}
            />
          </div>

          <TrackInsightsChartPanel
            chartIsEmpty={monthlyChartIsEmpty}
            chartMeta={monthlyChartMeta}
            chartMetric={monthlyChartMetric}
            items={monthlyChart}
            isAnalyticsLoading={isAnalyticsLoading}
            latestMetricValue={latestMonthlyMetricValue}
            maxMetricValue={maxMonthlyMetricValue}
            metricOptions={MONTHLY_CHART_METRICS}
            onChangeMetric={setMonthlyChartMetric}
            sectionEyebrow="Xu hướng theo tháng"
            sectionTitle="Biểu đồ tích lũy theo tháng"
            sectionDescription="Theo dõi hiệu suất dài hạn của bài hát qua từng tháng với lượt phát, người nghe, stream hợp lệ và doanh thu."
            emptyTitle="Chưa có dữ liệu theo tháng"
            emptyDescription="Khi backend bắt đầu tổng hợp dữ liệu theo tháng, biểu đồ tích lũy sẽ hiển thị tại đây."
            tooltipLabelFormatter={(value) => formatMonthLabel(value)}
            xAxisLabelFormatter={(value) =>
              formatMonthLabel(value, { month: "2-digit", year: "2-digit" })
            }
          />

          <TrackInsightsDailyTable dailyChart={dailyChart} />
        </>
      )}
    </section>
  );
};

export default ArtistTrackInsightsPage;
