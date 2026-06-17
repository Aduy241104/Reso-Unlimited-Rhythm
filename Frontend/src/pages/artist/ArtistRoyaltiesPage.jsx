import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeDollarSign,
  CalendarDays,
  CircleAlert,
  Clock3,
  Coins,
  Landmark,
  Loader2,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { getMyArtistRevenueSummaryService } from "../../services/artistService";
import { getApiErrorMessage } from "../../utils/apiError";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);
const formatNumber = (value) => numberFormatter.format(Number(value) || 0);

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

const formatDateOnly = (value) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

const statusMeta = {
  calculated: {
    label: "Sẵn sàng",
    className: "border-violet-200 bg-violet-50 text-violet-700",
    typeLabel: "Khả dụng",
    amountClassName: "text-violet-700",
  },
  paid: {
    label: "Đã chi trả",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    typeLabel: "Đã thanh toán",
    amountClassName: "text-emerald-700",
  },
  pending: {
    label: "Đang chờ",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    typeLabel: "Chờ đối soát",
    amountClassName: "text-amber-700",
  },
};

const buildSummaryItems = ({
  balance,
  pendingAmount,
  paidAmount,
  averageRevenuePerSummary,
}) => [
  {
    label: "Tổng doanh thu gộp",
    value: formatCurrency(balance?.lifetimeGrossRevenueAmount),
    helper: "Tổng doanh thu tạo ra trước khi chia tỷ lệ cho nghệ sĩ.",
    accentClassName: "from-violet-100 via-white to-violet-50",
    icon: Coins,
  },
  {
    label: "Doanh thu của nghệ sĩ",
    value: formatCurrency(balance?.lifetimeArtistRevenueAmount),
    helper: "Phần doanh thu artist share đã cộng dồn qua tất cả các kỳ.",
    accentClassName: "from-emerald-100 via-white to-emerald-50",
    icon: BadgeDollarSign,
  },
  {
    label: "Đang chờ đối soát",
    value: formatCurrency(pendingAmount),
    helper: "Các kỳ đang ở trạng thái chờ, chưa chuyển sang số dư khả dụng.",
    accentClassName: "from-amber-100 via-white to-amber-50",
    icon: Clock3,
  },
  {
    label: "Đã chi trả",
    value: formatCurrency(paidAmount),
    helper:
      averageRevenuePerSummary > 0
        ? `Trung bình ${formatCurrency(
            averageRevenuePerSummary
          )} cho mỗi kỳ doanh thu đã ghi nhận.`
        : "Chưa có kỳ nào được ghi nhận là đã chi trả.",
    accentClassName: "from-sky-100 via-white to-sky-50",
    icon: Landmark,
  },
];

const SummaryMetricCard = ({
  icon: Icon,
  label,
  value,
  helper,
  accentClassName,
}) => (
  <article
    className={[
      "rounded-[22px] border border-[#ebe6ff] bg-gradient-to-br p-5 shadow-[0_18px_40px_-28px_rgba(76,47,146,0.35)]",
      accentClassName,
    ].join(" ")}
  >
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#6f5cf1] shadow-sm shadow-[#6f5cf1]/10">
      <Icon className="h-5 w-5" />
    </div>
    <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7c7891]">
      {label}
    </p>
    <p className="mt-2 text-2xl font-semibold tracking-tight text-[#241b15]">
      {value}
    </p>
    <p className="mt-3 text-sm leading-6 text-[#6a647d]">{helper}</p>
  </article>
);

