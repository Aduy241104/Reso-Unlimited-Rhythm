import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  LoaderCircle,
  ReceiptText,
  Search,
} from "lucide-react";
import { getAdminTransactionList } from "../../services/adminTransactionService";

const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "pending", label: "Đang chờ" },
  { value: "success", label: "Thành công" },
  { value: "failed", label: "Thất bại" },
  { value: "refunded", label: "Đã hoàn tiền" },
];

const paymentMethodOptions = [
  { value: "", label: "Tất cả phương thức" },
  { value: "vnpay", label: "VNPay" },
  { value: "momo", label: "MoMo" },
  { value: "stripe", label: "Stripe" },
  { value: "card", label: "Thẻ" },
];

const paymentMethodMap = {
  vnpay: "VNPay",
  momo: "MoMo",
  stripe: "Stripe",
  card: "Thẻ",
};

const statusMap = {
  pending: {
    label: "Đang chờ",
    className: "bg-amber-100 text-amber-700",
  },
  success: {
    label: "Thành công",
    className: "bg-emerald-100 text-emerald-700",
  },
  failed: {
    label: "Thất bại",
    className: "bg-red-100 text-red-700",
  },
  refunded: {
    label: "Đã hoàn tiền",
    className: "bg-blue-100 text-blue-700",
  },
};

const DEFAULT_APPLIED_FILTERS = {
  search: "",
  status: "",
  paymentMethod: "",
};

const formatCurrency = (value, currency = "VND") => {
  if (value === undefined || value === null) {
    return "-";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return "-";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatTransactionDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const parts = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((result, part) => {
      if (part.type !== "literal") {
        result[part.type] = part.value;
      }

      return result;
    }, {});

  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`;
};

const getPaymentMethodLabel = (paymentMethod) =>
  paymentMethodMap[paymentMethod] || paymentMethod || "-";

const getStatusConfig = (status) =>
  statusMap[status] || {
    label: status || "-",
    className: "bg-slate-100 text-slate-700",
  };

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_APPLIED_FILTERS);

  useEffect(() => {
    let isActive = true;

    const fetchTransactions = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await getAdminTransactionList({
          page,
          limit,
          ...appliedFilters,
        });

        if (!isActive) {
          return;
        }

        const data = response?.data?.data ?? response?.data ?? response;

        setTransactions(data?.transactions ?? []);
        setPagination(
          data?.pagination ?? {
            page,
            limit,
            total: 0,
            totalPages: 0,
          }
        );
      } catch (apiError) {
        if (!isActive) {
          return;
        }

        console.error(apiError);
        setTransactions([]);
        setError(
          apiError?.response?.data?.message ||
            "Không thể tải danh sách giao dịch."
        );
        setPagination({
          page,
          limit,
          total: 0,
          totalPages: 0,
        });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void fetchTransactions();

    return () => {
      isActive = false;
    };
  }, [page, limit, appliedFilters, reloadKey]);

  const handleSearch = () => {
    const nextFilters = {
      search: searchInput.trim(),
      status: selectedStatus,
      paymentMethod: selectedPaymentMethod,
    };

    setAppliedFilters(nextFilters);
    setPage(1);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    handleSearch();
  };

  const handleRetry = () => {
    setReloadKey((currentValue) => currentValue + 1);
  };

  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 0;
  const safeTotalPages = Math.max(totalPages, 1);
  const currentPage = pagination?.page ?? page;
  const pageLabel = `${currentPage} / ${safeTotalPages}`;
  const startRecord =
    total === 0 ? 0 : (currentPage - 1) * (pagination?.limit ?? limit) + 1;
  const endRecord =
    total === 0
      ? 0
      : Math.min(currentPage * (pagination?.limit ?? limit), total);
  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = totalPages > 0 && currentPage < totalPages && !isLoading;
  const hasAppliedFilters = Object.values(appliedFilters).some(Boolean);

  return (
    <section className="min-h-screen w-full space-y-6 bg-slate-50/50 p-6 text-slate-800 antialiased">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Quản lý giao dịch
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Danh sách giao dịch
          </h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="min-w-[112px] rounded-xl bg-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Tổng số
            </p>
            <p className="mt-1.5 text-lg font-semibold text-slate-900">{total}</p>
          </div>

          <div className="min-w-[112px] rounded-xl bg-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Đang hiển thị
            </p>
            <p className="mt-1.5 text-lg font-semibold text-slate-900">
              {transactions.length}
            </p>
          </div>

          <div className="min-w-[112px] rounded-xl bg-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Trang
            </p>
            <p className="mt-1.5 text-lg font-semibold text-slate-900">
              {pageLabel}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] xl:grid-cols-[minmax(0,1.5fr)_220px_220px_140px]"
      >
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo mã hóa đơn, email người dùng..."
            className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
          />
        </label>

        <select
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
          className="cursor-pointer rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
        >
          {statusOptions.map((option) => (
            <option key={option.value || "all-status"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={selectedPaymentMethod}
          onChange={(event) => setSelectedPaymentMethod(event.target.value)}
          className="cursor-pointer rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
        >
          {paymentMethodOptions.map((option) => (
            <option key={option.value || "all-method"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Tìm kiếm
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-white p-8 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle size={24} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-900">
              {error}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-5 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="rounded-2xl bg-white p-12 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-center gap-3 text-sm font-medium text-slate-500">
            <LoaderCircle size={20} className="animate-spin" />
            <span>Đang tải danh sách giao dịch...</span>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ReceiptText size={24} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-900">
              {hasAppliedFilters
                ? "Không có giao dịch nào phù hợp với điều kiện tìm kiếm."
                : "Không có giao dịch nào."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <table className="w-full table-fixed text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <th className="w-[16%] px-4 py-4">Mã hóa đơn</th>
                <th className="w-[18%] px-4 py-4">Người dùng</th>
                <th className="w-[13%] px-4 py-4">Gói đăng ký</th>
                <th className="w-[10%] px-4 py-4">Tổng tiền</th>
                <th className="w-[10%] px-4 py-4">Phương thức</th>
                <th className="w-[10%] px-4 py-4">Trạng thái</th>
                <th className="w-[13%] px-4 py-4">Ngày giao dịch</th>
                <th className="w-[10%] px-4 py-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 align-top">
              {transactions.map((transaction) => {
                const status = getStatusConfig(transaction.status);

                return (
                  <tr
                    key={transaction.id || transaction.invoiceNumber}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="break-words text-sm font-semibold leading-6 text-slate-950">
                        {transaction.invoiceNumber || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="break-all text-sm leading-6 text-slate-700">
                        {transaction.user?.email || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="break-words text-sm leading-6 text-slate-700">
                        {transaction.plan?.name || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="whitespace-nowrap text-sm font-semibold leading-6 text-slate-900">
                        {formatCurrency(
                          transaction.totalAmount,
                          transaction.currency || "VND"
                        )}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {getPaymentMethodLabel(transaction.paymentMethod)}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="text-sm leading-6 text-slate-600">
                        {formatTransactionDate(transaction.transactionDate)}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
                        >
                          Xem chi tiết
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!error && !isLoading && total > 0 ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Hiển thị{" "}
            <span className="font-medium text-slate-900">
              {startRecord}-{endRecord}
            </span>{" "}
            trong tổng số{" "}
            <span className="font-medium text-slate-900">{total}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((currentValue) => Math.max(currentValue - 1, 1))}
              disabled={!canGoPrevious}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
              {pageLabel}
            </span>

            <button
              type="button"
              onClick={() => setPage((currentValue) => currentValue + 1)}
              disabled={!canGoNext}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default TransactionList;
