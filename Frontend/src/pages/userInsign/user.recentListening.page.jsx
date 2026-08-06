import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  Crown,
  Headphones,
  LockKeyhole,
  Music2,
  Tags,
} from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import { useAuth } from "../../hooks/useAuth";
import { routePaths } from "../../routes/routePaths";
import { getCurrentUserRecentListeningActivity } from "../../services/user.recentListening.service";
import { getApiErrorMessage } from "../../utils/apiError";
import { hasPremiumAccess } from "../../utils/premiumAccess";
import { filterPlayableTracks } from "../../utils/trackStatus";
import { getTrackDisplayTitle } from "../../utils/trackTitle";

const pageShellClassName =
  "min-h-screen bg-[#020202] px-4 py-8 text-white sm:px-6 lg:px-8";

const lightGrayBorderClassName = "border border-[#d1d5db]/25";
const lightGraySoftBorderClassName = "border border-[#d1d5db]/20";
const lightGrayDividerClassName = "border-[#d1d5db]/18";

const panelClassName =
  `rounded-[20px] ${lightGrayBorderClassName} bg-[#0b0b0b] shadow-[0_24px_70px_rgba(0,0,0,0.42)]`;

const chartViewBox = { width: 940, height: 280 };
const chartPadding = { top: 18, right: 18, bottom: 42, left: 44 };

