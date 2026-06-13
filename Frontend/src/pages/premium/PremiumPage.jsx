import { useEffect, useMemo, useState } from "react";
import {
  AudioLines,
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
import {
  createVnpayOrderService,
  getSubscriptionPlansService,
} from "../../services/subscriptionService";
import { getApiErrorMessage } from "../../utils/apiError";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full max-w-[760px] rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#181818_0%,#101010_100%)] p-6 text-white shadow-[0_32px_120px_rgba(0,0,0,0.62)] sm:p-7"
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
  const tax = 0;
  const total = subtotal + tax;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/84 p-4 backdrop-blur-sm"
      onClick={isProcessing ? undefined : onClose}
      aria-hidden="true"
    >
      <div
        className="w-full max-w-[620px] rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#1a1a1a_0%,#111111_100%)] p-6 text-white shadow-[0_32px_120px_rgba(0,0,0,0.65)] sm:p-7"
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            <span className="text-sm font-semibold">Phương thức thanh toán</span>
            <span className="text-sm text-white/88">VNPAY</span>
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [checkoutPlanId, setCheckoutPlanId] = useState("");

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

  const openDetailPlan = (planId) => {
    setDetailPlanId(planId);
    setErrorMessage("");
  };

  const openPurchasePlan = (planId) => {
    setPurchasePlanId(planId);
    setErrorMessage("");
  };

  const closeDetailPlan = () => {
    setDetailPlanId("");
  };

  const closePurchasePlan = () => {
    if (checkoutPlanId) {
      return;
    }

    setPurchasePlanId("");
  };

  const moveDetailToPurchase = () => {
    const planId = detailPlan?._id || detailPlan?.id || "";

    if (!planId) {
      return;
    }

    setDetailPlanId("");
    setPurchasePlanId(planId);
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

  return (
    <>
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-[1560px] px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
          <section className="mx-auto max-w-[880px] text-center">
            <h1 className="text-[2rem] font-medium tracking-tight text-white sm:text-[2.35rem]">
              Nâng cấp gói của bạn
            </h1>
          </section>

          {errorMessage ? (
            <section className="mx-auto mt-8 max-w-[720px] rounded-[24px] border border-red-400/25 bg-[#171717] px-5 py-4 text-[14px] text-red-200">
              {errorMessage}
            </section>
          ) : null}

          <section className="mx-auto mt-10 max-w-[1500px]">
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
              <div className="grid justify-center gap-7 lg:grid-cols-2 xl:grid-cols-3">
                {orderedPlans.map((plan) => {
                  const planId = plan?._id || plan?.id || "";
                  const features = Array.isArray(plan?.features)
                    ? plan.features.slice(0, 5)
                    : [];
                  const isProcessing = checkoutPlanId === planId;

                  return (
                    <article
                      key={planId || plan?.name}
                      className="flex h-full min-h-[680px] w-full max-w-[480px] flex-col rounded-[28px] border border-white/10 bg-[#232323] p-7 shadow-[0_18px_54px_rgba(0,0,0,0.28)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="text-[28px] font-semibold leading-none tracking-tight">
                          {plan?.name || "Premium"}
                        </h2>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetailPlan(planId)}
                            className="rounded-full px-1 py-1 text-[14px] font-medium text-white/62 transition hover:text-white"
                          >
                            Chi tiết
                          </button>
                        </div>
                      </div>

                      <div className="mt-10 flex items-end gap-3">
                        <span className="pb-1 text-[14px] leading-none text-white/65">₫</span>
                        <span className="text-[48px] font-semibold leading-[0.9] tracking-[-0.04em]">
                          {(Number(plan?.price) || 0).toLocaleString("vi-VN")}
                        </span>
                        <span className="max-w-[10rem] pb-1 text-[14px] font-medium leading-5 text-white">
                          {getPlanPeriodText(plan?.durationDays)}
                        </span>
                      </div>

                      <p className="mt-6 min-h-[72px] text-[14px] font-semibold leading-6 text-white">
                        {plan?.description ||
                          "Tiếp tục trò chuyện với quyền truy cập mở rộng và nhiều quyền lợi hơn."}
                      </p>

                      <button
                        type="button"
                        onClick={() => openPurchasePlan(planId)}
                        disabled={isProcessing}
                        className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-white/10 bg-transparent text-[14px] font-semibold text-white transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isProcessing ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang xử lý...
                          </span>
                        ) : (
                          `Chuyển sang ${plan?.name || "gói này"}`
                        )}
                      </button>

                      <div className="mt-10 flex-1 space-y-4">
                        {features.map((feature) => {
                          const { label, Icon } = getFeatureMeta(feature);

                          return (
                            <div
                              key={feature}
                              className="flex items-start gap-4 text-[14px] leading-6 text-white"
                            >
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/10">
                                <Icon className="h-4.5 w-4.5 text-white/92" />
                              </span>
                              <span className="text-white/92">{label}</span>
                            </div>
                          );
                        })}

                        {features.length === 0 ? (
                          <div className="rounded-[20px] border border-white/8 bg-black/10 px-4 py-4 text-[14px] text-white/62">
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
