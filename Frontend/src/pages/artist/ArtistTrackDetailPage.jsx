import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  CalendarDays,
  Disc3,
  FileText,
  Flag,
  Music2,
  ShieldAlert,
  Sparkles,
  BadgeCheck,
  Pencil,
} from "lucide-react";
import PlayButton from "../../components/common/PlayButton";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { trackService } from "../../services/trackService";
import {
  createPlaceholderImage,
  formatReleaseYear,
  formatTrackDuration,
} from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";

const statusMeta = {
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  draft: {
    label: "Draft",
    className: "bg-neutral-100 text-neutral-600 border-neutral-200",
  },
  hidden: {
    label: "Hidden",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  blocked: {
    label: "Blocked",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

const approvalMeta = {
  approved: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pending: {
    label: "Pending review",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  draft: {
    label: "Draft",
    className: "bg-neutral-100 text-neutral-600 border-neutral-200",
  },
};

const formatDateTime = (value) => {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatCount = (value) => {
  const count = Number(value) || 0;

  return new Intl.NumberFormat("vi-VN").format(count);
};

const InfoCard = ({ icon, label, value, helper }) => (
  <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#fcfaf7] text-[#8b5e3c]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
          {label}
        </p>
        <p className="mt-2 text-base font-semibold text-[#241b15]">{value}</p>
        {helper ? <p className="mt-1 text-xs text-neutral-500">{helper}</p> : null}
      </div>
    </div>
  </div>
);

const ArtistTrackDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack } = usePlayer();
  const [track, setTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTrack = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const detail = await trackService.getArtistTrackDetail(id);

        if (!isMounted) {
          return;
        }

        setTrack(detail);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTrack(null);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load artist track detail from the server right now."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setTrack(null);
      setErrorMessage("Track id is missing.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    loadTrack();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const coverImage = useMemo(
    () =>
      track?.coverImage?.[0] ||
      track?.avatar ||
      track?.album?.avatar ||
      track?.artist?.avatar ||
      createPlaceholderImage(track?.title || "Track", "#8b5e3c", "#241b15"),
    [track]
  );

  const artistAvatar = useMemo(
    () =>
      track?.artist?.avatar ||
      createPlaceholderImage(track?.artist?.name || "Artist", "#334155", "#0f172a"),
    [track]
  );

  const status = statusMeta[track?.activeStatus] || statusMeta.draft;
  const approval = approvalMeta[track?.approvalStatus] || approvalMeta.draft;
  const releaseYear = formatReleaseYear(track?.releaseDate);
  const duration = formatTrackDuration(track?.duration);
  const genres = Array.isArray(track?.genres) ? track.genres : [];
  const audioFiles = Array.isArray(track?.audioFiles) ? track.audioFiles : [];
  const canPlayTrack =
    track?.activeStatus === "active" &&
    track?.approvalStatus === "approved" &&
    audioFiles.length > 0;

  const handlePlay = async () => {
    if (!track) {
      return;
    }

    if (!canPlayTrack) {
      setActionError(
        "This track cannot be played until it is active, approved, and has audio files."
      );
      return;
    }

    await playTrack(
      {
        id: track._id,
        title: track.title,
        duration: track.duration,
        avatar: track.avatar,
        coverImage: track.coverImage,
        artist: track.artist,
        album: track.album,
        lyrics: {
          static: track.lyricsStatic,
          syncUrl: track.lyricsSyncUrl,
        },
      },
      {
        queue: [track],
        startIndex: 0,
        collection: {
          id: track.album?._id || track._id,
          type: track.album?._id ? "album" : "track",
          title: track.album?.title || track.title || "Track",
          image: coverImage,
          artistName: track.artist?.name || "Artist",
        },
      }
    );
  };

  const handleEditTrack = () => {
    if (!track) {
      return;
    }

    navigate(routePaths.artistTrackEdit(track._id));
  };

  const handleEditLyrics = () => {
    if (!track) {
      return;
    }

    navigate(`${routePaths.artistLyrics}?trackId=${track._id}`);
  };

  const handleHideTrack = async () => {
    if (!track || isActionLoading) {
      return;
    }

    const reason = window.prompt(
      "Enter a hide reason (optional):",
      track.hiddenReason || "Hidden by artist."
    );

    if (reason === null) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsActionLoading(true);

    try {
      const updatedTrack = await trackService.hideArtistTrack(track._id, reason);
      setTrack(updatedTrack);
      setActionMessage("Track has been hidden successfully.");
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "Unable to hide this track right now.")
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTrack = async () => {
    if (!track || isActionLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this track permanently? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsActionLoading(true);

    try {
      await trackService.deleteArtistTrack(track._id);
      navigate(routePaths.artistMusic, {
        state: { message: "Track deleted successfully." },
      });
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "Unable to delete this track right now.")
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-8 text-sm text-neutral-600 shadow-sm">
        Loading artist track detail...
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-md border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-semibold">Could not load track</h2>
        <p className="mt-2 text-sm leading-6">{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(routePaths.artistMusic)}
        className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-[#8b5e3c]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Music
      </button>

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
        <div className="relative h-56 w-full bg-[#241b15] sm:h-64">
          <img src={coverImage} alt={track?.title || "Track cover"} className="h-full w-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          <div className="absolute left-0 top-0 flex w-full items-start justify-between gap-4 p-5 sm:p-8">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">Artist track detail</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                {track?.title || "Untitled track"}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={["inline-flex rounded-sm border px-2.5 py-1 text-xs font-medium capitalize", status.className].join(" ")}>{status.label}</span>
                <span className={["inline-flex rounded-sm border px-2.5 py-1 text-xs font-medium capitalize", approval.className].join(" ")}>{approval.label}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePlay}
              disabled={!canPlayTrack}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#1ed760] px-5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:brightness-100"
            >
              <Play className="h-5 w-5 fill-current" />
              {canPlayTrack ? "Play" : "Play unavailable"}
            </button>
            <PlayButton onClick={ handlePlay } size="compact" />
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-8">
          {actionMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {actionMessage}
            </div>
          ) : null}

          {actionError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {actionError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleEditTrack}
              disabled={!track}
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" />
              Edit track
            </button>

            <button
              type="button"
              onClick={handleEditLyrics}
              disabled={!track}
              className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              Edit lyrics
            </button>

            <button
              type="button"
              onClick={handleHideTrack}
              disabled={isActionLoading || track?.activeStatus === "hidden"}
              className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AlertTriangle className="h-4 w-4" />
              {track?.activeStatus === "hidden" ? "Already hidden" : "Hide track"}
            </button>

            <button
              type="button"
              onClick={handleDeleteTrack}
              disabled={isActionLoading}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldAlert className="h-4 w-4" />
              Delete track
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard icon={<Music2 className="h-5 w-5" />} label="Duration" value={duration} helper="Track length" />
            <InfoCard icon={<CalendarDays className="h-5 w-5" />} label="Release year" value={releaseYear} helper={formatDateTime(track?.releaseDate)} />
            <InfoCard icon={<BadgeCheck className="h-5 w-5" />} label="Plays" value={formatCount(track?.stats?.totalPlay)} helper="Total streamed plays" />
            <InfoCard icon={<Sparkles className="h-5 w-5" />} label="Likes" value={formatCount(track?.stats?.totalLike)} helper="Total likes" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
            <div className="space-y-6">
              <div className="rounded-md border border-neutral-200 bg-[#fcfaf7] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Track info</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#241b15]">Management detail</h2>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm">
                    <Disc3 className="h-4 w-4 text-[#8b5e3c]" />
                    {track?.album?.title || "No album"}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-neutral-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Artist</p>
                    <div className="mt-3 flex items-center gap-3">
                      <img src={artistAvatar} alt={track?.artist?.name || "Artist"} className="h-14 w-14 rounded-full object-cover" />
                      <div>
                        <p className="font-semibold text-[#241b15]">{track?.artist?.name || "Unknown artist"}</p>
                        <p className="text-sm text-neutral-500">Artist account</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-neutral-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Genres</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {genres.length > 0 ? genres.map((genre) => (
                        <span key={genre.id || genre._id || genre.name} className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-700">
                          {genre.name}
                        </span>
                      )) : <span className="text-sm text-neutral-500">No genres selected</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-neutral-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Created</p>
                    <p className="mt-2 text-sm font-medium text-[#241b15]">{formatDateTime(track?.createdAt)}</p>
                  </div>
                  <div className="rounded-md border border-neutral-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Updated</p>
                    <p className="mt-2 text-sm font-medium text-[#241b15]">{formatDateTime(track?.updatedAt)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#8b5e3c]" />
                  <h2 className="text-lg font-semibold text-[#241b15]">Lyrics</h2>
                </div>
                <div className="mt-4 rounded-md border border-neutral-200 bg-[#fcfaf7] p-4 text-sm leading-7 text-neutral-700">
                  {track?.lyricsStatic?.trim() ? (
                    <pre className="whitespace-pre-wrap font-sans">{track.lyricsStatic}</pre>
                  ) : (
                    <p>No static lyrics added yet.</p>
                  )}
                </div>
                <div className="mt-4 text-sm text-neutral-500">
                  Sync URL: {track?.lyricsSyncUrl || "Not provided"}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-[#8b5e3c]" />
                  <h2 className="text-lg font-semibold text-[#241b15]">Moderation status</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm text-neutral-600">
                  <div className="flex items-center justify-between gap-4">
                    <span>Active status</span>
                    <span className={["inline-flex rounded-sm border px-2.5 py-1 text-xs font-medium capitalize", status.className].join(" ")}>{track?.activeStatus || "draft"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Approval status</span>
                    <span className={["inline-flex rounded-sm border px-2.5 py-1 text-xs font-medium capitalize", approval.className].join(" ")}>{track?.approvalStatus || "draft"}</span>
                  </div>
                  {track?.blockedReason ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-900">
                      <p className="font-medium">Blocked reason</p>
                      <p className="mt-1 text-sm text-rose-800">{track.blockedReason}</p>
                    </div>
                  ) : null}
                  {track?.hiddenReason ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                      <p className="font-medium">Hidden reason</p>
                      <p className="mt-1 text-sm text-amber-800">{track.hiddenReason}</p>
                    </div>
                  ) : null}
                  {track?.hiddenAt ? (
                    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-neutral-700">
                      <p className="font-medium">Hidden at</p>
                      <p className="mt-1 text-sm">{formatDateTime(track.hiddenAt)}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-[#8b5e3c]" />
                  <h2 className="text-lg font-semibold text-[#241b15]">Audio files</h2>
                </div>

                <div className="mt-4 space-y-3">
                  {audioFiles.length > 0 ? audioFiles.map((file, index) => (
                    <div key={`${file.url}-${index}`} className="rounded-md border border-neutral-200 bg-[#fcfaf7] p-3 text-sm text-neutral-700">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-[#241b15]">{file.label || "original"}</p>
                          <p className="mt-1 break-all text-xs text-neutral-500">{file.url}</p>
                        </div>
                        <div className="text-right text-xs text-neutral-500">
                          <p>{file.format || "unknown"}</p>
                          <p>{file.bitrate ? `${file.bitrate} kbps` : "Unknown bitrate"}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-neutral-500">No audio files available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistTrackDetailPage;
