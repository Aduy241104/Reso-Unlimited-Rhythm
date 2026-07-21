import { ShieldAlert, UserRound } from "lucide-react";
import {
  formatDateTime,
  formatDuration,
  formatNumber,
  getAlbumStatusBadge,
  getArtistStatusBadge,
} from "../utils";
import { Field, Section, StatusBadge } from "./AlbumManagementPrimitives";

const AlbumManagementModerationSidebar = ({
  album,
  isSubmitting,
  onBlock,
  onUnblock,
}) => {
  const albumStatus = getAlbumStatusBadge(album?.status);
  const artistStatus = getArtistStatusBadge(album?.artist?.activeStatus);
  const isBlocked = album?.status === "blocked";

  return (
    <div className="space-y-5">
      <Section title="Kiểm duyệt album" icon={ShieldAlert}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Trạng thái hiện tại
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge config={albumStatus} tone="neutral" />
              {album?.artist ? (
                <StatusBadge config={artistStatus} tone="neutral" />
              ) : null}
            </div>
          </div>

          {isBlocked ? (
            <button
              type="button"
              onClick={onUnblock}
              disabled={isSubmitting}
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Đang xử lý..." : "Gỡ chặn album"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onBlock}
              disabled={isSubmitting}
              className="h-11 w-full rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Đang xử lý..." : "Chặn album"}
            </button>
          )}

          {album?.blockedReason ? (
            <div className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Lý do chặn hiện tại
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-800">
                {album.blockedReason}
              </p>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Thông tin nhanh" icon={UserRound}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Album ID" value={album?.id} />
          <Field label="Nghệ sĩ" value={album?.artist?.name} />
          <Field label="Email nghệ sĩ" value={album?.artist?.email} />
          <Field label="Số bài hát" value={formatNumber(album?.trackCount ?? 0)} />
          <Field
            label="Tổng thời lượng"
            value={formatDuration(album?.totalDuration)}
          />
          <Field label="Ngày tạo" value={formatDateTime(album?.createdAt)} />
        </div>
      </Section>
    </div>
  );
};

export default AlbumManagementModerationSidebar;
