import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarRange,
  CircleDollarSign,
  Coins,
  LoaderCircle,
  Radio,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import {
  calculateRevenueDistributionService,
  closeRevenuePeriodService,
  confirmRevenueDistributionService,
  getRevenuePeriodDetailService,
} from "../../services/revenueService";
import RevenueActionConfirmModal from "./components/RevenueActionConfirmModal";
import RevenueLifecycleModal from "./components/RevenueLifecycleModal";
import { DashboardCard, StatusBadge } from "./components/RevenueShared";
import {
  buildLifecycleItems,
  buildWorkflowSteps,
  getActiveStatusLabel,
  getArtistBadgeTone,
  getArtistStatusLabel,
  getConfirmedByName,
  getDistributionSummary,
  getRevenuePeriodLabel,
  getVerificationStatusLabel,
  getWorkflowStateTone,
  isActionAvailable,
} from "./revenueOverviewModel";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getErrorMessage,
} from "./utils";

const ACTION_EXECUTORS = {
  close: closeRevenuePeriodService,
  calculate: calculateRevenueDistributionService,
  confirm: confirmRevenueDistributionService,
};

const createInitialActionModalState = () => ({
  isOpen: false,
  actionKey: null,
  phase: "idle",
  result: null,
  error: "",
});

const SummaryCard = ({ icon, label, value, helper }) => (
  <DashboardCard className="border-slate-200">
    <div className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <p className="mt-2 text-[1.6rem] font-semibold tracking-tight text-slate-950">
          {value}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        {icon}
      </div>
    </div>
  </DashboardCard>
);

const ArtistAvatar = ({ name, avatar }) => {
  const initial = name?.charAt(0)?.toUpperCase() || "A";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-11 w-11 rounded-2xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
      {initial}
    </div>
  );
};

