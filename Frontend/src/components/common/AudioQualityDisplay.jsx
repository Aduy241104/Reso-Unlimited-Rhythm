const QUALITY_LABELS = {
  high: "Cao",
  medium: "Trung binh",
  low: "Thap",
  lowest: "Rat thap",
  original: "Goc",
};

const QUALITY_BADGES = {
  high: "Ban stream chat luong cao",
  medium: "Can bang giua chat luong va dung luong",
  low: "Phu hop mang di dong",
  lowest: "Du phong cho ket noi cham",
  original: "Ban nguon da duoc xac minh",
};

const QUALITY_CONFIG = {
  high: {
    color: "bg-green-100",
    borderColor: "border-green-300",
    textColor: "text-green-800",
    icon: "++",
  },
  medium: {
    color: "bg-blue-100",
    borderColor: "border-blue-300",
    textColor: "text-blue-800",
    icon: "+",
  },
  low: {
    color: "bg-yellow-100",
    borderColor: "border-yellow-300",
    textColor: "text-yellow-800",
    icon: "-",
  },
  lowest: {
    color: "bg-orange-100",
    borderColor: "border-orange-300",
    textColor: "text-orange-800",
    icon: "--",
  },
  original: {
    color: "bg-gray-100",
    borderColor: "border-gray-300",
    textColor: "text-gray-800",
    icon: "SRC",
  },
};

const formatSampleRate = (sampleRate) => {
  const numericSampleRate = Number(sampleRate);

  if (!Number.isFinite(numericSampleRate) || numericSampleRate <= 0) {
    return "Unknown";
  }

  return `${(numericSampleRate / 1000).toFixed(1)} kHz`;
};

const getEstimatedFileSizePerMinute = (bitrate) => {
  const numericBitrate = Number(bitrate);

  if (!Number.isFinite(numericBitrate) || numericBitrate <= 0) {
    return "Unknown";
  }

  const bytesPerMinute = (numericBitrate * 1000 * 60) / 8;

  if (bytesPerMinute < 1024 * 1024) {
    return `${(bytesPerMinute / 1024).toFixed(0)} KB/phut`;
  }

  return `${(bytesPerMinute / (1024 * 1024)).toFixed(1)} MB/phut`;
};

const AudioQualityDisplay = ({
  qualities = [],
  isLoading = false,
  sourceAnalysis = null,
}) => {
  if (isLoading) {
    return (
      <div className="mt-4 rounded-md border-2 border-dashed border-amber-300 bg-amber-50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-amber-600" />
          <p className="text-sm font-medium text-amber-900">
            Dang phan tich file nguon va tao cac muc chat luong audio...
          </p>
        </div>
      </div>
    );
  }

  if (!qualities || qualities.length === 0) {
    return null;
  }

  const sortedQualities = [...qualities].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );

  return (
    <div className="mt-4">
      {sourceAnalysis ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-emerald-900">
              Nguon audio da duoc xac minh
            </h4>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
              {sourceAnalysis.isLossless ? "Lossless source" : "High-bitrate source"}
            </span>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-emerald-900 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md bg-white/80 px-3 py-2">
              <span className="font-semibold">Format:</span>{" "}
              {String(sourceAnalysis.format || "unknown").toUpperCase()}
            </div>
            <div className="rounded-md bg-white/80 px-3 py-2">
              <span className="font-semibold">Bitrate:</span>{" "}
              {sourceAnalysis.bitrate ? `${sourceAnalysis.bitrate} kbps` : "Unknown"}
            </div>
            <div className="rounded-md bg-white/80 px-3 py-2">
              <span className="font-semibold">Sample rate:</span>{" "}
              {formatSampleRate(sourceAnalysis.sampleRate)}
            </div>
            <div className="rounded-md bg-white/80 px-3 py-2">
              <span className="font-semibold">Codec:</span>{" "}
              {String(sourceAnalysis.codec || "unknown")}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-3 flex items-center gap-2">
        <h4 className="text-sm font-semibold text-[#241b15]">
          Cac phien ban chat luong audio
        </h4>
        <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
          {qualities.length} phien ban
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {sortedQualities.map((quality, index) => {
          const config = QUALITY_CONFIG[quality.label] || QUALITY_CONFIG.original;
          const displayLabel = QUALITY_LABELS[quality.label] || quality.label;
          const displayBadge =
            QUALITY_BADGES[quality.label] || "Phien ban audio duoc tao boi he thong";

          return (
            <div
              key={`${quality.label}-${index}`}
              className={`rounded-lg border-2 ${config.borderColor} ${config.color} p-3 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${config.textColor}`}>
                      {config.icon}
                    </span>
                    <h5 className={`text-sm font-bold uppercase ${config.textColor}`}>
                      {displayLabel}
                    </h5>
                  </div>
                  <p className={`mt-1 text-xs font-semibold ${config.textColor}`}>
                    {quality.bitrate} kbps
                  </p>
                  <p className={`mt-1 text-xs ${config.textColor} opacity-75`}>
                    ~{getEstimatedFileSizePerMinute(quality.bitrate)}
                  </p>
                  <p className={`mt-1 break-all text-[11px] ${config.textColor} opacity-75`}>
                    {String(quality.format || "mp3").toUpperCase()}
                  </p>
                </div>
                <div className="ml-2 flex flex-col items-end gap-1">
                  <span
                    className={`inline-block rounded px-2 py-1 text-xs font-bold ${config.textColor}`}
                  >
                    P{quality.priority || 0}
                  </span>
                </div>
              </div>

              <div className="mt-2 border-t border-current border-opacity-20 pt-2">
                <p className={`text-xs font-medium ${config.textColor}`}>
                  {displayBadge}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-md bg-blue-50 p-2 text-xs text-blue-700">
        He thong chi tao cac bitrate thap hon hoac bang kha nang cua file nguon,
        nen se khong con tinh trang nang cap gia thanh 320 kbps.
      </div>
    </div>
  );
};

export default AudioQualityDisplay;
