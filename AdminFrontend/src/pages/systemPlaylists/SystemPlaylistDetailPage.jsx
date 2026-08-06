import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactPaginate from "react-paginate";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Ban,
  Disc,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Loader2,
  Music,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import AddTracksModal from "./AddTracksModal";
import ConfirmModal from "./ConfirmModal";
import {
  deleteAdminSystemPlaylistService,
  getAdminSystemPlaylistDetailService,
  removeTrackFromSystemPlaylistService,
} from "../../services/playlistService";
import { routePaths } from "../../routes/routePaths";

const fmtDur = (s) => {
  const n = Math.floor(Number(s));
  if (!Number.isFinite(n) || n < 0) return "-";
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};

const fmtDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const PlaylistStatusBadge = ({ playlist }) => {
  if (playlist?.isHidden) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        <EyeOff className="h-3.5 w-3.5" /> Đã ẩn
      </span>
    );
  }

  if (playlist?.isPublic) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <Globe className="h-3.5 w-3.5" /> Công khai
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      <Lock className="h-3.5 w-3.5" /> Riêng tư
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
        <Icon className="h-4 w-4 text-blue-500" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  </div>
);

const SystemPlaylistDetailPage = () => {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [addTracksOpen, setAddTracksOpen] = useState(false);
  const [tracksMsg, setTracksMsg] = useState({ type: "", text: "" });
  const [removingTrackId, setRemovingTrackId] = useState(null);

  const existingTrackIds = useMemo(() => {
    if (!Array.isArray(tracks)) return [];
    return tracks
      .map((r) => {
        if (!r) return null;
        if (typeof r.trackId === "string") return r.trackId;
        if (r.trackId?._id) return String(r.trackId._id);
        if (r.trackId?.id) return String(r.trackId.id);
        if (r.track?.id) return String(r.track.id);
        if (r.track?._id) return String(r.track._id);
        return typeof r.trackId === "number" ? String(r.trackId) : null;
      })
      .filter(Boolean);
  }, [tracks]);

  const loadPlaylist = useCallback(async () => {
    if (!playlistId) {
      setIsLoading(false);
      setErrorMessage("Thiếu mã playlist.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getAdminSystemPlaylistDetailService(playlistId);
      if (!data) {
        setErrorMessage("Không tìm thấy playlist.");
        setIsLoading(false);
        return;
      }
      setPlaylist(data);
      setTracks(Array.isArray(data.tracks) ? data.tracks : []);
    } catch (e) {
      setPlaylist(null);
      setTracks([]);
      setErrorMessage(
        e?.response?.data?.message || e.message || "Không thể tải dữ liệu."
      );
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const [deletePlaylistModalOpen, setDeletePlaylistModalOpen] = useState(false);
  const [removeTrackTarget, setRemoveTrackTarget] = useState(null);

  const handleDeleteConfirm = async () => {
    if (!playlistId) return;
    setIsDeleting(true);
    try {
      await deleteAdminSystemPlaylistService(playlistId);
      toast.success("Đã xóa playlist thành công.");
      setDeletePlaylistModalOpen(false);
      navigate(routePaths.systemPlaylists, { replace: true });
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e.message || "Không thể xóa playlist."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTracksBatchAdded = (updated, count) => {
    if (updated) {
      setPlaylist(updated);
      if (Array.isArray(updated.tracks)) {
        setTracks(updated.tracks);
      }
    }
    setTracksMsg({
      type: "success",
      text: `Đã thêm ${count} bài hát.`,
    });
  };

  const handleRemoveTrackConfirm = async () => {
    if (!playlistId || !removeTrackTarget?.id) return;
    const { id: rowId } = removeTrackTarget;
    setTracksMsg({ type: "", text: "" });
    setRemovingTrackId(rowId);
    try {
      const updated = await removeTrackFromSystemPlaylistService(
        playlistId,
        rowId
      );
      if (updated) {
        setPlaylist(updated);
        setTracks(Array.isArray(updated.tracks) ? updated.tracks : []);
      }
      setTracksMsg({ type: "success", text: "Đã gỡ bài hát khỏi playlist." });
      setRemoveTrackTarget(null);
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e.message || "Không thể gỡ bài hát."
      );
    } finally {
      setRemovingTrackId(null);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const TRACKS_PER_PAGE = 10;

  const orderedTracks = useMemo(() => {
    if (!Array.isArray(tracks)) return [];
    return [...tracks].sort((a, b) => {
      const trackA = a?.track;
      const trackB = b?.track;

      const aDisabled =
        trackA?.activeStatus === "blocked" ||
        trackA?.isBlocked === true ||
        trackA?.activeStatus === "hidden" ||
        trackA?.isHidden === true ||
        trackA?.isHide === true;

      const bDisabled =
        trackB?.activeStatus === "blocked" ||
        trackB?.isBlocked === true ||
        trackB?.activeStatus === "hidden" ||
        trackB?.isHidden === true ||
        trackB?.isHide === true;

      if (aDisabled !== bDisabled) {
        return aDisabled ? 1 : -1;
      }

      return (a?.order ?? 0) - (b?.order ?? 0);
    });
  }, [tracks]);

  const totalTrackPages = Math.ceil(orderedTracks.length / TRACKS_PER_PAGE) || 1;

  useEffect(() => {
    if (currentPage > totalTrackPages) {
      setCurrentPage(Math.max(1, totalTrackPages));
    }
  }, [orderedTracks.length, totalTrackPages, currentPage]);

  const paginatedTracks = useMemo(() => {
    const start = (currentPage - 1) * TRACKS_PER_PAGE;
    return orderedTracks.slice(start, start + TRACKS_PER_PAGE);
  }, [orderedTracks, currentPage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="flex items-center justify-center rounded-2xl shadow-sm"
          style={{ backgroundColor: "white", border: "1px solid #e2e8f0", minWidth: 200, minHeight: 200 }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (errorMessage || !playlist) {
    return (
      <section className="space-y-4 max-w-[800px] mx-auto p-6">
        <Link
          to={routePaths.systemPlaylists}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Playlist hệ thống
        </Link>
        <div
          className="rounded-xl border px-5 py-4 text-sm"
          style={{
            borderColor: "#fca5a5",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
          }}
        >
          {errorMessage || "Không tìm thấy playlist."}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">

      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <Link
            to={routePaths.systemPlaylists}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4.5 w-4.5" style={{ color: "#64748b" }} />
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Playlist hệ thống
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
              {playlist.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={routePaths.systemPlaylistEdit(playlistId)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" style={{ color: "#64748b" }} />
            Chỉnh sửa
          </Link>
          <button
            type="button"
            onClick={() => setDeletePlaylistModalOpen(true)}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-40"
            style={{
              borderColor: "#fecaca",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
            }}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "..." : "Xóa"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-3">
            <PlaylistStatusBadge playlist={playlist} />
          </div>

          {playlist.description && (
            <p className="text-sm leading-relaxed text-slate-500">
              {playlist.description}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Music} label="Bài hát" value={playlist.trackCount ?? 0} />
            <StatCard icon={Disc} label="Thời lượng" value={fmtDur(playlist.totalDuration)} />
            <StatCard icon={Disc} label="Ngày tạo" value={fmtDate(playlist.createdAt)} />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          {playlist.coverImage ? (
            <img
              src={playlist.coverImage}
              alt={playlist.title}
              className="h-full w-full object-cover"
              style={{ minHeight: 200 }}
            />
          ) : (
            <div
              className="flex h-full items-center justify-center"
              style={{ minHeight: 200, backgroundColor: "#f8fafc" }}
            >
              <Disc className="h-12 w-12 text-slate-300" />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #e2e8f0" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <Music className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              {`Bài hát · ${orderedTracks.length}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setTracksMsg({ type: "", text: "" });
              setAddTracksOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{ backgroundColor: "#1e40af", color: "white" }}
          >
            <Plus className="h-4 w-4" /> Thêm bài hát
          </button>
        </div>

        {tracksMsg.text && (
          <div
            className="mx-4 mt-4 rounded-xl border px-4 py-3 text-sm font-medium"
            style={
              tracksMsg.type === "error"
                ? { borderColor: "#fca5a5", backgroundColor: "#fef2f2", color: "#dc2626" }
                : { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4", color: "#16a34a" }
            }
          >
            {tracksMsg.text}
          </div>
        )}

        {orderedTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <Music className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Chưa có bài hát</p>
            <p className="mt-1 text-xs text-slate-400">Nhấn "Thêm bài hát" để cập nhật playlist này</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr
                    className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                    style={{ borderBottom: "1px solid #e2e8f0" }}
                  >
                    <th className="px-4 py-3 text-center w-12">STT</th>
                    <th className="px-4 py-3 text-left">Bài hát</th>
                    <th className="px-4 py-3 text-left">Nghệ sĩ</th>
                    <th className="px-4 py-3 text-right w-20">Thời lượng</th>
                    <th className="px-4 py-3 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedTracks.map((row, index) => {
                    const track = row.track;
                    const title = track?.title ?? "Bài hát không xác định";
                    const artistName = track?.artist?.name ?? "-";
                    const rowTrackId = typeof row.trackId === "string" ? row.trackId : (row.trackId?._id ? String(row.trackId._id) : (track?.id ? String(track.id) : null));
                    const isRemoving = removingTrackId === rowTrackId;
                    const trackNumber = (currentPage - 1) * TRACKS_PER_PAGE + index + 1;
                    const isBlocked = track?.activeStatus === "blocked" || track?.isBlocked === true;
                    const isHidden = track?.activeStatus === "hidden" || track?.isHidden === true || track?.isHide === true;

                    return (
                      <tr
                        key={rowTrackId ?? `orphan-${index}`}
                        className="transition hover:bg-slate-50"
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        <td className="px-4 py-3 text-center text-slate-400">
                          {trackNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{title}</span>
                            {isBlocked && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                <Ban className="h-3 w-3" /> Đã khóa
                              </span>
                            )}
                            {isHidden && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                <EyeOff className="h-3 w-3" /> Tạm ẩn
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {artistName}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {fmtDur(track?.duration)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {rowTrackId && (
                            <button
                              type="button"
                              onClick={() => setRemoveTrackTarget({ id: rowTrackId, title })}
                              disabled={isRemoving}
                              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40"
                              style={{
                                borderColor: "#fecaca",
                                backgroundColor: "#fef2f2",
                                color: "#dc2626",
                              }}
                            >
                              <X className="h-3 w-3" />
                              {isRemoving ? "..." : "Gỡ"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalTrackPages >= 1 && (
              <div className="flex justify-center p-4 border-t border-slate-200">
                <ReactPaginate
                  previousLabel="Trở lại"
                  nextLabel="Tiếp"
                  onPageChange={({ selected }) => setCurrentPage(selected + 1)}
                  pageCount={totalTrackPages}
                  forcePage={Math.max(0, Math.min(currentPage - 1, totalTrackPages - 1))}
                  containerClassName="flex items-center gap-1 text-sm font-medium text-slate-600"
                  pageClassName="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 transition cursor-pointer"
                  activeClassName="!bg-blue-600 !border-blue-600 !text-white"
                  previousClassName="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 transition cursor-pointer"
                  nextClassName="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 transition cursor-pointer"
                  disabledClassName="opacity-40 cursor-not-allowed"
                />
              </div>
            )}
          </>
        )}
      </div>

      <AddTracksModal
        isOpen={addTracksOpen}
        onClose={() => setAddTracksOpen(false)}
        playlistId={playlistId}
        existingTrackIds={existingTrackIds}
        onAdded={handleTracksBatchAdded}
      />

      {/* Confirm modal: Xóa playlist */}
      <ConfirmModal
        isOpen={deletePlaylistModalOpen}
        onClose={() => setDeletePlaylistModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Xóa vĩnh viễn playlist"
        description={
          <span>
            Bạn có chắc chắn muốn xóa playlist <strong className="font-bold text-slate-900">"{playlist?.title}"</strong>? Hành động này không thể hoàn tác.
          </span>
        }
        confirmText="Xóa playlist"
        cancelText="Hủy"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Confirm modal: Gỡ bài hát */}
      <ConfirmModal
        isOpen={Boolean(removeTrackTarget)}
        onClose={() => setRemoveTrackTarget(null)}
        onConfirm={handleRemoveTrackConfirm}
        title="Gỡ bài hát khỏi playlist"
        description={
          <span>
            Bạn có chắc chắn muốn gỡ bài hát <strong className="font-bold text-slate-900">"{removeTrackTarget?.title}"</strong> khỏi playlist này?
          </span>
        }
        confirmText="Gỡ bài hát"
        cancelText="Hủy"
        type="danger"
        isLoading={Boolean(removingTrackId)}
      />
    </section>
  );
};

export default SystemPlaylistDetailPage;
