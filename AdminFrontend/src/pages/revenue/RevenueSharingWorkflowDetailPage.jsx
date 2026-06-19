import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarRange,
  CircleDollarSign,
  Coins,
  LoaderCircle,
  Radio,
  ReceiptText,
  RefreshCw,
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
import RevenueWorkflowActions from "./components/RevenueWorkflowActions";
import RevenueWorkflowModal from "./components/RevenueWorkflowModal";
import { DashboardCard, StatusBadge } from "./components/RevenueShared";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getErrorMessage,
} from "./utils";
import { getRevenueReminderTone, resolveRevenueWorkflow } from "./workflow";

const ACTION_EXECUTORS = {
  close: closeRevenuePeriodService,
  calculate: calculateRevenueDistributionService,
  confirm: confirmRevenueDistributionService,
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
    <span className="text-[13px] text-slate-500">{label}</span>
    <span className="text-right text-[13px] font-medium text-slate-900">
      {value}
    </span>
  </div>
);

const CompactStatCard = ({ icon, label, value, helper }) => (
  <DashboardCard className="border-slate-200">
    <div className="flex items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        <p className="mt-1.5 text-[1.35rem] font-semibold tracking-tight text-slate-950">
          {value}
        </p>
        <p className="mt-1.5 text-[13px] leading-6 text-slate-500">{helper}</p>
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
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
        className="h-10 w-10 rounded-2xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-white">
      {initial}
    </div>
  );
};

