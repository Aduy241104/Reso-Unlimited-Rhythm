import {
  ArrowLeft,
  CalendarDays,
  Disc3,
  ListMusic,
  ShieldAlert,
  UserRound,
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

const HighlightCard = ({ label, value, tone = "slate" }) => {
  const toneClass =
    tone === "blue"
      ? "border-sky-200 bg-sky-50"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50"
          : tone === "rose"
            ? "border-rose-200 bg-rose-50"
            : "border-slate-200 bg-slate-50";

  return (
    <div className={`border px-4 py-4 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
};

const RestrictionNote = ({ label, value, timestamp }) => {
  if (!value) return null;

  return (
    <div className="border-l-2 border-rose-400 bg-rose-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700">
        {label}
      </p>

      <p className="mt-1 text-sm leading-5 text-rose-900">
        {value}
      </p>

      {timestamp ? (
        <p className="mt-1 text-xs text-rose-700/80">
          {formatDateTime(timestamp)}
        </p>
      ) : null}
    </div>
  );
};

const AlbumManagementInfoSections = ({
  album,
  isSubmitting,
  onBlock,
  onUnblock,
}) => {
  const albumStatus = getAlbumStatusBadge(album?.status);
  const artistStatus = getArtistStatusBadge(album?.artist?.activeStatus);
  const isBlocked = album?.status === "blocked";

  return (
    <div className="space-y-4">
      <Section
        title="Tổng quan album"
        icon={Disc3}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {album?.artist?.id ? (
              <Link
                to={routePaths.artistDetail(album.artist.id)}
                className="inline-flex h-10 items-center gap-2 border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
              >
                <UserRound className="h-4 w-4" />
                Chi tiết nghệ sĩ
              </Link>
            ) : null}

            <button
              type="button"
              onClick={isBlocked ? onUnblock : onBlock}
              disabled={isSubmitting}
              className={`inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isBlocked
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              {isSubmitting
                ? "Đang xử lý..."
                : isBlocked
                  ? "Gỡ khóa album"
                  : "Khóa album"}
            </button>
          </div>
        }
      >
        <Link
          to={routePaths.systemAlbums}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách album
        </Link>

        <div className="mt-5 border-y border-slate-200 py-5">
          <div className="grid min-w-0 gap-5 md:grid-cols-[124px_minmax(0,1fr)] md:items-center">
            {album?.coverImage ? (
              <img
                src={album.coverImage}
                alt={album?.title || "Album cover"}
                className="h-28 w-28 border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center bg-slate-950 text-2xl font-semibold text-white">
                {getInitials(album?.title)}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    Quản lý album
                  </p>

                  <h1 className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                    {album?.title || "Album"}
                  </h1>

                  <p className="mt-2 text-sm text-slate-600">
                    {album?.artist?.name || "Chưa có nghệ sĩ"}
                    {album?.artist?.email ? ` • ${album.artist.email}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge config={albumStatus} />
                  {album?.artist ? <StatusBadge config={artistStatus} /> : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HighlightCard
            label="Số bài hát"
            value={formatNumber(album?.trackCount ?? 0)}
            tone="blue"
          />
          <HighlightCard
            label="Tổng thời lượng"
            value={formatDuration(album?.totalDuration)}
            tone="green"
          />
          <HighlightCard
            label="Phát hành"
            value={formatDate(album?.releaseDate)}
            tone="amber"
          />
          <HighlightCard
            label="Trạng thái"
            value={albumStatus.label}
            tone={isBlocked ? "rose" : "slate"}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Album ID" value={album?.id} />
          <Field label="Nghệ sĩ" value={album?.artist?.name} />
          <Field label="Email nghệ sĩ" value={album?.artist?.email} />
          <Field label="Cập nhật lần cuối" value={formatDateTime(album?.updatedAt)} />
        </div>

        {album?.blockedReason ? (
          <div className="mt-5 border border-rose-200 bg-rose-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
              Lý do khóa hiện tại
            </p>
            <p className="mt-1.5 text-sm leading-6 text-rose-900">
              {album.blockedReason}
            </p>
          </div>
        ) : null}
      </Section>

      <Section title="Danh sách bài hát" icon={ListMusic}>
        {album?.tracks?.length ? (
          <div className="overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left">
                <thead className="border-b border-slate-200 bg-slate-100">
                  <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <th className="w-16 px-4 py-3.5">STT</th>
                    <th className="px-4 py-3.5">Bài hát</th>
                    <th className="px-4 py-3.5">Nghệ sĩ</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Thời lượng</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Phát hành</th>
                    <th className="px-4 py-3.5">Duyệt</th>
                    <th className="px-4 py-3.5">Hiển thị</th>
                    <th className="min-w-52 px-4 py-3.5">Hạn chế</th>
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
                      <tr
                        key={track?.id || `${trackItem?.order}-track`}
                        className="align-top transition-colors hover:bg-sky-50/40"
                      >
                        <td className="px-4 py-3.5 text-sm font-medium text-slate-600">
                          {trackItem?.order ?? "-"}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex min-w-0 items-center gap-3">
                            {track?.avatar || track?.coverImage?.[0] ? (
                              <img
                                src={track?.avatar || track?.coverImage?.[0]}
                                alt={track?.title || "Track cover"}
                                className="h-10 w-10 shrink-0 border border-slate-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-slate-100 text-xs font-semibold text-slate-600">
                                {getInitials(track?.title || "Track")}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {track?.title || "-"}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                ID: {track?.id || "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            {track?.artist?.avatar ? (
                              <img
                                src={track.artist.avatar}
                                alt={track.artist.name || "Artist avatar"}
                                className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                                {getInitials(track?.artist?.name || "Artist")}
                              </div>
                            )}

                            <p className="truncate text-sm text-slate-700">
                              {track?.artist?.name || "-"}
                            </p>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-700">
                          {formatDuration(track?.duration)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-700">
                          {formatDate(track?.releaseDate)}
                        </td>

                        <td className="px-4 py-3.5">
                          <StatusBadge config={approvalStatus} />
                        </td>

                        <td className="px-4 py-3.5">
                          <StatusBadge config={activeStatus} />
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="space-y-2 text-sm text-slate-700">
                            <RestrictionNote
                              label="Đã khóa"
                              value={track?.blockedReason}
                            />

                            <RestrictionNote
                              label="Đã ẩn"
                              value={track?.hiddenReason}
                              timestamp={track?.hiddenAt}
                            />

                            {!track?.blockedReason && !track?.hiddenReason ? (
                              <span className="text-sm text-slate-400">
                                Không có
                              </span>
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
          <div className="border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center text-sm text-slate-500">
            Không có bài hát trong album này.
          </div>
        )}
      </Section>

      <Section title="Thông tin hệ thống" icon={CalendarDays}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
