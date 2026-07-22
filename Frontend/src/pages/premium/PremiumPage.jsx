import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  ChevronLeft,
  Bot,
  Brain,
  Check,
  Download,
  ImagePlus,
  Infinity as InfinityIcon,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  createVnpayOrderService,
  getSubscriptionPlansService,
} from "../../services/subscriptionService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorMessage } from "../../utils/apiError";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const VAT_RATE = 0.1;

const FEATURE_META = {
  NO_ADS: {
    label: "Nghe nhạc không quảng cáo",
    Icon: AudioLines,
  },
  HIGH_QUALITY_AUDIO: {
    label: "Chất lượng âm thanh cao",
    Icon: Sparkles,
  },
  LOSSLESS_AUDIO: {
    label: "Âm thanh lossless",
    Icon: AudioLines,
  },
  UNLIMITED_SKIP: {
    label: "Bỏ qua bài hát không giới hạn",
    Icon: InfinityIcon,
  },
  OFFLINE_DOWNLOAD: {
    label: "Tải về ngoại tuyến",
    Icon: Download,
  },
  BACKGROUND_PLAY: {
    label: "Nghe nền",
    Icon: AudioLines,
  },
  AI_SMART_PLAYLIST: {
    label: "Playlist AI thông minh",
    Icon: Bot,
  },
  ADVANCED_RECOMMENDATION: {
    label: "Gợi ý nội dung tốt hơn",
    Icon: Brain,
  },
  EARLY_ACCESS: {
    label: "Ưu tiên trải nghiệm sớm",
    Icon: Sparkles,
  },
  EXCLUSIVE_CONTENT: {
    label: "Nội dung độc quyền",
    Icon: ImagePlus,
  },
};

const formatPrice = (price) => currencyFormatter.format(Number(price) || 0);

const getPlanPeriodText = (durationDays) => {
  if (Number(durationDays) === 30) {
    return "VND / tháng (bao gồm VAT)";
  }

  return `VND / ${durationDays || 0} ngày`;
};

const getFeatureMeta = (feature) =>
  FEATURE_META[feature] || {
    label: feature,
    Icon: Check,
  };

const getPlanPriceCaption = (durationDays) => {
  const baseCaption = getPlanPeriodText(durationDays);

  if (baseCaption.includes("VAT")) {
    return baseCaption.replace(/\([^)]*VAT\)/, "(+ VAT 10%)");
  }

  return `${baseCaption} (+ VAT 10%)`;
};

const MODAL_OPEN_DELAY_MS = 260;

const PremiumModalStyles = () => (
  <style>{`
    @keyframes premiumModalOverlayIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes premiumModalContentIn {
      from {
        opacity: 0;
        transform: translateY(18px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `}</style>
);

const ModalOpeningState = ({ isOpen, label }) => {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm [animation:premiumModalOverlayIn_180ms_ease-out]"
      aria-hidden="true"
    >
      <div className="w-full max-w-[320px] rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-6 text-center text-white shadow-[0_28px_90px_rgba(0,0,0,0.5)] [animation:premiumModalContentIn_220ms_ease-out_both]">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <p className="mt-4 text-sm font-semibold text-white/92">{label}</p>
        <p className="mt-2 text-xs text-white/56">Vui long cho trong giay lat...</p>
      </div>
    </div>,
    document.body
  );
};

const useModalEscape = ({ isOpen, isLocked, onClose }) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isLocked) {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocked, isOpen, onClose]);
};

