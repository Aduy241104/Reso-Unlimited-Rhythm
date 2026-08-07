import { DashboardCard } from "./RevenueShared";
import RevenueArtistAvatar from "./RevenueArtistAvatar";
import {
  getActiveStatusLabel,
  getArtistBadgeTone,
  getArtistStatusLabel,
  getVerificationStatusLabel,
} from "../revenueOverviewModel";
import { formatCurrency, formatDateTime, formatNumber } from "../utils";

const RevenueDistributionArtistsTable = ({ artists = [] }) => (
  <DashboardCard className="border-slate-200">
    <div className="border-b border-slate-200 px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Phân bổ doanh thu
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-950">
        Danh sách nghệ sĩ nhận doanh thu
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Hiển thị trực tiếp từ dữ liệu `distribution.artists` của API chi tiết kỳ
        doanh thu.
      </p>
    </div>

    {artists.length === 0 ? (
      <div className="px-5 py-12 text-center">
        <p className="text-sm font-medium text-slate-600">
          Kỳ này chưa có nghệ sĩ nào được phân bổ doanh thu.
        </p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Nghệ sĩ
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Stream hợp lệ
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Nghệ sĩ nhận
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody>
            {artists.map((artistItem) => {
              const artist = artistItem.artist ?? {};
              const verificationLabel = getVerificationStatusLabel(
                artist?.verificationStatus
              );
              const activeLabel = getActiveStatusLabel(artist?.activeStatus);
              const badges = [verificationLabel, activeLabel].filter(
                (label) => label && label !== "Chưa rõ"
              );

              return (
                <tr
                  key={artistItem.artistId}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <RevenueArtistAvatar
                        name={artist?.name}
                        avatar={artist?.avatar}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {artist?.name || "Chưa có tên nghệ sĩ"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          ID: {artistItem.artistId}
                        </p>
                        {badges.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {badges.map((label) => (
                              <span
                                key={label}
                                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">
                    {formatNumber(artistItem.totalEligibleStreams)}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">
                    {formatCurrency(artistItem.artistRevenueAmount)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getArtistBadgeTone(
                          artistItem.status
                        )}`}
                      >
                        {getArtistStatusLabel(artistItem.status)}
                      </span>
                      <p className="text-xs text-slate-500">
                        {artistItem.calculatedAt
                          ? `Tính lúc ${formatDateTime(artistItem.calculatedAt)}`
                          : "Chưa có thời điểm tính."}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </DashboardCard>
);

export default RevenueDistributionArtistsTable;
