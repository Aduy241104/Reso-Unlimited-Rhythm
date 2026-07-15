import {
  CalendarDays,
  Disc3,
  ListMusic,
  Mic2,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../../routes/routePaths";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  getAlbumStatusBadge,
  getArtistStatusBadge,
  getTrackActiveStatusBadge,
  getTrackApprovalStatusBadge,
} from "../utils";
import { Field, Section, StatusBadge } from "./AlbumManagementPrimitives";

const AlbumManagementInfoSections = ({ album }) => {
  const albumStatus = getAlbumStatusBadge(album?.status);
  const artistStatus = getArtistStatusBadge(album?.artist?.activeStatus);

  return (
    <div className="space-y-5">
      <Section title="Tổng quan album" icon={Disc3}>
        <Link
          to={routePaths.systemAlbums}
          className="inline-flex text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          Quay lại danh sách
        </Link>

        <div className="mt-5 flex min-w-0 flex-col gap-4 md:flex-row md:items-center">
          {album?.coverImage ? (
            <img
              src={album.coverImage}
              alt={album?.title || "Album cover"}
              className="h-24 w-24 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-slate-900 text-lg font-semibold text-white">
              AL
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
              {album?.title || "Album"}
            </h1>
            <p className="mt-1 truncate text-sm text-slate-500">
              {album?.artist?.name || "Chưa có nghệ sĩ"} · {album?.artist?.email || "-"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge config={albumStatus} />
              {album?.artist ? <StatusBadge config={artistStatus} /> : null}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Ngày phát hành" value={formatDate(album?.releaseDate)} />
          <Field label="Số track" value={formatNumber(album?.trackCount ?? 0)} />
          <Field
            label="Tổng thời lượng"
            value={formatDuration(album?.totalDuration)}
          />
          <Field label="Cập nhật lần cuối" value={formatDateTime(album?.updatedAt)} />
        </div>

        {album?.blockedReason ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
              Lý do chặn
            </p>
            <p className="mt-2 text-sm leading-6 text-rose-700">
              {album.blockedReason}
            </p>
          </div>
        ) : null}
      </Section>

      <Section
        title="Thông tin nghệ sĩ"
        icon={Mic2}
        action={
          album?.artist?.id ? (
            <Link
              to={routePaths.artistDetail(album.artist.id)}
              className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
            >
              Xem hồ sơ nghệ sĩ
            </Link>
          ) : null
        }
      >
        {album?.artist ? (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-[160px_minmax(0,1fr)]">
              <div>
                {album.artist.coverImage ? (
                  <img
                    src={album.artist.coverImage}
                    alt={album.artist.name || "Artist cover"}
                    className="h-36 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
                    Không có ảnh cover
                  </div>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Tên nghệ sĩ" value={album.artist.name} />
                <Field label="Email" value={album.artist.email} />
                <Field label="Trạng thái" value={artistStatus.label} />
                <Field
                  label="Lượt theo dõi"
                  value={formatNumber(album.artist.stats?.followers ?? 0)}
                />
                <Field
                  label="Tổng lượt nghe"
                  value={formatNumber(album.artist.stats?.totalStreams ?? 0)}
                />
                <Field
                  label="Nghe hàng tháng"
                  value={formatNumber(album.artist.stats?.monthlyListeners ?? 0)}
                />
              </div>
            </div>

            <Field label="Tiểu sử" value={album.artist.bio} />

            {album.artist.blockedReason ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                  Lý do chặn nghệ sĩ
                </p>
                <p className="mt-2 text-sm leading-6 text-rose-700">
                  {album.artist.blockedReason}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Album này chưa có thông tin nghệ sĩ.</p>
        )}
      </Section>

      <Section title="Danh sách track" icon={ListMusic}>
        {album?.tracks?.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-[1160px] w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-xs font-medium text-slate-500">
                    <th className="px-5 py-4">Thứ tự</th>
                    <th className="px-5 py-4">Track</th>
                    <th className="px-5 py-4">Nghệ sĩ</th>
                    <th className="px-5 py-4">Thời lượng</th>
                    <th className="px-5 py-4">Phát hành</th>
                    <th className="px-5 py-4">Duyệt</th>
                    <th className="px-5 py-4">Hiển thị</th>
                    <th className="px-5 py-4">Ghi chú moderation</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {album.tracks.map((trackItem) => {
                    const track = trackItem?.track;
                    const approvalStatus = getTrackApprovalStatusBadge(
                      track?.approvalStatus
                    );
                    const activeStatus = getTrackActiveStatusBadge(
                      track?.activeStatus
                    );

                    return (
                      <tr key={track?.id || `${trackItem?.order}-track`}>
                        <td className="px-5 py-4 text-sm font-medium text-slate-700">
                          {trackItem?.order ?? "-"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            {track?.avatar || track?.coverImage?.[0] ? (
                              <img
                                src={track?.avatar || track?.coverImage?.[0]}
                                alt={track?.title || "Track cover"}
                                className="h-11 w-11 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600">
                                TR
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {track?.title || "-"}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                ID: {track?.id || "-"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-0 items-center gap-2">
                            {track?.artist?.avatar ? (
                              <img
                                src={track.artist.avatar}
                                alt={track.artist.name || "Artist avatar"}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                                AR
                              </div>
                            )}
                            <p className="truncate text-sm text-slate-700">
                              {track?.artist?.name || "-"}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {formatDuration(track?.duration)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {formatDate(track?.releaseDate)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge config={approvalStatus} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge config={activeStatus} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-2 text-sm text-slate-700">
                            {track?.blockedReason ? (
                              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                                  Blocked
                                </p>
                                <p className="mt-1 leading-5 text-rose-700">
                                  {track.blockedReason}
                                </p>
                              </div>
                            ) : null}
                            {track?.hiddenReason ? (
                              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                                  Hidden
                                </p>
                                <p className="mt-1 leading-5 text-amber-800">
                                  {track.hiddenReason}
                                </p>
                                {track?.hiddenAt ? (
                                  <p className="mt-1 text-xs text-amber-700">
                                    {formatDateTime(track.hiddenAt)}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                            {!track?.blockedReason && !track?.hiddenReason ? (
                              <span className="text-sm text-slate-400">-</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Album này chưa có track nào.
          </div>
        )}
      </Section>

      <Section title="Dấu thời gian hệ thống" icon={CalendarDays}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Ngày tạo album" value={formatDateTime(album?.createdAt)} />
          <Field
            label="Ngày cập nhật album"
            value={formatDateTime(album?.updatedAt)}
          />
        </div>
      </Section>

      <Section title="Lưu ý moderation" icon={ShieldAlert}>
        <div className="rounded-xl bg-slate-100 px-4 py-4 text-sm leading-6 text-slate-600">
          Khi block album, backend sẽ block các track liên quan theo rule đã mô tả.
          Khi unblock, hệ thống chỉ restore các track bị khóa bởi chính album này.
          UI đang dùng thẳng dữ liệu trả về từ API để render và cập nhật state.
        </div>
      </Section>
    </div>
  );
};

export default AlbumManagementInfoSections;
