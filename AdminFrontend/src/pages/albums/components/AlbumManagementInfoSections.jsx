import {
  CalendarDays,
  Disc3,
  ListMusic,
  Mic2,
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
  getInitials,
  getTrackActiveStatusBadge,
  getTrackApprovalStatusBadge,
} from "../utils";
import { Field, Section, StatusBadge } from "./AlbumManagementPrimitives";

const RestrictionNote = ({ label, value, timestamp }) => {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-5 text-slate-800">{value}</p>
      {timestamp ? (
        <p className="mt-1 text-xs text-slate-500">{formatDateTime(timestamp)}</p>
      ) : null}
    </div>
  );
};

const AlbumManagementInfoSections = ({ album, moderationSection = null }) => {
  const albumStatus = getAlbumStatusBadge(album?.status);
  const artistStatus = getArtistStatusBadge(album?.artist?.activeStatus);

  return (
    <div className="space-y-5">
      <Section title="Thông tin album" icon={Disc3}>
        <Link
          to={routePaths.systemAlbums}
          className="inline-flex text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          Quay lại danh sách album
        </Link>

        <div className="mt-5 flex min-w-0 flex-col gap-4 md:flex-row md:items-center">
          {album?.coverImage ? (
            <img
              src={album.coverImage}
              alt={album?.title || "Album cover"}
              className="h-28 w-28 rounded-3xl object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-slate-950 text-2xl font-semibold text-white">
              {getInitials(album?.title)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Chi tiết album
            </p>
            <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight text-slate-950">
              {album?.title || "Album"}
            </h1>
            <p className="mt-2 truncate text-sm text-slate-500">
              {album?.artist?.name || "Chưa có nghệ sĩ"} · {album?.artist?.email || "-"}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge config={albumStatus} tone="neutral" />
              {album?.artist ? (
                <StatusBadge config={artistStatus} tone="neutral" />
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Album ID" value={album?.id} />
          <Field label="Ngày phát hành" value={formatDate(album?.releaseDate)} />
          <Field label="Số bài hát" value={formatNumber(album?.trackCount ?? 0)} />
          <Field
            label="Tổng thời lượng"
            value={formatDuration(album?.totalDuration)}
          />
          <Field
            label="Cập nhật lần cuối"
            value={formatDateTime(album?.updatedAt)}
          />
        </div>

        {album?.blockedReason ? (
          <div className="mt-6 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Lý do chặn hiện tại
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-800">
              {album.blockedReason}
            </p>
          </div>
        ) : null}
      </Section>

      {moderationSection}

      <Section
        title="Thông tin nghệ sĩ"
        icon={Mic2}
        action={
          album?.artist?.id ? (
            <Link
              to={routePaths.artistDetail(album.artist.id)}
              className="inline-flex items-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Xem hồ sơ nghệ sĩ
            </Link>
          ) : null
        }
      >
        {album?.artist ? (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
              <div>
                {album.artist.coverImage ? (
                  <img
                    src={album.artist.coverImage}
                    alt={album.artist.name || "Artist cover"}
                    className="h-40 w-full rounded-3xl object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-500">
                    Không có ảnh
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Tên nghệ sĩ" value={album.artist.name} />
                <Field label="Email" value={album.artist.email} />
                <Field label="Trạng thái" value={artistStatus.label} />
                <Field
                  label="Người theo dõi"
                  value={formatNumber(album.artist.stats?.followers ?? 0)}
                />
                <Field
                  label="Tổng lượt nghe"
                  value={formatNumber(album.artist.stats?.totalStreams ?? 0)}
                />
                <Field
                  label="Người nghe hàng tháng"
                  value={formatNumber(album.artist.stats?.monthlyListeners ?? 0)}
                />
              </div>
            </div>

            {album.artist.blockedReason ? (
              <div className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Lý do chặn nghệ sĩ
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-800">
                  {album.artist.blockedReason}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Không có dữ liệu nghệ sĩ.</p>
        )}
      </Section>

      <Section title="Danh sách bài hát" icon={ListMusic}>
        {album?.tracks?.length ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-[1060px] w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-5 py-4">STT</th>
                    <th className="px-5 py-4">Bài hát</th>
                    <th className="px-5 py-4">Nghệ sĩ</th>
                    <th className="px-5 py-4">Thời lượng</th>
                    <th className="px-5 py-4">Phát hành</th>
                    <th className="px-5 py-4">Duyệt</th>
                    <th className="px-5 py-4">Hiển thị</th>
                    <th className="px-5 py-4">Hạn chế</th>
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
                                className="h-11 w-11 rounded-2xl object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xs font-semibold text-slate-600">
                                {getInitials(track?.title || "Track")}
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
                                {getInitials(track?.artist?.name || "Artist")}
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
                          <StatusBadge config={approvalStatus} tone="neutral" />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge config={activeStatus} tone="neutral" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-2 text-sm text-slate-700">
                            <RestrictionNote
                              label="Đã chặn"
                              value={track?.blockedReason}
                            />
                            <RestrictionNote
                              label="Đã ẩn"
                              value={track?.hiddenReason}
                              timestamp={track?.hiddenAt}
                            />
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
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Không có bài hát trong album này.
          </div>
        )}
      </Section>

      <Section title="Thông tin hệ thống" icon={CalendarDays}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Ngày tạo album" value={formatDateTime(album?.createdAt)} />
          <Field
            label="Ngày cập nhật album"
            value={formatDateTime(album?.updatedAt)}
          />
          <Field label="Ngày phát hành" value={formatDate(album?.releaseDate)} />
          <Field label="Trạng thái album" value={albumStatus.label} />
        </div>
      </Section>
    </div>
  );
};

export default AlbumManagementInfoSections;
