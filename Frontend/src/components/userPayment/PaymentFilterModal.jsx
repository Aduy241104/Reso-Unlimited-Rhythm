import { Check, X } from "lucide-react";

const PaymentFilterModal = ({
  isOpen,
  options = [],
  selectedStatus = "all",
  onClose,
  onSelect,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 bg-black/30"
        onClick={onClose}
        aria-label="Đóng bộ lọc"
      />

      <div className="absolute right-0 top-full z-40 mt-3 w-[min(20rem,calc(100vw-2.5rem))] rounded-[24px] bg-[#181818] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">
              Bộ lọc
            </p>
            <h3 className="mt-2 text-base font-semibold text-white">
              Trạng thái thanh toán
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1f1f1f] text-white/70 transition hover:bg-[#121212] hover:text-white"
            aria-label="Đóng bộ lọc"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {options.map((option) => {
            const isSelected = selectedStatus === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className={[
                  "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition",
                  isSelected
                    ? "bg-[#1f1f1f] text-white"
                    : "bg-[#121212] text-white/72 hover:bg-[#1f1f1f] hover:text-white",
                ].join(" ")}
              >
                <div>
                  <p className="text-sm font-medium">{option.label}</p>
                  {option.description ? (
                    <p className="mt-1 text-xs text-white/45">{option.description}</p>
                  ) : null}
                </div>

                <span
                  className={[
                    "inline-flex h-5 w-5 items-center justify-center rounded-full",
                    isSelected
                      ? "bg-[#181818] text-emerald-200"
                      : "bg-[#181818] text-transparent",
                  ].join(" ")}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default PaymentFilterModal;
