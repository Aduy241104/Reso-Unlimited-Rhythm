import React from "react";

const QUALITY_LABELS = {
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
  lowest: "Rất thấp",
  original: "Gốc",
};

const QUALITY_BADGES = {
  high: "Chất lượng cao",
  medium: "Cân bằng",
  low: "Phù hợp di động",
  lowest: "Mạng chậm",
  original: "Bản dự phòng",
};

const AudioQualityDisplay = ({ qualities = [], isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="mt-4 rounded-md border-2 border-dashed border-amber-300 bg-amber-50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-amber-600" />
          <p className="text-sm font-medium text-amber-900">
            Đang xử lý các chất lượng âm thanh. Vui lòng chờ trong giây lát.
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

  const qualityConfig = {
    high: {
      color: "bg-green-100",
      borderColor: "border-green-300",
      textColor: "text-green-800",
      icon: "▲▲",
    },
    medium: {
      color: "bg-blue-100",
      borderColor: "border-blue-300",
      textColor: "text-blue-800",
      icon: "▲",
    },
    low: {
      color: "bg-yellow-100",
      borderColor: "border-yellow-300",
      textColor: "text-yellow-800",
      icon: "▼",
    },
    lowest: {
      color: "bg-orange-100",
      borderColor: "border-orange-300",
      textColor: "text-orange-800",
      icon: "▼▼",
    },
    original: {
      color: "bg-gray-100",
      borderColor: "border-gray-300",
      textColor: "text-gray-800",
      icon: "◆",
    },
  };

  const getEstimatedFileSize = (bitrate, durationSeconds = 180) => {
    const bytes = (bitrate * durationSeconds) / 8;
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center gap-2">
        <h4 className="text-sm font-semibold text-[#241b15]">
          Các phiên bản chất lượng âm thanh
        </h4>
        <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
          {qualities.length} phiên bản
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {sortedQualities.map((quality, index) => {
          const config = qualityConfig[quality.label] || qualityConfig.original;
          const fileSize = getEstimatedFileSize(quality.bitrate);
          const displayLabel = QUALITY_LABELS[quality.label] || quality.label;
          const displayBadge = QUALITY_BADGES[quality.label] || "Phiên bản âm thanh";

          return (
            <div
              key={index}
              className={`rounded-lg border-2 ${config.borderColor} ${config.color} p-3 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${config.textColor}`}>{config.icon}</span>
                    <h5 className={`text-sm font-bold uppercase ${config.textColor}`}>
                      {displayLabel}
                    </h5>
                  </div>
                  <p className={`mt-1 text-xs font-semibold ${config.textColor}`}>
                    {quality.bitrate} kbps
                  </p>
                  <p className={`mt-1 text-xs ${config.textColor} opacity-75`}>
                    ~{fileSize}/phút
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

              <div className="mt-2 border-t-2 border-current border-opacity-20 pt-2">
                <p className={`text-xs font-medium ${config.textColor}`}>✓ {displayBadge}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-md bg-blue-50 p-2 text-xs text-blue-700">
        Bài nhạc của bạn đã được tự động chuyển đổi thành {qualities.length} phiên bản
        chất lượng. Người nghe có thể chọn phiên bản phù hợp với kết nối mạng của họ.
      </div>
    </div>
  );
};

export default AudioQualityDisplay;
