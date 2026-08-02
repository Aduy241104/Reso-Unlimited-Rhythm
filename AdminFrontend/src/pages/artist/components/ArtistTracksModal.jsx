import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Disc3,
  ExternalLink,
  Music2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../../routes/routePaths";
import { getAdminArtistTracksService } from "../../../services/trackService";

const PAGE_SIZE = 5;

const formatDuration = (seconds) => {
  const totalSeconds = Math.floor(Number(seconds));
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getStatusLabel = (status) => {
  switch (status) {
    case "approved":
      return "Đã duyệt";
    case "pending":
      return "Chờ duyệt";
    case "rejected":
      return "Đã từ chối";
    case "active":
      return "Hoạt động";
    case "hidden":
      return "Đang ẩn";
    case "blocked":
      return "Đã khóa";
    default:
      return status || "Chưa xác định";
  }
};

const getStatusClasses = (status) => {
  switch (status) {
    case "approved":
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
    case "blocked":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "hidden":
      return "border-orange-200 bg-orange-50 text-orange-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
};

const ArtistTracksModal = ({ artistId, artistName, isOpen, onClose }) => {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
  const visibleTracks = tracks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !artistId || !artistName) return undefined;

    let isCancelled = false;
    setCurrentPage(1);

    const loadTracks = async () => {
      setIsLoading(true);
      setError("");

      try {
        const result = await getAdminArtistTracksService({
          artistId,
          artistName,
        });

        if (!isCancelled) setTracks(result);
      } catch (loadError) {
        if (!isCancelled) {
          setTracks([]);
          setError(
            loadError?.response?.data?.message ||
              loadError?.message ||
              "Không thể tải danh sách bài hát của nghệ sĩ."
          );
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    void loadTracks();
    return () => {
      isCancelled = true;
    };
  }, [artistId, artistName, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="artist-tracks-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Danh mục nghệ sĩ
            </p>
            <h2
              id="artist-tracks-title"
              className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-950"
            >
              <Music2 className="h-5 w-5 text-sky-600" />
              Bài hát của {artistName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isLoading
                ? "Đang tải danh sách..."
                : `${tracks.length} bài hát được tìm thấy trong hệ thống.`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Đóng danh sách bài hát"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
              <p className="text-sm font-medium text-slate-500">
                Đang tải các bài hát của nghệ sĩ...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
              <Disc3 className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                Nghệ sĩ chưa có bài hát nào
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Không tìm thấy track thuộc nghệ sĩ này trong hệ thống.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <div className="grid min-w-[640px] grid-cols-[minmax(0,1fr)_110px_120px_44px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Bài hát</span>
                <span>Thời lượng</span>
                <span>Trạng thái</span>
                <span />
              </div>

              <div className="divide-y divide-slate-100">
                {visibleTracks.map((track) => {
                  const approvalStatus =
                    track.reviewStatus || track.approvalStatus;

                  return (
                    <div
                      key={track.id}
                      className="grid min-w-[640px] grid-cols-[minmax(0,1fr)_110px_120px_44px] items-center gap-4 px-4 py-3 transition hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {track.avatar ? (
                          <img
                            src={track.avatar}
                            alt={track.title}
                            className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[9px] font-bold text-white">
                            TRACK
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {track.title || "Bài hát chưa đặt tên"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {getStatusLabel(track.activeStatus)}
                          </p>
                        </div>
                      </div>

                      <span className="font-mono text-xs text-slate-600">
                        {formatDuration(track.duration)}
                      </span>

                      <span
                        className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClasses(
                          approvalStatus
                        )}`}
                      >
                        {getStatusLabel(approvalStatus)}
                      </span>

                      <Link
                        to={routePaths.trackDetail(track.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                        aria-label={`Xem chi tiết ${track.title}`}
                        title="Xem chi tiết bài hát"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {tracks.length > 0 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="min-w-24 text-center text-xs font-semibold text-slate-600">
                Trang {currentPage}/{totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Trang sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtistTracksModal;