const ArtistRoyaltiesPage = () => {
  const [revenue, setRevenue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadRevenue = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await getMyArtistRevenueSummaryService();

        if (!isMounted) {
          return;
        }

        setRevenue(payload);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRevenue(null);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải số dư khả dụng của bạn.")
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRevenue();

    return () => {
      isMounted = false;
    };
  }, []);

  const balance = revenue?.balance || null;
  const monthlySummaries = revenue?.monthlySummaries || [];

  const pendingAmount = useMemo(
    () =>
      monthlySummaries
        .filter((summary) => summary.status === "pending")
        .reduce(
          (total, summary) => total + (Number(summary.artistRevenueAmount) || 0),
          0
        ),
    [monthlySummaries]
  );

  const paidAmount = useMemo(
    () =>
      monthlySummaries
        .filter((summary) => summary.status === "paid")
        .reduce(
          (total, summary) => total + (Number(summary.artistRevenueAmount) || 0),
          0
        ),
    [monthlySummaries]
  );

  const averageRevenuePerSummary = useMemo(() => {
    const count = Number(balance?.summaryCount || 0);

    if (count <= 0) {
      return 0;
    }

    return Number(balance?.lifetimeArtistRevenueAmount || 0) / count;
  }, [balance]);

  const summaryItems = useMemo(
    () =>
      buildSummaryItems({
        balance,
        pendingAmount,
        paidAmount,
        averageRevenuePerSummary,
      }),
    [averageRevenuePerSummary, balance, paidAmount, pendingAmount]
  );

  const latestPeriodLabel = balance?.latestPeriod
    ? formatPeriodLabel(balance.latestPeriod.year, balance.latestPeriod.month)
    : "--";

  const latestStatusLabel =
    statusMeta[balance?.latestStatus]?.label || statusMeta.pending.label;

  const handleScrollToHistory = () => {
    const target = document.getElementById("lich-su-chi-tra");
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleWithdrawClick = () => {
    setActionMessage(
      "Tính năng rút tiền sẽ được kết nối ở bước tiếp theo. Hiện tại bạn có thể theo dõi số dư và lịch sử đối soát tại đây."
    );
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-[#ebe6ff] bg-white p-10 text-[#6b6682] shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-[#6f5cf1]" aria-hidden />
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
            Theo dõi số tiền hiện có thể rút về tài khoản ngân hàng, số dư đang
            chờ đối soát và toàn bộ các kỳ doanh thu gần đây.
          </p>
        </div>

        <button
          type="button"
          onClick={handleScrollToHistory}
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#e7e1ff] bg-white px-4 py-3 text-sm font-medium text-[#2f2747] shadow-sm transition hover:border-[#cbbfff] hover:bg-[#faf8ff]"
        >
          <ReceiptText className="h-4 w-4 text-[#6f5cf1]" />
          Lịch sử chi trả
        </button>
      </div>

      {errorMessage ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-[22px] border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          {actionMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-[#ebe6ff] bg-white shadow-[0_24px_60px_-36px_rgba(70,42,135,0.35)]">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(124,108,242,0.16),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(140,112,240,0.14),_transparent_36%),linear-gradient(135deg,#ffffff_0%,#fcfbff_56%,#f7f4ff_100%)] px-5 py-6 sm:px-7">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr_auto] xl:items-center">
            <div className="xl:pr-6 xl:border-r xl:border-[#ece8ff]">
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
                Số dư chờ đối soát
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-[#241b15]">
                {formatCurrency(pendingAmount)}
              </p>
              <button
                type="button"
                onClick={handleScrollToHistory}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#6f5cf1] transition hover:text-[#5842e8]"
              >
                Xem các kỳ đang chờ
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleWithdrawClick}
                className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6f5cf1] to-[#8258f4] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_34px_-18px_rgba(111,92,241,0.65)] transition hover:from-[#614de8] hover:to-[#764aef]"
              >
                <Wallet className="h-4 w-4" />
                Rút tiền
              </button>

              <div className="rounded-2xl border border-[#ece8ff] bg-white/90 px-4 py-3 text-sm text-[#6a647d]">
                <p className="font-medium text-[#2f2747]">Kỳ đối soát gần nhất</p>
                <p className="mt-1">{latestPeriodLabel}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8b84a6]">
                  {latestStatusLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="huong-dan-so-du"
        className="rounded-[22px] border border-[#d8e7ff] bg-[linear-gradient(135deg,rgba(237,244,255,0.95),rgba(248,251,255,0.98))] px-4 py-4 shadow-sm sm:px-5"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#3b82f6] shadow-sm">
            <CircleAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1f4f9c]">
              Số dư khả dụng là số tiền bạn có thể rút.
            </p>
            <p className="mt-1 text-sm leading-6 text-[#4a6a9a]">
              Mục này không bao gồm các kỳ doanh thu vẫn đang chờ đối soát hoặc
              các bản phát hành mới chưa hoàn tất tổng hợp.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[#241b15]">
              Tóm tắt doanh thu
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6a647d]">
              Nhìn nhanh bức tranh doanh thu của nghệ sĩ qua toàn bộ các kỳ đã
              được tổng hợp.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#ebe6ff] bg-white px-4 py-3 text-sm text-[#645d86] shadow-sm">
            <CalendarDays className="h-4 w-4 text-[#6f5cf1]" />
            <span>Kỳ gần nhất: {latestPeriodLabel}</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <SummaryMetricCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              helper={item.helper}
              accentClassName={item.accentClassName}
            />
          ))}
        </div>
      </section>

      <section
        id="lich-su-chi-tra"
        className="overflow-hidden rounded-[28px] border border-[#ebe6ff] bg-white shadow-[0_24px_60px_-40px_rgba(70,42,135,0.35)]"
      >
        <div className="flex flex-col gap-3 border-b border-[#f0ebff] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[#241b15]">
              Giao dịch gần đây
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6a647d]">
              Danh sách các kỳ doanh thu mới nhất dùng để tính số dư và trạng
              thái chi trả.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#ebe6ff] bg-[#faf8ff] px-4 py-3 text-sm font-medium text-[#645d86]">
            <ReceiptText className="h-4 w-4 text-[#6f5cf1]" />
            {formatNumber(balance?.summaryCount || 0)} kỳ doanh thu
          </div>
        </div>

        {monthlySummaries.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-lg font-semibold text-[#241b15]">
              Chưa có lịch sử doanh thu
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6a647d]">
              Khi hệ thống hoàn tất đối soát theo tháng, các kỳ doanh thu sẽ
              xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#f0ebff] text-left text-sm">
              <thead className="bg-[linear-gradient(180deg,#fdfcff_0%,#faf8ff_100%)] text-[#7c7891]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ngày cập nhật</th>
                  <th className="px-6 py-4 font-semibold">Diễn giải</th>
                  <th className="px-6 py-4 font-semibold">Loại</th>
                  <th className="px-6 py-4 font-semibold">Số tiền</th>
                  <th className="px-6 py-4 font-semibold">Trạng thái</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f4f0ff]">
                {monthlySummaries.map((summary) => {
                  const meta = statusMeta[summary.status] || statusMeta.pending;

                  return (
                    <tr
                      key={summary.id}
                      className="bg-white text-[#2f261f] transition hover:bg-[#fcfbff]"
                    >
                      <td className="px-6 py-5 align-top">
                        <p className="font-medium text-[#241b15]">
                          {formatDateOnly(summary.updatedAt)}
                        </p>
                        <p className="mt-1 text-xs text-[#8b84a6]">
                          {formatDateTime(summary.updatedAt)}
                        </p>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <p className="font-medium text-[#241b15]">
                          Doanh thu {formatPeriodLabel(summary.year, summary.month)}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#7c7891]">
                          {formatNumber(summary.totalEligibleStreams)} lượt stream
                          hợp lệ • Tổng gộp {formatCurrency(summary.grossRevenueAmount)}
                        </p>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <span className="inline-flex rounded-full border border-[#ece8ff] bg-[#faf8ff] px-3 py-1 text-xs font-medium text-[#6f5cf1]">
                          {meta.typeLabel}
                        </span>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <p className={["font-semibold", meta.amountClassName].join(" ")}>
                          {formatCurrency(summary.artistRevenueAmount)}
                        </p>
                        <p className="mt-1 text-xs text-[#7c7891]">
                          Khả dụng {formatCurrency(summary.availableAmount)}
                        </p>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                            meta.className,
                          ].join(" ")}
                        >
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
};

export default ArtistRoyaltiesPage;
