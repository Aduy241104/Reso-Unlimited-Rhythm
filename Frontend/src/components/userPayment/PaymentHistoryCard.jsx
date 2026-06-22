import { Check, ChevronDown, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import PaymentStatusBadge from "./PaymentStatusBadge";

const PaymentHistoryCard = ({ payment, isExpanded, onToggle }) => {
  const [isCopied, setIsCopied] = useState(false);
  const invoiceValue = payment.invoiceNumber || payment.transactionId || "";

  useEffect(() => {
    if (!isCopied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsCopied(false);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [isCopied]);

  const handleCopyInvoice = async () => {
    if (!invoiceValue) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(invoiceValue);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = invoiceValue;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <article className="w-full overflow-hidden bg-[#111111] shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[#181818] sm:px-6 sm:py-5"
        aria-expanded={isExpanded}
      >
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {payment.displayDate}
          </p>
          <p className="mt-2 text-base font-medium text-white/72 sm:text-lg">
            {payment.displayAmount}
          </p>
        </div>

        <span
          className={[
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1f1f1f] text-white/72 transition duration-200 sm:h-11 sm:w-11",
            isExpanded ? "rotate-180 text-white" : "rotate-0",
          ].join(" ")}
        >
          <ChevronDown className="h-5 w-5" />
        </span>
      </button>

      {isExpanded ? (
        <div className="mx-auto w-full max-w-[1000px] px-8 py-8">
          <div className="bg-[#111111]">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-white/36">
                Số hóa đơn
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-white/88">
                  {invoiceValue || "Chưa có thông tin"}
                </span>
                <button
                  type="button"
                  onClick={handleCopyInvoice}
                  disabled={!invoiceValue}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#181818] text-white/68 transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Sao chép số hóa đơn"
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="mt-8 bg-[#111111]">
              <div className="grid gap-4 sm:hidden">
                <div>
                  <p className="text-sm text-white/45">Mặt hàng</p>
                  <p className="mt-1 text-base font-bold text-white">{payment.planName}</p>
                </div>

                <div>
                  <p className="text-sm text-white/45">Số tiền</p>
                  <p className="mt-1 text-base text-white/88">{payment.displayAmount}</p>
                </div>

                <div>
                  <p className="text-sm text-white/45">Trạng thái</p>
                  <div className="mt-2">
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                </div>

                <Link
                  to={routePaths.premium}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/14"
                >
                  Quản lý
                </Link>
              </div>

              <div className="hidden sm:block">
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-x-10 pb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/38">
                  <span>Mặt hàng</span>
                  <span>Số tiền</span>
                  <span>Trạng thái</span>
                  <span className="justify-self-end">Quản lý</span>
                </div>

                <div className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-x-10 pt-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {payment.planName}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white/88">{payment.displayAmount}</p>
                  </div>

                  <div>
                    <PaymentStatusBadge status={payment.status} />
                  </div>

                  <div className="justify-self-end">
                    <Link
                      to={routePaths.premium}
                      className="inline-flex min-h-10 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white transition hover:bg-[#181818]"
                    >
                      Quản lý
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-10 text-sm leading-6 text-white/52">
            Giá đã bao gồm thuế. Xem (các) biên nhận của bạn để biết đầy đủ thông
            tin chi tiết về thuế.
          </p>
        </div>
      ) : null}
    </article>
  );
};

export default PaymentHistoryCard;