const formatMinutesAsVietnameseDuration = (minutesValue) => {
  const totalMinutes = Math.max(Math.round(Number(minutesValue) || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} phút`;
  }

  if (minutes <= 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${minutes} phút`;
};

const formatCount = (value) => `${Math.max(Math.round(Number(value) || 0), 0)}`;

const formatPercentage = (value) => {
  const percentage = Math.min(Math.max(Number(value) || 0, 0), 100);

  return Number.isInteger(percentage)
    ? `${percentage}%`
    : `${percentage.toFixed(1)}%`;
};

const formatComparisonMessage = (comparison = {}) => {
  const listenComparison = comparison?.listenCount || {};
  const minuteComparison = comparison?.listenedMinutes || {};
  const listenDelta = Math.round(Number(listenComparison.absoluteDiff) || 0);
  const minuteDelta = Number(minuteComparison.absoluteDiff || 0);

  if (listenComparison.trend === "same" && minuteComparison.trend === "same") {
    return "Hôm nay bạn nghe tương đương hôm qua.";
  }

  const direction =
    listenComparison.trend === "down" || minuteComparison.trend === "down"
      ? "ít hơn"
      : "nhiều hơn";

  const parts = [];

  if (listenDelta > 0) {
    parts.push(`${listenDelta} lượt`);
  }

  if (minuteDelta > 0) {
    parts.push(formatMinutesAsVietnameseDuration(minuteDelta));
  }

  if (parts.length === 0) {
    return "Hôm nay bạn nghe tương đương hôm qua.";
  }

  return `Hôm nay bạn nghe ${direction} hôm qua ${parts.join(" và ")}.`;
};

const buildChartDateLabel = (item) => {
  if (typeof item?.date === "string") {
    const [, month, day] = item.date.split("-");
    if (month && day) {
      return `${day}/${month}`;
    }
  }

  if (typeof item?.label === "string" && item.label.trim()) {
    return item.label.trim();
  }

  return "";
};

const StatCard = ({ icon, label, value, hint }) => (
  <div className={`rounded-[22px] ${lightGraySoftBorderClassName} bg-white/[0.03] px-5 py-4`}>
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${lightGraySoftBorderClassName} bg-white/[0.04] text-white/88`}>
        {createElement(icon, { className: "h-5 w-5" })}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-white/38">
          {label}
        </p>
        <p className="mt-2 text-xl font-semibold tracking-tight text-white">
          {value}
        </p>
      </div>
    </div>
    <p className="mt-3 text-sm leading-6 text-white/55">{hint}</p>
  </div>
);

const ListeningBarChart = ({ chartData, chartMaxListenCount }) => {
  const chartMetrics = useMemo(() => {
    const innerWidth =
      chartViewBox.width - chartPadding.left - chartPadding.right;
    const innerHeight =
      chartViewBox.height - chartPadding.top - chartPadding.bottom;
    const slotWidth =
      chartData.length > 0 ? innerWidth / chartData.length : innerWidth;
    const barWidth = Math.min(slotWidth * 0.64, 64);

    const bars = chartData.map((item, index) => {
      const listenCount = Math.max(Number(item.listenCount) || 0, 0);
      const ratio =
        chartMaxListenCount > 0
          ? Math.min(Math.max(listenCount / chartMaxListenCount, 0), 1)
          : 0;
      const height = Math.max(ratio * innerHeight, listenCount > 0 ? 6 : 0);
      const x =
        chartPadding.left + slotWidth * index + (slotWidth - barWidth) / 2;
      const y = chartPadding.top + innerHeight - height;
      const labelX = chartPadding.left + slotWidth * index + slotWidth / 2;

      return {
        id: `${item.date || item.label || index}`,
        x,
        y,
        width: barWidth,
        height,
        labelX,
        label: item.displayLabel,
        listenCount,
      };
    });

    return {
      innerHeight,
      bars,
    };
  }, [chartData, chartMaxListenCount]);

  const axisStops = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, index) => {
      const ratio = 1 - index / steps;
      return Math.round(chartMaxListenCount * ratio);
    });
  }, [chartMaxListenCount]);

  return (
    <div
      className={`overflow-hidden rounded-[10px] ${lightGrayBorderClassName} bg-[#060606] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-4`}
    >
      <svg
        viewBox={`0 0 ${chartViewBox.width} ${chartViewBox.height}`}
        className="h-[240px] w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Biểu đồ cột lượt nghe trong 7 ngày gần nhất"
      >
        <rect
          x={chartPadding.left}
          y={chartPadding.top}
          width={chartViewBox.width - chartPadding.left - chartPadding.right}
          height={chartMetrics.innerHeight}
          fill="rgba(255,255,255,0.012)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />

        {axisStops.map((value) => {
          const ratio =
            chartMaxListenCount > 0
              ? Math.min(Math.max(value / chartMaxListenCount, 0), 1)
              : 0;
          const y =
            chartPadding.top +
            chartMetrics.innerHeight -
            ratio * chartMetrics.innerHeight;

          return (
            <g key={value}>
              <line
                x1={chartPadding.left}
                y1={y}
                x2={chartViewBox.width - chartPadding.right}
                y2={y}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="4 6"
              />
              <text
                x={chartPadding.left - 12}
                y={y + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.48)"
                fontSize="12"
              >
                {formatCount(value)}
              </text>
            </g>
          );
        })}

        {chartMetrics.bars.map((bar) => (
          <g key={bar.id}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx="2"
              ry="2"
              fill="#60a5fa"
            >
              <title>{`${bar.label}: ${bar.listenCount} lượt nghe`}</title>
            </rect>
            {bar.listenCount > 0 ? (
              <text
                x={bar.labelX}
                y={Math.max(bar.y - 8, 12)}
                textAnchor="middle"
                fill="rgba(255,255,255,0.72)"
                fontSize="11"
                fontWeight="600"
              >
                {formatCount(bar.listenCount)}
              </text>
            ) : null}
            <text
              x={bar.labelX}
              y={chartViewBox.height - 14}
              textAnchor="middle"
              fill="rgba(255,255,255,0.66)"
              fontSize="12"
            >
              {bar.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const EmptyState = ({ title, description }) => (
  <section className="rounded-[18px] border border-dashed border-[#d1d5db]/25 bg-[#080808] px-6 py-14 text-center">
    <p className="text-lg font-semibold text-white">{title}</p>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/58">
      {description}
    </p>
  </section>
);

const isPremiumAccessDeniedError = (error) => {
  const status = Number(error?.response?.status || 0);
  const requiredPlan = error?.response?.data?.errors?.requiredPlan;
  const message = String(error?.response?.data?.message || "").toLowerCase();

  return (
    status === 403 &&
    (requiredPlan === "premium" || message.includes("premium"))
  );
};

const PremiumRequiredState = () => (
  <main className={`${pageShellClassName} relative overflow-hidden`}>
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[#f1c27d]/10 blur-[110px]" />
      <div className="absolute -right-32 bottom-[-10rem] h-80 w-80 rounded-full bg-[#9672ff]/[0.08] blur-[100px]" />
    </div>

    <section className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center justify-center">
      <div className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(24,22,18,0.98),rgba(10,10,10,0.98)_48%,rgba(8,8,8,1))] shadow-[0_30px_100px_rgba(0,0,0,0.52)]">
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[#f1c27d]/10 blur-3xl" />

        <div className="relative grid gap-10 p-6 sm:p-9 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:p-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f1c27d]/20 bg-[#f1c27d]/[0.08] px-3.5 py-2 text-xs font-semibold text-[#f4cf95]">
              <Crown className="h-4 w-4" />
              Dành cho thành viên Premium
            </div>

            <h1 className="mt-6 max-w-xl text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-[3.25rem]">
              Khám phá câu chuyện âm nhạc của bạn
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/58 sm:text-base">
              Nâng cấp Premium để xem hoạt động nghe nhạc trong 7 ngày gần nhất,
              thể loại nổi bật và những bài hát bạn yêu thích nhất.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { Icon: Headphones, label: "Thống kê 7 ngày" },
                { Icon: Tags, label: "Thể loại nổi bật" },
                { Icon: Music2, label: "Bài hát yêu thích" },
              ].map((benefit) => (
                <div
                  key={benefit.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3.5"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1c27d]/10 text-[#f1c27d]">
                    <benefit.Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-xs font-medium leading-5 text-white/72">
                    {benefit.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={routePaths.premium}
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f1c27d] px-6 text-sm font-semibold text-[#18120a] transition hover:-translate-y-0.5 hover:bg-[#f4cf95]"
              >
                Xem các gói Premium
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to={routePaths.home}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 px-6 text-sm font-semibold text-white/68 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
              >
                Về trang chủ
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg" aria-hidden="true">
            <div className="absolute inset-5 rounded-[28px] bg-[#f1c27d]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#101010]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)] sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/32">
                    Hoạt động nghe gần đây
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white/88">
                    Tổng quan 7 ngày
                  </p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#f1c27d]/20 bg-[#f1c27d]/10 text-[#f1c27d]">
                  <LockKeyhole className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {["Lượt nghe", "Phút nghe", "Bài hát"].map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3"
                  >
                    <div className="h-5 w-12 rounded-md bg-white/10" />
                    <p className="mt-2 truncate text-[10px] text-white/30">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex h-40 items-end justify-between gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 pb-4 pt-6">
                {[38, 58, 44, 82, 64, 92, 72].map((height, index) => (
                  <div key={`${height}-${index}`} className="flex h-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-[linear-gradient(180deg,rgba(241,194,125,0.72),rgba(241,194,125,0.14))]"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-black/15 backdrop-blur-[2px]">
                <div className="rounded-full border border-white/10 bg-[#111111]/90 px-4 py-2 text-xs font-semibold text-white/72 shadow-xl">
                  Nâng cấp để mở khóa
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
);

const InsightBadge = ({ icon, label, value, hint }) => (
  <div className={`rounded-[20px] ${lightGraySoftBorderClassName} bg-white/[0.03] p-4`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-white/35">
          {label}
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${lightGraySoftBorderClassName} bg-white/[0.04] text-white/88`}>
        {createElement(icon, { className: "h-5 w-5" })}
      </div>
    </div>
    <p className="mt-3 text-sm leading-6 text-white/52">{hint}</p>
  </div>
);

const UserInsightSection = ({ activity }) => {
  const topGenres = activity?.topGenres || [];
  const topTracks = filterPlayableTracks(activity?.topTracks || []);

  return (
    <section className={`${panelClassName} overflow-hidden p-6 sm:p-7 lg:p-8`}>
      <div className={`flex flex-col gap-4 border-b ${lightGrayDividerClassName} pb-6 lg:flex-row lg:items-end lg:justify-between`}>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/35">
            Insight gần đây
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[2.25rem] sm:leading-[1.08]">
            Thể loại và bài hát bạn nghe nhiều nhất
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55 sm:text-base">
            Phần này cập nhật ngay khi bạn tải lại trang để bạn thấy thể loại và
            bài hát nổi bật trong 7 ngày gần nhất.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
          <InsightBadge
            icon={Music2}
            label="Top bài hát"
            value={`${formatCount(topTracks.length)} bài`}
            hint="Danh sách bài hát xuất hiện nhiều nhất gần đây."
          />
          <InsightBadge
            icon={Tags}
            label="Top thể loại"
            value={`${formatCount(topGenres.length)} thể loại`}
            hint="Những thể loại bạn nghe nhiều nhất trong 7 ngày qua."
          />
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className={`rounded-[16px] ${lightGraySoftBorderClassName} bg-[#050505] p-5`}>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">
              Top thể loại
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Thể loại bạn nghe nhiều
            </h3>
          </div>

          {topGenres.length === 0 ? (
            <p className="mt-5 text-sm leading-6 text-white/52">
              Chưa có dữ liệu thể loại trong 7 ngày gần nhất.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {topGenres.map((genre) => (
                <div key={genre.id || genre.name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {genre.name}
                      </p>
                      <p className="mt-1 text-xs text-white/42">
                        {formatCount(genre.trackCount)} bài hát
                      </p>
                    </div>
                    <p className="shrink-0 text-white/72">
                      {formatPercentage(genre.percentage)}
                    </p>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-[#5c9fff]"
                      style={{
                        width: `${Math.max(
                          6,
                          Math.min(Number(genre.percentage) || 0, 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`rounded-[16px] ${lightGraySoftBorderClassName} bg-[#050505] p-5`}>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">
              Top bài hát
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Bài hát bạn nghe nhiều nhất
            </h3>
          </div>

          {topTracks.length === 0 ? (
            <p className="mt-5 text-sm leading-6 text-white/52">
              Chưa có bài hát nào được ghi nhận trong 7 ngày gần nhất.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {topTracks.map((track, index) => (
                <article
                  key={track.id || `${track.title}-${index}`}
                  className={`flex flex-col gap-4 rounded-[20px] ${lightGraySoftBorderClassName} bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${lightGraySoftBorderClassName} bg-white/[0.04] text-sm font-semibold text-white/88`}>
                      {index + 1}
                    </div>

                    {track.image ? (
                      <img
                        src={track.image}
                        alt={getTrackDisplayTitle(track, track.title)}
                        className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${lightGraySoftBorderClassName} bg-white/[0.04] text-white/70`}>
                        <Music2 className="h-6 w-6" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">
                        {getTrackDisplayTitle(track, track.title)}
                      </p>
                      <p className="mt-1 text-sm text-white/48">
                        {track.genres.length > 0
                          ? track.genres.map((genre) => genre.name).join(" • ")
                          : "Chưa gắn thể loại"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 md:min-w-[240px]">
                    <div className={`rounded-[16px] ${lightGraySoftBorderClassName} bg-[#090909] px-4 py-3`}>
                      <p className="text-xs uppercase tracking-[0.16em] text-white/34">
                        Lượt nghe
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatCount(track.listenCount)}
                      </p>
                    </div>
                    <div className={`rounded-[16px] ${lightGraySoftBorderClassName} bg-[#090909] px-4 py-3`}>
                      <p className="text-xs uppercase tracking-[0.16em] text-white/34">
                        Thời gian nghe
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatMinutesAsVietnameseDuration(track.listenedMinutes)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

const UserRecentListeningPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [premiumDeniedUserKey, setPremiumDeniedUserKey] = useState("");
  const activeActivityRequestRef = useRef(null);
  const currentUserKey = String(
    user?.id || user?._id || user?.userId || user?.email || "anonymous"
  );
  const hasPremiumPermission = useMemo(
    () =>
      hasPremiumAccess(user) && premiumDeniedUserKey !== currentUserKey,
    [currentUserKey, premiumDeniedUserKey, user]
  );

  const loadActivity = useCallback(async ({ silent = false } = {}) => {
    if (activeActivityRequestRef.current) {
      return activeActivityRequestRef.current;
    }

    if (!silent) {
      setIsLoading(true);
    }

    setErrorMessage("");

    const activityRequest = (async () => {
      try {
        const nextActivity = await getCurrentUserRecentListeningActivity();
        setActivity(nextActivity);
      } catch (error) {
        if (isPremiumAccessDeniedError(error)) {
          setActivity(null);
          setErrorMessage("");
          setPremiumDeniedUserKey(currentUserKey);
          return;
        }

        if (!silent) {
          setActivity(null);
        }

        setErrorMessage(
          getApiErrorMessage(
            error,
            "Không thể tải hoạt động nghe gần đây lúc này."
          )
        );
      } finally {
        if (!silent) {
          setIsLoading(false);
        }

        if (activeActivityRequestRef.current === activityRequest) {
          activeActivityRequestRef.current = null;
        }
      }
    })();

    activeActivityRequestRef.current = activityRequest;
    return activityRequest;
  }, [currentUserKey]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!hasPremiumPermission) {
      setIsLoading(false);
      return;
    }

    loadActivity();
  }, [hasPremiumPermission, isAuthLoading, loadActivity]);

  useEffect(() => {
    if (!hasPremiumPermission) {
      return undefined;
    }

    const handleWindowFocus = () => {
      loadActivity({ silent: true });
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [hasPremiumPermission, loadActivity]);

  const chartData = useMemo(() => activity?.chart || [], [activity]);
  const summary = activity?.summary || {
    totalListens: 0,
    totalMinutes: 0,
    today: {
      listenCount: 0,
      listenedMinutes: 0,
    },
    comparison: {
      listenCount: {
        current: 0,
        previous: 0,
        absoluteDiff: 0,
        trend: "same",
      },
      listenedMinutes: {
        current: 0,
        previous: 0,
        absoluteDiff: 0,
        trend: "same",
      },
    },
  };

  const chartSeries = useMemo(
    () =>
      chartData.map((item) => ({
        ...item,
        displayLabel: buildChartDateLabel(item),
      })),
    [chartData]
  );

  const chartMaxListenCount = useMemo(() => {
    const highestPoint = Math.max(
      ...chartSeries.map((item) => Math.max(Number(item.listenCount) || 0, 0)),
      0
    );

    if (highestPoint <= 4) {
      return 8;
    }

    const paddedValue = Math.ceil(highestPoint * 1.15);
    return Math.max(Math.ceil(paddedValue / 4) * 4, 8);
  }, [chartSeries]);

  const comparisonMessage = useMemo(
    () => formatComparisonMessage(summary.comparison),
    [summary.comparison]
  );

  if (isAuthLoading || isLoading) {
    return (
      <main className={pageShellClassName}>
        <section
          className={`mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center ${panelClassName}`}
        >
          <LoadingState message="Đang tải hoạt động nghe gần đây..." />
        </section>
      </main>
    );
  }

  if (!hasPremiumPermission) {
    return <PremiumRequiredState />;
  }

  return (
    <main className={pageShellClassName}>
      <section className="mx-auto w-full max-w-7xl space-y-6">
        <section className={`${panelClassName} overflow-hidden p-6 sm:p-7 lg:p-8`}>
          <div className={`flex flex-col gap-4 border-b ${lightGrayDividerClassName} pb-6 lg:flex-row lg:items-end lg:justify-between`}>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/35">
                Hoạt động nghe gần đây
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[3rem] sm:leading-[1.05]">
                Thống kê lượt nghe 7 ngày
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55 sm:text-base">
                Biểu đồ bên dưới hiển thị số lượt nghe theo từng ngày trong 7
                ngày gần nhất. Dữ liệu phần này được tổng hợp lại lúc 00:30 mỗi
                ngày.
              </p>
            </div>

            <div className={`rounded-[20px] ${lightGraySoftBorderClassName} bg-white/[0.03] px-4 py-3 text-sm text-white/60`}>
              So sánh hôm nay với hôm qua vẫn được tính theo dữ liệu nghe hiện tại.
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <StatCard
              icon={Headphones}
              label="7 ngày qua"
              value={`${formatCount(summary.totalListens)} lượt`}
              hint="Tổng số lượt nghe đã được chốt trong 7 ngày gần nhất."
            />
            <StatCard
              icon={Clock3}
              label="Thời gian nghe 7 ngày"
              value={formatMinutesAsVietnameseDuration(summary.totalMinutes)}
              hint="Tổng thời gian nghe trong cùng giai đoạn 7 ngày."
            />
            <StatCard
              icon={Clock3}
              label="Hôm nay"
              value={formatMinutesAsVietnameseDuration(
                summary.today?.listenedMinutes
              )}
              hint={comparisonMessage}
            />
          </div>

          <div className="mt-6">
            {chartSeries.some((item) => Number(item.listenCount) > 0) ? (
              <ListeningBarChart
                chartData={chartSeries}
                chartMaxListenCount={chartMaxListenCount}
              />
            ) : (
              <EmptyState
                title="Chưa có dữ liệu nghe gần đây"
                description="Khi bạn nghe nhạc đủ dữ liệu, biểu đồ 7 ngày sẽ xuất hiện ở đây để bạn theo dõi số lượt nghe theo từng ngày."
              />
            )}
          </div>
        </section>

        {errorMessage ? (
          <section className={`rounded-[16px] ${lightGrayBorderClassName} bg-[#111111] px-5 py-4 text-sm text-white/78`}>
            {errorMessage}
          </section>
        ) : null}

        <UserInsightSection activity={activity} />
      </section>
    </main>
  );
};

export default UserRecentListeningPage;
