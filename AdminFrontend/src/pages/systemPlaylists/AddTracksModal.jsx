import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Music, Search, X } from "lucide-react";
import { addTracksBatchToSystemPlaylistService } from "../../services/playlistService";
import { searchAdminTracksService } from "../../services/trackService";

const PAGE_SIZE = 15;
const MAX_BATCH = 50;

const formatDuration = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) {
    return "-";
  }
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const AddTracksModal = ({
  isOpen,
  onClose,
  playlistId,
  existingTrackIds = [],
  onAdded,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [tracks, setTracks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchError, setBatchError] = useState("");

  const existingSet = useMemo(
    () => new Set((existingTrackIds || []).map(String)),
    [existingTrackIds]
  );

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const enterId = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(enterId);
    }

    setIsVisible(false);
    if (!shouldRender) return;

    const timeoutId = setTimeout(() => setShouldRender(false), 250);
    return () => clearTimeout(timeoutId);
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!isOpen) return;

    setSearchInput("");
    setDebouncedQuery("");
    setPage(1);
    setSelectedIds(new Set());
    setListError("");
    setBatchError("");
    setTracks([]);
    setPagination(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = setTimeout(() => setDebouncedQuery(searchInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchInput, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
  }, [debouncedQuery, isOpen]);

  useEffect(() => {
    if (!isOpen || !playlistId) return undefined;

    let cancelled = false;

    const run = async () => {
      setListLoading(true);
      setListError("");
      try {
        const result = await searchAdminTracksService({
          q: debouncedQuery,
          page,
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        setTracks(result.tracks ?? []);
        setPagination(result.pagination);
      } catch (error) {
        if (!cancelled) {
          setTracks([]);
          setPagination(null);
          setListError(
            error?.response?.data?.message ||
              error?.message ||
              "Không thể tải danh sách bài hát."
          );
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, playlistId, debouncedQuery, page]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const toggleSelect = (trackId) => {
    if (existingSet.has(trackId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
        return next;
      }
      if (next.size >= MAX_BATCH) return prev;
      next.add(trackId);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!playlistId || selectedIds.size === 0) return;
    setBatchError("");
    setBatchSubmitting(true);
    try {
      const { playlist, addedCount } =
        await addTracksBatchToSystemPlaylistService(playlistId, {
          trackIds: [...selectedIds],
        });
      if (playlist) onAdded?.(playlist, addedCount);
      onClose();
    } catch (error) {
      setBatchError(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể thêm bài hát."
      );
    } finally {
      setBatchSubmitting(false);
    }
  };

  if (!shouldRender) return null;

  const totalPages = pagination?.totalPages ?? 0;
  const currentPage = pagination?.page ?? page;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "rgba(15,23,42,0.4)" }}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`flex h-[min(85vh,700px)] w-full max-w-lg flex-col overflow-hidden rounded-[20px] transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        style={{
          backgroundColor: "white",
          border: "1px solid #e2e8f0",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tracks-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6 pb-5"
          style={{ borderBottom: "1px solid #e2e8f0" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Music className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2
                id="add-tracks-modal-title"
                className="text-lg font-semibold text-slate-900"
              >
                Thêm bài hát
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Chọn bài hát để thêm vào playlist này, tối đa {MAX_BATCH} bài mỗi lần
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-50"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" style={{ color: "#64748b" }} />
          </button>
        </div>

        <div className="shrink-0 px-6 py-4" style={{ borderBottom: "1px solid #e2e8f0" }}>
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên bài hát hoặc nghệ sĩ..."
              className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition"
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#1e293b",
              }}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {listLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
              <p className="mt-3 text-sm">Đang tải danh sách bài hát...</p>
            </div>
          ) : listError ? (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: "#fca5a5",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
              }}
            >
              {listError}
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Music className="h-8 w-8 mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Không tìm thấy bài hát</p>
              <p className="mt-1 text-xs text-slate-400">
                {debouncedQuery ? "Hãy thử từ khóa khác" : "Hiện chưa có bài hát nào"}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {tracks.map((track) => {
                const inPlaylist = existingSet.has(track.id);
                const isSelected = selectedIds.has(track.id);
                const atCap = selectedIds.size >= MAX_BATCH && !isSelected;
                const disabled = inPlaylist || (atCap && !isSelected);
                return (
                  <li key={track.id}>
                    <label
                      className={[
                        "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 transition",
                        disabled ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 rounded"
                        style={{ accentColor: "#1e40af" }}
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => toggleSelect(track.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className="block font-medium"
                          style={{ color: isSelected ? "#1e293b" : "#475569" }}
                        >
                          {track.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {track.artist?.name || "-"} · {formatDuration(track.duration)}
                        </span>
                        {inPlaylist && (
                          <span
                            className="mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={{
                              borderColor: "#bfdbfe",
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                            }}
                          >
                            Đã có trong playlist
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-6 py-3 text-xs text-slate-400"
            style={{ borderTop: "1px solid #e2e8f0" }}
          >
            <button
              type="button"
              disabled={currentPage <= 1 || listLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <span>
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || listLoading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        )}

        <div
          className="shrink-0 space-y-2 px-6 py-4"
          style={{
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
          }}
        >
          {batchError && (
            <p className="text-sm" style={{ color: "#dc2626" }}>
              {batchError}
            </p>
          )}
          {selectedIds.size >= MAX_BATCH && (
            <p className="text-xs text-slate-400">
              Chỉ có thể thêm tối đa {MAX_BATCH} bài hát trong một lần.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              Đã chọn: <strong className="text-slate-900">{selectedIds.size}</strong>
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={batchSubmitting || selectedIds.size === 0}
                onClick={handleAddSelected}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "#1e40af", color: "white" }}
              >
                {batchSubmitting
                  ? "Đang thêm..."
                  : `Thêm đã chọn (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddTracksModal;
