import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Headphones, LoaderCircle } from "lucide-react";
import { usePlayer } from "../../hooks/usePlayer";
import { getCurrentUserRecentListeningActivity } from "../../services/user.recentListening.service";
import { getApiErrorMessage } from "../../utils/apiError";

const pageShellClassName =
  "min-h-screen bg-[#030303] px-4 py-8 text-white sm:px-6 lg:px-8";

const panelClassName =
  "rounded-[30px] border border-white/8 bg-[#0d0d0d] shadow-[0_24px_70px_rgba(0,0,0,0.42)]";

const chartViewBox = { width: 1000, height: 350 };
const chartPadding = { top: 16, right: 14, bottom: 52, left: 42 };
const chartBarFill = "url(#recentListeningBarGradient)";

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

const StatCard = ({ icon: Icon, label, value, hint }) => (
  <div className="rounded-[22px] border border-white/7 bg-white/[0.03] px-5 py-4">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-white/88">
        <Icon className="h-5 w-5" />
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
    <p className="mt-3 text-sm leading-6 text-white/50">{hint}</p>
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
    const barWidth = Math.min(slotWidth * 0.74, 74);

    const bars = chartData.map((item, index) => {
      const listenCount = Math.max(Number(item.listenCount) || 0, 0);
      const ratio =
        chartMaxListenCount > 0
          ? Math.min(Math.max(listenCount / chartMaxListenCount, 0), 1)
          : 0;
      const height = ratio * innerHeight;
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
    <div className="rounded-[24px] border border-white/7 bg-[#050505] p-4 sm:p-5">
      <svg
        viewBox={`0 0 ${chartViewBox.width} ${chartViewBox.height}`}
        className="h-[300px] w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Biểu đồ cột lượt nghe trong 7 ngày gần nhất"
      >
        <defs>
          <linearGradient
            id="recentListeningBarGradient"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#5c9fff" />
            <stop offset="100%" stopColor="#4f8fe7" />
          </linearGradient>
        </defs>

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
                x={chartPadding.left - 14}
                y={y + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.54)"
                fontSize="13"
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
              height={Math.max(bar.height, 2)}
              rx="10"
              ry="10"
              fill={chartBarFill}
            >
              <title>{`${bar.label}: ${bar.listenCount} lượt nghe`}</title>
            </rect>
            <text
              x={bar.labelX}
              y={chartViewBox.height - 20}
              textAnchor="middle"
              fill="rgba(255,255,255,0.62)"
              fontSize="13"
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
  <section className="rounded-[26px] border border-dashed border-white/15 bg-[#080808] px-6 py-14 text-center">
    <p className="text-lg font-semibold text-white">{title}</p>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/58">
      {description}
    </p>
  </section>
);

const UserRecentListeningPage = () => {
  const { currentTrack, currentTime, isPlaying } = usePlayer();
  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadActivity = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      const nextActivity = await getCurrentUserRecentListeningActivity();
      setActivity(nextActivity);
    } catch (error) {
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
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadActivity({ silent: true });
    }, 10000);

    const handleWindowFocus = () => {
      loadActivity({ silent: true });
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [loadActivity]);

  const chartData = useMemo(() => activity?.chart || [], [activity]);
  const summary = activity?.summary || {
    totalListens: 0,
    totalMinutes: 0,
  };

  const liveListeningMinutes =
    isPlaying && currentTrack
      ? Number((Math.max(Number(currentTime) || 0, 0) / 60).toFixed(1))
      : 0;

  const displayedTotalMinutes = Number(
    (Number(summary.totalMinutes || 0) + liveListeningMinutes).toFixed(1)
  );

  const chartSeries = useMemo(
    () =>
      chartData.map((item) => ({
        ...item,
        displayLabel: buildChartDateLabel(item),
      })),
    [chartData]
  );

  const todayPoint = chartSeries[chartSeries.length - 1] || {
    listenCount: 0,
  };

  const chartMaxListenCount = useMemo(() => {
    const highestPoint = Math.max(
      ...chartSeries.map((item) => Math.max(Number(item.listenCount) || 0, 0)),
      0
    );

    if (highestPoint <= 4) {
      return 16;
    }

    const paddedValue = Math.ceil(highestPoint * 1.1);
    return Math.max(Math.ceil(paddedValue / 4) * 4, 8);
  }, [chartSeries]);

  const averageDailyListens =
    chartSeries.length > 0
      ? chartSeries.reduce(
          (sum, item) => sum + Math.max(Number(item.listenCount) || 0, 0),
          0
        ) / chartSeries.length
      : 0;

  if (isLoading) {
    return (
      <main className={pageShellClassName}>
        <section
          className={`mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center ${panelClassName}`}
        >
          <div className="flex items-center gap-3 text-sm text-white/60">
            <LoaderCircle className="h-5 w-5 animate-spin text-white" />
            Đang tải hoạt động nghe gần đây...
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={pageShellClassName}>
      <section className="mx-auto w-full max-w-7xl space-y-6">
        <section className={`${panelClassName} overflow-hidden p-6 sm:p-7 lg:p-8`}>
          <div className="border-b border-white/8 pb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-white/35">
              Hoạt động nghe gần đây
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[3.05rem] sm:leading-[1.05]">
              Thống kê lượt nghe 7 ngày
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55 sm:text-base">
              Biểu đồ bên dưới hiển thị số lượt nghe theo từng ngày trong 7 ngày
              gần nhất.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <StatCard
              icon={Headphones}
              label="7 ngày qua"
              value={`${formatCount(summary.totalListens)} lượt`}
              hint="Tổng số lượt nghe được ghi nhận trong 7 ngày gần nhất."
            />
            <StatCard
              icon={Clock3}
              label="Thời gian nghe"
              value={formatMinutesAsVietnameseDuration(displayedTotalMinutes)}
              hint="Tổng thời gian nghe trong cùng giai đoạn."
            />
            <StatCard
              icon={Clock3}
              label="Hôm nay"
              value={`${formatCount(todayPoint.listenCount)} lượt`}
              hint="Số lượt nghe đã được ghi nhận trong ngày hiện tại."
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
                description="Khi bạn nghe nhạc, biểu đồ 7 ngày sẽ xuất hiện ở đây để bạn theo dõi số lượt nghe theo từng ngày."
              />
            )}
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-[24px] border border-white/10 bg-[#111111] px-5 py-4 text-sm text-white/78">
            {errorMessage}
          </section>
        ) : null}
      </section>
    </main>
  );
};

export default UserRecentListeningPage;
