import { ArrowRight, ChevronLeft, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PaymentFilterModal from "../../components/userPayment/PaymentFilterModal";
import PaymentHistoryCard from "../../components/userPayment/PaymentHistoryCard";
import { routePaths } from "../../routes/routePaths";
import { getUserPaymentHistory } from "../../services/userPaymentService";
import { getApiErrorMessage } from "../../utils/apiError";

const PAYMENT_STATUS_OPTIONS = [
  {
    value: "all",
    label: "Tất cả",
    description: "Hiển thị toàn bộ giao dịch của bạn.",
  },
  {
    value: "success",
    label: "Đã thanh toán",
    description: "Các giao dịch đã hoàn tất thành công.",
  },
  {
    value: "pending",
    label: "Đang xử lý",
    description: "Các giao dịch đang chờ xác nhận.",
  },
  {
    value: "failed",
    label: "Thất bại",
    description: "Các giao dịch thanh toán chưa thành công.",
  },
  {
    value: "refunded",
    label: "Đã hoàn tiền",
    description: "Các giao dịch đã được hoàn tiền.",
  },
  {
    value: "cancelled",
    label: "Đã hủy",
    description: "Các giao dịch đã bị hủy.",
  },
];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const normalizeStatus = (status) => {
  if (typeof status !== "string") {
    return "unknown";
  }

  const normalizedStatus = status.trim().toLowerCase();
  return normalizedStatus || "unknown";
};

const formatPaymentDate = (dateValue) => {
  if (!dateValue) {
    return "Chưa có ngày thanh toán";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có ngày thanh toán";
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  return `thg ${month} ${day}, ${year}`;
};

const formatPaymentAmount = (amount) => currencyFormatter.format(Number(amount) || 0);

const normalizePayments = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((payment, index) => {
      const transactionId =
        payment?.transactionId || payment?._id || payment?.id || `payment-${index + 1}`;
      const amountValue = Number(payment?.totalAmount ?? payment?.amount ?? 0);
      const paidAt = payment?.paidAt || payment?.createdAt || null;
      const createdAt = payment?.createdAt || payment?.paidAt || null;

      return {
        id: String(transactionId),
        transactionId: String(transactionId),
        invoiceNumber:
          payment?.invoiceNumber || payment?.invoiceNo || payment?.transactionCode || "",
        planName:
          payment?.planName ||
          payment?.plan?.name ||
          payment?.planId?.name ||
          "Premium",
        amount: amountValue,
        status: normalizeStatus(payment?.status),
        paidAt,
        createdAt,
        displayDate: formatPaymentDate(paidAt),
        displayAmount: formatPaymentAmount(amountValue),
      };
    })
    .sort((firstPayment, secondPayment) => {
      const firstDate = new Date(firstPayment.paidAt || firstPayment.createdAt || 0).getTime();
      const secondDate = new Date(secondPayment.paidAt || secondPayment.createdAt || 0).getTime();

      return secondDate - firstDate;
    });
};

const LoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="animate-pulse bg-[#111111] px-5 py-5 shadow-[0_10px_26px_rgba(0,0,0,0.16)] sm:px-6"
        >
          <div className="h-6 w-40 rounded-full bg-[#1f1f1f]" />
          <div className="mt-3 h-4 w-28 rounded-full bg-[#1f1f1f]" />
        </div>
      ))}
      <p className="text-sm text-white/58">Đang tải lịch sử thanh toán...</p>
    </div>
  );
};

const PaymentHistoryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState([]);
  const [expandedPaymentId, setExpandedPaymentId] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPaymentHistory = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getUserPaymentHistory({
          page: 1,
          limit: 50,
        });

        if (!isMounted) {
          return;
        }

        const normalizedPayments = normalizePayments(response?.items);
        setPayments(normalizedPayments);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setPayments([]);
        setError(
          getApiErrorMessage(loadError, "Không thể tải lịch sử thanh toán lúc này.")
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPaymentHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPayments = useMemo(() => {
    if (filterStatus === "all") {
      return payments;
    }

    return payments.filter((payment) => payment.status === filterStatus);
  }, [filterStatus, payments]);

  useEffect(() => {
    if (filteredPayments.length === 0) {
      setExpandedPaymentId("");
      return;
    }

    setExpandedPaymentId((currentPaymentId) => {
      const hasCurrentExpandedPayment = filteredPayments.some(
        (payment) => payment.id === currentPaymentId
      );

      return hasCurrentExpandedPayment ? currentPaymentId : filteredPayments[0].id;
    });
  }, [filteredPayments]);

  const activeFilterLabel =
    PAYMENT_STATUS_OPTIONS.find((option) => option.value === filterStatus)?.label || "Tất cả";

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(routePaths.home);
  };

  const handleTogglePayment = (paymentId) => {
    setExpandedPaymentId((currentPaymentId) =>
      currentPaymentId === paymentId ? "" : paymentId
    );
  };

  const handleSelectFilter = (status) => {
    setFilterStatus(status);
    setIsFilterOpen(false);
  };

  return (
    <main className="min-h-screen w-full bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[900px]">
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#181818] text-white transition hover:bg-[#1f1f1f] sm:h-12 sm:w-12"
          aria-label="Quay lại"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="mt-5">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Lịch sử thanh toán
          </h1>
        </div>

        <section className="mt-6 w-full bg-[#111111] p-5 shadow-[0_12px_28px_rgba(0,0,0,0.16)] sm:max-w-[480px] sm:p-6">
          <p className="text-sm font-medium text-white/82">
            Bạn đang dùng dịch vụ miễn phí của chúng tôi.
          </p>
          <div className="my-4 border-t border-white/10" />
          <Link
            to={routePaths.premium}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-white/80"
          >
            <span>Dùng Premium</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                Khoản thanh toán của bạn
              </h2>
              <p className="mt-1 text-sm text-white/48">
                {filterStatus === "all"
                  ? "Toàn bộ giao dịch thanh toán gần đây của bạn."
                  : `Đang lọc theo trạng thái: ${activeFilterLabel}.`}
              </p>
            </div>

            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsFilterOpen((currentValue) => !currentValue)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-4 text-sm font-medium text-white transition hover:bg-[#1f1f1f] sm:w-auto"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Bộ lọc</span>
              </button>

              <PaymentFilterModal
                isOpen={isFilterOpen}
                options={PAYMENT_STATUS_OPTIONS}
                selectedStatus={filterStatus}
                onClose={() => setIsFilterOpen(false)}
                onSelect={handleSelectFilter}
              />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? <LoadingSkeleton /> : null}

            {!loading && error ? (
              <div className="w-full bg-[#111111] px-5 py-4 text-sm text-rose-100 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                {error}
              </div>
            ) : null}

            {!loading && !error && payments.length === 0 ? (
              <div className="w-full bg-[#111111] px-5 py-6 text-sm text-white/60 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                Bạn chưa có lịch sử thanh toán.
              </div>
            ) : null}

            {!loading && !error && payments.length > 0 && filteredPayments.length === 0 ? (
              <div className="w-full bg-[#111111] px-5 py-6 text-sm text-white/60 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                Không có thanh toán phù hợp với bộ lọc đã chọn.
              </div>
            ) : null}

            {!loading && !error && filteredPayments.length > 0
              ? filteredPayments.map((payment) => (
                  <PaymentHistoryCard
                    key={payment.id}
                    payment={payment}
                    isExpanded={expandedPaymentId === payment.id}
                    onToggle={() => handleTogglePayment(payment.id)}
                  />
                ))
              : null}
          </div>
        </section>
      </div>
    </main>
  );
};

export default PaymentHistoryPage;
