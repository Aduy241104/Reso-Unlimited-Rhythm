import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Disc, Loader2, Music, Pencil, Plus, Trash2, X } from "lucide-react";
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

const StatusPill = ({ on, label }) => (
  <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold ${
    on ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
  }`}>
    {label ?? (on ? "On" : "Off")}
  </span>
);

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 border border-black/10 bg-white px-4 py-3">
    <Icon className="h-5 w-5 text-black/40" />
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-black/30">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-black">{value}</p>
    </div>
  </div>
);

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

  if (isLoading) {
    return (
      <section className="m-6">
        <div className="flex min-h-[200px] items-center justify-center border border-black bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-black/30" />
        </div>
      </section>
    );
  }

  if (errorMessage || !playlist) {
    return (
      <section className="m-6 space-y-4">
        <Link to={routePaths.systemPlaylists}
          className="inline-flex items-center gap-2 border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/60 hover:bg-black/[0.03]">
          <ArrowLeft className="h-4 w-4" /> System Playlists
        </Link>
        <div className="border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {errorMessage || "Playlist not found."}
        </div>
      </section>
    );
  }

  return (
    <section className="m-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border border-black bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to={routePaths.systemPlaylists}
            className="inline-flex items-center gap-2 text-sm font-semibold text-black/50 hover:text-black/80">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-black/30">System Playlist</p>
            <h1 className="text-xl font-bold text-black">{playlist.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={routePaths.systemPlaylistEdit(playlistId)}
            className="inline-flex items-center gap-2 border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/70 hover:bg-black/[0.03]">
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <button type="button" onClick={handleDelete} disabled={isDeleting}
            className="inline-flex items-center gap-2 border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40">
            <Trash2 className="h-4 w-4" /> {isDeleting ? "..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="border border-black bg-white px-6 py-5">
          <div className="flex flex-wrap gap-3">
            <StatusPill on={playlist.isPublic} label={playlist.isPublic ? "Public" : "Private"} />
            <StatusPill on={!playlist.isHidden} label={playlist.isHidden ? "Hidden" : "Visible"} />
          </div>
          {playlist.description && (
            <p className="mt-3 text-sm text-black/50">{playlist.description}</p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard icon={Music} label="Tracks" value={playlist.trackCount ?? 0} />
            <StatCard icon={Disc} label="Duration" value={fmtDur(playlist.totalDuration)} />
            <StatCard icon={Disc} label="Created" value={fmtDate(playlist.createdAt)} />
          </div>
        </div>
        <div className="border border-black bg-white px-6 py-5">
          {playlist.coverImage ? (
            <img src={playlist.coverImage} alt={playlist.title} className="h-48 w-full object-cover" />
          ) : (
            <div className="flex h-48 w-full items-center justify-center border-2 border-dashed border-black/10 bg-black/[0.02]">
              <Disc className="h-10 w-10 text-black/10" />
            </div>
          )}
        </div>
      </div>

      {/* Tracks */}
      <div className="border border-black bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-black/50">
            Tracks · {orderedTracks.length}
          </h2>
          <button type="button" onClick={() => { setTracksMsg({ type: "", text: "" }); setAddTracksOpen(true); }}
            className="inline-flex items-center gap-2 bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80">
            <Plus className="h-4 w-4" /> Add Tracks
          </button>
        </div>

        {tracksMsg.text && (
          <div className={`mx-5 mt-4 border px-4 py-3 text-sm font-medium ${
            tracksMsg.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}>
            {tracksMsg.text}
          </div>
        )}

        {orderedTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Music className="h-8 w-8 text-black/10" />
            <p className="mt-3 text-sm font-semibold text-black/30">No tracks yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm text-black">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-widest text-black/30 border-b border-black/10">
                  <th className="px-5 py-3 text-center w-12">#</th>
                  <th className="px-5 py-3 text-left">Track</th>
                  <th className="px-5 py-3 text-left">Artist</th>
                  <th className="px-5 py-3 text-right w-20">Duration</th>
                  <th className="px-5 py-3 w-28" />
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
                    <tr key={rowTrackId ?? `orphan-${i}`} className="hover:bg-black/[0.02]">
                      <td className="px-5 py-3 text-center text-black/25">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-black/80">{title}</td>
                      <td className="px-5 py-3 text-black/45">{artistName}</td>
                      <td className="px-5 py-3 text-right text-black/35">{fmtDur(track?.duration)}</td>
                      <td className="px-5 py-3 text-center">
                        {rowTrackId && (
                          <button type="button" onClick={() => handleRemoveTrack(rowTrackId, title)}
                            disabled={isRemoving}
                            className="inline-flex items-center gap-1.5 border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40">
                            <X className="h-3 w-3" /> {isRemoving ? "..." : "Remove"}
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