const PlanDetailModal = ({ isOpen, plan, onClose, onPurchase }) => {
  useModalEscape({ isOpen, isLocked: false, onClose });

  if (!isOpen || !plan || typeof document === "undefined") {
    return null;
  }

  const features = Array.isArray(plan.features) ? plan.features : [];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/82 p-3 backdrop-blur-sm [animation:premiumModalOverlayIn_180ms_ease-out] sm:p-4"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-[760px] overflow-y-auto overscroll-contain rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#181818_0%,#101010_100%)] p-4 text-white shadow-[0_32px_120px_rgba(0,0,0,0.62)] [animation:premiumModalContentIn_220ms_ease-out_both] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[30px] sm:p-7"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-detail-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">
              Chi tiết gói
            </p>
            <h2
              id="plan-detail-title"
              className="mt-3 text-[1.9rem] font-semibold tracking-tight"
            >
              {plan.name || "Gói Premium"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/78 transition hover:bg-white/10 hover:text-white"
            aria-label="Đóng chi tiết gói"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[24px] bg-white/[0.04] p-5">
            <p className="text-sm leading-7 text-white/72">
              {plan.description ||
                "Gói này phù hợp nếu bạn muốn nâng cấp trải nghiệm nghe nhạc với nhiều quyền lợi hơn."}
            </p>
          </div>

          <div className="rounded-[24px] bg-white/[0.04] p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              Giá gói
            </p>
            <p className="mt-3 text-[2rem] font-semibold tracking-tight">
              {formatPrice(plan.price)}
            </p>
            <p className="mt-2 text-sm text-white/62">
              Thời hạn {plan.durationDays || 0} ngày
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Quyền lợi bao gồm</h3>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-white/60">
              {features.length} quyền lợi
            </span>
          </div>

          {features.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {features.map((feature) => {
                const { label, Icon } = getFeatureMeta(feature);

                return (
                  <div
                    key={feature}
                    className="flex items-start gap-3 rounded-[18px] border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm leading-6 text-white/88">{label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/64">
              Gói này hiện chưa có danh sách quyền lợi chi tiết.
            </p>
          )}
        </div>

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/14 px-5 text-sm font-semibold text-white transition hover:bg-white/8"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onPurchase}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-[#ececec]"
          >
            Tiếp tục mua gói
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const PurchaseConfirmationModal = ({
  isOpen,
  plan,
  isProcessing,
  onClose,
  onConfirm,
}) => {
  useModalEscape({ isOpen, isLocked: isProcessing, onClose });

  if (!isOpen || !plan || typeof document === "undefined") {
    return null;
  }

  const subtotal = Number(plan.price) || 0;
  const tax = Math.round(subtotal * VAT_RATE);
  const total = subtotal + tax;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/84 p-3 backdrop-blur-sm [animation:premiumModalOverlayIn_180ms_ease-out] sm:p-4"
      onClick={isProcessing ? undefined : onClose}
      aria-hidden="true"
    >
      <div
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-[620px] overflow-y-auto overscroll-contain rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#1a1a1a_0%,#111111_100%)] p-4 text-white shadow-[0_32px_120px_rgba(0,0,0,0.65)] [animation:premiumModalContentIn_220ms_ease-out_both] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[30px] sm:p-7"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-confirmation-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="purchase-confirmation-title"
            className="max-w-[26rem] text-[1.7rem] font-semibold tracking-tight"
          >
            Xác nhận mua gói dịch vụ
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/72 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng xác nhận thanh toán"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-[1.05rem] font-semibold">
              Gói đăng ký {plan.name || "Premium"}
            </p>
            <p className="mt-2 text-sm text-white/72">
              Thanh toán một lần, kích hoạt ngay sau khi giao dịch hoàn tất.
            </p>
          </div>
          <p className="shrink-0 text-[1.05rem] font-semibold">
            {formatPrice(plan.price)}
          </p>
        </div>

        <p className="mt-3 text-xs text-white/58">
          Tong thanh toan da bao gom VAT 10%.
        </p>

        <div className="mt-6 h-px bg-white/10" />

        <div className="mt-6 space-y-3.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/76">Tổng phụ</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/76">Thuế/Phí</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-base font-semibold">
            <span>Tổng đến hạn hôm nay</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <div className="mt-6 h-px bg-white/10" />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <span className="text-sm font-semibold">Phương thức thanh toán</span>
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <img
                src="/img_vieclam24h_vn_162996575242.png"
                alt="VNPAY"
                className="h-8 w-auto rounded-md bg-white px-2 py-1"
              />
              <span className="text-sm font-medium text-white/88">VNPAY</span>
            </div>
          </div>

          <div className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-semibold text-white/82">
            Cổng thanh toán trực tuyến
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/14 px-5 text-sm font-semibold text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-[#ececec] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang chuyển sang VNPAY...
              </span>
            ) : (
              "Thanh toán ngay"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const PremiumPage = () => {
  const [plans, setPlans] = useState([]);
  const [detailPlanId, setDetailPlanId] = useState("");
  const [purchasePlanId, setPurchasePlanId] = useState("");
  const [modalOpeningState, setModalOpeningState] = useState({
    type: "",
    planId: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [checkoutPlanId, setCheckoutPlanId] = useState("");
  const modalOpenTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadPremiumData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const plansResponse = await getSubscriptionPlansService();

        if (!isMounted) {
          return;
        }

        setPlans(Array.isArray(plansResponse) ? plansResponse : []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPlans([]);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải danh sách gói Premium lúc này.")
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPremiumData();

    return () => {
      isMounted = false;
    };
  }, []);

  const orderedPlans = useMemo(
    () =>
      [...plans].sort((firstPlan, secondPlan) => {
        const firstPrice = Number(firstPlan?.price) || 0;
        const secondPrice = Number(secondPlan?.price) || 0;

        return firstPrice - secondPrice;
      }),
    [plans]
  );

  const detailPlan = useMemo(
    () =>
      orderedPlans.find((plan) => (plan?._id || plan?.id || "") === detailPlanId) || null,
    [detailPlanId, orderedPlans]
  );

  const purchasePlan = useMemo(
    () =>
      orderedPlans.find((plan) => (plan?._id || plan?.id || "") === purchasePlanId) || null,
    [orderedPlans, purchasePlanId]
  );

  const openingPlan = useMemo(
    () =>
      orderedPlans.find((plan) => (plan?._id || plan?.id || "") === modalOpeningState.planId) ||
      null,
    [modalOpeningState.planId, orderedPlans]
  );

  useEffect(
    () => () => {
      if (modalOpenTimerRef.current) {
        window.clearTimeout(modalOpenTimerRef.current);
      }
    },
    []
  );

  const clearModalOpeningState = () => {
    if (modalOpenTimerRef.current) {
      window.clearTimeout(modalOpenTimerRef.current);
      modalOpenTimerRef.current = null;
    }

    setModalOpeningState({ type: "", planId: "" });
  };

  const beginOpenModal = (type, planId) => {
    if (!planId) {
      return;
    }

    clearModalOpeningState();
    setErrorMessage("");
    setDetailPlanId("");
    setPurchasePlanId("");
    setModalOpeningState({ type, planId });

    modalOpenTimerRef.current = window.setTimeout(() => {
      if (type === "detail") {
        setDetailPlanId(planId);
      } else {
        setPurchasePlanId(planId);
      }

      modalOpenTimerRef.current = null;
      setModalOpeningState({ type: "", planId: "" });
    }, MODAL_OPEN_DELAY_MS);
  };

  const openDetailPlan = (planId) => {
    beginOpenModal("detail", planId);
  };

  const openPurchasePlan = (planId) => {
    beginOpenModal("purchase", planId);
  };

  const closeDetailPlan = () => {
    clearModalOpeningState();
    setDetailPlanId("");
  };

  const closePurchasePlan = () => {
    if (checkoutPlanId) {
      return;
    }

    clearModalOpeningState();
    setPurchasePlanId("");
  };

  const moveDetailToPurchase = () => {
    const planId = detailPlan?._id || detailPlan?.id || "";

    if (!planId) {
      return;
    }

    beginOpenModal("purchase", planId);
  };

  const handleCheckout = async () => {
    const planId = purchasePlan?._id || purchasePlan?.id || "";

    if (!planId) {
      return;
    }

    setCheckoutPlanId(planId);
    setErrorMessage("");

    try {
      const response = await createVnpayOrderService({ planId });
      const paymentUrl = response?.paymentUrl?.trim?.() || "";

      if (!paymentUrl) {
        throw new Error("Payment URL was not returned from the backend.");
      }

      window.location.assign(paymentUrl);
    } catch (error) {
      setCheckoutPlanId("");
      setErrorMessage(
        getApiErrorMessage(error, "Không thể tạo đơn thanh toán VNPAY.")
      );
    }
  };

  const modalOpeningLabel =
    modalOpeningState.type === "detail"
      ? `Dang mo chi tiet ${openingPlan?.name || "goi"}...`
      : `Dang chuan bi ${openingPlan?.name || "goi"}...`;

  return (
    <>
      <PremiumModalStyles />
      <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(252,211,77,0.16),transparent_28%),radial-gradient(circle_at_18%_30%,rgba(56,189,248,0.14),transparent_26%),radial-gradient(circle_at_82%_74%,rgba(244,114,182,0.12),transparent_24%),linear-gradient(180deg,#090909_0%,#040404_100%)]" />
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_72px]" />
          <div className="absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-[#66c7f0]/10 blur-3xl" />
          <div className="absolute right-[-6rem] top-12 h-80 w-80 rounded-full bg-[#ffd36a]/10 blur-3xl" />
          <div className="absolute bottom-[-7rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#ff7cb0]/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1560px] px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
          <section className="mx-auto max-w-[880px] text-center">
            <div className="mb-6 flex justify-center">
              <Link
                to={routePaths.home}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/88 transition hover:bg-white/[0.08] hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Trở về trang chủ</span>
              </Link>
            </div>
            <h1 className="text-[2rem] font-medium tracking-tight text-white sm:text-[2.35rem]">
              Nâng cấp gói của bạn
            </h1>
          </section>

          {errorMessage ? (
            <section className="mx-auto mt-8 max-w-[720px] rounded-[24px] border border-red-400/25 bg-[#171717] px-5 py-4 text-[14px] text-red-200">
              {errorMessage}
            </section>
          ) : null}

          <section className="mx-auto mt-10 max-w-[1180px]">
            {isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center gap-3 text-[14px] text-white/70">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Đang tải danh sách gói...</span>
              </div>
            ) : orderedPlans.length === 0 ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-white/10 bg-[#151515] px-6 text-[14px] text-white/62">
                Hiện chưa có gói Premium khả dụng.
              </div>
            ) : (
              <div className="mx-auto grid w-fit justify-center gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {orderedPlans.map((plan) => {
                  const planId = plan?._id || plan?.id || "";
                  const features = Array.isArray(plan?.features)
                    ? plan.features.slice(0, 5)
                    : [];
                  const isProcessing = checkoutPlanId === planId;
                  const isOpeningThisPlan = modalOpeningState.planId === planId;
                  const isOpeningAnyModal = Boolean(modalOpeningState.type);

                  return (
                    <article
                      key={planId || plan?.name}
                      className="flex h-full min-h-[560px] w-full max-w-[360px] flex-col rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,31,32,0.9)_0%,rgba(18,18,19,0.96)_100%)] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-sm"
                    >
                      <div className="flex min-h-[220px] flex-col">
                        <div className="flex min-h-[60px] items-start justify-between gap-4">
                        <h2 className="text-[23px] font-semibold leading-tight tracking-tight">
                          {plan?.name || "Premium"}
                        </h2>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetailPlan(planId)}
                            disabled={isOpeningAnyModal}
                            className="rounded-full px-1 py-1 text-[13px] font-medium text-white/62 transition hover:text-white"
                          >
                            Chi tiết
                          </button>
                        </div>
                      </div>

                      <div className="mt-7 flex items-end gap-2.5">
                        <span className="pb-1 text-[14px] leading-none text-white/65">₫</span>
                        <span className="text-[38px] font-semibold leading-[0.9] tracking-[-0.04em]">
                          {(Number(plan?.price) || 0).toLocaleString("vi-VN")}
                        </span>
                        <span className="max-w-[8.5rem] pb-1 text-[12px] font-medium leading-5 text-white/86">
                          {getPlanPriceCaption(plan?.durationDays)}
                        </span>
                      </div>

                      <p className="mt-5 min-h-[58px] text-[13px] font-semibold leading-6 text-white/92">
                        {plan?.description ||
                          "Tiếp tục trò chuyện với quyền truy cập mở rộng và nhiều quyền lợi hơn."}
                      </p>

                      </div>

                      <button
                        type="button"
                        onClick={() => openPurchasePlan(planId)}
                        disabled={isProcessing || isOpeningAnyModal}
                        className="mt-4 inline-flex min-h-[46px] w-full items-center justify-center rounded-full bg-white text-[13px] font-semibold text-black transition hover:bg-[#ececec] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isProcessing ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang xử lý...
                          </span>
                        ) : isOpeningThisPlan && modalOpeningState.type === "purchase" ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Dang mo...
                          </span>
                        ) : (
                          `Chuyển sang ${plan?.name || "gói này"}`
                        )}
                      </button>

                      <div className="mt-7 flex-1 space-y-3">
                        {features.map((feature) => {
                          const { label, Icon } = getFeatureMeta(feature);

                          return (
                            <div
                              key={feature}
                              className="flex items-start gap-3 rounded-[18px] px-3 py-3 text-[13px] leading-6 text-white"
                            >
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                                <Icon className="h-4.5 w-4.5 text-white/92" />
                              </span>
                              <span className="text-white/92">{label}</span>
                            </div>
                          );
                        })}

                        {features.length === 0 ? (
                          <div className="rounded-[20px] border border-white/8 bg-black/10 px-4 py-4 text-[13px] text-white/62">
                            Gói này hiện chưa có quyền lợi hiển thị.
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <ModalOpeningState
        isOpen={Boolean(modalOpeningState.type)}
        label={modalOpeningLabel}
      />

      <PlanDetailModal
        isOpen={Boolean(detailPlan)}
        plan={detailPlan}
        onClose={closeDetailPlan}
        onPurchase={moveDetailToPurchase}
      />

      <PurchaseConfirmationModal
        isOpen={Boolean(purchasePlan)}
        plan={purchasePlan}
        isProcessing={checkoutPlanId === (purchasePlan?._id || purchasePlan?.id || "")}
        onClose={closePurchasePlan}
        onConfirm={handleCheckout}
      />
    </>
  );
};

export default PremiumPage;
