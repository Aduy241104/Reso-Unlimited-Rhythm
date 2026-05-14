import React, { useState } from "react";

const AudioQualityPreview = ({ qualities = [] }) => {
  const [selectedQuality, setSelectedQuality] = useState(
    qualities && qualities.length > 0 ? qualities[0] : null
  );
  const [isPlaying, setIsPlaying] = useState(false);

  if (!qualities || qualities.length === 0) {
    return null;
  }

  // Sort by priority (highest first)
  const sortedQualities = [...qualities].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const qualityLabels = {
    high: "🎵 High Quality (320 kbps) - Best Sound",
    medium: "📻 Medium Quality (192 kbps) - Balanced",
    low: "📱 Low Quality (128 kbps) - Mobile",
    lowest: "🚀 Lowest Quality (96 kbps) - Slow Connection",
    original: "◆ Original Quality",
  };

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
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900">
        <span>🎧 Preview Audio Quality</span>
      </h4>

      {/* Quality Selector */}
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
            <div className="font-bold">{quality.label.toUpperCase()}</div>
            <div className="text-xs opacity-75">{quality.bitrate} kbps</div>
          </button>
        ))}
      </div>

      {/* Selected Quality Info */}
      {selectedQuality && (
        <div className="mb-3 rounded-md bg-white p-3">
          <p className="mb-2 text-sm font-medium text-gray-800">
            {qualityLabels[selectedQuality.label] ||
              `${selectedQuality.label} Quality (${selectedQuality.bitrate} kbps)`}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>📊 Bitrate: {selectedQuality.bitrate} kbps</span>
            {selectedQuality.priority && (
              <span>• Priority: {selectedQuality.priority}/4</span>
            )}
          </div>
        </div>
      )}

      {/* Play Button */}
      {selectedQuality?.url && (
        <button
          onClick={handlePlayPreview}
          disabled={isPlaying}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPlaying ? "🔊 Playing..." : "▶️ Preview"}
        </button>
      )}

      {/* Info */}
      <p className="mt-3 text-xs text-blue-700">
        ℹ️ Listen to a short preview of this quality. Your full track will be stored with all 4 versions.
      </p>
    </div>
  );
};

export default AudioQualityPreview;
