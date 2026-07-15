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
    <div className="space-y-4">
      <Section title="Điều phối moderation" icon={ShieldAlert}>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-medium text-slate-900">
              Trạng thái hiện tại
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge config={albumStatus} />
              {album?.artist ? <StatusBadge config={artistStatus} /> : null}
            </div>
          </div>

          <div className="grid gap-3">
            {isBlocked ? (
              <button
                type="button"
                onClick={onUnblock}
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Đang xử lý..." : "Gỡ chặn album"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onBlock}
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Đang xử lý..." : "Chặn album"}
              </button>
            )}
          </div>

          {album?.blockedReason ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                Lý do moderation đang áp dụng
              </p>
              <p className="mt-2 text-sm leading-6 text-rose-700">
                {album.blockedReason}
              </p>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Snapshot nhanh" icon={UserRound}>
        <div className="space-y-3">
          <Field label="Album ID" value={album?.id} />
          <Field label="Nghệ sĩ" value={album?.artist?.name} />
          <Field label="Email nghệ sĩ" value={album?.artist?.email} />
          <Field label="Track count" value={formatNumber(album?.trackCount ?? 0)} />
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
