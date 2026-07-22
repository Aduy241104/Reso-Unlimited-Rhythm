import { Check, ChevronDown, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import PaymentStatusBadge from "./PaymentStatusBadge";

const PaymentHistoryCard = ({ payment, isExpanded, onToggle }) => {
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);
  const mobileManageMenuRef = useRef(null);
  const desktopManageMenuRef = useRef(null);
  const invoiceValue = payment.invoiceNumber || payment.transactionId || "";
  const paymentId = payment.id || payment._id || "";

  useEffect(() => {
    if (!isCopied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsCopied(false);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [isCopied]);

  useEffect(() => {
    if (!isManageMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const isInsideMobileMenu = mobileManageMenuRef.current?.contains(event.target);
      const isInsideDesktopMenu = desktopManageMenuRef.current?.contains(event.target);

      if (!isInsideMobileMenu && !isInsideDesktopMenu) {
        setIsManageMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsManageMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isManageMenuOpen]);

  useEffect(() => {
    if (!isExpanded) {
      setIsManageMenuOpen(false);
    }
  }, [isExpanded]);

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

  const handleViewReceipt = () => {
    if (!paymentId) {
      return;
    }

    setIsManageMenuOpen(false);
    navigate(routePaths.userPaymentReceipt.replace(":paymentId", payment.id || payment._id));
  };

  const renderManageMenu = ({ menuRef, wrapperClassName, buttonClassName, menuClassName }) => (
    <div ref={menuRef} className={wrapperClassName}>
      <button
        type="button"
        onClick={() => setIsManageMenuOpen((currentValue) => !currentValue)}
        className={buttonClassName}
        aria-expanded={isManageMenuOpen}
        aria-haspopup="menu"
      >
        <span>Quản lý</span>
        <ChevronDown
          className={[
            "h-4 w-4 transition duration-200",
            isManageMenuOpen ? "rotate-180 text-white" : "rotate-0 text-white/72",
          ].join(" ")}
        />
      </button>

      {isManageMenuOpen ? (
        <div
          className={[
            "absolute top-[calc(100%+8px)] z-20 min-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#161616] p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.42)]",
            menuClassName,
          ].join(" ")}
          role="menu"
        >
          <button
            type="button"
            onClick={handleViewReceipt}
            disabled={!paymentId}
            className="flex w-full items-center rounded-[14px] px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:text-white/35"
            role="menuitem"
          >
            Xem biên nhận
          </button>

          <button
            type="button"
            disabled
            className="flex w-full items-center rounded-[14px] px-4 py-3 text-left text-sm font-medium text-white/45"
            role="menuitem"
          >
            Yêu cầu hoàn tiền
          </button>
        </div>
      ) : null}
    </div>
  );

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
        <div className="mx-auto w-full max-w-[1000px] px-4 py-5 sm:px-8 sm:py-8">
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

                {renderManageMenu({
                  menuRef: mobileManageMenuRef,
                  wrapperClassName: "relative w-full",
                  buttonClassName:
                    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/14",
                  menuClassName: "left-0 w-full",
                })}
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
                    {renderManageMenu({
                      menuRef: desktopManageMenuRef,
                      wrapperClassName: "relative",
                      buttonClassName:
                        "inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white transition hover:bg-[#181818]",
                      menuClassName: "right-0 w-[220px]",
                    })}
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

