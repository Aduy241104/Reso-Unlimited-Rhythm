import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  CalendarDays,
  Disc3,
  FileText,
  Music2,
  ShieldAlert,
  Sparkles,
  BadgeCheck,
  Pencil,
  Send,
  X,
} from "lucide-react";
import PlayButton from "../../components/common/PlayButton";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { trackService } from "../../services/trackService";
import {
  createPlaceholderImage,
  formatReleaseYear,
  formatTrackDuration,
} from "../../utils/albumDetail";
import { getApiErrorFullMessage, getApiErrorMessage } from "../../utils/apiError";
import {
  canArtistEditTrack,
  canArtistSubmitTrack,
  getSubmitReadinessIssues,
  usesThirdPartyRights,
} from "../../utils/trackWorkflow";

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

const getMediaFileName = (value) => {
  if (!value || typeof value !== "string") {
    return "Không xác định";
  }

  try {
    const decoded = decodeURIComponent(value);
    const segments = decoded.split("/");
    return segments[segments.length - 1] || decoded;
  } catch {
    const segments = value.split("/");
    return segments[segments.length - 1] || value;
  }
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
  const location = useLocation();
  const { playTrack } = usePlayer();
  const [track, setTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);

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
  const canPlayTrack =
    track?.activeStatus === "active" &&
    track?.approvalStatus === "approved" &&
    Array.isArray(track?.audioFiles) &&
    track.audioFiles.length > 0;
  const canEdit = canArtistEditTrack(track);
  const canSubmit = canArtistSubmitTrack(track);
  const submitIssues = useMemo(() => getSubmitReadinessIssues(track), [track]);
  const locationMessage = location.state?.message || "";
  const hasLyrics = Boolean(track?.lyricsStatic?.trim());

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

    if (!canEdit) {
      setActionError("Bài nhạc này không thể chỉnh sửa khi đang chờ duyệt hoặc đã được phê duyệt.");
      return;
    }

    navigate(routePaths.artistTrackEdit(track._id));
  };

  const handleSubmitForApproval = async () => {
    if (!track || isActionLoading || !canSubmit) {
      return;
    }

    if (submitIssues.length > 0) {
      setActionError(
        `Vui lòng hoàn tất bài nhạc trước khi gửi duyệt:\n${submitIssues
          .map((item) => `• ${item}`)
          .join("\n")}`
      );
      navigate(routePaths.artistTrackEdit(track._id));
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsActionLoading(true);
    setIsSubmitConfirmOpen(false);

    try {
      const updatedTrack = await trackService.submitForApproval(track._id);
      setTrack(updatedTrack);
      setActionMessage("Đã gửi bài nhạc lên để chờ phê duyệt.");
    } catch (error) {
      setActionError(
        getApiErrorFullMessage(error, "Không thể gửi bài nhạc để phê duyệt.")
      );
    } finally {
      setIsActionLoading(false);
    }
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

            <PlayButton 
              onClick={handlePlay} 
              label={canPlayTrack ? "Play" : "Play unavailable"}
              size="compact" 
              disabled={!canPlayTrack}
            />
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-8">
          {locationMessage ? (
            <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {locationMessage}
            </div>
          ) : null}

          {actionMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {actionMessage}
            </div>
          ) : null}

          {actionError ? (
            <div className="whitespace-pre-line rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {actionError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleEditTrack}
              disabled={!track || !canEdit}
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" />
              {canEdit ? "Edit track" : "Edit locked"}
            </button>

            {canSubmit ? (
              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setActionMessage("");
                  setIsSubmitConfirmOpen(true);
                }}
                disabled={isActionLoading || submitIssues.length > 0}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Gửi duyệt bài nhạc
              </button>
            ) : null}

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
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#8b5e3c]" />
                    <h2 className="text-lg font-semibold text-[#241b15]">Lyrics</h2>
                  </div>
                  {hasLyrics ? (
                    <button
                      type="button"
                      onClick={() => setIsLyricsModalOpen(true)}
                      className="rounded-full border border-[#8b5e3c]/20 bg-[#fcfaf7] px-4 py-2 text-sm font-medium text-[#8b5e3c] transition hover:bg-[#f6efe5]"
                    >
                      Xem toàn bộ
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 rounded-md border border-neutral-200 bg-[#fcfaf7] p-4 text-sm leading-7 text-neutral-700">
                  {hasLyrics ? (
                    <div className="relative">
                      <pre className="max-h-72 overflow-hidden whitespace-pre-wrap font-sans">
                        {track.lyricsStatic}
                      </pre>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#fcfaf7] via-[#fcfaf7]/95 to-transparent" />
                    </div>
                  ) : (
                    <p>No static lyrics added yet.</p>
                  )}
                </div>
                {hasLyrics ? (
                  <p className="mt-3 text-xs text-neutral-500">
                    Chỉ đang hiển thị bản xem trước. Nhấn `Xem toàn bộ` để đọc đầy đủ lời
                    bài hát.
                  </p>
                ) : null}
                <div className="mt-4 text-sm text-neutral-500">
                  <span className="font-medium text-[#241b15]">Tệp lời đồng bộ:</span>{" "}
                  {track?.lyricsSyncUrl ? getMediaFileName(track.lyricsSyncUrl) : "Chưa cung cấp"}
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
                  {track?.rejectReason ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-900">
                      <p className="font-medium">Reject reason</p>
                      <p className="mt-1 text-sm text-rose-800">{track.rejectReason}</p>
                    </div>
                  ) : null}
                  {track?.moderation?.submittedAt ? (
                    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-neutral-700">
                      <p className="font-medium">Submitted at</p>
                      <p className="mt-1 text-sm">{formatDateTime(track.moderation.submittedAt)}</p>
                    </div>
                  ) : null}
                  {canSubmit && submitIssues.length > 0 ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                      <p className="font-medium">Before you can submit</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                        {submitIssues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-[#8b5e3c]" />
                  <h2 className="text-lg font-semibold text-[#241b15]">Copyright</h2>
                </div>
                <div className="mt-4 space-y-2 text-sm text-neutral-700">
                  <p>
                    <span className="font-medium text-[#241b15]">Copyright owner:</span>{" "}
                    {track?.copyright?.copyrightOwner || "Not provided"}
                  </p>
                  <p>
                    <span className="font-medium text-[#241b15]">Recording owner:</span>{" "}
                    {track?.copyright?.recordingOwner || "Not provided"}
                  </p>
                  <p>
                    <span className="font-medium text-[#241b15]">Declaration:</span>{" "}
                    {track?.copyright?.declarationAccepted ? "Accepted" : "Not accepted"}
                  </p>
                  {usesThirdPartyRights(track?.copyright) ? (
                    <>
                      <p>
                        <span className="font-medium text-[#241b15]">Original track:</span>{" "}
                        {track?.copyright?.originalTrackTitle || "—"} by{" "}
                        {track?.copyright?.originalArtistName || "—"}
                      </p>
                      <p>
                        <span className="font-medium text-[#241b15]">License documents:</span>{" "}
                        {track?.copyright?.licenseDocumentUrls?.length || 0}
                      </p>
                    </>
                  ) : (
                    <p>
                      <span className="font-medium text-[#241b15]">Rights type:</span>{" "}
                      {track?.copyright?.isOriginal ? "Original work" : "Not specified"}
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={isSubmitConfirmOpen}
        title="Gửi duyệt bài nhạc?"
        message="Sau khi gửi duyệt, bạn sẽ không thể chỉnh sửa bài nhạc trong thời gian chờ phê duyệt. Bạn có muốn tiếp tục không?"
        confirmText="Xác nhận gửi duyệt"
        cancelText="Quay lại"
        isLoading={isActionLoading}
        onCancel={() => setIsSubmitConfirmOpen(false)}
        onConfirm={handleSubmitForApproval}
      />

      {isLyricsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setIsLyricsModalOpen(false)}
          />
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-[#241b15]">
                  Toàn bộ lời bài hát
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  {track?.title || "Bài nhạc chưa có tên"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLyricsModalOpen(false)}
                className="rounded-full border border-neutral-200 p-2 text-neutral-600 transition hover:bg-neutral-50 hover:text-[#241b15]"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <div className="rounded-2xl border border-neutral-200 bg-[#fcfaf7] p-5 text-sm leading-7 text-neutral-700">
                {hasLyrics ? (
                  <pre className="whitespace-pre-wrap font-sans">
                    {track.lyricsStatic}
                  </pre>
                ) : (
                  <p>Chưa có lời bài hát tĩnh.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ArtistTrackDetailPage;
