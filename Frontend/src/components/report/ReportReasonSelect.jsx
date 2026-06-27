import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const GROUP_STYLES = [
  {
    headerClassName: "text-[#f5d08a]",
  },
  {
    headerClassName: "text-[#f5d08a]",
  },
  {
    headerClassName: "text-[#f5d08a]",
  },
];

const flattenOptions = (groups) =>
  groups.flatMap((group) => group.options.map((option) => option));

const ReportReasonSelect = ({
  groups,
  value,
  onChange,
  placeholder = "Chọn lý do báo cáo",
  disabled = false,
}) => {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo(() => flattenOptions(groups), [groups]);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className={[
          "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition",
          disabled
            ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-white/40"
            : "border-white/12 bg-[#232427] text-white hover:border-white/25 hover:bg-[#2a2c30]",
          isOpen ? "border-[#f5b66f]/55 ring-2 ring-[#f5b66f]/20" : "",
        ].join(" ")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {selectedOption ? selectedOption.label : placeholder}
          </p>
          <p className="mt-1 text-xs text-white/65">
            {selectedOption
              ? "Đã chọn lý do báo cáo"
              : "Mở danh sách để chọn đúng nhóm lý do"}
          </p>
        </div>

        <ChevronDown
          className={[
            "h-5 w-5 shrink-0 text-white/55 transition",
            isOpen ? "rotate-180 text-[#f5b66f]" : "",
          ].join(" ")}
        />
      </button>

      <input type="hidden" name="reason" value={value} />

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[140] overflow-hidden rounded-[18px] border border-white/12 bg-[#202225] shadow-[0_16px_40px_rgba(0,0,0,0.32)]">
          <div className="max-h-[22rem] overflow-y-auto p-2.5">
            {groups.map((group, groupIndex) => {
              const groupStyle =
                GROUP_STYLES[groupIndex % GROUP_STYLES.length];

              return (
                <section
                  key={group.label}
                  className={groupIndex > 0 ? "mt-2.5 pt-2.5 border-t border-white/6" : ""}
                >
                  <div
                    className={[
                      "mb-2 px-1",
                      groupStyle.headerClassName,
                    ].join(" ")}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
                      {group.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.options.map((option) => {
                      const isSelected = option.value === value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSelect(option.value)}
                          className={[
                            "flex w-full items-center rounded-lg px-3 py-2.5 text-left transition",
                            isSelected
                              ? "bg-[#f5b66f] text-[#15181d]"
                              : "bg-transparent text-white hover:bg-white/[0.08]",
                          ].join(" ")}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <p className="text-sm font-medium leading-5">
                            {option.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReportReasonSelect;
