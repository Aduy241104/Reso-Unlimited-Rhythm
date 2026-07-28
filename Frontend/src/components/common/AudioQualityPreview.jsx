import React, { useState } from "react";

const QUALITY_BUTTON_LABELS = {
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
  lowest: "Rất thấp",
  original: "Gốc",
};

const QUALITY_DETAILS = {
  high: "Chất lượng cao (320 kbps) - Âm thanh tốt nhất",
  medium: "Chất lượng trung bình (192 kbps) - Cân bằng",
  low: "Chất lượng thấp (128 kbps) - Phù hợp di động",
  lowest: "Chất lượng rất thấp (96 kbps) - Dành cho mạng chậm",
  original: "Chất lượng gốc",
};

const AudioQualityPreview = ({ qualities = [] }) => {
  const [selectedQuality, setSelectedQuality] = useState(
    qualities && qualities.length > 0 ? qualities[0] : null
  );
  const [isPlaying, setIsPlaying] = useState(false);

  if (!qualities || qualities.length === 0) {
    return null;
  }

  const sortedQualities = [...qualities].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );

  const handlePlayPreview = () => {
    if (selectedQuality?.url) {
      setIsPlaying(true);
      const audio = new Audio(selectedQuality.url);
      audio.onended = () => setIsPlaying(false);
      audio.play().catch(() => setIsPlaying(false));
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-blue-900">
        Nghe thử chất lượng âm thanh
      </h4>

      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {sortedQualities.map((quality) => (
          <button
            key={quality.label}
            onClick={() => setSelectedQuality(quality)}
            className={`rounded-md px-3 py-2 text-xs font-medium transition-all ${
              selectedQuality?.label === quality.label
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-blue-700 hover:bg-blue-100"
            }`}
          >
            <div className="font-bold">
              {(QUALITY_BUTTON_LABELS[quality.label] || quality.label).toUpperCase()}
            </div>
            <div className="text-xs opacity-75">{quality.bitrate} kbps</div>
          </button>
        ))}
      </div>

      {selectedQuality && (
        <div className="mb-3 rounded-md bg-white p-3">
          <p className="mb-2 text-sm font-medium text-gray-800">
            {QUALITY_DETAILS[selectedQuality.label] ||
              `Chất lượng ${selectedQuality.label} (${selectedQuality.bitrate} kbps)`}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Bitrate: {selectedQuality.bitrate} kbps</span>
            {selectedQuality.priority ? (
              <span>• Mức ưu tiên: {selectedQuality.priority}/4</span>
            ) : null}
          </div>
        </div>
      )}

      {selectedQuality?.url && (
        <button
          onClick={handlePlayPreview}
          disabled={isPlaying}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPlaying ? "Đang phát..." : "Nghe thử"}
        </button>
      )}

      <p className="mt-3 text-xs text-blue-700">
        Bạn có thể nghe thử ngắn của chất lượng này. Bản đầy đủ của bài nhạc sẽ được lưu
        cùng tất cả các phiên bản chất lượng.
      </p>
    </div>
  );
};

export default AudioQualityPreview;
