import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { addTracksBatchToSystemPlaylistService } from "../../services/playlistService";
import { searchAdminTracksService } from "../../services/trackService";

const PAGE_SIZE = 15;
const MAX_BATCH = 50;

const formatDuration = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) {
    return "—";
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
    if (!isOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
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
    if (!isOpen) {
      return undefined;
    }
    const handle = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setPage(1);
  }, [debouncedQuery, isOpen]);

  useEffect(() => {
    if (!isOpen || !playlistId) {
      return undefined;
    }

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
        if (cancelled) {
          return;
        }
        setTracks(result.tracks);
        setPagination(result.pagination);
      } catch (error) {
        if (!cancelled) {
          setTracks([]);
          setPagination(null);
          setListError(
            error?.response?.data?.message ||
              error?.message ||
              "Could not load tracks."
          );
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isOpen, playlistId, debouncedQuery, page]);

  const toggleSelect = (trackId) => {
    if (existingSet.has(trackId)) {
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
        return next;
      }
      if (next.size >= MAX_BATCH) {
        return prev;
      }
      next.add(trackId);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!playlistId || selectedIds.size === 0) {
      return;
    }
    setBatchError("");
    setBatchSubmitting(true);
    try {
      const { playlist, addedCount } = await addTracksBatchToSystemPlaylistService(
        playlistId,
        { trackIds: [...selectedIds] }
      );
      if (playlist) {
        onAdded?.(playlist, addedCount);
      }
      onClose();
    } catch (error) {
      setBatchError(
        error?.response?.data?.message ||
          error?.message ||
          "Could not add tracks."
      );
    } finally {
      setBatchSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const totalPages = pagination?.totalPages ?? 0;
  const currentPage = pagination?.page ?? page;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex h-[min(85vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-[1.5rem] border border-black bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tracks-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/10 px-5 py-4">
          <div>
            <h2
              id="add-tracks-modal-title"
              className="text-lg font-semibold text-black"
            >
              Add tracks
            </h2>
            <p className="mt-1 text-xs text-black/55">
              Search by track or artist name, select tracks, then add (up to {MAX_BATCH} at a
              time).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-black/60 transition hover:bg-black/[0.06] hover:text-black"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="shrink-0 border-b border-black/10 px-5 py-3">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by track or artist name…"
              className="w-full rounded-2xl border border-black bg-white py-2.5 pl-10 pr-4 text-sm text-black outline-none transition focus:ring-4 focus:ring-black/10"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {listLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-black/50">
              <Loader2 className="h-8 w-8 animate-spin text-black" aria-hidden />
              <p className="mt-3 text-sm">Loading tracks…</p>
            </div>
          ) : listError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {listError}
            </p>
          ) : tracks.length === 0 ? (
            <p className="py-12 text-center text-sm text-black/55">No tracks found.</p>
          ) : (
            <ul className="divide-y divide-black/10">
              {tracks.map((track) => {
                const inPlaylist = existingSet.has(track.id);
                const isSelected = selectedIds.has(track.id);
                const atCap = selectedIds.size >= MAX_BATCH && !isSelected;
                const disabled = inPlaylist || (atCap && !isSelected);
                return (
                  <li key={track.id}>
                    <label
                      className={[
                        "flex cursor-pointer items-start gap-3 py-3",
                        disabled ? "cursor-not-allowed opacity-60" : "",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 rounded border-black text-black focus:ring-black/20"
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => toggleSelect(track.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-black">{track.title}</span>
                        <span className="mt-0.5 block text-xs text-black/55">
                          {track.artist?.name || "—"} · {formatDuration(track.duration)}
                        </span>
                        {inPlaylist ? (
                          <span className="mt-1 inline-block rounded-full border border-black/15 bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/55">
                            Already in playlist
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-black/10 px-5 py-3 text-xs text-black/60">
            <button
              type="button"
              disabled={currentPage <= 1 || listLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-black/20 px-3 py-1.5 font-semibold text-black transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || listLoading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-black/20 px-3 py-1.5 font-semibold text-black transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}

        <div className="shrink-0 space-y-2 border-t border-black/10 bg-black/[0.02] px-5 py-4">
          {batchError ? (
            <p className="text-sm text-red-700">{batchError}</p>
          ) : null}
          {selectedIds.size >= MAX_BATCH ? (
            <p className="text-xs text-black/55">
              Maximum {MAX_BATCH} tracks can be added at once.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-black/70">
              Selected: <strong className="text-black">{selectedIds.size}</strong>
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-black/25 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-black/[0.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={batchSubmitting || selectedIds.size === 0}
                onClick={handleAddSelected}
                className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {batchSubmitting ? "Adding…" : `Add selected (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTracksModal;
