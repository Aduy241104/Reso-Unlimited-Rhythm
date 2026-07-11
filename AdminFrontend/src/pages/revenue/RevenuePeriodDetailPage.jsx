import { useEffect, useState } from "react";
import {
  AlertCircle,
  CircleDollarSign,
  Coins,
  LoaderCircle,
  Radio,
  ReceiptText,
  ShieldCheck,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useParams } from "react-router-dom";
import {
  calculateRevenueDistributionService,
  closeRevenuePeriodService,
  confirmRevenueDistributionService,
  getRevenuePeriodDetailService,
} from "../../services/revenueService";
import RevenueActionConfirmModal from "./components/RevenueActionConfirmModal";
import RevenueDistributionArtistsTable from "./components/RevenueDistributionArtistsTable";
import RevenueLifecycleModal from "./components/RevenueLifecycleModal";
import RevenuePeriodDetailHero from "./components/RevenuePeriodDetailHero";
import RevenuePeriodInfoSection from "./components/RevenuePeriodInfoSection";
import { DashboardCard } from "./components/RevenueShared";
import RevenueSummaryCard from "./components/RevenueSummaryCard";
import RevenueWorkflowPanel from "./components/RevenueWorkflowPanel";
import {
  buildLifecycleItems,
  buildWorkflowSteps,
  getConfirmedByName,
  getDistributionSummary,
  getRevenuePeriodLabel,
  getWorkflowStateTone,
  isActionAvailable,
} from "./revenueOverviewModel";
import {
  formatCurrency,
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
  const workflowCards = buildWorkflowSteps(
    lifecycleTimestamps,
    availableActions
  ).map((step) => ({
    ...step,
    tone: getWorkflowStateTone(step.state),
    isAvailable: isActionAvailable(availableActions, step.key),
  }));
  const lifecycleItems = buildLifecycleItems(
    lifecycleTimestamps,
    confirmedBy
  );
  const distributionSummary = getDistributionSummary(distribution);
  const confirmedByName = getConfirmedByName(confirmedBy);
  const shouldShowEligibleStreams = period?.status && period.status !== "open";
  const shouldShowLifecycleButton = lifecycleItems.length > 0;
  const shouldShowDistribution = Boolean(distribution);

  return (
    <section className="-mt-2 bg-[linear-gradient(180deg,#fcfcfd_0%,#f3f4f6_100%)] py-1 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-4">
        <RevenuePeriodDetailHero
          period={period}
          confirmedByLabel={
            confirmedBy ? confirmedByName : "Chưa có người xác nhận"
          }
          updatedAt={lifecycleTimestamps?.updatedAt}
          isRefreshing={isRefreshing}
          onRefresh={() => void handleRefresh()}
          onOpenLifecycle={() => setIsLifecycleModalOpen(true)}
          showLifecycleButton={shouldShowLifecycleButton}
          title={`Chi tiết kỳ doanh thu ${getRevenuePeriodLabel(period)}`}
        />

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
              <RevenueSummaryCard
                icon={<CircleDollarSign size={20} />}
                label="Doanh thu premium"
                value={formatCurrency(summary?.premiumRevenue)}
                helper="Tổng doanh thu premium ghi nhận trong kỳ."
              />
              <RevenueSummaryCard
                icon={<Coins size={20} />}
                label="Quỹ nghệ sĩ"
                value={formatCurrency(summary?.artistPool)}
                helper="Khoản doanh thu dành để phân bổ cho nghệ sĩ."
              />
              <RevenueSummaryCard
                icon={<Wallet size={20} />}
                label="Doanh thu nền tảng"
                value={formatCurrency(summary?.platformRevenue)}
                helper="Phần doanh thu được giữ lại cho nền tảng."
              />
              {shouldShowEligibleStreams ? (
                <RevenueSummaryCard
                  icon={<Radio size={20} />}
                  label="Stream hợp lệ"
                  value={formatNumber(summary?.totalEligibleStreams)}
                  helper="Số lượt stream được tính vào phân bổ doanh thu."
                />
              ) : null}
              <RevenueSummaryCard
                icon={<ReceiptText size={20} />}
                label="Giao dịch thành công"
                value={formatNumber(summary?.successfulTransactions)}
                helper="Số giao dịch premium thành công trong kỳ."
              />
            </div>

            <DashboardCard className="border-slate-200">
              <RevenueWorkflowPanel
                workflowCards={workflowCards}
                onActionClick={openActionModal}
              />
            </DashboardCard>

            <RevenuePeriodInfoSection
              period={period}
              confirmedByLabel={confirmedBy ? confirmedByName : "Chưa có"}
              confirmedByEmail={confirmedBy?.email}
              lifecycleTimestamps={lifecycleTimestamps}
            />

            {shouldShowDistribution ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {distributionSummary.map((item) => (
                    <RevenueSummaryCard
                      key={item.key}
                      icon={<UsersRound size={20} />}
                      label={item.label}
                      value={item.value}
                      helper={item.helper}
                    />
                  ))}
                </div>

                <RevenueDistributionArtistsTable artists={artists} />
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
