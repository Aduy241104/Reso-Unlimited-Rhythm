import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { routePaths } from "../../routes/routePaths";
import { getMySubscriptionService } from "../../services/subscriptionService";
import { getApiErrorMessage } from "../../utils/apiError";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const PREMIUM_SYNC_MAX_ATTEMPTS = 4;
const PREMIUM_SYNC_RETRY_DELAY_MS = 1200;

const wait = (durationMs) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

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

const mergeSubscriptionIntoUser = (user, subscription) => {
  if (!user) {
    return user;
  }

  const isPremium = Boolean(
    subscription?.isPremium ||
    user.isPremium ||
    user.premium ||
    user.subscription?.isPremium
  );
  const currentPlanName =
    subscription?.currentPlan?.name ||
    user.premiumType ||
    user.subscriptionType ||
    user.subscription?.tier ||
    user.subscription?.type ||
    null;

  return {
    ...user,
    isPremium,
    premium: isPremium,
    premiumType: currentPlanName || user.premiumType || null,
    subscriptionType: currentPlanName || user.subscriptionType || null,
    subscription: {
      ...(user.subscription || {}),
      isPremium,
      currentPlanId:
        subscription?.currentPlan?._id || user.subscription?.currentPlanId || null,
      currentPlan: subscription?.currentPlan || user.subscription?.currentPlan || null,
      tier: currentPlanName || user.subscription?.tier || null,
      type: currentPlanName || user.subscription?.type || null,
      premiumEndDate: subscription?.premiumEndDate || null,
    },
  };
};

const PremiumPaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { refreshSession, refreshCurrentUser, setUser } = useAuth();
  const { isDark } = useTheme();
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const invoiceNumber = searchParams.get("invoiceNumber")?.trim() || "";

  useEffect(() => {
    let isMounted = true;

    const syncSubscription = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        await refreshSession({ preserveSessionOnError: true });
      } catch {
        // Ignore here and continue to query the latest subscription state.
      }

      try {
        let subscriptionResponse = null;
        let currentUserProfile = null;

        for (let attempt = 0; attempt < PREMIUM_SYNC_MAX_ATTEMPTS; attempt += 1) {
          const [latestSubscription, latestUserProfile] = await Promise.all([
            getMySubscriptionService(),
            refreshCurrentUser().catch(() => null),
          ]);

          subscriptionResponse = latestSubscription || subscriptionResponse;
          currentUserProfile = latestUserProfile || currentUserProfile;

          if (latestSubscription?.isPremium || latestUserProfile?.isPremium) {
            break;
          }

          if (attempt < PREMIUM_SYNC_MAX_ATTEMPTS - 1) {
            await wait(PREMIUM_SYNC_RETRY_DELAY_MS);
          }
        }

        if (!isMounted) {
          return;
        }

        setSubscription(subscriptionResponse || null);
        setUser((currentUser) =>
          mergeSubscriptionIntoUser(
            currentUserProfile || currentUser,
            subscriptionResponse
          )
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          getApiErrorMessage(
            error,
            "Thanh toán thành công nhưng chưa thể cập nhật trạng thái Premium."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    syncSubscription();

    return () => {
      isMounted = false;
    };
  }, [refreshCurrentUser, refreshSession, setUser]);

  return (
    <main className="mx-auto max-w-3xl py-8">
      <section
        className={[
          "rounded-2xl border p-6 sm:p-8",
          isDark ? "border-white/10 bg-[#111111] text-[#f7f1ea]" : "border-[#e5e7eb] bg-white text-[#111111]",
        ].join(" ")}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <h1 className="mt-4 text-2xl font-semibold">Thanh toán thành công</h1>
        <p className={`mt-2 text-sm ${isDark ? "text-[#b3b3b3]" : "text-[#6b7280]"}`}>
          Hệ thống đã nhận kết quả thanh toán từ VNPAY.
        </p>

        <div
          className={[
            "mt-6 rounded-xl border p-4",
            isDark ? "border-white/10 bg-[#151515]" : "border-[#e5e7eb] bg-[#fafafa]",
          ].join(" ")}
        >
          {isLoading ? (
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-[#f5b66f]" />
              <span>Đang cập nhật trạng thái premium...</span>
            </div>
          ) : errorMessage ? (
            <p className={`text-sm ${isDark ? "text-red-100" : "text-red-700"}`}>
              {errorMessage}
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <p>
                Trạng thái:{" "}
                <span className="font-semibold">
                  {subscription?.isPremium ? "Premium" : "Đã cập nhật"}
                </span>
              </p>
              <p>
                Gói:{" "}
                <span className="font-semibold">
                  {subscription?.currentPlan?.name || "--"}
                </span>
              </p>
              <p>
                Hết hạn:{" "}
                <span className="font-semibold">
                  {formatDate(subscription?.premiumEndDate)}
                </span>
              </p>
              {invoiceNumber ? (
                <p>
                  Mã đơn: <span className="font-semibold">{invoiceNumber}</span>
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={routePaths.premium}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f5b66f] px-4 text-sm font-semibold text-black transition hover:bg-[#f8c886]"
          >
            Quay lại Premium
          </Link>
          <Link
            to={routePaths.home}
            className={[
              "inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition",
              isDark
                ? "border-white/10 bg-[#151515] text-[#f7f1ea] hover:bg-[#1b1b1b]"
                : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
            ].join(" ")}
          >
            Về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
};

export default PremiumPaymentSuccessPage;
