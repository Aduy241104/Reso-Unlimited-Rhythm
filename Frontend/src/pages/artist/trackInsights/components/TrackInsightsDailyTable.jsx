import { displayRawValue, formatDateLabel, formatNumber } from "../helpers";

const TrackInsightsDailyTable = ({ dailyChart }) => (
  <section className="rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
          Dữ liệu theo ngày
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[#2f2747]">Bảng chi tiết</h3>
        <p className="mt-2 text-[13px] leading-5 text-[#7c7891]">
          Toàn bộ dữ liệu trả về từ backend theo từng ngày để bạn dễ đối chiếu
          biến động tăng giảm.
        </p>
      </div>
    </div>

    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
        <thead className="bg-[#fcfaf7] text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Ngày</th>
            <th className="px-4 py-3 font-medium">Lượt phát</th>
            <th className="px-4 py-3 font-medium">Người nghe</th>
            <th className="px-4 py-3 font-medium">Nghe trung bình</th>
            <th className="px-4 py-3 font-medium">Lượt bỏ qua</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-200">
          {dailyChart.length > 0 ? (
            dailyChart.map((item) => (
              <tr key={item.date} className="text-[#2f261f]">
                <td className="px-4 py-4 font-medium">
                  {formatDateLabel(item.date, {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-4">{formatNumber(item.playCount)}</td>
                <td className="px-4 py-4">{formatNumber(item.uniqueListeners)}</td>
                <td className="px-4 py-4">
                  {displayRawValue(item.averageListenDuration)}
                </td>
                <td className="px-4 py-4">{formatNumber(item.skipCount)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-10 text-center text-sm text-neutral-500"
              >
                Chưa có dữ liệu phân tích theo ngày cho bài hát này.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

export default TrackInsightsDailyTable;
