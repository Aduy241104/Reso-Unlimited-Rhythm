import { ArrowRight, ChevronLeft, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoadingState from "../../components/common/LoadingState";
import PaymentFilterModal from "../../components/userPayment/PaymentFilterModal";
import PaymentHistoryCard from "../../components/userPayment/PaymentHistoryCard";
import { useAuth } from "../../hooks/useAuth";
import { routePaths } from "../../routes/routePaths";
import { getMySubscriptionService } from "../../services/subscriptionService";
import { getUserPaymentHistory } from "../../services/userPaymentService";
import { getApiErrorMessage } from "../../utils/apiError";
import { hasPremiumAccess } from "../../utils/premiumAccess";

const PAYMENTS_PER_PAGE = 10;
const INITIAL_PAGINATION = {
  page: 1,
  limit: PAYMENTS_PER_PAGE,
  total: 0,
  totalPages: 1,
};

const PAYMENT_STATUS_OPTIONS = [
  {
    value: "all",
    label: "T\u1ea5t c\u1ea3",
    description: "Hi\u1ec3n th\u1ecb to\u00e0n b\u1ed9 giao d\u1ecbch c\u1ee7a b\u1ea1n.",
  },
  {
    value: "success",
    label: "\u0110\u00e3 thanh to\u00e1n",
    description: "C\u00e1c giao d\u1ecbch \u0111\u00e3 ho\u00e0n t\u1ea5t th\u00e0nh c\u00f4ng.",
  },
  {
    value: "pending",
    label: "\u0110ang x\u1eed l\u00fd",
    description: "C\u00e1c giao d\u1ecbch \u0111ang ch\u1edd x\u00e1c nh\u1eadn.",
  },
  {
    value: "failed",
    label: "Th\u1ea5t b\u1ea1i",
    description: "C\u00e1c giao d\u1ecbch thanh to\u00e1n ch\u01b0a th\u00e0nh c\u00f4ng.",
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

const toPositiveNumber = (value) => {
  const normalizedValue = Number(value);

  return Number.isFinite(normalizedValue) && normalizedValue > 0
    ? normalizedValue
    : null;
};

const resolvePaginationSource = (payload) =>
  payload?.pagination || payload?.meta || payload || {};

const getPaginationMeta = (payload, currentPage, fallbackTotal) => {
  const source = resolvePaginationSource(payload);
  const page = toPositiveNumber(
    source?.page || source?.currentPage || source?.pageNumber
  );
  const limit = toPositiveNumber(source?.limit || source?.pageSize);
  const total = toPositiveNumber(
    source?.total || source?.totalItems || source?.count
  );
  const totalPages = toPositiveNumber(
    source?.totalPages || source?.pages || source?.totalPage
  );

  return {
    page: page || currentPage,
    limit: limit || PAYMENTS_PER_PAGE,
    total: total || fallbackTotal,
    totalPages:
      totalPages ||
      Math.max(
        1,
        Math.ceil((total || fallbackTotal || 0) / (limit || PAYMENTS_PER_PAGE))
      ),
  };
};

const getLocalPaginationMeta = (currentPage, totalItems) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAYMENTS_PER_PAGE));
  const page = Math.min(Math.max(currentPage, 1), totalPages);

  return {
    page,
    limit: PAYMENTS_PER_PAGE,
    total: totalItems,
    totalPages,
  };
};

const formatPaymentDate = (dateValue) => {
  if (!dateValue) {
    return "Ch\u01b0a c\u00f3 ng\u00e0y thanh to\u00e1n";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Ch\u01b0a c\u00f3 ng\u00e0y thanh to\u00e1n";
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  return `thg ${month} ${day}, ${year}`;
};

const formatPaymentAmount = (amount) => currencyFormatter.format(Number(amount) || 0);

const getFirstValidPlanName = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
};

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
    <LoadingState
      message={"\u0110ang t\u1ea3i l\u1ecbch s\u1eed thanh to\u00e1n..."}
      className="min-h-[18rem]"
    />
  );
};

const PaymentHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [subscription, setSubscription] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPaymentId, setExpandedPaymentId] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const loadSubscription = useCallback(async () => {
    try {
      const nextSubscription = await getMySubscriptionService();
      setSubscription(nextSubscription || null);
    } catch {
      setSubscription(null);
    }
  }, []);

  const loadPaymentHistory = useCallback(async (page, status) => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        limit: PAYMENTS_PER_PAGE,
      };

      if (status && status !== "all") {
        params.status = status;
      }

      const response = await getUserPaymentHistory(params);
      const nextPayments = normalizePayments(response?.items);
      const paginationSource = resolvePaginationSource(response);
      const hasBackendPagination =
        toPositiveNumber(paginationSource?.totalPages) !== null ||
        toPositiveNumber(paginationSource?.total) !== null ||
        toPositiveNumber(paginationSource?.totalItems) !== null;

      if (hasBackendPagination) {
        const nextPagination = getPaginationMeta(response, page, nextPayments.length);

        setPayments(nextPayments);
        setPagination(nextPagination);

        if (nextPagination.page !== page) {
          setCurrentPage(nextPagination.page);
        }

        return;
      }

      const locallyFilteredPayments =
        status === "all"
          ? nextPayments
          : nextPayments.filter((payment) => payment.status === status);
      const nextPagination = getLocalPaginationMeta(page, locallyFilteredPayments.length);
      const startIndex = (nextPagination.page - 1) * PAYMENTS_PER_PAGE;

      setPayments(
        locallyFilteredPayments.slice(startIndex, startIndex + PAYMENTS_PER_PAGE)
      );
      setPagination(nextPagination);

      if (nextPagination.page !== page) {
        setCurrentPage(nextPagination.page);
      }
    } catch (loadError) {
      setPayments([]);
      setPagination(INITIAL_PAGINATION);
      setError(
        getApiErrorMessage(
          loadError,
          "Kh\u00f4ng th\u1ec3 t\u1ea3i l\u1ecbch s\u1eed thanh to\u00e1n l\u00fac n\u00e0y."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    void loadPaymentHistory(currentPage, filterStatus);
  }, [currentPage, filterStatus, loadPaymentHistory]);

  const visiblePayments = useMemo(() => {
    if (filterStatus === "all") {
      return payments;
    }

    return payments.filter((payment) => payment.status === filterStatus);
  }, [filterStatus, payments]);

  useEffect(() => {
    if (visiblePayments.length === 0) {
      setExpandedPaymentId("");
      return;
    }

    setExpandedPaymentId((currentPaymentId) => {
      const hasCurrentExpandedPayment = visiblePayments.some(
        (payment) => payment.id === currentPaymentId
      );

      return hasCurrentExpandedPayment ? currentPaymentId : visiblePayments[0].id;
    });
  }, [visiblePayments]);

  const activeFilterLabel =
    PAYMENT_STATUS_OPTIONS.find((option) => option.value === filterStatus)?.label ||
    "T\u1ea5t c\u1ea3";
  const isPremiumUser = useMemo(
    () => hasPremiumAccess(user) || Boolean(subscription?.isPremium),
    [subscription?.isPremium, user]
  );
  const currentPlanName = useMemo(() => {
    const latestSuccessfulPayment = payments.find((payment) => payment.status === "success");

    return (
      getFirstValidPlanName(
        subscription?.currentPlan?.name,
        user?.subscription?.currentPlan?.name,
        user?.premiumType,
        user?.subscriptionType,
        user?.subscription?.tier,
        user?.subscription?.type,
        user?.plan?.name,
        typeof user?.plan === "string" ? user.plan : "",
        latestSuccessfulPayment?.planName
      ) || "Premium"
    );
  }, [payments, subscription?.currentPlan?.name, user]);
  const visiblePageNumbers = useMemo(() => {
    const totalPages = Math.max(1, pagination.totalPages || 1);

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const startPage = Math.max(1, Math.min(currentPage - 1, totalPages - 4));
    const endPage = Math.min(totalPages, startPage + 4);

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    );
  }, [currentPage, pagination.totalPages]);

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
    setCurrentPage(1);
    setExpandedPaymentId("");
    setIsFilterOpen(false);
  };

  const handleChangePage = (nextPage) => {
    const normalizedPage = Number(nextPage);

    if (!Number.isFinite(normalizedPage)) {
      return;
    }

    const clampedPage = Math.min(
      Math.max(normalizedPage, 1),
      Math.max(1, pagination.totalPages || 1)
    );

    if (clampedPage === currentPage) {
      return;
    }

    setCurrentPage(clampedPage);
    setExpandedPaymentId("");
  };

  return (
    <main className="min-h-screen w-full bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[900px]">
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#181818] text-white transition hover:bg-[#1f1f1f] sm:h-12 sm:w-12"
          aria-label={"Quay l\u1ea1i"}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="mt-5">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            {"L\u1ecbch s\u1eed thanh to\u00e1n"}
          </h1>
        </div>

        <section className="mt-6 w-full bg-[#111111] p-5 shadow-[0_12px_28px_rgba(0,0,0,0.16)] sm:max-w-[480px] sm:p-6">
          <p className="text-sm font-medium text-white/82">
            {isPremiumUser
              ? `G\u00f3i hi\u1ec7n t\u1ea1i c\u1ee7a b\u1ea1n: ${currentPlanName}.`
              : "B\u1ea1n \u0111ang d\u00f9ng d\u1ecbch v\u1ee5 mi\u1ec5n ph\u00ed c\u1ee7a ch\u00fang t\u00f4i."}
          </p>
          <div className="my-4 border-t border-white/10" />
          <Link
            to={routePaths.premium}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-white/80"
          >
            <span>{isPremiumUser ? "Xem Premium" : "D\u00f9ng Premium"}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                {"Kho\u1ea3n thanh to\u00e1n c\u1ee7a b\u1ea1n"}
              </h2>
              <p className="mt-1 text-sm text-white/48">
                {filterStatus === "all"
                  ? "To\u00e0n b\u1ed9 giao d\u1ecbch thanh to\u00e1n g\u1ea7n \u0111\u00e2y c\u1ee7a b\u1ea1n."
                  : `\u0110ang l\u1ecdc theo tr\u1ea1ng th\u00e1i: ${activeFilterLabel}.`}
              </p>
            </div>

            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsFilterOpen((currentValue) => !currentValue)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-4 text-sm font-medium text-white transition hover:bg-[#1f1f1f] sm:w-auto"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>{"B\u1ed9 l\u1ecdc"}</span>
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

            {!loading && !error && visiblePayments.length === 0 ? (
              <div className="w-full bg-[#111111] px-5 py-6 text-sm text-white/60 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                {filterStatus === "all"
                  ? "B\u1ea1n ch\u01b0a c\u00f3 l\u1ecbch s\u1eed thanh to\u00e1n."
                  : "Kh\u00f4ng c\u00f3 thanh to\u00e1n ph\u00f9 h\u1ee3p v\u1edbi b\u1ed9 l\u1ecdc \u0111\u00e3 ch\u1ecdn."}
              </div>
            ) : null}

            {!loading && !error && visiblePayments.length > 0
              ? visiblePayments.map((payment) => (
                  <PaymentHistoryCard
                    key={payment.id}
                    payment={payment}
                    isExpanded={expandedPaymentId === payment.id}
                    onToggle={() => handleTogglePayment(payment.id)}
                  />
                ))
              : null}
          </div>

          {!loading && !error && visiblePayments.length > 0 ? (
            <div className="mt-6 flex flex-col items-center justify-between gap-4 bg-[#111111] px-5 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.16)] sm:flex-row sm:px-6">
              <p className="text-sm text-white/60">
                {`Trang ${pagination.page} / ${pagination.totalPages}`}
                {pagination.total > 0 ? ` | ${pagination.total} giao d\u1ecbch` : ""}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChangePage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {"<"}
                </button>

                {visiblePageNumbers[0] > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleChangePage(1)}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-sm font-medium text-white transition hover:bg-white/[0.08]"
                    >
                      1
                    </button>
                    {visiblePageNumbers[0] > 2 ? (
                      <span className="px-1 text-sm text-white/45">...</span>
                    ) : null}
                  </>
                ) : null}

                {visiblePageNumbers.map((pageNumber) => {
                  const isActive = pageNumber === currentPage;

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => handleChangePage(pageNumber)}
                      className={[
                        "inline-flex h-12 w-12 items-center justify-center rounded-md border text-sm font-medium transition",
                        isActive
                          ? "border-white bg-white text-[#111111]"
                          : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]",
                      ].join(" ")}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                {visiblePageNumbers[visiblePageNumbers.length - 1] < pagination.totalPages ? (
                  <>
                    {visiblePageNumbers[visiblePageNumbers.length - 1] <
                    pagination.totalPages - 1 ? (
                      <span className="px-1 text-sm text-white/45">...</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleChangePage(pagination.totalPages)}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-sm font-medium text-white transition hover:bg-white/[0.08]"
                    >
                      {pagination.totalPages}
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleChangePage(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                >
                 {">"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default PaymentHistoryPage;