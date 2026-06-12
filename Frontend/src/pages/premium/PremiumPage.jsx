import { useEffect, useMemo, useState } from "react";
import { Check, Crown, Loader2, Sparkles } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import {
  createVnpayOrderService,
  getMySubscriptionService,
  getSubscriptionPlansService,
} from "../../services/subscriptionService";
import { getApiErrorMessage } from "../../utils/apiError";
import { hasPremiumAccess } from "../../utils/premiumAccess";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const FEATURE_LABELS = {
  NO_ADS: "Ad-free listening",
  HIGH_QUALITY_AUDIO: "High quality audio",
  LOSSLESS_AUDIO: "Lossless audio",
  UNLIMITED_SKIP: "Unlimited skips",
  OFFLINE_DOWNLOAD: "Offline downloads",
  BACKGROUND_PLAY: "Background play",
  AI_SMART_PLAYLIST: "AI smart playlist",
  ADVANCED_RECOMMENDATION: "Better recommendations",
  EARLY_ACCESS: "Early access content",
  EXCLUSIVE_CONTENT: "Exclusive content",
};

const formatPrice = (price) => {
  const normalizedPrice = Number(price) || 0;
  return currencyFormatter.format(normalizedPrice);
};

const formatDate = (value) => {
  if (!value) {
    return "--";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "--";
  }

  return dateFormatter.format(parsedDate);
};

const formatFeature = (feature) => FEATURE_LABELS[feature] || feature;