const RevenueSharingWorkflowDetailPage = () => {
  const { periodId } = useParams();
  const [period, setPeriod] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    actionKey: null,
    phase: "idle",
    result: null,
    error: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadDetail = async () => {
      if (!periodId) {
        setError("Khong tim thay ky doanh thu.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const result = await getRevenuePeriodDetailService(periodId);

        if (!isActive) return;

        setPeriod(result);
      } catch (apiError) {
        if (!isActive) return;
        setError(getErrorMessage(apiError));
        setPeriod(null);
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
    if (!periodId) return;

    setIsRefreshing(true);
    setError("");

    try {
      const result = await getRevenuePeriodDetailService(periodId);
      setPeriod(result);
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

    setActionModal({
      isOpen: false,
      actionKey: null,
      phase: "idle",
      result: null,
      error: "",
    });
  };

  const handleConfirmAction = async () => {
    const actionKey = actionModal.actionKey;
    const executor = ACTION_EXECUTORS[actionKey];

    if (!actionKey || !executor || !period?.id) {
      return;
    }

    setActionModal((currentModal) => ({
      ...currentModal,
      phase: "submitting",
      result: null,
      error: "",
    }));

    try {
      const result = await executor(period.id);
      await handleRefresh();

      setActionModal((currentModal) => ({
        ...currentModal,
        phase: "success",
        result,
        error: "",
      }));
    } catch (apiError) {
      setActionModal((currentModal) => ({
        ...currentModal,
        phase: "error",
        result: null,
        error: getErrorMessage(apiError),
      }));
    }
  };

  const summary = period?.summary ?? {};
  const distribution = period?.distribution ?? {};
  const timestamps = period?.timestamps ?? {};
  const artists = period?.artists ?? [];
  const confirmedBy = period?.confirmedBy ?? {};
  const confirmedByName = confirmedBy?.fullName || "Chua co";
  const workflow = resolveRevenueWorkflow(period);
  const reminder = workflow.reminder;
  const reminderTone = getRevenueReminderTone(reminder?.severity);

  return (
    <section className="-mt-2 bg-[linear-gradient(180deg,#fcfcfd_0%,#f4f4f5_100%)] py-1 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-4">
        <DashboardCard className="border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#f3f4f6_100%)] px-5 py-5 lg:px-6 lg:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Link
                to={routePaths.revenueSharingHistory}
                className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700"
              >
                <ArrowLeft size={13} />
                Quay lai
              </Link>

              <div className="space-y-2">
                <h1 className="text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  Chi tiet chia doanh thu {period?.label || ""}
                </h1>

                <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-slate-600">
                  <StatusBadge status={period?.status} />

                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                    <CalendarRange size={13} />
                    {formatDate(period?.periodStart)} - {formatDate(period?.periodEnd)}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                    <UsersRound size={13} />
                    {confirmedByName}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {period ? (
                <RevenueWorkflowActions
                  period={period}
                  actionModal={actionModal}
                  onOpenAction={openActionModal}
                />
              ) : null}

              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={15}
                  className={isRefreshing ? "animate-spin" : undefined}
                />
                Lam moi
              </button>
            </div>
          </div>
        </DashboardCard>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-6">{error}</p>
          </div>
        ) : null}

        {!isLoading && reminder ? (
          <DashboardCard className="border-slate-200">
            <div className={`rounded-2xl border px-5 py-4 ${reminderTone.container}`}>
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Workflow hien tai</p>
                  <p className={`mt-1 text-sm leading-6 ${reminderTone.text}`}>
                    {reminder.message}
                  </p>
                </div>
              </div>
            </div>
          </DashboardCard>
        ) : null}

        {isLoading ? (
          <DashboardCard className="border-slate-200 p-10">
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-3 text-slate-500">
                <LoaderCircle size={20} className="animate-spin" />
                <span className="text-[13px] font-medium">
                  Dang tai chi tiet chia doanh thu...
                </span>
              </div>
            </div>
          </DashboardCard>
        ) : period ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <CompactStatCard
                label="Doanh thu premium"
                value={formatCurrency(summary.premiumRevenue)}
                helper="Tong doanh thu premium trong ky."
                icon={<CircleDollarSign size={20} />}
              />
              <CompactStatCard
                label="Quy nghe si"
                value={formatCurrency(summary.artistPool)}
                helper="Tong quy mang di phan bo."
                icon={<Coins size={20} />}
              />
              <CompactStatCard
                label="Doanh thu nen tang"
                value={formatCurrency(summary.platformRevenue)}
                helper="Phan doanh thu con lai cua nen tang."
                icon={<Building2 size={20} />}
              />
              <CompactStatCard
                label="Nghe si duoc chia"
                value={formatNumber(distribution.distributedArtistCount)}
                helper="So nghe si co phan bo trong ky."
                icon={<UsersRound size={20} />}
              />
              <CompactStatCard
                label="Stream hop le"
                value={formatNumber(summary.totalEligibleStreams)}
                helper="Tong luot stream du dieu kien."
                icon={<Radio size={20} />}
              />
              <CompactStatCard
                label="Giao dich thanh cong"
                value={formatNumber(summary.successfulTransactions)}
                helper="So giao dich premium thanh cong."
                icon={<ReceiptText size={20} />}
              />
              <CompactStatCard
                label="Da rut"
                value={formatCurrency(distribution.totalWithdrawnAmount)}
                helper="Tong doanh thu nghe si da rut."
                icon={<Wallet size={20} />}
              />
              <CompactStatCard
                label="Con kha dung"
                value={formatCurrency(distribution.totalAvailableAmount)}
                helper="Tong doanh thu nghe si con co the rut."
                icon={<Wallet size={20} />}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
              <DashboardCard className="border-slate-200">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-950">
                    Thong tin ky doanh thu
                  </h2>
                </div>

                <div className="px-5 py-4">
                  <InfoRow
                    label="Thoi gian ap dung"
                    value={`${formatDate(period.periodStart)} - ${formatDate(period.periodEnd)}`}
                  />
                  <InfoRow
                    label="Tong phan bo"
                    value={formatCurrency(
                      distribution.distributedArtistRevenueAmount
                    )}
                  />
                  <InfoRow
                    label="Tong hop gan nhat"
                    value={formatDateTime(timestamps.lastAggregatedAt)}
                  />
                  <InfoRow label="Dong ky" value={formatDateTime(timestamps.closedAt)} />
                  <InfoRow
                    label="Tinh toan"
                    value={formatDateTime(timestamps.calculatedAt)}
                  />
                  <InfoRow
                    label="Xac nhan"
                    value={formatDateTime(timestamps.confirmedAt)}
                  />
                </div>
              </DashboardCard>

              <DashboardCard className="border-slate-200">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-950">
                    Tom tat ky chia
                  </h2>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Nguoi xac nhan
                    </p>
                    <p className="mt-1.5 text-base font-semibold text-slate-950">
                      {confirmedByName}
                    </p>
                    <p className="mt-1 text-[13px] text-slate-500">
                      {confirmedBy.email || "Chua co email"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[13px] leading-6 text-slate-600">
                      Ky nay da phan bo{" "}
                      <span className="font-semibold text-slate-950">
                        {formatCurrency(
                          distribution.distributedArtistRevenueAmount
                        )}
                      </span>{" "}
                      cho{" "}
                      <span className="font-semibold text-slate-950">
                        {formatNumber(distribution.distributedArtistCount)}
                      </span>{" "}
                      nghe si. Hien da rut{" "}
                      <span className="font-semibold text-slate-950">
                        {formatCurrency(distribution.totalWithdrawnAmount)}
                      </span>{" "}
                      va con kha dung{" "}
                      <span className="font-semibold text-slate-950">
                        {formatCurrency(distribution.totalAvailableAmount)}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </DashboardCard>
            </div>

            <DashboardCard className="border-slate-200">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-950">
                  Nghe si duoc chia doanh thu
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Hien thi ten, stream hop le, doanh thu nhan, da rut va con kha
                  dung.
                </p>
              </div>

              {artists.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <p className="text-[13px] font-medium text-slate-600">
                    Ky nay chua co nghe si nao duoc phan bo doanh thu.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {artists.map((artistItem) => {
                    const artist = artistItem.artist ?? {};

                    return (
                      <article
                        key={artistItem.artistId}
                        className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.25fr_0.7fr_0.8fr_0.8fr_0.8fr_auto] lg:items-center"
                      >
                        <div className="flex items-center gap-3">
                          <ArtistAvatar
                            name={artist.name}
                            avatar={artist.avatar}
                          />

                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-950">
                              {artist.name || "Chua co ten"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              ID: {artistItem.artistId}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Stream hop le
                          </p>
                          <p className="mt-1.5 text-[13px] font-semibold text-slate-950">
                            {formatNumber(artistItem.totalEligibleStreams)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Doanh thu nhan
                          </p>
                          <p className="mt-1.5 text-[13px] font-semibold text-slate-950">
                            {formatCurrency(artistItem.artistRevenueAmount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Da rut
                          </p>
                          <p className="mt-1.5 text-[13px] font-semibold text-slate-950">
                            {formatCurrency(artistItem.withdrawnAmount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Con kha dung
                          </p>
                          <p className="mt-1.5 text-[13px] font-semibold text-slate-950">
                            {formatCurrency(artistItem.availableAmount)}
                          </p>
                        </div>

                        <div>
                          <StatusBadge status={artistItem.status} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </DashboardCard>
          </>
        ) : (
          <DashboardCard className="border-slate-200 px-5 py-14 text-center">
            <p className="text-[13px] font-medium text-slate-600">
              Khong tim thay du lieu ky doanh thu nay.
            </p>
          </DashboardCard>
        )}
      </div>

      <RevenueWorkflowModal
        period={period}
        modalState={actionModal}
        onClose={closeActionModal}
        onConfirm={handleConfirmAction}
      />
    </section>
  );
};

export default RevenueSharingWorkflowDetailPage;
