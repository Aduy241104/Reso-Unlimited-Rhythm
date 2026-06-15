import { AlertTriangle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { routePaths } from "../../routes/routePaths";

const normalizeFailureReason = (value) => {
  const normalizedValue = typeof value === "string" ? value.trim() : "";

  if (!normalizedValue) {
    return "Thanh toan khong thanh cong.";
  }

  if (normalizedValue === "invalid_signature") {
    return "Chu ky callback khong hop le.";
  }

  return normalizedValue;
};

const PremiumPaymentFailedPage = () => {
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  const invoiceNumber = searchParams.get("invoiceNumber")?.trim() || "";
  const reason = normalizeFailureReason(searchParams.get("reason"));

  return (
    <main className="mx-auto max-w-3xl py-8">
      <section
        className={[
          "rounded-2xl border p-6 sm:p-8",
          isDark ? "border-white/10 bg-[#111111] text-[#f7f1ea]" : "border-[#e5e7eb] bg-white text-[#111111]",
        ].join(" ")}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 text-red-500">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h1 className="mt-4 text-2xl font-semibold">Thanh toán chưa hoàn tất</h1>
        <p className={`mt-2 text-sm ${isDark ? "text-[#b3b3b3]" : "text-[#6b7280]"}`}>
          Giao dịch chưa được xác nhận. Bạn có thể kiểm tra lại và thử thanh toán lại.
        </p>

        <div
          className={[
            "mt-6 space-y-3 rounded-xl border p-4 text-sm",
            isDark
              ? "border-red-400/15 bg-red-500/10 text-red-100"
              : "border-red-200 bg-red-50 text-red-700",
          ].join(" ")}
        >
          <p>
            Lý do: <span className="font-semibold">{reason}</span>
          </p>
          {invoiceNumber ? (
            <p>
              Mã đơn: <span className="font-semibold">{invoiceNumber}</span>
            </p>
          ) : null}
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

export default PremiumPaymentFailedPage;
