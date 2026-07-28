import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { getAdminTransactionDetail } from "../../services/adminTransactionService";
import { routePaths } from "../../routes/routePaths";

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

const genderMap = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

const formatCurrency = (value, currency = "VND") => {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
  }).format(Number.isNaN(amount) ? 0 : amount);
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
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

const getStatusConfig = (status) =>
  statusMap[status] || {
    label: status || "—",
    className: "bg-slate-100 text-slate-700",
  };

const getPaymentMethodLabel = (paymentMethod) =>
  paymentMethodMap[paymentMethod] || paymentMethod || "—";

const getGenderLabel = (gender) => genderMap[gender] || gender || "—";

const getFallbackErrorMessage = (statusCode) => {
  if (statusCode === 404) {
    return "Không tìm thấy giao dịch.";
  }

  if (statusCode === 400) {
    return "Mã giao dịch không hợp lệ.";
  }

  return "Không thể tải chi tiết giao dịch.";
};

const getUserInitial = (email = "") => email.trim().charAt(0).toUpperCase() || "U";

const TransactionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadTransaction = async () => {
      if (!id) {
        setTransaction(null);
        setError("Mã giao dịch không hợp lệ.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await getAdminTransactionDetail(id);

        if (!isActive) {
          return;
        }

        setTransaction(result);
      } catch (apiError) {
        if (!isActive) {
          return;
        }

        console.error(apiError);
        setTransaction(null);
        setError(
          apiError?.response?.data?.message ||
            getFallbackErrorMessage(apiError?.response?.status)
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadTransaction();

    return () => {
      isActive = false;
    };
  }, [id, reloadKey]);

  const summaryDate = transaction?.paidAt || transaction?.createdAt;
  const statusConfig = getStatusConfig(transaction?.status);
  const shouldShowFailureCard = Boolean(
    transaction?.status === "failed" ||
      transaction?.failedAt ||
      transaction?.failureReason
  );
  const user = transaction?.user ?? null;
  const plan = transaction?.plan ?? null;
  const currency = transaction?.currency || "VND";
  const subscriptionDuration =
    plan?.duration ?? plan?.durationDays ?? plan?.durationInDays ?? null;

  if (loading) {
    return (
      <section className="min-h-screen w-full space-y-6 bg-slate-50/50 p-6 text-slate-800 antialiased">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen w-full space-y-6 bg-slate-50/50 p-6 text-slate-800 antialiased">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Quản lý giao dịch / Chi tiết giao dịch
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Chi tiết giao dịch
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Thông tin chi tiết về giao dịch thanh toán.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(routePaths.transactions)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách
          </button>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-white p-8 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle size={24} />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">{error}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setReloadKey((currentValue) => currentValue + 1)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Thử lại
              </button>
              <button
                type="button"
                onClick={() => navigate(routePaths.transactions)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Quay lại danh sách
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen w-full space-y-6 bg-slate-50/50 p-6 text-slate-800 antialiased">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Quản lý giao dịch / Chi tiết giao dịch
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Chi tiết giao dịch
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Thông tin chi tiết về giao dịch thanh toán.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(routePaths.transactions)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Mã hóa đơn
            </p>
            <p className="mt-2 break-all text-lg font-semibold text-slate-950">
              {transaction?.invoiceNumber || "—"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Trạng thái giao dịch
            </p>
            <div className="mt-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.className}`}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Tổng thanh toán
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {formatCurrency(transaction?.totalAmount, currency)}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Ngày giao dịch
            </p>
            <p className="mt-2 whitespace-nowrap text-lg font-semibold text-slate-950">
              {formatDateTime(summaryDate)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <h2 className="text-lg font-semibold text-slate-950">Chi tiết thanh toán</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Giá gốc
            </p>
            <p className="mt-2 text-base font-semibold text-slate-950">
              {formatCurrency(transaction?.amount, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Thuế
            </p>
            <p className="mt-2 text-base font-semibold text-slate-950">
              {formatCurrency(transaction?.tax, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Đơn vị tiền tệ
            </p>
            <p className="mt-2 text-base font-semibold text-slate-950">{currency}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Ngày thanh toán
            </p>
            <p className="mt-2 whitespace-nowrap text-base font-semibold text-slate-950">
              {formatDateTime(transaction?.paidAt)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Tổng thanh toán
            </p>
            <p className="mt-2 whitespace-nowrap text-2xl font-semibold text-slate-950">
              {formatCurrency(transaction?.totalAmount, currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <h2 className="text-lg font-semibold text-slate-950">Thông tin giao dịch</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-slate-400">Mã giao dịch nội bộ</span>
              <span className="break-all font-medium text-slate-900">{transaction?.id || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400">Mã hóa đơn</span>
              <span className="break-all font-medium text-slate-900">{transaction?.invoiceNumber || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400">Mã giao dịch cổng thanh toán</span>
              <span className="break-all font-medium text-slate-900">{transaction?.gatewayTransactionId || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400">Phương thức thanh toán</span>
              <span className="font-medium text-slate-900">{getPaymentMethodLabel(transaction?.paymentMethod)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400">Cổng thanh toán</span>
              <span className="font-medium text-slate-900">{transaction?.paymentGateway || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400">Trạng thái</span>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.className}`}
                >
                  {statusConfig.label}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400">Ngày tạo</span>
              <span className="whitespace-nowrap font-medium text-slate-900">
                {formatDateTime(transaction?.createdAt)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400">Ngày cập nhật</span>
              <span className="whitespace-nowrap font-medium text-slate-900">
                {formatDateTime(transaction?.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-slate-950">Thông tin người dùng</h2>
            {user ? (
              <div className="mt-5 space-y-5">
                <div className="flex items-center gap-4">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.email || "User avatar"}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
                      {getUserInitial(user?.email)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold text-slate-950">
                      {user?.fullName || "—"}
                    </p>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      {user?.email || "—"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400">Họ và tên</span>
                    <span className="break-words font-medium text-slate-900">
                      {user?.fullName || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400">Email</span>
                    <span className="break-all font-medium text-slate-900">
                      {user?.email || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400">Giới tính</span>
                    <span className="font-medium text-slate-900">
                      {getGenderLabel(user?.gender)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400">Quốc gia</span>
                    <span className="break-words font-medium text-slate-900">
                      {user?.country || "—"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">Người dùng không tồn tại.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-slate-950">Thông tin gói đăng ký</h2>
            {plan ? (
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400">Tên gói</span>
                  <span className="font-medium text-slate-900">{plan?.name || "—"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400">Giá gói</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(plan?.price, currency)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400">Thời hạn</span>
                  <span className="font-medium text-slate-900">
                    {subscriptionDuration !== null && subscriptionDuration !== undefined
                      ? `${subscriptionDuration} ngày`
                      : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">Gói đăng ký không tồn tại.</p>
            )}
          </div>
        </div>
      </div>

      {shouldShowFailureCard ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <h2 className="text-lg font-semibold text-red-700">Thông tin thất bại</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-red-400">Thời gian thất bại</span>
              <span className="whitespace-nowrap font-medium text-red-700">
                {formatDateTime(transaction?.failedAt)}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-red-400">Lý do thất bại</span>
              <span className="break-words font-medium text-red-700">
                {transaction?.failureReason || "Không có lý do được cung cấp."}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default TransactionDetail;
