import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
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
import {
  deleteAdminSystemPlaylistService,
  getAdminSystemPlaylistDetailService,
  removeTrackFromSystemPlaylistService,
} from "../../services/playlistService";
import { routePaths } from "../../routes/routePaths";

const fmtDur = (s) => {
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "—";
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};

const fmtDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const VisibilityBadge = ({ isPublic }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
      isPublic
        ? "bg-emerald-50 border-emerald-100 text-emerald-600"
        : "bg-slate-50 border-slate-200 text-slate-500"
    }`}
  >
    {isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
    {isPublic ? "Public" : "Private"}
  </span>
);

const HiddenBadge = ({ hidden }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
      hidden
        ? "bg-amber-50 border-amber-100 text-amber-600"
        : "bg-emerald-50 border-emerald-100 text-emerald-600"
    }`}
  >
    {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
    {hidden ? "Hidden" : "Visible"}
  </span>
);

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
    return tracks.map((r) => r.trackId ?? r.track?.id).filter(Boolean);
  }, [tracks]);

  const loadPlaylist = useCallback(async () => {
    if (!playlistId) {
      setIsLoading(false);
      setErrorMessage("Missing playlist id.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getAdminSystemPlaylistDetailService(playlistId);
      if (!data) {
        setErrorMessage("Playlist not found.");
        setIsLoading(false);
        return;
      }
      setPlaylist(data);
      setTracks(data.tracks ?? []);
    } catch (e) {
      setPlaylist(null);
      setTracks([]);
      setErrorMessage(
        e?.response?.data?.message || e.message || "Could not load."
      );
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const handleDelete = async () => {
    if (!playlistId) return;
    if (!window.confirm("Delete permanently? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteAdminSystemPlaylistService(playlistId);
      toast.success("Playlist deleted.");
      navigate(routePaths.systemPlaylists, { replace: true });
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e.message || "Could not delete playlist."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTracksBatchAdded = (updated, count) => {
    setPlaylist(updated);
    setTracks(updated?.tracks ?? tracks);
    setTracksMsg({
      type: "success",
      text: `${count} track${count === 1 ? "" : "s"} added.`,
    });
  };

  const handleRemoveTrack = async (rowId, title) => {
    if (!playlistId || !rowId) return;
    if (!window.confirm(`Remove "${title}"?`)) return;
    setTracksMsg({ type: "", text: "" });
    setRemovingTrackId(rowId);
    try {
      const updated = await removeTrackFromSystemPlaylistService(
        playlistId,
        rowId
      );
      if (updated) {
        setPlaylist(updated);
        setTracks(updated.tracks ?? []);
      }
      setTracksMsg({ type: "success", text: "Track removed." });
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e.message || "Could not remove track."
      );
    } finally {
      setRemovingTrackId(null);
    }
  };

  const orderedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [tracks]);

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
          <ArrowLeft className="h-4 w-4" /> System Playlists
        </Link>
        <div
          className="rounded-xl border px-5 py-4 text-sm"
          style={{
            borderColor: "#fca5a5",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
          }}
        >
          {errorMessage || "Playlist not found."}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">

      {/* Page Header */}
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
              System Playlist
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
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-40"
            style={{
              borderColor: "#fecaca",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
            }}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Info + Cover Grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">

        {/* Info Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-3">
            <VisibilityBadge isPublic={playlist.isPublic} />
            <HiddenBadge hidden={playlist.isHidden} />
          </div>

          {playlist.description && (
            <p className="text-sm leading-relaxed text-slate-500">
              {playlist.description}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Music} label="Tracks" value={playlist.trackCount ?? 0} />
            <StatCard icon={Disc} label="Duration" value={fmtDur(playlist.totalDuration)} />
            <StatCard icon={Disc} label="Created" value={fmtDate(playlist.createdAt)} />
          </div>
        </div>

        {/* Cover */}
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

      {/* Tracks Card */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        {/* Tracks Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #e2e8f0" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <Music className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Tracks · {orderedTracks.length}
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
            <Plus className="h-4 w-4" /> Add Tracks
          </button>
        </div>

        {/* Feedback Message */}
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

        {/* Tracks Table */}
        {orderedTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <Music className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No tracks yet</p>
            <p className="mt-1 text-xs text-slate-400">Click "Add Tracks" to populate this playlist</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr
                  className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                  style={{ borderBottom: "1px solid #e2e8f0" }}
                >
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3 text-left">Track</th>
                  <th className="px-4 py-3 text-left">Artist</th>
                  <th className="px-4 py-3 text-right w-20">Duration</th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {orderedTracks.map((row, i) => {
                  const track = row.track;
                  const title = track?.title ?? "Unknown track";
                  const artistName = track?.artist?.name ?? "—";
                  const rowTrackId = row.trackId ?? track?.id ?? null;
                  const isRemoving = removingTrackId === rowTrackId;
                  return (
                    <tr
                      key={rowTrackId ?? `orphan-${i}`}
                      className="transition hover:bg-slate-50"
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td className="px-4 py-3 text-center text-slate-400">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {title}
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
                            onClick={() => handleRemoveTrack(rowTrackId, title)}
                            disabled={isRemoving}
                            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40"
                            style={{
                              borderColor: "#fecaca",
                              backgroundColor: "#fef2f2",
                              color: "#dc2626",
                            }}
                          >
                            <X className="h-3 w-3" />
                            {isRemoving ? "..." : "Remove"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddTracksModal
        isOpen={addTracksOpen}
        onClose={() => setAddTracksOpen(false)}
        playlistId={playlistId}
        existingTrackIds={existingTrackIds}
        onAdded={handleTracksBatchAdded}
      />
    </section>
  );
};

export default SystemPlaylistDetailPage;
