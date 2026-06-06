import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Disc, Loader2, Music, Pencil, Plus, Trash2, X, Clock, Calendar } from "lucide-react";
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
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StatusPill = ({ on, onLabel, offLabel }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
    on
      ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
      : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-slate-300"}`} />
    {on ? (onLabel ?? "On") : (offLabel ?? "Off")}
  </span>
);

const InfoCard = ({ icon: Icon, label, value, accent = "slate" }) => {
  const accentMap = {
    slate: "bg-slate-100 text-slate-500",
    violet: "bg-violet-100 text-violet-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accentMap[accent]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
};

const SystemPlaylistDetailPage = () => {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [addTracksOpen, setAddTracksOpen] = useState(false);
  const [tracksMsg, setTracksMsg] = useState({ type: "", text: "" });
  const [removingTrackId, setRemovingTrackId] = useState(null);

  const existingTrackIds = useMemo(() => {
    return tracks.map((r) => r.trackId ?? r.track?.id).filter(Boolean);
  }, [tracks]);

  const loadPlaylist = useCallback(async () => {
    if (!playlistId) { setIsLoading(false); setErrorMessage("Missing playlist id."); return; }
    setIsLoading(true); setErrorMessage("");
    try {
      const data = await getAdminSystemPlaylistDetailService(playlistId);
      if (!data) { setErrorMessage("Playlist not found."); setIsLoading(false); return; }
      setPlaylist(data);
      setTracks(data.tracks ?? []);
    } catch (e) {
      setPlaylist(null); setTracks([]);
      setErrorMessage(e?.response?.data?.message || e.message || "Could not load.");
    } finally { setIsLoading(false); }
  }, [playlistId]);

  useEffect(() => { loadPlaylist(); }, [loadPlaylist]);

  const handleDelete = async () => {
    if (!playlistId) return;
    if (!window.confirm("Delete permanently? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteAdminSystemPlaylistService(playlistId);
      toast.success("Playlist deleted.");
      navigate(routePaths.systemPlaylists, { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Could not delete playlist.");
    } finally { setIsDeleting(false); }
  };

  const handleTracksBatchAdded = (updated, count) => {
    setPlaylist(updated);
    setTracks(updated?.tracks ?? tracks);
    setTracksMsg({ type: "success", text: `${count} track${count === 1 ? "" : "s"} added.` });
  };

  const handleRemoveTrack = async (rowId, title) => {
    if (!playlistId || !rowId) return;
    if (!window.confirm(`Remove "${title}"?`)) return;
    setTracksMsg({ type: "", text: "" });
    setRemovingTrackId(rowId);
    try {
      const updated = await removeTrackFromSystemPlaylistService(playlistId, rowId);
      if (updated) { setPlaylist(updated); setTracks(updated.tracks ?? []); }
      setTracksMsg({ type: "success", text: "Track removed." });
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Could not remove track.");
    } finally { setRemovingTrackId(null); }
  };

  const orderedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [tracks]);

  /* Loading */
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm">Loading playlist...</p>
        </div>
      </div>
    );
  }

  /* Error */
  if (errorMessage || !playlist) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 space-y-4">
        <Link
          to={routePaths.systemPlaylists}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> System Playlists
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {errorMessage || "Playlist not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to={routePaths.systemPlaylists}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400">System Playlist</p>
            <h1 className="text-xl font-black text-slate-900">{playlist.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={routePaths.systemPlaylistEdit(playlistId)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 shadow-sm transition-all hover:bg-red-50 disabled:opacity-40"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* ── Info + Cover ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        {/* Left: info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <StatusPill on={playlist.isPublic} onLabel="Public" offLabel="Private" />
            <StatusPill on={!playlist.isHidden} onLabel="Visible" offLabel="Hidden" />
          </div>

          {/* Description */}
          {playlist.description && (
            <p className="text-sm leading-relaxed text-slate-500">{playlist.description}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <InfoCard icon={Music} label="Tracks" value={playlist.trackCount ?? 0} accent="violet" />
            <InfoCard icon={Clock} label="Duration" value={fmtDur(playlist.totalDuration)} accent="blue" />
            <InfoCard icon={Calendar} label="Created" value={fmtDate(playlist.createdAt)} accent="slate" />
          </div>
        </div>

        {/* Right: cover */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {playlist.coverImage ? (
            <img
              src={playlist.coverImage}
              alt={playlist.title}
              className="h-full w-full rounded-xl object-cover"
              style={{ minHeight: "180px", maxHeight: "220px" }}
            />
          ) : (
            <div className="flex h-full min-h-[180px] w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
              <div className="flex flex-col items-center gap-2 text-slate-300">
                <Disc className="h-10 w-10" />
                <p className="text-xs">No cover image</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tracks ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Tracks header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">Tracks</h2>
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
              {orderedTracks.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setTracksMsg({ type: "", text: "" }); setAddTracksOpen(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:bg-violet-700 hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" /> Add Tracks
          </button>
        </div>

        {/* Tracks message */}
        {tracksMsg.text && (
          <div className={`mx-5 mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
            tracksMsg.type === "error"
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}>
            {tracksMsg.text}
          </div>
        )}

        {/* Track list */}
        {orderedTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Music className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-500">No tracks yet</p>
            <p className="mt-0.5 text-xs text-slate-400">Add tracks to this playlist</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="w-12 py-3 pl-5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">#</th>
                  <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Track</th>
                  <th className="py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Artist</th>
                  <th className="w-24 py-3 px-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Duration</th>
                  <th className="w-28 py-3 pr-5" />
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
                      className="group border-b border-slate-100 transition-colors hover:bg-violet-50/40"
                    >
                      <td className="py-3.5 pl-5 text-center text-sm text-slate-400">{i + 1}</td>
                      <td className="px-3 py-3.5 text-sm font-semibold text-slate-700">{title}</td>
                      <td className="px-3 py-3.5 text-sm text-slate-500">{artistName}</td>
                      <td className="px-3 py-3.5 text-right text-sm text-slate-400">{fmtDur(track?.duration)}</td>
                      <td className="py-3.5 pr-5 text-right">
                        {rowTrackId && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTrack(rowTrackId, title)}
                            disabled={isRemoving}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          >
                            {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
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
    </div>
  );
};

export default SystemPlaylistDetailPage;
