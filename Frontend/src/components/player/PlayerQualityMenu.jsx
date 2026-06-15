import { Check, LoaderCircle, Volume2, X } from "lucide-react";

const QUALITY_DESCRIPTIONS = {
  original: "Source quality",
  high: "Best sound",
  medium: "Balanced quality",
  low: "Lower data use",
  lowest: "Best for weak network",
};

const QUALITY_LABELS = {
  original: "Original",
  high: "High",
  medium: "Medium",
  low: "Low",
  lowest: "Lowest",
};

const formatQualityLabel = (value = "") => {
  const normalizedValue =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!normalizedValue) {
    return "Auto";
  }

  return QUALITY_LABELS[normalizedValue] || normalizedValue.toUpperCase();
};

const PlayerQualityMenu = ({
  qualities = [],
  selectedQualityLabel = "",
  selectedQualityUrl = "",
  pendingQualityUrl = "",
  isChangingQuality = false,
  onSelectQuality,
  onClose,
  className = "",
}) => {
  const selectedQuality =
    qualities.find((quality) => quality.url === selectedQualityUrl) ||
    qualities.find((quality) => quality.label === selectedQualityLabel) ||
    qualities.find((quality) => quality.isDefault) ||
    qualities[0] ||
    null;
  const activeQualityUrl = selectedQuality?.url || "";
  const selectedQualityText = selectedQuality
    ? `${formatQualityLabel(selectedQuality.label)}${selectedQuality.bitrate ? ` - ${selectedQuality.bitrate} kbps` : ""}`
    : "Choose stream quality";

  return (
    <div
      className={[
        "w-full rounded-lg border border-white/10 bg-[#121212] px-2.5 py-2 text-white shadow-[0_16px_40px_rgba(0,0,0,0.34)]",
        className,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Audio quality</p>
          <p className="mt-0.5 text-[11px] leading-4 text-white/55">
            Current: {selectedQualityText}
          </p>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] text-white/60 transition hover:bg-white/8 hover:text-white"
            aria-label="Close audio quality menu"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </div>

      <div className="mt-2.5 space-y-0.5">
        {qualities.map((quality) => {
          const isSelected = quality.url === activeQualityUrl;
          const isPending = quality.url === pendingQualityUrl;

          return (
            <button
              key={quality.url || quality.label}
              type="button"
              onClick={() => onSelectQuality?.(quality)}
              disabled={isChangingQuality}
              className={[
                "flex w-full items-center gap-2 rounded-[8px] border px-2 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                isSelected
                  ? "border-[#f5b66f]/60 bg-[#f5b66f]/12"
                  : "border-transparent hover:bg-white/[0.05]",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
                  isSelected
                    ? "bg-white text-black"
                    : "bg-white/[0.06] text-white/70",
                ].join(" ")}
              >
                {isPending ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : isSelected ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium leading-4 text-white">
                  {formatQualityLabel(quality.label)}
                  {quality.bitrate ? ` - ${quality.bitrate} kbps` : ""}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-white/55">
                  {QUALITY_DESCRIPTIONS[quality.label] || "Stream setting"}
                </span>
              </span>

              {isSelected ? (
                <span className="shrink-0 rounded-full bg-[#f5b66f]/18 px-2 py-0.5 text-[10px] font-medium text-[#f8cf95]">
                  Current
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerQualityMenu;
