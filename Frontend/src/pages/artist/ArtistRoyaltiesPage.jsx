import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CircleAlert, ReceiptText, Wallet, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { getMyArtistRevenueSummaryService } from "../../services/artistService";
import { getApiErrorMessage } from "../../utils/apiError";
import { routePaths } from "../../routes/routePaths";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

const formatDateTime = (value) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatPeriodLabel = (year, month) => {
  const safeYear = Number(year);
  const safeMonth = Number(month);

  if (!Number.isInteger(safeYear) || !Number.isInteger(safeMonth)) {
    return "--";
  }

  const date = new Date(
    `${safeYear}-${String(safeMonth).padStart(2, "0")}-01T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return `${String(safeMonth).padStart(2, "0")}/${safeYear}`;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(date);
};

const ArtistRoyaltiesPage = () => {
  const [revenue, setRevenue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRevenue = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const payload = await getMyArtistRevenueSummaryService();
      setRevenue(payload);
    } catch (error) {
      setRevenue(null);
      setErrorMessage(
        getApiErrorMessage(error, "Không thể tải số dư khả dụng của bạn.")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  const balance = revenue?.balance || null;
  const withdrawalSummary = revenue?.withdrawalSummary || null;

  const latestPeriodLabel = balance?.latestPeriod
    ? formatPeriodLabel(balance.latestPeriod.year, balance.latestPeriod.month)
    : "--";
  const pendingPayoutAmount = Number(withdrawalSummary?.pendingAmount || 0);
  const latestStatusLabel =
    balance?.latestStatus === "calculated"
      ? "Sẵn sàng"
      : balance?.latestStatus === "paid"
        ? "Đã chi trả"
        : "Đang chờ";

  const handleScrollToHistory = () => {
    const target = document.getElementById("lich-su-doanh-thu");
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-[#ebe6ff] bg-white p-10 text-[#6b6682] shadow-sm">
        <Wallet className="h-8 w-8 animate-pulse text-[#6f5cf1]" aria-hidden />
        <p className="mt-4 text-sm">Đang tải số dư khả dụng...</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#7c6cf2]">
            Tài chính nghệ sĩ
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#241b15]">
            Số dư khả dụng
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6a647d]">
            Theo dõi số tiền hiện có thể rút về, số tiền đang chờ chi trả và toàn bộ doanh thu đã được ghi nhận.
          </p>
        </div>

        <button
          type="button"
          onClick={handleScrollToHistory}
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#e7e1ff] bg-white px-4 py-3 text-sm font-medium text-[#2f2747] shadow-sm transition hover:border-[#cbbfff] hover:bg-[#faf8ff]"
        >
          <ReceiptText className="h-4 w-4 text-[#6f5cf1]" />
          Lịch sử doanh thu
        </button>
      </div>

      {errorMessage ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <section
        id="lich-su-doanh-thu"
        className="overflow-hidden rounded-[28px] border border-[#ebe6ff] bg-white shadow-[0_24px_60px_-36px_rgba(70,42,135,0.35)]"
      >
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(124,108,242,0.16),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(140,112,240,0.14),_transparent_36%),linear-gradient(135deg,#ffffff_0%,#fcfbff_56%,#f7f4ff_100%)] px-5 py-6 sm:px-7">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr_auto] xl:items-center">
            <div className="xl:border-r xl:border-[#ece8ff] xl:pr-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c7891]">
                <Wallet className="h-4 w-4 text-[#6f5cf1]" />
                Số dư khả dụng
              </div>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-[#241b15] sm:text-5xl">
                {formatCurrency(balance?.availableAmount)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#6a647d]">
                <span className="rounded-full bg-white px-3 py-1 font-medium text-[#2f2747] shadow-sm">
                  VND
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Cập nhật lần cuối {formatDateTime(balance?.updatedAt)}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c7891]">
                <Clock3 className="h-4 w-4 text-amber-500" />
                Số dư cần chi trả
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-[#241b15]">
                {formatCurrency(pendingPayoutAmount)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to={routePaths.artistWithdrawalRequests}
                className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6f5cf1] to-[#8258f4] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_34px_-18px_rgba(111,92,241,0.65)] transition hover:from-[#614de8] hover:to-[#764aef]"
              >
                <Wallet className="h-4 w-4" />
                Sang trang rút tiền
              </Link>

              {/* <div className="rounded-2xl border border-[#ece8ff] bg-white/90 px-4 py-3 text-sm text-[#6a647d]">
                <p className="font-medium text-[#2f2747]">Kỳ đối soát gần nhất</p>
                <p className="mt-1">{latestPeriodLabel}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8b84a6]">
                  {latestStatusLabel}
                </p>
              </div> */}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#d8e7ff] bg-[linear-gradient(135deg,rgba(237,244,255,0.95),rgba(248,251,255,0.98))] px-4 py-4 shadow-sm sm:px-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#3b82f6] shadow-sm">
            <CircleAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1f4f9c]">
              Trang này chỉ hiển thị số dư và lịch sử doanh thu.
            </p>
            <p className="mt-1 text-sm leading-6 text-[#4a6a9a]">
              Để tạo hoặc theo dõi yêu cầu rút tiền, hãy dùng mục <strong>Yêu cầu rút tiền</strong> ở thanh bên trái.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
};

export default ArtistRoyaltiesPage;
