import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  deleteAdminSystemPlaylistService,
  getAdminSystemPlaylistDetailService,
} from "../../services/playlistService";
import { routePaths } from "../../routes/routePaths";

const formatDuration = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) {
    return "—";
  }
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString();
};

const MetaRow = ({ label, children }) => (
  <div className="grid gap-1 border-b border-black/10 py-3 text-sm last:border-b-0 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-start sm:gap-4">
    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">{label}</dt>
    <dd className="text-black/85">{children}</dd>
  </div>
);

const SystemPlaylistDetailPage = () => {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
      setPlaylist(data);
      if (!data) {
        setErrorMessage("Playlist not found.");
      }
    } catch (error) {
      setPlaylist(null);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Could not load this playlist."
      );
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const handleDelete = async () => {
    if (!playlistId) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this system playlist permanently? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAdminSystemPlaylistService(playlistId);
      navigate(routePaths.systemPlaylists, { replace: true });
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Could not delete this playlist."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[240px] flex-col items-center justify-center rounded-[2rem] border border-black bg-white p-10 text-black/60">
        <Loader2 className="h-8 w-8 animate-spin text-black" aria-hidden />
        <p className="mt-4 text-sm">Loading playlist…</p>
      </section>
    );
  }

  if (errorMessage || !playlist) {
    return (
      <section className="space-y-6">
        <Link
          to={routePaths.systemPlaylists}
          className="inline-flex items-center gap-2 text-sm font-semibold text-black underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to system playlists
        </Link>
        <div className="rounded-[2rem] border border-red-600 bg-red-50 px-6 py-4 text-sm text-red-900">
          {errorMessage || "Playlist not found."}
        </div>
      </section>
    );
  }

  const orderedTracks = [...(playlist.tracks ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={routePaths.systemPlaylists}
          className="inline-flex items-center gap-2 text-sm font-semibold text-black underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to system playlists
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            to={routePaths.systemPlaylistEdit(playlistId)}
            className="inline-flex items-center gap-2 rounded-2xl border border-black bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-black/[0.04]"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <div className="rounded-[2rem] border border-black bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">
          System playlist (admin)
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-black">{playlist.title}</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
          <span className="rounded-full border border-black/15 px-3 py-1">
            type: {playlist.type}
          </span>
          <span className="rounded-full border border-black/15 px-3 py-1">
            {playlist.trackCount ?? 0} tracks
          </span>
          <span className="rounded-full border border-black/15 px-3 py-1">
            duration: {formatDuration(playlist.totalDuration)}
          </span>
          <span className="rounded-full border border-black/15 px-3 py-1">
            public: {playlist.isPublic ? "yes" : "no"}
          </span>
          <span className="rounded-full border border-black/15 px-3 py-1">
            hidden: {playlist.isHidden ? "yes" : "no"}
          </span>
        </div>
        {playlist.coverImage ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">
              Cover preview
            </p>
            <img
              src={playlist.coverImage}
              alt=""
              className="mt-2 max-h-48 rounded-2xl border border-black/10 object-cover"
            />
          </div>
        ) : null}
        {playlist.description ? (
          <p className="mt-5 max-w-3xl text-sm leading-6 text-black/75">{playlist.description}</p>
        ) : (
          <p className="mt-5 text-sm text-black/50">No description.</p>
        )}
      </div>

      {/* <div className="rounded-[2rem] border border-black bg-white p-6">
        <h2 className="text-lg font-semibold text-black">Playlist details</h2>
        <dl className="mt-2 divide-y divide-black/10">
          <MetaRow label="ID">{playlist.id}</MetaRow>
          <MetaRow label="Created">{formatDateTime(playlist.createdAt)}</MetaRow>
          <MetaRow label="Updated">{formatDateTime(playlist.updatedAt)}</MetaRow>
          <MetaRow label="Owner">
            {playlist.owner ? (
              <div className="space-y-1">
                <p className="font-medium text-black">{playlist.owner.fullName || "—"}</p>
                <p className="text-xs text-black/60">{playlist.owner.email || "—"}</p>
                <p className="font-mono text-xs text-black/55">user: {playlist.owner.id}</p>
                <p className="text-xs text-black/55">role: {playlist.owner.role ?? "—"}</p>
              </div>
            ) : (
              "—"
            )}
          </MetaRow>
          <MetaRow label="AI prompt">
            {playlist.aiPrompt ? (
              <span className="whitespace-pre-wrap text-black/80">{playlist.aiPrompt}</span>
            ) : (
              "—"
            )}
          </MetaRow>
          <MetaRow label="AI generated at">{formatDateTime(playlist.aiGeneratedAt)}</MetaRow>
        </dl>
      </div> */}

      <div className="rounded-[2rem] border border-black bg-white p-6">
        <h2 className="text-lg font-semibold text-black">Tracks</h2>
        {orderedTracks.length === 0 ? (
          <p className="mt-4 text-sm text-black/60">This playlist has no tracks yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/10">
            {orderedTracks.map((row, index) => {
              const track = row.track;
              const title = track?.title ?? "Unknown track";
              const artistName = track?.artist?.name ?? "—";
              return (
                <li
                  key={track?.id ?? `row-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
                >
                  <div>
                    <span className="text-xs font-semibold text-black/40">{index + 1}.</span>{" "}
                    <span className="font-medium text-black">{title}</span>
                    <span className="mt-1 block text-xs text-black/55">{artistName}</span>
                  </div>
                  <span className="text-black/60">{formatDuration(track?.duration)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SystemPlaylistDetailPage;