const RevenuePeriodDetailPage = () => {
  const { periodId } = useParams();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionModal, setActionModal] = useState(createInitialActionModalState);
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadDetail = async () => {
      if (!periodId) {
        setError("Không tìm thấy kỳ doanh thu.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const result = await getRevenuePeriodDetailService(periodId);

        if (!isActive) {
          return;
        }

        setDetail(result);
      } catch (apiError) {
        if (!isActive) {
          return;
        }

        setError(getErrorMessage(apiError));
        setDetail(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      isActive = false;
    };
  }, [periodId]);

  const handleRefresh = async () => {
    if (!periodId) {
      return;
    }

    setIsRefreshing(true);
    setError("");

    try {
      const result = await getRevenuePeriodDetailService(periodId);
      setDetail(result);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setIsRefreshing(false);
    }
  };

  const openActionModal = (actionKey) => {
    setActionModal({
      isOpen: true,
      actionKey,
      phase: "idle",
      result: null,
      error: "",
    });
  };

  const closeActionModal = () => {
    if (actionModal.phase === "submitting") {
      return;
    }

    setActionModal(createInitialActionModalState());
  };

  const handleRunAction = async () => {
    const actionKey = actionModal.actionKey;
    const executor = ACTION_EXECUTORS[actionKey];
    const currentPeriodId = detail?.period?.id || detail?.id;

    if (!actionKey || !executor || !currentPeriodId) {
      return;
    }

    setActionModal((currentState) => ({
      ...currentState,
      phase: "submitting",
      result: null,
      error: "",
    }));

    try {
      const result = await executor(currentPeriodId);
      const refreshedDetail = await getRevenuePeriodDetailService(currentPeriodId);

      setDetail(refreshedDetail);
      setActionModal((currentState) => ({
        ...currentState,
        phase: "success",
        result,
        error: "",
      }));
    } catch (apiError) {
      setActionModal((currentState) => ({
        ...currentState,
        phase: "error",
        result: null,
        error: getErrorMessage(apiError),
      }));
    }
  };

  const period = detail?.period ?? null;
  const summary = detail?.summary ?? {};
  const lifecycleTimestamps = detail?.lifecycleTimestamps ?? {};
  const distribution = detail?.distribution ?? null;
  const availableActions = detail?.availableActions ?? [];
  const confirmedBy = detail?.confirmedBy ?? null;
  const artists = Array.isArray(distribution?.artists) ? distribution.artists : [];
  const workflowSteps = useMemo(
    () =>
      buildWorkflowSteps(lifecycleTimestamps, availableActions).map(
        (step, index, steps) => ({
          ...step,
          tone: getWorkflowStateTone(step.state),
          isAvailable: isActionAvailable(availableActions, step.key),
          isLastStep: index === steps.length - 1,
        })
      ),
    [availableActions, lifecycleTimestamps]
  );
  const lifecycleItems = useMemo(
    () => buildLifecycleItems(lifecycleTimestamps, confirmedBy),
    [confirmedBy, lifecycleTimestamps]
  );
  const distributionSummary = useMemo(
    () => getDistributionSummary(distribution),
    [distribution]
  );
  const confirmedByName = getConfirmedByName(confirmedBy);
  const shouldShowEligibleStreams = period?.status && period.status !== "open";
  const shouldShowLifecycleButton = lifecycleItems.length > 0;
  const shouldShowDistribution = Boolean(distribution);

  return (
    <section className="-mt-2 bg-[linear-gradient(180deg,#fcfcfd_0%,#f3f4f6_100%)] py-1 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-4">
        <DashboardCard className="border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef4ff_100%)] px-5 py-5 lg:px-6 lg:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Link
                to={routePaths.revenueHistory}
                className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700"
              >
                <ArrowLeft size={14} />
                Quay lại lịch sử doanh thu
              </Link>

              <div className="space-y-2">
                <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
                  Chi tiết kỳ doanh thu {getRevenuePeriodLabel(period)}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  Tra cứu số liệu của kỳ doanh thu đã lưu trên hệ thống và xử lý
                  các bước tiếp theo dựa trên trạng thái hiện tại từ backend.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-slate-600">
                <StatusBadge status={period?.status} />

                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                  <CalendarRange size={14} />
                  {formatDate(period?.periodStart)} - {formatDate(period?.periodEnd)}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                  <UsersRound size={14} />
                  {confirmedBy ? confirmedByName : "Chưa có người xác nhận"}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                  <RefreshCw size={14} />
                  Cập nhật: {formatDateTime(lifecycleTimestamps?.updatedAt)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {shouldShowLifecycleButton ? (
                <button
                  type="button"
                  onClick={() => setIsLifecycleModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Xem mốc xử lý
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={15}
                  className={isRefreshing ? "animate-spin" : undefined}
                />
                Làm mới dữ liệu
              </button>
            </div>
          </div>
        </DashboardCard>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <p className="text-sm leading-6">{error}</p>
          </div>
        ) : null}

        {isLoading ? (
          <DashboardCard className="border-slate-200 p-10">
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-slate-500">
                <LoaderCircle size={22} className="animate-spin" />
                <span className="text-sm font-medium">
                  Đang tải chi tiết kỳ doanh thu...
                </span>
              </div>
            </div>
          </DashboardCard>
        ) : period ? (
          <>
            <div
              className={`grid gap-4 md:grid-cols-2 ${
                shouldShowEligibleStreams ? "xl:grid-cols-5" : "xl:grid-cols-4"
              }`}
            >
              <SummaryCard
                icon={<CircleDollarSign size={20} />}
                label="Doanh thu premium"
                value={formatCurrency(summary?.premiumRevenue)}
                helper="Tổng doanh thu premium ghi nhận trong kỳ."
              />
              <SummaryCard
                icon={<Coins size={20} />}
                label="Quỹ nghệ sĩ"
                value={formatCurrency(summary?.artistPool)}
                helper="Khoản doanh thu dành để phân bổ cho nghệ sĩ."
              />
              <SummaryCard
                icon={<Wallet size={20} />}
                label="Doanh thu nền tảng"
                value={formatCurrency(summary?.platformRevenue)}
                helper="Phần doanh thu được giữ lại cho nền tảng."
              />
              {shouldShowEligibleStreams ? (
                <SummaryCard
                  icon={<Radio size={20} />}
                  label="Stream hợp lệ"
                  value={formatNumber(summary?.totalEligibleStreams)}
                  helper="Số lượt stream được tính vào phân bổ doanh thu."
                />
              ) : null}
              <SummaryCard
                icon={<ReceiptText size={20} />}
                label="Giao dịch thành công"
                value={formatNumber(summary?.successfulTransactions)}
                helper="Số giao dịch premium thành công trong kỳ."
              />
            </div>

            <DashboardCard className="border-slate-200">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Trạng thái xử lý
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Theo dõi tiến độ của kỳ doanh thu
                </h2>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
                  {workflowSteps.map((step) => (
                    <div key={step.key} className="relative">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-4 transition">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full border ${step.tone.ring}`}
                            >
                              <div
                                className={`h-3 w-3 rounded-full ${step.tone.dot}`}
                              />
                            </div>

                            <div>
                              <h3 className="text-base font-semibold text-slate-950">
                                {step.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {step.timestamp
                                  ? formatDateTime(step.timestamp)
                                  : "Chưa ghi nhận thời điểm xử lý"}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${step.tone.badge}`}
                          >
                            {step.tone.label}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openActionModal(step.key)}
                          disabled={!step.isAvailable}
                          className={`mt-4 inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                            step.isAvailable
                              ? "bg-slate-950 text-white hover:bg-slate-800"
                              : "cursor-not-allowed bg-slate-100 text-slate-400"
                          }`}
                        >
                          {step.isAvailable
                            ? "Thực hiện bước này"
                            : "Chưa thể thực hiện"}
                        </button>
                      </div>

                      {!step.isLastStep ? (
                        <div className="pointer-events-none absolute left-[calc(50%+1.25rem)] right-[-1.05rem] top-9 hidden h-[2px] lg:block">
                          <div
                            className={`h-full w-full rounded-full ${
                              step.state === "completed"
                                ? "bg-emerald-300"
                                : "bg-slate-200"
                            }`}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </DashboardCard>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <DashboardCard className="border-slate-200">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-lg font-semibold text-slate-950">
                    Thông tin kỳ doanh thu
                  </h2>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Thời gian áp dụng
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatDate(period?.periodStart)} - {formatDate(period?.periodEnd)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Người xác nhận
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {confirmedBy ? confirmedByName : "Chưa có"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {confirmedBy?.email || "Chưa có email"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Tổng hợp gần nhất
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatDateTime(lifecycleTimestamps?.lastAggregatedAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Cập nhật cuối
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatDateTime(lifecycleTimestamps?.updatedAt)}
                    </p>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard className="border-slate-200 px-5 py-14 text-center">
                <div className="mx-auto max-w-xl">
                  <ShieldCheck size={28} className="mx-auto text-slate-400" />
                  <p className="mt-4 text-sm font-medium text-slate-700">
                    Giao diện chi tiết kỳ doanh thu chỉ hiển thị dữ liệu nghiệp vụ
                    cần đối soát. Phần biểu đồ đã được lược bỏ theo yêu cầu.
                  </p>
                </div>
              </DashboardCard>
            </div>

            {shouldShowDistribution ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {distributionSummary.map((item) => (
                    <SummaryCard
                      key={item.key}
                      icon={<UsersRound size={20} />}
                      label={item.label}
                      value={item.value}
                      helper={item.helper}
                    />
                  ))}
                </div>

                <DashboardCard className="border-slate-200">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Phân bổ doanh thu
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                      Danh sách nghệ sĩ nhận doanh thu
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Hiển thị trực tiếp từ dữ liệu `distribution.artists` của API
                      chi tiết kỳ doanh thu.
                    </p>
                  </div>

                  {artists.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <p className="text-sm font-medium text-slate-600">
                        Kỳ này chưa có nghệ sĩ nào được phân bổ doanh thu.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[1180px] w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-left">
                            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Nghệ sĩ
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Stream hợp lệ
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Doanh thu gộp
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Nghệ sĩ nhận
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Nền tảng giữ
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Đã rút
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Còn khả dụng
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Trạng thái
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {artists.map((artistItem) => {
                            const artist = artistItem.artist ?? {};

                            return (
                              <tr
                                key={artistItem.artistId}
                                className="border-b border-slate-100 last:border-b-0"
                              >
                                <td className="px-5 py-4">
                                  <div className="flex items-start gap-3">
                                    <ArtistAvatar
                                      name={artist?.name}
                                      avatar={artist?.avatar}
                                    />

                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-950">
                                        {artist?.name || "Chưa có tên nghệ sĩ"}
                                      </p>
                                      <p className="mt-1 text-sm text-slate-500">
                                        ID: {artistItem.artistId}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                                          {getVerificationStatusLabel(
                                            artist?.verificationStatus
                                          )}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                                          {getActiveStatusLabel(artist?.activeStatus)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-slate-900">
                                  {formatNumber(artistItem.totalEligibleStreams)}
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-slate-900">
                                  {formatCurrency(artistItem.grossRevenueAmount)}
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-slate-900">
                                  {formatCurrency(artistItem.artistRevenueAmount)}
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-slate-900">
                                  {formatCurrency(artistItem.platformRevenueAmount)}
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-slate-900">
                                  {formatCurrency(artistItem.withdrawnAmount)}
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-slate-900">
                                  {formatCurrency(artistItem.availableAmount)}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="space-y-2">
                                    <span
                                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getArtistBadgeTone(
                                        artistItem.status
                                      )}`}
                                    >
                                      {getArtistStatusLabel(artistItem.status)}
                                    </span>
                                    <p className="text-xs text-slate-500">
                                      {artistItem.calculatedAt
                                        ? `Tính lúc ${formatDateTime(
                                            artistItem.calculatedAt
                                          )}`
                                        : "Chưa có thời điểm tính."}
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </DashboardCard>
              </>
            ) : null}
          </>
        ) : (
          <DashboardCard className="border-slate-200 px-5 py-14 text-center">
            <div className="mx-auto max-w-xl">
              <ShieldCheck size={28} className="mx-auto text-slate-400" />
              <p className="mt-4 text-sm font-medium text-slate-700">
                Không tìm thấy dữ liệu kỳ doanh thu này.
              </p>
            </div>
          </DashboardCard>
        )}
      </div>

      <RevenueActionConfirmModal
        period={period}
        modalState={actionModal}
        onClose={closeActionModal}
        onConfirm={handleRunAction}
      />

      <RevenueLifecycleModal
        isOpen={isLifecycleModalOpen}
        onClose={() => setIsLifecycleModalOpen(false)}
        period={period}
        lifecycleItems={lifecycleItems}
      />
    </section>
  );
};

export default RevenuePeriodDetailPage;
