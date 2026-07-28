import { useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  Heart,
  MousePointerClick,
  Repeat2,
  SkipForward,
  UserPlus,
  Users,
} from "lucide-react";
import TrackInsightsSummaryGrid from "./trackInsights/components/TrackInsightsSummaryGrid";

export const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatPercent = (value) => `${formatNumber(value)}%`;

export const formatDateLabel = (
  value,
  options = { day: "2-digit", month: "short", year: "numeric" }
) => {
  if (!value) {
    return "--";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", options).format(date);
};

export const SOURCE_LABEL_MAP = {
  "Track detail": "Chi tiết bài hát",
  "Chi tiet bai hat": "Chi tiết bài hát",
  Album: "Album",
  Playlist: "Playlist",
  Search: "Tìm kiếm",
  "Tim kiem": "Tìm kiếm",
  "Artist profile": "Trang nghệ sĩ",
  "Trang nghe si": "Trang nghệ sĩ",
  Unknown: "Không xác định",
  "Khong xac dinh": "Không xác định",
};

export const DEVICE_LABEL_MAP = {
  Mobile: "Di động",
  Desktop: "Máy tính",
  Tablet: "Máy tính bảng",
  Unknown: "Không xác định",
  "Khong xac dinh": "Không xác định",
};

export const LOYALTY_LABEL_MAP = {
  "1 stream": "1 lượt nghe",
  "1 luot nghe": "1 lượt nghe",
  "2 - 4 streams": "2 - 4 lượt nghe",
  "2 - 4 luot nghe": "2 - 4 lượt nghe",
  "5 - 9 streams": "5 - 9 lượt nghe",
  "5 - 9 luot nghe": "5 - 9 lượt nghe",
  "10+ streams": "10+ lượt nghe",
  "10+ luot nghe": "10+ lượt nghe",
};

export const localizeItems = (items = [], labelMap = {}) =>
  items.map((item) => ({
    ...item,
    label: labelMap[item?.label] || item?.label,
  }));

export const buildListenerBehaviorSummaryCards = (summary) => [
  {
    label: "Tổng lượt stream",
    value: `${formatNumber(summary?.totalStreams)} lượt`,
    helper: "Toàn bộ lượt stream đã được ghi nhận.",
    icon: Activity,
  },
  {
    label: "Người nghe duy nhất",
    value: `${formatNumber(summary?.uniqueListeners)} người`,
    helper: "Số người nghe riêng biệt đã phát nhạc của bạn.",
    icon: Users,
  },
  {
    label: "Người nghe quay lại",
    value: `${formatNumber(summary?.returningListeners)} người`,
    helper: "Người nghe có ít nhất 2 lượt nghe.",
    icon: Repeat2,
  },
  {
    label: "Stream trung bình mỗi người",
    value: `${formatNumber(summary?.averageStreamsPerListener)} lượt`,
    helper: "Độ sâu nghe trung bình trên mỗi người nghe duy nhất.",
    icon: MousePointerClick,
  },
  {
    label: "Tỷ lệ nghe hết",
    value: formatPercent(summary?.completionRate),
    helper: "Số lượt nghe hoàn thành chia cho tổng lượt nghe.",
    icon: CheckCircle2,
  },
  {
    label: "Tỷ lệ bỏ qua",
    value: formatPercent(summary?.skipRate),
    helper: "Số lượt nghe bị bỏ qua chia cho tổng lượt nghe.",
    icon: SkipForward,
  },
];

export const ListenerBehaviorSummaryGrid = ({ summary }) => (
  <TrackInsightsSummaryGrid
    summaryCards={buildListenerBehaviorSummaryCards(summary)}
    className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
  />
);

export const BreakdownCard = ({
  title,
  description,
  items,
  emptyMessage,
  maxItems,
  valueFormatter,
}) => {
  const visibleItems = useMemo(() => {
    const filteredItems = (items || []).filter((item) => Number(item?.count) > 0);
    return typeof maxItems === "number"
      ? filteredItems.slice(0, maxItems)
      : filteredItems;
  }, [items, maxItems]);

  return (
    <section className="rounded-[18px] border border-[#e7e1ff] bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-[#2f2747]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#7c7891]">{description}</p>

      {visibleItems.length === 0 ? (
        <div className="mt-5 rounded-[16px] border border-dashed border-neutral-200 bg-[#faf9ff] px-4 py-6 text-sm text-[#7c7891]">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {visibleItems.map((item) => (
            <div key={item.key || item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-medium text-[#2f2747]">{item.label}</p>
                <p className="text-[#6b6682]">
                  {valueFormatter
                    ? valueFormatter(item)
                    : `${formatNumber(item.count)} (${formatPercent(item.percentage)})`}
                </p>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f0edff]">
                <div
                  className="h-full rounded-full bg-[#7c6cf2]"
                  style={{ width: `${Math.min(Number(item.percentage) || 0, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export const EngagementCard = ({ engagement }) => (
  <section className="rounded-[18px] border border-[#e7e1ff] bg-white p-5 shadow-sm">
    <h3 className="text-lg font-semibold text-[#2f2747]">Tương tác của người nghe</h3>
    <p className="mt-2 text-sm leading-6 text-[#7c7891]">
      Ghi nhận các tương tác của người nghe với trang nghệ sĩ và các bài hát của bạn.
    </p>

    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        {
          label: "Người nghe có tương tác",
          value: formatNumber(engagement?.engagedListeners),
          helper: `${formatPercent(engagement?.engagementRate)} trên tổng người nghe duy nhất`,
          icon: Users,
        },
        {
          label: "Lượt theo dõi",
          value: formatNumber(engagement?.followActions),
          helper: "Số lượt follow nghệ sĩ",
          icon: UserPlus,
        },
        {
          label: "Lượt thích",
          value: formatNumber(engagement?.likeActions),
          helper: "Số lượt thích bài hát hoặc nghệ sĩ",
          icon: Heart,
        },
        {
          label: "Tổng tương tác",
          value: formatNumber(engagement?.totalActions),
          helper: "Tổng hợp lượt thích và theo dõi",
          icon: MousePointerClick,
        },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-[16px] border border-[#efeaff] bg-[#faf9ff] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[#7c7891]">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#2f2747]">{item.value}</p>
            </div>
            <item.icon className="h-5 w-5 text-[#7c6cf2]" />
          </div>
          <p className="mt-3 text-xs leading-5 text-[#7c7891]">{item.helper}</p>
        </div>
      ))}
    </div>
  </section>
);
