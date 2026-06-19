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
import { getRevenuePeriodDetailService } from "../../services/revenueService";
import { DashboardCard, StatusBadge } from "./components/RevenueShared";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getErrorMessage,
} from "./utils";

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

const RevenueSharingDetailPage = () => {
  const { periodId } = useParams();
  const [period, setPeriod] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

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

  const summary = period?.summary ?? {};
  const distribution = period?.distribution ?? {};
  const timestamps = period?.timestamps ?? {};
  const artists = period?.artists ?? [];
  const confirmedBy = period?.confirmedBy ?? {};
  const confirmedByName = confirmedBy?.fullName || "Chưa có";

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
                Quay lại
              </Link>

              <div className="space-y-2">
                <h1 className="text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  Chi tiết chia doanh thu {period?.label || ""}
                </h1>

                <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-slate-600">
                  <StatusBadge status={period?.status} />

                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                    <CalendarRange size={13} />
                    {formatDate(period?.periodStart)} -{" "}
                    {formatDate(period?.periodEnd)}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                    <UsersRound size={13} />
                    {confirmedByName}
                  </span>
                </div>
              </div>
            </div>

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
              Làm mới
            </button>
          </div>
        </DashboardCard>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-6">{error}</p>
          </div>
        ) : null}

        {isLoading ? (
          <DashboardCard className="border-slate-200 p-10">
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-3 text-slate-500">
                <LoaderCircle size={20} className="animate-spin" />
                <span className="text-[13px] font-medium">
                  Đang tải chi tiết chia doanh thu...
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
                helper="Tổng doanh thu premium trong kỳ."
                icon={<CircleDollarSign size={20} />}
              />
              <CompactStatCard
                label="Quỹ nghệ sĩ"
                value={formatCurrency(summary.artistPool)}
                helper="Tổng quỹ mang đi phân bổ."
                icon={<Coins size={20} />}
              />
              <CompactStatCard
                label="Doanh thu nền tảng"
                value={formatCurrency(summary.platformRevenue)}
                helper="Phần doanh thu còn lại của nền tảng."
                icon={<Building2 size={20} />}
              />
              <CompactStatCard
                label="Nghệ sĩ được chia"
                value={formatNumber(distribution.distributedArtistCount)}
                helper="Số nghệ sĩ có phân bổ trong kỳ."
                icon={<UsersRound size={20} />}
              />
              <CompactStatCard
                label="Stream hợp lệ"
                value={formatNumber(summary.totalEligibleStreams)}
                helper="Tổng lượt stream đủ điều kiện."
                icon={<Radio size={20} />}
              />
              <CompactStatCard
                label="Giao dịch thành công"
                value={formatNumber(summary.successfulTransactions)}
                helper="Số giao dịch premium thành công."
                icon={<ReceiptText size={20} />}
              />
              <CompactStatCard
                label="Đã rút"
                value={formatCurrency(distribution.totalWithdrawnAmount)}
                helper="Tổng doanh thu nghệ sĩ đã rút."
                icon={<Wallet size={20} />}
              />
              <CompactStatCard
                label="Còn khả dụng"
                value={formatCurrency(distribution.totalAvailableAmount)}
                helper="Tổng doanh thu nghệ sĩ còn có thể rút."
                icon={<Wallet size={20} />}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
              <DashboardCard className="border-slate-200">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-950">
                    Thông tin kỳ doanh thu
                  </h2>
                </div>

                <div className="px-5 py-4">
                  <InfoRow
                    label="Thời gian áp dụng"
                    value={`${formatDate(period.periodStart)} - ${formatDate(period.periodEnd)}`}
                  />
                  <InfoRow
                    label="Tổng phân bổ"
                    value={formatCurrency(
                      distribution.distributedArtistRevenueAmount
                    )}
                  />
                  <InfoRow
                    label="Tổng hợp gần nhất"
                    value={formatDateTime(timestamps.lastAggregatedAt)}
                  />
                  <InfoRow
                    label="Đóng kỳ"
                    value={formatDateTime(timestamps.closedAt)}
                  />
                  <InfoRow
                    label="Tính toán"
                    value={formatDateTime(timestamps.calculatedAt)}
                  />
                  <InfoRow
                    label="Xác nhận"
                    value={formatDateTime(timestamps.confirmedAt)}
                  />
                </div>
              </DashboardCard>

              <DashboardCard className="border-slate-200">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-950">
                    Tóm tắt kỳ chia
                  </h2>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Người xác nhận
                    </p>
                    <p className="mt-1.5 text-base font-semibold text-slate-950">
                      {confirmedByName}
                    </p>
                    <p className="mt-1 text-[13px] text-slate-500">
                      {confirmedBy.email || "Chưa có email"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[13px] leading-6 text-slate-600">
                      Kỳ này đã phân bổ{" "}
                      <span className="font-semibold text-slate-950">
                        {formatCurrency(
                          distribution.distributedArtistRevenueAmount
                        )}
                      </span>{" "}
                      cho{" "}
                      <span className="font-semibold text-slate-950">
                        {formatNumber(distribution.distributedArtistCount)}
                      </span>{" "}
                      nghệ sĩ. Hiện đã rút{" "}
                      <span className="font-semibold text-slate-950">
                        {formatCurrency(distribution.totalWithdrawnAmount)}
                      </span>{" "}
                      và còn khả dụng{" "}
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
                  Nghệ sĩ được chia doanh thu
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Hiển thị tên, stream hợp lệ, doanh thu nhận, đã rút và còn khả
                  dụng.
                </p>
              </div>

              {artists.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <p className="text-[13px] font-medium text-slate-600">
                    Kỳ này chưa có nghệ sĩ nào được phân bổ doanh thu.
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
                              {artist.name || "Chưa có tên"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              ID: {artistItem.artistId}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Stream hợp lệ
                          </p>
                          <p className="mt-1.5 text-[13px] font-semibold text-slate-950">
                            {formatNumber(artistItem.totalEligibleStreams)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Doanh thu nhận
                          </p>
                          <p className="mt-1.5 text-[13px] font-semibold text-slate-950">
                            {formatCurrency(artistItem.artistRevenueAmount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Đã rút
                          </p>
                          <p className="mt-1.5 text-[13px] font-semibold text-slate-950">
                            {formatCurrency(artistItem.withdrawnAmount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Còn khả dụng
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
              Không tìm thấy dữ liệu kỳ doanh thu này.
            </p>
          </DashboardCard>
        )}
      </div>
    </section>
  );
};

export default RevenueSharingDetailPage;
