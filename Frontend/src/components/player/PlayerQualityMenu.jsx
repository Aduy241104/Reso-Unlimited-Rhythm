import { Check, LoaderCircle, X } from "lucide-react";

const QUALITY_DESCRIPTIONS = {
  original: "Chất lượng gốc",
  high: "Âm thanh tốt nhất",
  medium: "Cân bằng chất lượng",
  low: "Tiết kiệm dữ liệu hơn",
  lowest: "Phù hợp mạng yếu",
};

const QUALITY_LABELS = {
  original: "Gốc",
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
  lowest: "Thấp nhất",
};

const formatQualityLabel = (value = "") => {
  const normalizedValue =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!normalizedValue) return "Tự động";

  return QUALITY_LABELS[normalizedValue] || normalizedValue.toUpperCase();
};

const PlayerQualityMenu = ({
  qualities = [],
  selectedQualityLabel = "",
  selectedQualityBitrate = 0,
  pendingQualityBitrate = 0,
  isChangingQuality = false,
  onSelectQuality,
  onClose,
  className = "",
}) => {
  const selectedQuality =
    qualities.find(
      (quality) =>
        selectedQualityBitrate > 0 &&
        quality.bitrate === selectedQualityBitrate
    ) ||
    qualities.find((quality) => quality.label === selectedQualityLabel) ||
    qualities.find((quality) => quality.isDefault) ||
    qualities[0] ||
    null;

  const selectedQualityText = selectedQuality
    ? `${formatQualityLabel(selectedQuality.label)}${selectedQuality.bitrate ? ` - ${selectedQuality.bitrate} kbps` : ""
    }`
    : "Chưa chọn";

  return (
    <div
      className={ [
        "w-full rounded bg-[#1b161d] p-1.5 text-white shadow-lg origin-bottom-right animate-[menuIn_.18s_cubic-bezier(0.22,1,0.36,1)]",
        className,
      ].join(" ") }
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-1 pb-1.5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white">
            Chất lượng âm thanh
          </p>

          <p className="mt-0.5 truncate text-[10px] leading-3 text-white/45">
            Đang phát: { selectedQualityText }
          </p>
        </div>

        { onClose ? (
          <button
            type="button"
            onClick={ onClose }
            className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-white/45 transition hover:bg-white/10 hover:text-white"
            aria-label="Đóng menu chất lượng âm thanh"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null }
      </div>

      <div className="mt-1">
        { qualities.map((quality, qualityIndex) => {
          // The selected option is resolved by bitrate first because different
          // quality levels can point to the same media URL.
          const isSelected = quality === selectedQuality;
          const isPending =
            pendingQualityBitrate > 0 &&
            quality.bitrate === pendingQualityBitrate;

          return (
            <button
              key={ `${quality.label || "quality"}:${quality.url || qualityIndex}:${quality.index ?? qualityIndex}` }
              type="button"
              onClick={ () => onSelectQuality?.(quality) }
              disabled={ isChangingQuality }
              role="menuitemradio"
              aria-checked={ isSelected }
              className={ [
                "flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1.5 text-left transition",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white",
              ].join(" ") }
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-white/65">
                { isPending ? (
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                ) : isSelected ? (
                  <Check className="h-3 w-3" />
                ) : null }
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium leading-4">
                  { formatQualityLabel(quality.label) }
                  { quality.bitrate ? ` - ${quality.bitrate} kbps` : "" }
                </span>

                <span className="mt-0.5 block truncate text-[10px] leading-3 text-white/40">
                  { QUALITY_DESCRIPTIONS[quality.label] || "Thiết lập phát" }
                </span>
              </span>
            </button>
          );
        }) }
      </div>
    </div>
  );
};

export default PlayerQualityMenu;
