import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { getArtistListenerBehaviorInsightsService } from "../../services/artistService";
import {
  BreakdownCard,
  DEVICE_LABEL_MAP,
  EngagementCard,
  formatDateLabel,
  formatNumber,
  formatPercent,
  ListenerBehaviorSummaryGrid,
  LOYALTY_LABEL_MAP,
  localizeItems,
  SOURCE_LABEL_MAP,
} from "./listenerBehaviorShared";

const normalizeErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải dữ liệu hành vi người nghe.";

const ArtistListenerBehaviorPage = () => {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadInsights = async () => {
      setIsLoading(true);

      try {
        const response = await getArtistListenerBehaviorInsightsService();

        if (!isMounted) {
          return;
        }

        setInsights(response);
        setErrorMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(normalizeErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInsights();

    return () => {
      isMounted = false;
    };
  }, []);

  const localizedSources = useMemo(
    () => localizeItems(insights?.behavior?.sources || [], SOURCE_LABEL_MAP),
    [insights?.behavior?.sources]
  );
  const localizedDevices = useMemo(
    () => localizeItems(insights?.behavior?.devices || [], DEVICE_LABEL_MAP),
    [insights?.behavior?.devices]
  );
  const localizedLoyaltySegments = useMemo(
    () => localizeItems(insights?.behavior?.loyaltySegments || [], LOYALTY_LABEL_MAP),
    [insights?.behavior?.loyaltySegments]
  );

  if (isLoading && !insights) {
    return (
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-7 text-sm text-[#6b6682] shadow-sm">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#7c6cf2]" />
          Đang tải dữ liệu hành vi người nghe...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
          Hành vi người nghe
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#2f2747]">
          {insights?.artist?.name || "Nghệ sĩ"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#7c7891]">
          Theo dõi cách người nghe quay lại, nghe hết bài, bỏ qua, tương tác và
          khám phá nhạc của bạn trên toàn bộ lịch sử dữ liệu hiện có.
        </p>

        <div className="mt-4 rounded-[16px] border border-[#efeaff] bg-[#faf9ff] px-4 py-3 text-sm text-[#6b6682]">
          Dữ liệu đang xem:{" "}
          <span className="font-semibold text-[#2f2747]">
            {formatDateLabel(insights?.period?.from)} - {formatDateLabel(insights?.period?.to)}
          </span>{" "}
          (toàn thời gian)
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      <ListenerBehaviorSummaryGrid summary={insights?.summary || {}} />

      <section className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Nguồn nghe nổi bật"
          description="Những nguồn mà người nghe bắt đầu phát nhạc nhiều nhất trên toàn bộ dữ liệu."
          items={localizedSources}
          emptyMessage="Chưa có dữ liệu nguồn nghe."
          maxItems={6}
        />

        <BreakdownCard
          title="Phân bổ thiết bị"
          description="Thiết bị mà người nghe đã sử dụng để phát nhạc của bạn."
          items={localizedDevices}
          emptyMessage="Chưa có dữ liệu thiết bị."
          maxItems={6}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Khung giờ nghe cao điểm"
          description="Những khung giờ có lượng stream mạnh nhất trên toàn bộ lịch sử dữ liệu."
          items={insights?.behavior?.listeningHours || []}
          emptyMessage="Chưa có hoạt động nghe nào."
          maxItems={6}
        />

        <BreakdownCard
          title="Phân khúc mức độ trung thành"
          description="Mức độ nghe sâu của người nghe dựa trên số lượt stream mỗi người."
          items={localizedLoyaltySegments}
          emptyMessage="Chưa có dữ liệu phân khúc người nghe."
          valueFormatter={(item) =>
            `${formatNumber(item.count)} người (${formatPercent(item.percentage)})`
          }
        />
      </section>

      <EngagementCard engagement={insights?.behavior?.engagement || {}} />
    </section>
  );
};

export default ArtistListenerBehaviorPage;
