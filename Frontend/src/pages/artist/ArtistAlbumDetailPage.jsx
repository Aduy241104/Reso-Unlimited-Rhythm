import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  getArtistAlbumDetailService,
  addTrackToAlbumService,
  removeTrackFromAlbumService,
  publishAlbumService,
} from "../../services/artist/artistAlbumService";
import { getArtistTracksService } from "../../services/artist/artistTrackService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorMessage } from "../../utils/apiError";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import {
  createPlaceholderImage,
  formatReleaseYear,
  formatTrackDuration,
  resolveAlbumTotalDurationSeconds,
} from "../../utils/albumDetail";

const ArtistAlbumDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showAddTracksModal, setShowAddTracksModal] = useState(false);
  const [availableTracks, setAvailableTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isAddingTracks, setIsAddingTracks] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [isRemovingTrack, setIsRemovingTrack] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [isPublishingAlbum, setIsPublishingAlbum] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAlbumDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const albumDetail = await getArtistAlbumDetailService(id);

        if (!isMounted) {
          return;
        }

        setAlbum(albumDetail);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAlbum(null);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load album detail from the backend right now.",
          ),
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setAlbum(null);
      setErrorMessage("Album id is missing.");
      setIsLoading(false);
      return;
    }

    loadAlbumDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const loadAvailableTracks = async () => {
    setTracksLoading(true);
    try {
      const result = await getArtistTracksService();
      // Get current track IDs from album (they're formatted as strings via .id)
      const currentTrackIds = album?.tracks?.map((t) => t.track?.id) || [];
      // Filter out tracks already in album - compare strings
      const filteredTracks = result.tracks.filter(
        (track) => !currentTrackIds.includes(String(track._id)),
      );
      setAvailableTracks(filteredTracks);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Failed to load tracks"));
    } finally {
      setTracksLoading(false);
    }
  };

  const handleAddTracksClick = async () => {
    setShowAddTracksModal(true);
    await loadAvailableTracks();
  };

  const handleAddTracks = async () => {
    if (selectedTracks.length === 0) return;

    setIsAddingTracks(true);
    try {
      for (const trackId of selectedTracks) {
        await addTrackToAlbumService(album.id, trackId);
      }

      // Reload album detail
      const updatedAlbum = await getArtistAlbumDetailService(id);
      setAlbum(updatedAlbum);
      setSelectedTracks([]);
      setShowAddTracksModal(false);
      setSuccessMessage("Đã thêm bài hát vào album.");
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Failed to add tracks to album"),
      );
    } finally {
      setIsAddingTracks(false);
    }
  };

  const handleRemoveTrack = async (trackId) => {
    setIsRemovingTrack(true);

    try {
      const previousStatus = album?.status;
      await removeTrackFromAlbumService(album.id, trackId);

      // load lại detail
      const updatedAlbum = await getArtistAlbumDetailService(id);

      setAlbum(updatedAlbum);
      setRemoveConfirm(null);
      setSuccessMessage(
        previousStatus === "active" && updatedAlbum?.status === "draft"
          ? "Đã gỡ bài hát. Album đã chuyển về nháp vì hiện còn dưới 2 bài hát."
          : "Đã gỡ bài hát khỏi album."
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Failed to remove track from album"),
      );
    } finally {
      setIsRemovingTrack(false);
    }
  };

  const handlePublishAlbum = async () => {
    setIsPublishingAlbum(true);
    setErrorMessage("");

    try {
      const updatedAlbum = await publishAlbumService(album.id);
      setAlbum((prevAlbum) => ({
        ...prevAlbum,
        status: updatedAlbum?.status || "active",
      }));
      setPublishConfirmOpen(false);
      setSuccessMessage("Album đã được công khai thành công.");
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Không thể công khai album lúc này.")
      );
    } finally {
      setIsPublishingAlbum(false);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <button
          onClick={() => navigate(routePaths.artistAlbums)}
          className="flex items-center gap-2 text-sm font-medium text-[#8b5e3c] hover:text-[#6d4a2f] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Albums
        </button>
        <div className="rounded-md border border-neutral-200 bg-white p-8 text-center">
          <p className="text-neutral-600">Loading album details...</p>
        </div>
      </section>
    );
  }

  if (!album) {
    return (
      <section className="space-y-6">
        <button
          onClick={() => navigate(routePaths.artistAlbums)}
          className="flex items-center gap-2 text-sm font-medium text-[#8b5e3c] hover:text-[#6d4a2f] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Albums
        </button>
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage || "Album not found."}
        </div>
      </section>
    );
  }

  const albumCoverImage =
    album?.coverImage || createPlaceholderImage(album?.title);
  const trackItems = album?.tracks ?? [];
  const albumTotalDurationSeconds = resolveAlbumTotalDurationSeconds(
    album,
    trackItems
  );
  const releaseYear = formatReleaseYear(album?.releaseDate);
  const canReleaseAlbum = trackItems.length >= 2;
  const showReleaseActions = album?.status !== "active";

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(routePaths.artistAlbums)}
          className="flex items-center gap-2 text-sm font-medium text-[#8b5e3c] hover:text-[#6d4a2f] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Albums
        </button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {showReleaseActions && canReleaseAlbum ? (
            <>
              <button
                type="button"
                onClick={() => setPublishConfirmOpen(true)}
                className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100"
              >
                <Play className="h-4 w-4" />
                Công khai ngay
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(routePaths.artistCreateReleaseSchedule, {
                    state: {
                      releaseType: "album",
                      targetId: album?.id,
                    },
                  })
                }
                className="flex items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-900 transition hover:bg-violet-100"
              >
                <MoreHorizontal className="h-4 w-4" />
                Lên lịch phát hành
              </button>
            </>
          ) : null}
          <button
            onClick={() => navigate(routePaths.artistEditAlbum(id))}
            className="flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900 border border-sky-200 transition hover:bg-sky-100"
          >
            <Pencil className="h-4 w-4" />
            Edit Album
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {/* Album Header */}
      <div className="rounded-md border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <div className="shrink-0">
            <img
              src={albumCoverImage}
              alt={album?.title || "Album cover"}
              className="h-48 w-48 rounded-lg object-cover shadow-lg"
            />
          </div>

          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8b5e3c]">
              Album
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#241b15]">
              {album?.title}
            </h1>
            <p className="mt-2 text-neutral-600">
              by{" "}
              <span className="font-medium text-[#241b15]">
                {album?.artist?.name || "Unknown"}
              </span>
            </p>

            <div className="mt-4 flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-neutral-500">Release Date</p>
                <p className="mt-1 font-medium text-[#241b15]">
                  {releaseYear || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Total Tracks</p>
                <p className="mt-1 font-medium text-[#241b15]">
                  {trackItems.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Total Duration</p>
                <p className="mt-1 font-medium text-[#241b15]">
                  {formatTrackDuration(albumTotalDurationSeconds)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Status</p>
                <p className="mt-1">
                  <span className="inline-flex rounded-sm border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs font-medium capitalize text-neutral-600">
                    {album?.status || "draft"}
                  </span>
                </p>
              </div>
            </div>

            {showReleaseActions && !canReleaseAlbum ? (
              <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Album này hiện có {trackItems.length} bài hát. Bạn cần ít nhất 2 bài
                hát để có thể công khai hoặc lên lịch phát hành.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="rounded-md border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#241b15]">Tracks</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {trackItems.length} {trackItems.length === 1 ? "track" : "tracks"}{" "}
              in this album
            </p>
          </div>
          <button
            onClick={handleAddTracksClick}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Tracks
          </button>
        </div>

        {trackItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-base font-medium text-[#241b15]">
              No tracks yet
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Add tracks to this album to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
              <thead className="bg-[#fcfaf7] text-neutral-500">
                <tr>
                  <th className="px-6 py-3 font-medium">#</th>
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Duration</th>
                  <th className="px-6 py-3 font-medium">Plays</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-200">
                {trackItems.map((item, index) => {
                  const track = item.track;
                  if (!track) return null;

                  return (
                    <tr
                      key={track.id}
                      className="text-[#2f261f] hover:bg-[#fcfaf7]"
                    >
                      <td className="px-6 py-4 font-medium text-neutral-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              track.coverImage ||
                              track.avatar ||
                              createPlaceholderImage(track.title)
                            }
                            alt={track.title}
                            className="h-8 w-8 rounded object-cover"
                          />
                          <div>
                            <p className="font-medium text-[#241b15]">
                              {track.title}
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              {track.artist?.name || "Unknown artist"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        {formatTrackDuration(track.duration)}
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        {(track.stats?.totalPlay || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-sm border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs font-medium capitalize text-neutral-600">
                          {track.activeStatus || "draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setRemoveConfirm(track.id)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded hover:bg-rose-100 transition text-rose-600 hover:text-rose-700"
                          aria-label="Remove track"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Tracks Modal */}
      {showAddTracksModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="rounded-md border border-neutral-200 bg-white max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="border-b border-neutral-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-[#241b15]">
                Add Tracks to Album
              </h3>
              <p className="mt-1 text-sm text-neutral-600">
                Select tracks from your library to add to this album
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {tracksLoading ? (
                <div className="px-6 py-8 text-center text-neutral-500">
                  Loading tracks...
                </div>
              ) : availableTracks.length === 0 ? (
                <div className="px-6 py-8 text-center text-neutral-500">
                  No available tracks. All your tracks are already in this
                  album.
                </div>
              ) : (
                <div className="px-6 py-4">
                  <div className="space-y-2">
                    {availableTracks.map((track) => (
                      <label
                        key={track._id}
                        className="flex items-center gap-3 rounded-md border border-neutral-200 p-3 cursor-pointer hover:bg-neutral-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTracks.includes(track._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTracks([...selectedTracks, track._id]);
                            } else {
                              setSelectedTracks(
                                selectedTracks.filter((id) => id !== track._id),
                              );
                            }
                          }}
                          className="h-4 w-4 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#241b15] truncate">
                            {track.title}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {track.artist?.name || "Unknown artist"}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 px-6 py-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddTracksModal(false);
                  setSelectedTracks([]);
                }}
                disabled={isAddingTracks}
                className="flex-1 rounded-md border border-neutral-200 px-4 py-2 font-medium text-[#241b15] transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddTracks}
                disabled={isAddingTracks || selectedTracks.length === 0}
                className="flex-1 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAddingTracks
                  ? "Adding..."
                  : `Add ${selectedTracks.length} Track${selectedTracks.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {removeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-6 w-[400px]">
            <h3 className="text-lg font-semibold">Remove Track</h3>

            <p className="mt-2 text-neutral-600">
              Remove this track from album?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="px-4 py-2 border rounded"
                disabled={isRemovingTrack}
              >
                Cancel
              </button>

              <button
                onClick={() => handleRemoveTrack(removeConfirm)}
                className="px-4 py-2 bg-rose-600 text-white rounded"
                disabled={isRemovingTrack}
              >
                {isRemovingTrack ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmActionModal
        isOpen={publishConfirmOpen}
        title="Công khai album ngay"
        message={`Album "${album?.title || ""}" sẽ được hiển thị công khai ngay bây giờ.`}
        confirmText="Công khai ngay"
        cancelText="Hủy"
        onConfirm={handlePublishAlbum}
        onCancel={() => setPublishConfirmOpen(false)}
        isLoading={isPublishingAlbum}
      />
    </section>
  );
};

export default ArtistAlbumDetailPage;
