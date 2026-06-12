import { AlertTriangle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { routePaths } from "../../routes/routePaths";

const normalizeFailureReason = (value) => {
  const normalizedValue = typeof value === "string" ? value.trim() : "";

  if (!normalizedValue) {
    return "The payment could not be completed.";
  }

  if (normalizedValue === "invalid_signature") {
    return "The payment callback signature was invalid.";
  }

  return normalizedValue;
};

const PremiumPaymentFailedPage = () => {
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  const invoiceNumber = searchParams.get("invoiceNumber")?.trim() || "";
  const reason = normalizeFailureReason(searchParams.get("reason"));

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
            ? "border-[#f5b66f]/10 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.12),_transparent_40%),linear-gradient(145deg,_#09080b_0%,_#131018_52%,_#19151e_100%)]"
            : "border-[#e5e7eb] bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.14),_transparent_40%),linear-gradient(145deg,_#fff5f5_0%,_#ffffff_52%,_#fff1f1_100%)]",
        ].join(" ")}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/15 text-red-400">
          <AlertTriangle className="h-9 w-9" />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
          Payment failed
        </p>
        <h1 className="mt-3 font-title text-3xl font-semibold tracking-tight sm:text-4xl">
          The premium payment was not completed.
        </h1>
        <p
          className={[
            "mt-4 text-sm leading-7 sm:text-base",
            isDark ? "text-[#d8d0ca]" : "text-[#4b5563]",
          ].join(" ")}
        >
          No premium change was applied. You can return to the premium page and
          try again whenever you are ready.
        </p>

        <div
          className={[
            "mt-6 space-y-3 rounded-2xl border p-4 text-sm",
            isDark
              ? "border-red-400/15 bg-red-500/10 text-red-100"
              : "border-red-200 bg-red-50 text-red-700",
          ].join(" ")}
        >
          <p>
            Reason: <span className="font-semibold">{reason}</span>
          </p>
          {invoiceNumber ? (
            <p>
              Invoice: <span className="font-semibold">{invoiceNumber}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={routePaths.premium}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#f5b66f] px-5 text-sm font-semibold text-black transition hover:bg-[#f8c886]"
          >
            Try again
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
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
};

export default PremiumPaymentFailedPage;
