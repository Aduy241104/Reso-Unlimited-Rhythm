import { ArrowRight, LoaderCircle, Trophy } from "lucide-react";
import { formatNumber, getTrackImage } from "../helpers";

const formatPercent = (value) => `${formatNumber(value)}%`;

const TrackInsightsTopTracksPanel = ({
  isLoading,
  error,
  topTracks,
  topTracksSummary,
  selectedTrackId,
  onSelectTrack,
}) => (
  <section className="rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
          Bài hát nổi bật
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[#2f2747]">
          Bài hát hiệu suất cao
        </h3>
        <p className="mt-2 text-[13px] leading-5 text-[#7c7891]">
          Xếp hạng các bài hát đang hoạt động tốt nhất trong giai đoạn bạn đang xem.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[14px] border border-[#ece8ff] bg-[#faf9ff] px-4 py-3">
          <p className="text-[12px] text-[#7c7891]">Bài có phát sinh stream</p>
          <p className="mt-1 text-lg font-semibold text-[#2f2747]">
            {formatNumber(topTracksSummary?.rankedTracks || 0)}
          </p>
        </div>
        <div className="rounded-[14px] border border-[#ece8ff] bg-[#faf9ff] px-4 py-3">
          <p className="text-[12px] text-[#7c7891]">Tổng lượt phát</p>
          <p className="mt-1 text-lg font-semibold text-[#2f2747]">
            {formatNumber(topTracksSummary?.totalPlays || 0)}
          </p>
        </div>
        <div className="rounded-[14px] border border-[#ece8ff] bg-[#faf9ff] px-4 py-3">
          <p className="text-[12px] text-[#7c7891]">Bài dẫn đầu</p>
          <p className="mt-1 truncate text-lg font-semibold text-[#2f2747]">
            {topTracksSummary?.topTrack?.title || "--"}
          </p>
        </div>
      </div>
    </div>

    {error ? (
      <div className="mt-5 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {error}
      </div>
    ) : null}

    <div className="mt-5">
      {isLoading ? (
        <div className="flex h-[220px] items-center justify-center rounded-[18px] border border-dashed border-neutral-200 bg-white text-sm text-neutral-500">
          <div className="flex items-center gap-3">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#7c6cf2]" />
            Đang tải bảng xếp hạng bài hát...
          </div>
        </div>
      ) : topTracks.length === 0 ? (
        <div className="flex h-[220px] flex-col items-center justify-center rounded-[18px] border border-dashed border-neutral-200 bg-white px-6 text-center">
          <Trophy className="h-8 w-8 text-[#b4acd6]" />
          <p className="mt-4 text-base font-semibold text-[#2f2747]">
            Chưa có bài hát nổi bật trong giai đoạn này
          </p>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#7c7891]">
            Khi có phát sinh lượt nghe, hệ thống sẽ xếp hạng các bài hát hiệu suất cao tại đây.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-[#ece8ff]">
          <table className="min-w-full divide-y divide-[#ece8ff] text-left text-sm">
            <thead className="bg-[#faf9ff] text-[#7c7891]">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Bài hát</th>
                <th className="px-4 py-3 font-medium">Lượt phát</th>
                <th className="px-4 py-3 font-medium">Người nghe</th>
                <th className="px-4 py-3 font-medium">Nghe TB</th>
                <th className="px-4 py-3 font-medium">Tỷ lệ bỏ qua</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#ece8ff]">
              {topTracks.map((item) => {
                const trackId = item?.track?.id || "";
                const isActive = trackId === selectedTrackId;

                return (
                  <tr key={trackId} className={isActive ? "bg-[#f6f3ff]" : "bg-white"}>
                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f0ff] text-xs font-semibold text-[#6f5cf1]">
                        {item.rank}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={getTrackImage(item.track)}
                          alt={item?.track?.title || "Ảnh bìa bài hát"}
                          className="h-12 w-12 rounded-[10px] object-cover"
                        />

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#2f2747]">
                            {item?.track?.title || "Chưa có tên bài hát"}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-[#7c7891]">
                            <span>{formatNumber(item?.track?.duration || 0)} phút</span>
                            <span>•</span>
                            <span>
                              {formatNumber(item?.track?.stats?.totalPlay || 0)} lượt phát toàn thời gian
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-medium text-[#2f2747]">
                      {formatNumber(item?.playCount)}
                    </td>
                    <td className="px-4 py-4 text-[#2f2747]">
                      {formatNumber(item?.uniqueListeners)}
                    </td>
                    <td className="px-4 py-4 text-[#2f2747]">
                      {formatNumber(item?.averageListenDuration)} phút
                    </td>
                    <td className="px-4 py-4 text-[#2f2747]">
                      {formatPercent(item?.skipRate)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectTrack(trackId)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#ddd6ff] bg-[#faf8ff] px-3.5 py-2 text-xs font-semibold text-[#5f4fe0] transition hover:border-[#b7abff] hover:bg-[#f4f0ff]"
                      >
                        {isActive ? "Đang xem" : "Xem phân tích"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </section>
);

export default TrackInsightsTopTracksPanel;
