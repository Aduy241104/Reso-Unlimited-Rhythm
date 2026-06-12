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

  return {
    ...user,
    subscription: {
      ...(user.subscription || {}),
      isPremium: Boolean(subscription?.isPremium),
      currentPlanId:
        subscription?.currentPlan?._id || user.subscription?.currentPlanId || null,
      premiumEndDate: subscription?.premiumEndDate || null,
    },
  };
};

const PremiumPaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { refreshSession, setUser } = useAuth();
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
        const subscriptionResponse = await getMySubscriptionService();

        if (!isMounted) {
          return;
        }

        setSubscription(subscriptionResponse || null);
        setUser((currentUser) =>
          mergeSubscriptionIntoUser(currentUser, subscriptionResponse)
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          getApiErrorMessage(
            error,
            "Payment succeeded, but the premium status could not be refreshed yet."
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
  }, [refreshSession, setUser]);

  return (
    <main
      className={[
        "mx-auto flex min-h-full w-full max-w-3xl items-center py-8",
        isDark ? "text-[#f7f1ea]" : "text-[#111111]",
      ].join(" ")}
    >
      <section
        className={[
          "w-full rounded-[32px] border p-6 shadow-[0_28px_90px_rgba(15,23,42,0.16)] sm:p-8",
          isDark
            ? "border-[#f5b66f]/10 bg-[radial-gradient(circle_at_top,_rgba(245,182,111,0.14),_transparent_40%),linear-gradient(145deg,_#09080b_0%,_#131018_52%,_#19151e_100%)]"
            : "border-[#e5e7eb] bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_40%),linear-gradient(145deg,_#fff8ec_0%,_#ffffff_52%,_#fff4dc_100%)]",
        ].join(" ")}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 className="h-9 w-9" />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[#f5b66f]">
          Payment success
        </p>
        <h1 className="mt-3 font-title text-3xl font-semibold tracking-tight sm:text-4xl">
          Your premium purchase was completed successfully.
        </h1>
        <p
          className={[
            "mt-4 text-sm leading-7 sm:text-base",
            isDark ? "text-[#d8d0ca]" : "text-[#4b5563]",
          ].join(" ")}
        >
          The backend has confirmed the VNPAY transaction and activated your
          premium flow.
        </p>

        <div
          className={[
            "mt-6 rounded-2xl border p-4",
            isDark
              ? "border-[#f5b66f]/10 bg-black/25"
              : "border-[#f3f4f6] bg-white/80",
          ].join(" ")}
        >
          {isLoading ? (
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-[#f5b66f]" />
              <span>Refreshing your premium status...</span>
            </div>
          ) : errorMessage ? (
            <p
              className={[
                "text-sm",
                isDark ? "text-red-100" : "text-red-700",
              ].join(" ")}
            >
              {errorMessage}
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <p>
                Status:{" "}
                <span className="font-semibold">
                  {subscription?.isPremium ? "Premium active" : "Updated"}
                </span>
              </p>
              <p>
                Plan:{" "}
                <span className="font-semibold">
                  {subscription?.currentPlan?.name || "--"}
                </span>
              </p>
              <p>
                Premium until:{" "}
                <span className="font-semibold">
                  {formatDate(subscription?.premiumEndDate)}
                </span>
              </p>
              {invoiceNumber ? (
                <p>
                  Invoice: <span className="font-semibold">{invoiceNumber}</span>
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={routePaths.premium}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#f5b66f] px-5 text-sm font-semibold text-black transition hover:bg-[#f8c886]"
          >
            Back to Premium
          </Link>
          <Link
            to={routePaths.home}
            className={[
              "inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition",
              isDark
                ? "border-[#f5b66f]/10 bg-white/5 text-[#f7f1ea] hover:bg-white/10"
                : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
            ].join(" ")}
          >
            Continue listening
          </Link>
        </div>
      </section>
    </main>
  );
};

export default PremiumPaymentSuccessPage;