const PremiumPage = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [checkoutPlanId, setCheckoutPlanId] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPremiumData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [plansResponse, subscriptionResponse] = await Promise.all([
          getSubscriptionPlansService(),
          getMySubscriptionService(),
        ]);

        if (!isMounted) {
          return;
        }

        setPlans(Array.isArray(plansResponse) ? plansResponse : []);
        setSubscription(subscriptionResponse || null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPlans([]);
        setSubscription(null);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load premium plans right now."
          )
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

  const isPremiumUser = useMemo(() => {
    if (subscription) {
      return Boolean(subscription.isPremium);
    }

    return hasPremiumAccess(user);
  }, [subscription, user]);

  const currentPlanName = subscription?.currentPlan?.name || "Free";
  const premiumEndDate = subscription?.premiumEndDate;

  const handleCheckout = async (planId) => {
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
      setErrorMessage(
        getApiErrorMessage(error, "Unable to start the VNPAY checkout flow.")
      );
      setCheckoutPlanId("");
    }
  };

  return (
    <main
      className={[
        "relative min-h-full overflow-hidden rounded-[28px] border px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
        isDark
          ? "border-[#f5b66f]/10 bg-[radial-gradient(circle_at_top_left,_rgba(245,182,111,0.16),_transparent_28%),linear-gradient(145deg,_#09080b_0%,_#131018_48%,_#1a1520_100%)] text-[#f7f1ea]"
          : "border-[#e5e7eb] bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_26%),linear-gradient(145deg,_#fff8ec_0%,_#ffffff_45%,_#fff4dc_100%)] text-[#111111]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(255,205,86,0.2),_transparent_65%)]" />

      <section className="relative mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div
            className={[
              "rounded-[28px] border p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:p-8",
              isDark
                ? "border-[#f5b66f]/10 bg-black/30"
                : "border-white/70 bg-white/80",
            ].join(" ")}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b66f]/30 bg-[#f5b66f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#f5b66f]">
              <Sparkles className="h-3.5 w-3.5" />
              Premium
            </div>

            <h1 className="mt-4 max-w-2xl font-title text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Upgrade your listening with the simplest premium flow.
            </h1>

            <p
              className={[
                "mt-4 max-w-2xl text-sm leading-7 sm:text-base",
                isDark ? "text-[#d8d0ca]" : "text-[#4b5563]",
              ].join(" ")}
            >
              Pick a plan, continue to VNPAY, and come back with your premium
              access activated automatically by the backend.
            </p>

            {errorMessage ? (
              <div
                className={[
                  "mt-5 rounded-2xl border px-4 py-3 text-sm",
                  isDark
                    ? "border-red-400/20 bg-red-500/10 text-red-100"
                    : "border-red-200 bg-red-50 text-red-700",
                ].join(" ")}
              >
                {errorMessage}
              </div>
            ) : null}
          </div>

          <aside
            className={[
              "rounded-[28px] border p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:p-7",
              isDark
                ? "border-[#f5b66f]/10 bg-[#120f16]/90"
                : "border-white/70 bg-white/85",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5b66f] text-black">
                <Crown className="h-6 w-6" />
              </div>

              <div>
                <p
                  className={[
                    "text-xs font-semibold uppercase tracking-[0.22em]",
                    isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
                  ].join(" ")}
                >
                  Current status
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {isPremiumUser ? "Premium active" : "Free account"}
                </p>
              </div>
            </div>

            <div
              className={[
                "mt-6 space-y-4 rounded-2xl border p-4",
                isDark
                  ? "border-[#f5b66f]/10 bg-black/25"
                  : "border-[#f3f4f6] bg-[#fffdf8]",
              ].join(" ")}
            >
              <div>
                <p
                  className={[
                    "text-xs uppercase tracking-[0.22em]",
                    isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
                  ].join(" ")}
                >
                  Plan
                </p>
                <p className="mt-1 text-lg font-semibold">{currentPlanName}</p>
              </div>

              <div>
                <p
                  className={[
                    "text-xs uppercase tracking-[0.22em]",
                    isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
                  ].join(" ")}
                >
                  Premium until
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {isPremiumUser ? formatDate(premiumEndDate) : "--"}
                </p>
              </div>

              <div>
                <p
                  className={[
                    "text-xs uppercase tracking-[0.22em]",
                    isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
                  ].join(" ")}
                >
                  Account
                </p>
                <p className="mt-1 truncate text-sm">
                  {user?.email || "Signed-in user"}
                </p>
              </div>
            </div>
          </aside>
        </div>

        {isLoading ? (
          <div
            className={[
              "mt-6 flex min-h-[280px] items-center justify-center rounded-[28px] border",
              isDark
                ? "border-[#f5b66f]/10 bg-black/20"
                : "border-[#e5e7eb] bg-white/70",
            ].join(" ")}
          >
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-[#f5b66f]" />
              <span>Loading premium plans...</span>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div
            className={[
              "mt-6 rounded-[28px] border p-6 text-sm sm:p-7",
              isDark
                ? "border-[#f5b66f]/10 bg-black/20 text-[#d8d0ca]"
                : "border-[#e5e7eb] bg-white/75 text-[#4b5563]",
            ].join(" ")}
          >
            There are no active premium plans available right now.
          </div>
        ) : (
          <section className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const planId = plan?._id || plan?.id || "";
              const isProcessing = checkoutPlanId === planId;
              const featureList = Array.isArray(plan?.features)
                ? plan.features
                : [];

              return (
                <article
                  key={planId || plan?.name}
                  className={[
                    "flex h-full flex-col rounded-[28px] border p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-7",
                    isDark
                      ? "border-[#f5b66f]/10 bg-[#100d14]/92"
                      : "border-white/70 bg-white/90",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={[
                          "text-xs font-semibold uppercase tracking-[0.24em]",
                          isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
                        ].join(" ")}
                      >
                        Premium plan
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold">
                        {plan?.name || "Unnamed plan"}
                      </h2>
                    </div>

                    <div className="rounded-full bg-[#f5b66f] px-3 py-1 text-xs font-semibold text-black">
                      {plan?.durationDays || 0} days
                    </div>
                  </div>

                  <p
                    className={[
                      "mt-4 min-h-12 text-sm leading-7",
                      isDark ? "text-[#d8d0ca]" : "text-[#4b5563]",
                    ].join(" ")}
                  >
                    {plan?.description || "Premium listening benefits."}
                  </p>

                  <div className="mt-6">
                    <p className="text-3xl font-semibold text-[#f5b66f]">
                      {formatPrice(plan?.price)}
                    </p>
                    <p
                      className={[
                        "mt-1 text-sm",
                        isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
                      ].join(" ")}
                    >
                      One-time payment via VNPAY
                    </p>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {featureList.length > 0 ? (
                      featureList.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5b66f]/15 text-[#f5b66f]">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span>{formatFeature(feature)}</span>
                        </li>
                      ))
                    ) : (
                      <li
                        className={[
                          "text-sm",
                          isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
                        ].join(" ")}
                      >
                        This plan does not list extra features.
                      </li>
                    )}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleCheckout(planId)}
                    disabled={!planId || Boolean(checkoutPlanId)}
                    className={[
                      "mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition",
                      !planId || Boolean(checkoutPlanId)
                        ? "cursor-not-allowed bg-[#d1d5db] text-[#6b7280]"
                        : "bg-[#f5b66f] text-black hover:bg-[#f8c886]",
                    ].join(" ")}
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirecting to VNPAY...
                      </span>
                    ) : isPremiumUser ? (
                      "Extend with VNPAY"
                    ) : (
                      "Buy with VNPAY"
                    )}
                  </button>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
};

export default PremiumPage;
