import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import trackService from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";

const formatDuration = (duration) => {
  const totalSeconds = Number(duration) || 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
};

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-neutral-100 text-neutral-600 border-neutral-200",
  hidden: "bg-amber-50 text-amber-700 border-amber-200",
  blocked: "bg-rose-50 text-rose-700 border-rose-200",
};

const approvalStyles = {
  approved: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-rose-50 text-rose-700",
  draft: "bg-neutral-100 text-neutral-600",
};

export const MyMusicPage = () => {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchTracks = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await trackService.getArtistTracks();

        if (!isMounted) {
          return;
        }

        if (response?.success) {
          setTracks(response.data?.tracks || []);
        } else {
          setTracks([]);
          setErrorMessage(response?.message || "Failed to load your tracks.");
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTracks([]);
        setErrorMessage(
          error?.message ||
            error?.response?.data?.message ||
            "Failed to load your tracks."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTracks();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleViewTrack = (trackId) => {
    navigate(routePaths.artistTrackDetail(trackId));
  };

  const handleHideTrack = async (track) => {
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

    setActionMessage("");
    setActionError("");
    setIsActionLoading(true);

    try {
      const updatedTrack = await trackService.hideArtistTrack(track._id, reason);

      setTracks((currentTracks) =>
        currentTracks.map((item) => (item._id === updatedTrack?._id ? updatedTrack : item))
      );
      setActionMessage("Track hidden successfully.");
    } catch (error) {
      setActionError(
        error?.message ||
          error?.response?.data?.message ||
          "Failed to hide this track."
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTrack = async (track) => {
    if (!track || isActionLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this track permanently? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setActionMessage("");
    setActionError("");
    setIsActionLoading(true);

    try {
      await trackService.deleteArtistTrack(track._id);
      setTracks((currentTracks) => currentTracks.filter((item) => item._id !== track._id));
      setActionMessage("Track deleted successfully.");
    } catch (error) {
      setActionError(
        error?.message ||
          error?.response?.data?.message ||
          "Failed to delete this track."
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const trackStats = useMemo(() => {
    const totalTracks = tracks.length;
    const activeTracks = tracks.filter((track) => track.activeStatus === "active").length;
    const pendingTracks = tracks.filter((track) => track.approvalStatus === "pending").length;
    const totalPlays = tracks.reduce(
      (sum, track) => sum + Number(track.stats?.totalPlay || 0),
      0
    );

    return {
      totalTracks,
      activeTracks,
      pendingTracks,
      totalPlays,
    };
  }, [tracks]);

  return (
    <section className="space-y-6">
      <div className="rounded-md border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#8b5e3c]">
              Artist Dashboard
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#241b15]">
              My Music
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
              View and manage every track you have created, including status,
              album, duration, and performance numbers.
            </p>
          </div>

          <button
            onClick={() => navigate(routePaths.artistCreateTrack)}
            className="rounded-md bg-[#8b5e3c] px-6 py-2 font-medium text-white transition-colors hover:bg-[#6d4a2f]"
          >
            + Create Track
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Tracks", value: trackStats.totalTracks },
            { label: "Active Tracks", value: trackStats.activeTracks },
            { label: "Pending Review", value: trackStats.pendingTracks },
            { label: "Total Plays", value: trackStats.totalPlays.toLocaleString() },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-md border border-neutral-200 bg-[#fcfaf7] p-4"
            >
              <p className="text-sm text-neutral-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[#241b15]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {actionMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      <div className="rounded-md border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#241b15]">Track List</h3>
            <p className="mt-1 text-sm text-neutral-500">
              A full list of tracks tied to your artist profile.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-sm text-neutral-500">
            Loading your tracks...
          </div>
        ) : tracks.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-base font-medium text-[#241b15]">No tracks yet</p>
            <p className="mt-2 text-sm text-neutral-500">
              Create your first track to start building your catalog.
            </p>
            <button
              onClick={() => navigate(routePaths.artistCreateTrack)}
              className="mt-5 rounded-md bg-[#8b5e3c] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6d4a2f]"
            >
              Create Track
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
              <thead className="bg-[#fcfaf7] text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Album</th>
                  <th className="px-5 py-3 font-medium">Duration</th>
                  <th className="px-5 py-3 font-medium">Plays</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Approval</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-200">
                {tracks.map((track) => (
                  <tr key={track._id} className="text-[#2f261f]">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => navigate(routePaths.artistTrackDetail(track._id))}
                        className="text-left font-medium text-[#241b15] transition-colors hover:text-[#8b5e3c]"
                      >
                        {track.title}
                      </button>
                      <p className="mt-1 text-xs text-neutral-500">
                        Released {track.releaseDate ? new Date(track.releaseDate).toLocaleDateString() : "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-neutral-600">
                      {track.album?.title || "No album"}
                    </td>
                    <td className="px-5 py-4 text-neutral-600">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="px-5 py-4 text-neutral-600">
                      {(track.stats?.totalPlay || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={[
                          "inline-flex rounded-sm border px-2.5 py-1 text-xs font-medium capitalize",
                          statusStyles[track.activeStatus] || statusStyles.draft,
                        ].join(" ")}
                      >
                        {track.activeStatus || "draft"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={[
                          "inline-flex rounded-sm px-2.5 py-1 text-xs font-medium capitalize",
                          approvalStyles[track.approvalStatus] || approvalStyles.draft,
                        ].join(" ")}
                      >
                        {track.approvalStatus || "draft"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewTrack(track._id)}
                          className="inline-flex items-center gap-2 rounded-sm border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-[#241b15] transition hover:border-[#8b5e3c] hover:text-[#8b5e3c]"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleHideTrack(track)}
                          disabled={isActionLoading || track.activeStatus === "hidden"}
                          className="inline-flex items-center gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <EyeOff className="h-4 w-4" />
                          {track.activeStatus === "hidden" ? "Hidden" : "Hide"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTrack(track)}
                          disabled={isActionLoading}
                          className="inline-flex items-center gap-2 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export const ReleasesPage = () => (
  <ArtistSectionPage
    title="Releases"
    description="Plan release schedules, monitor launch readiness, and track how each project performs after it goes live."
  />
);

export const AnalyticsPage = () => (
  <ArtistSectionPage
    title="Analytics"
    description="Review audience growth, platform performance, and streaming insights across your full catalog."
  />
);

export const FansPage = () => (
  <ArtistSectionPage
    title="Fans"
    description="Understand who is listening, where they are discovering your music, and how engagement changes over time."
  />
);

export const RoyaltiesPage = () => (
  <ArtistSectionPage
    title="Royalties"
    description="Track earnings, review payout timelines, and keep a clear picture of your revenue sources."
  />
);

export const SettingsPage = () => (
  <ArtistSectionPage
    title="Settings"
    description="Manage your artist profile, platform preferences, and dashboard-level account controls."
  />
);
