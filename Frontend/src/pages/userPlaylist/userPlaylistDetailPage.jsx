import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMinus,
  MoreHorizontal,
  Pencil,
  Shuffle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DeletePlaylistConfirmModal from "../../components/userPlaylist/DeletePlaylistConfirmModal";
import EditPlaylistModal from "../../components/userPlaylist/EditPlaylistModal";
import PlayButton from "../../components/common/PlayButton";
import LoadingState from "../../components/common/LoadingState";
import TrackCard from "../../components/TrackCard";
import TrackListSection from "../../components/trackList/TrackListSection";
import TrackTwoLevelMenu from "../../components/trackMenu/TrackTwoLevelMenu";
import { useAuth } from "../../hooks/useAuth";
import { usePlayer } from "../../hooks/usePlayer";
import useDominantColorGradient from "../../hooks/useDominantColorGradient";
import { routePaths } from "../../routes/routePaths";
import {
  deleteUserPlaylist,
  getUserPlaylistDetail,
  getUserPlaylists,
  removeTrackFromUserPlaylist,
} from "../../services/userPlaylistService";
import { formatTrackDuration, resolveTrackAvatar } from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  formatPlaylistDate,
  formatPlaylistDuration,
} from "../../utils/playlistDetail";
import { isBlockedTrack } from "../../utils/trackStatus";
import { Clock3 } from "lucide-react";

const shufflePlayButtonClassName = `
  inline-flex h-10 items-center gap-2 rounded-full border border-black/8 px-4
  bg-white/70 text-sm font-semibold text-[#18181b] transition hover:scale-[1.03] hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] sm:h-11 sm:px-5
`;

const metaPillClassName = `
  inline-flex items-center rounded-full border border-white/14 bg-white/10
  px-3 py-1.5 text-xs text-white/88 backdrop-blur-sm sm:text-sm
`;

const trackListHeaderColumns = [
  { label: "#" },
  { label: "Tiêu đề" },
  { label: "Đã lưu", className: "text-center" },
  {
    icon: Clock3,
    className: "flex items-center justify-center -translate-x-3",
    iconClassName: "h-3.5 w-3.5",
  },
  { label: "" },
].filter((_, index) => index !== 2);


const getPlaylistTitle = (playlist) => {
  if (typeof playlist?.title === "string" && playlist.title.trim()) {
    return playlist.title.trim();
  }

  if (typeof playlist?.name === "string" && playlist.name.trim()) {
    return playlist.name.trim();
  }

  return "";
};

const getPlaylistDescription = (playlist) => {
  if (typeof playlist?.description === "string" && playlist.description.trim()) {
    return playlist.description.trim();
  }

  return "";
};

const getPlaylistOwnerLabel = (playlist) => {
  if (typeof playlist?.userName === "string" && playlist.userName.trim()) {
    return playlist.userName.trim();
  }

  if (typeof playlist?.owner?.fullName === "string" && playlist.owner.fullName.trim()) {
    return playlist.owner.fullName.trim();
  }

  if (typeof playlist?.owner?.name === "string" && playlist.owner.name.trim()) {
    return playlist.owner.name.trim();
  }

  if (typeof playlist?.owner?.email === "string" && playlist.owner.email.trim()) {
    return playlist.owner.email.trim();
  }

  return "";
};

const normalizeTrackItems = (playlist) => {
  if (Array.isArray(playlist?.tracks)) {
    return playlist.tracks;
  }

  if (Array.isArray(playlist?.trackList)) {
    return playlist.trackList.map((item, index) => ({
      ...item,
      order: item?.order || index + 1,
      track: item?.track || item,
      trackId: item?.trackId || item?.track?.id || item?.id || "",
    }));
  }

  return [];
};

const getTrackEntity = (trackItem) => trackItem?.track || trackItem || null;

const getTrackId = (track) => track?.id || track?.trackId || "";

const getTrackArtistName = (track, fallbackArtistName) => {
  if (typeof track?.artist?.name === "string" && track.artist.name.trim()) {
    return track.artist.name.trim();
  }

  if (typeof track?.artistName === "string" && track.artistName.trim()) {
    return track.artistName.trim();
  }

  return fallbackArtistName || "";
};

const getTrackArtistId = (track) => track?.artist?.id || track?.artistId || "";

const getTrackImage = (track) => resolveTrackAvatar(track);

const getTotalDurationSeconds = (trackItems) =>
  trackItems.reduce((sum, item) => {
    const track = getTrackEntity(item);
    const duration = Number(track?.duration);
    return Number.isFinite(duration) ? sum + duration : sum;
  }, 0);

const normalizePlaylists = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.playlists)) {
    return payload.playlists;
  }

  return [];
};

const getPlaylistIdValue = (playlist) => playlist?.playlistId || playlist?.id || "";

const getPlaylistTrackCount = (playlist) => {
  if (typeof playlist?.totalTracks === "number") {
    return playlist.totalTracks;
  }

  if (typeof playlist?.trackCount === "number") {
    return playlist.trackCount;
  }

  if (Array.isArray(playlist?.tracks)) {
    return playlist.tracks.length;
  }

  return 0;
};

const UserPlaylistDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [existingPlaylists, setExistingPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [trackActionFeedback, setTrackActionFeedback] = useState(null);
  const [pendingTrackRemoval, setPendingTrackRemoval] = useState(null);
  const [isRemovingTrack, setIsRemovingTrack] = useState(false);
  const [removeTrackErrorMessage, setRemoveTrackErrorMessage] = useState("");
  const actionMenuRef = useRef(null);
  const {
    currentTrack,
    isPlaying,
    isShuffleEnabled,
    activeCollection,
    playPlaylist,
    playTrack,
    togglePlayPause,
  } = usePlayer();

  useEffect(() => {
    let isMounted = true;

    const loadPlaylistDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [playlistDetailResult, playlistsResult] = await Promise.allSettled([
          getUserPlaylistDetail(id),
          getUserPlaylists(),
        ]);

        if (playlistDetailResult.status !== "fulfilled") {
          throw playlistDetailResult.reason;
        }

        const playlistDetail = playlistDetailResult.value;
        const playlistsPayload =
          playlistsResult.status === "fulfilled" ? playlistsResult.value : [];

        if (!isMounted) {
          return;
        }

        if (!playlistDetail) {
          setPlaylist(null);
          setErrorMessage("Playlist not found.");
          return;
        }

        setPlaylist(playlistDetail);
        setExistingPlaylists(normalizePlaylists(playlistsPayload));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPlaylist(null);
        setExistingPlaylists([]);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load playlist detail from the backend right now."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setPlaylist(null);
      setErrorMessage("Playlist id is missing.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    void loadPlaylistDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!isActionMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!actionMenuRef.current?.contains(event.target)) {
        setIsActionMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsActionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionMenuOpen]);

  useEffect(() => {
    if (!trackActionFeedback?.message || trackActionFeedback.tone !== "success") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setTrackActionFeedback(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [trackActionFeedback]);

  const trackItems = normalizeTrackItems(playlist);
  const playlistOwnerLabel = getPlaylistOwnerLabel(playlist);
  const totalTracks = playlist?.trackCount ?? trackItems.length;
  const totalDuration =
    formatPlaylistDuration(playlist?.totalDuration) ||
    formatPlaylistDuration(getTotalDurationSeconds(trackItems));
  const createdDate = formatPlaylistDate(playlist?.createdAt);
  const playlistCoverImage = playlist?.coverImage ?? "";
  const headerGradient = useDominantColorGradient(playlistCoverImage);
  const playlistTitle = getPlaylistTitle(playlist);
  const playlistDescription = getPlaylistDescription(playlist);
  const currentPlaylistId = getPlaylistIdValue(playlist);
  const availableTargetPlaylists = useMemo(
    () =>
      existingPlaylists.filter(
        (item) => getPlaylistIdValue(item) && getPlaylistIdValue(item) !== currentPlaylistId
      ),
    [currentPlaylistId, existingPlaylists]
  );
  const isUserOwnedPlaylist = useMemo(() => {
    if (typeof playlist?.isOwner === "boolean") {
      return playlist.isOwner;
    }

    const currentUserId = String(user?.id || user?.userId || user?._id || "");
    const playlistOwnerId = String(
      playlist?.userId ||
      playlist?.ownerId ||
      playlist?.owner?.id ||
      playlist?.owner?._id ||
      ""
    );

    if (currentUserId && playlistOwnerId) {
      return currentUserId === playlistOwnerId;
    }

    const currentUserEmail =
      typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
    const playlistOwnerEmail =
      typeof playlist?.owner?.email === "string"
        ? playlist.owner.email.trim().toLowerCase()
        : "";

    if (currentUserEmail && playlistOwnerEmail) {
      return currentUserEmail === playlistOwnerEmail;
    }

    return true;
  }, [
    playlist?.isOwner,
    playlist?.userId,
    playlist?.ownerId,
    playlist?.owner?.id,
    playlist?.owner?._id,
    playlist?.owner?.email,
    user?.id,
    user?.userId,
    user?._id,
    user?.email,
  ]);

  const collectionMeta = useMemo(
    () => ({
      id: playlist?.playlistId || playlist?.id,
      type: "playlist",
      title: playlistTitle,
      image: playlistCoverImage,
      artistName: playlistOwnerLabel,
    }),
    [
      playlist?.playlistId,
      playlist?.id,
      playlistTitle,
      playlistCoverImage,
      playlistOwnerLabel,
    ]
  );
  const isPlaylistShuffleActive =
    isShuffleEnabled &&
    activeCollection?.type === "playlist" &&
    String(activeCollection?.id || "") ===
    String(collectionMeta.id || "");

  const handlePlayPlaylist = async () => {
    if (!playlist) {
      return;
    }

    await playPlaylist(
      {
        ...playlist,
        id: playlist?.playlistId || playlist?.id,
        title: playlistTitle,
        owner: {
          ...(playlist?.owner || {}),
          name: playlistOwnerLabel,
        },
      },
      trackItems
    );
  };

  const handleShufflePlaylist = async () => {
    if (!playlist) {
      return;
    }

    await playPlaylist(
      {
        ...playlist,
        id: playlist?.playlistId || playlist?.id,
        title: playlistTitle,
        owner: {
          ...(playlist?.owner || {}),
          name: playlistOwnerLabel,
        },
      },
      trackItems,
      { shuffle: true }
    );
  };

  const handlePlayTrack = async (track, index) => {
    if (!track || isBlockedTrack(track)) {
      return;
    }

    const trackId = getTrackId(track);

    if (currentTrack?.id && currentTrack.id === trackId) {
      await togglePlayPause();
      return;
    }

    await playTrack(track, {
      queue: trackItems,
      startIndex: index,
      collection: collectionMeta,
    });
  };

  const mergePlaylistSummary = (sourcePlaylist, updatedPlaylist) => {
    if (!updatedPlaylist) {
      return sourcePlaylist;
    }

    return {
      ...sourcePlaylist,
      ...updatedPlaylist,
      totalTracks:
        updatedPlaylist?.trackCount ??
        updatedPlaylist?.totalTracks ??
        sourcePlaylist?.totalTracks ??
        sourcePlaylist?.trackCount ??
        getPlaylistTrackCount(sourcePlaylist),
      trackCount:
        updatedPlaylist?.trackCount ??
        updatedPlaylist?.totalTracks ??
        sourcePlaylist?.trackCount ??
        sourcePlaylist?.totalTracks ??
        getPlaylistTrackCount(sourcePlaylist),
      totalDuration:
        updatedPlaylist?.totalDuration ?? sourcePlaylist?.totalDuration ?? 0,
    };
  };

  const updatePlaylistSummaryInList = (playlistId, updatedPlaylist) => {
    if (!playlistId) {
      return;
    }

    setExistingPlaylists((current) =>
      current.map((item) =>
        getPlaylistIdValue(item) === playlistId
          ? mergePlaylistSummary(item, updatedPlaylist)
          : item
      )
    );
  };

  const handleTrackAddedToPlaylist = (updatedPlaylist, targetPlaylist, track) => {
    const targetPlaylistId = getPlaylistIdValue(targetPlaylist);

    if (!targetPlaylistId || !track || isBlockedTrack(track)) {
      return;
    }

    updatePlaylistSummaryInList(targetPlaylistId, updatedPlaylist);
    setTrackActionFeedback({
      tone: "success",
      message: `Đã thêm "${track?.title || track?.name || "bài hát"}" vào ${getPlaylistTitle(
        targetPlaylist
      )}.`,
      image: getTrackImage(track, playlistCoverImage),
    });
  };

  const handleTrackQueueChanged = (track, isQueued) => {
    if (!track || isBlockedTrack(track)) {
      return;
    }

    setTrackActionFeedback({
      tone: "success",
      message: isQueued
        ? `Đã thêm "${track?.title || track?.name || "bài hát"}" vào danh sách chờ.`
        : `Đã xóa "${track?.title || track?.name || "bài hát"}" khỏi danh sách chờ.`,
      image: getTrackImage(track, playlistCoverImage),
    });
  };

  const handleOpenRemoveTrackModal = (track) => {
    const trackId = getTrackId(track);

    if (!trackId || isBlockedTrack(track)) {
      return;
    }

    setRemoveTrackErrorMessage("");
    setPendingTrackRemoval({
      id: trackId,
      title: track?.title || track?.name || "bài hát này",
    });
  };

  const handleRemoveTrackFromCurrentPlaylist = async () => {
    if (!currentPlaylistId || !pendingTrackRemoval?.id || isRemovingTrack) {
      return;
    }

    setIsRemovingTrack(true);
    setRemoveTrackErrorMessage("");

    try {
      const updatedPlaylist = await removeTrackFromUserPlaylist(
        currentPlaylistId,
        pendingTrackRemoval.id
      );

      setPlaylist((current) => {
        if (!current) {
          return current;
        }

        const nextTracks = normalizeTrackItems(current)
          .filter((item) => getTrackId(getTrackEntity(item)) !== pendingTrackRemoval.id)
          .map((item, index) => ({
            ...item,
            order: index + 1,
          }));

        return {
          ...current,
          trackCount: updatedPlaylist?.trackCount ?? nextTracks.length,
          totalDuration:
            updatedPlaylist?.totalDuration ?? getTotalDurationSeconds(nextTracks),
          tracks: nextTracks,
        };
      });

      updatePlaylistSummaryInList(currentPlaylistId, updatedPlaylist);
      setTrackActionFeedback({
        tone: "success",
        message: `Đã xóa "${pendingTrackRemoval.title}" khỏi ${playlistTitle}.`,
        image: "",
      });
      setPendingTrackRemoval(null);
    } catch (error) {
      setRemoveTrackErrorMessage(
        getApiErrorMessage(error, "Không thể xóa bài hát khỏi playlist hiện tại.")
      );
    } finally {
      setIsRemovingTrack(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!playlist || isLoading) {
      return;
    }

    setIsActionMenuOpen(false);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = () => {
    if (!playlist || isLoading) {
      return;
    }

    setDeleteErrorMessage("");
    setIsActionMenuOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleDeletePlaylist = async () => {
    const playlistId = playlist?.playlistId || playlist?.id;

    if (!playlistId || isDeletingPlaylist) {
      return;
    }

    setIsDeletingPlaylist(true);
    setDeleteErrorMessage("");

    try {
      await deleteUserPlaylist(playlistId);
      setIsDeleteModalOpen(false);
      navigate(routePaths.userPlaylist, { replace: true });
    } catch (error) {
      setDeleteErrorMessage(
        getApiErrorMessage(error, "Không thể xóa playlist lúc này.")
      );
    } finally {
      setIsDeletingPlaylist(false);
    }
  };

  const handlePlaylistUpdated = (updatedPlaylist) => {
    if (!updatedPlaylist) {
      return;
    }

    setPlaylist((current) => {
      if (!current) {
        return updatedPlaylist;
      }

      return {
        ...current,
        ...updatedPlaylist,
      };
    });

    setExistingPlaylists((current) =>
      current.map((item) => {
        const itemId = item?.playlistId || item?.id;
        const updatedId = updatedPlaylist?.playlistId || updatedPlaylist?.id;

        if (itemId && updatedId && itemId === updatedId) {
          return {
            ...item,
            ...updatedPlaylist,
          };
        }

        return item;
      })
    );
  };

  const metaItems = [
    playlistOwnerLabel,
    createdDate,
    totalTracks > 0 ? `${totalTracks} tracks` : "",
    totalDuration,
  ].filter(Boolean);

  if (isLoading) {
    return (
      <LoadingState
        message="Loading playlist detail..."
        className="min-h-[60vh]"
        spinnerClassName="h-8 w-8"
      />
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <div
        className="
          overflow-hidden rounded-[14px] border border-black/5 bg-white/80
          shadow-[0_24px_60px_rgba(15,23,42,0.08)]
          dark:border-white/10 dark:bg-[#121212] dark:shadow-[0_24px_60px_rgba(0,0,0,0.36)]
        "
      >
        <div
          className="px-4 pb-5 pt-6 transition-[background-image] duration-500 sm:px-8 sm:pb-8 sm:pt-10"
          style={{ backgroundImage: headerGradient }}
        >
          {isLoading ? (
            <LoadingState message="Loading playlist detail..." className="min-h-[20rem]" />
          ) : errorMessage ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="max-w-xl text-sm text-white/88">{errorMessage}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-end md:text-left">
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="group relative overflow-hidden rounded-[16px] focus:outline-none"
                aria-label="Edit playlist image"
              >
                {playlistCoverImage ? (
                  <img
                    src={playlistCoverImage}
                    alt={playlistTitle || "Playlist cover"}
                    className="
                      h-32 w-32 rounded-[16px] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.28)]
                      transition duration-300 group-hover:brightness-75
                      min-[420px]:h-36 min-[420px]:w-36
                      sm:h-56 sm:w-56
                    "
                  />
                ) : (
                  <div
                    className="
                      flex h-32 w-32 items-center justify-center rounded-[16px] bg-white/12
                      text-sm font-medium text-white/72 shadow-[0_24px_60px_rgba(0,0,0,0.18)]
                      backdrop-blur transition duration-300 group-hover:bg-white/20
                      min-[420px]:h-36 min-[420px]:w-36 sm:h-56 sm:w-56
                    "
                  >
                    No cover image
                  </div>
                )}

                <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[16px] bg-black/0 text-sm font-semibold text-white opacity-0 transition duration-300 group-hover:bg-black/30 group-hover:opacity-100">
                  Edit details
                </span>
              </button>

              <div className="min-w-0 max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">
                  User playlist
                </p>
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="mt-2 text-left text-2xl font-semibold tracking-tight text-white transition hover:text-white/80 sm:mt-3 sm:text-5xl lg:text-6xl"
                >
                  {playlistTitle}
                </button>
                {playlistDescription ? (
                  <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-6 text-white/88 sm:mt-4 sm:line-clamp-none sm:text-base">
                    {playlistDescription}
                  </p>
                ) : null}
                {metaItems.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    {metaItems.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className={[
                          metaPillClassName,
                          index === 0 ? "font-medium text-white" : "",
                        ].join(" ")}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 px-0 pb-4 pt-4 sm:space-y-5 sm:px-8 sm:pb-8 sm:pt-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PlayButton onClick={handlePlayPlaylist} size="compact" />

            <button
              type="button"
              onClick={handleShufflePlaylist}
              className={[
                shufflePlayButtonClassName,
                isPlaylistShuffleActive
                  ? "border-[#f5b66f]/70 bg-[#f5b66f] text-[#111111] hover:bg-[#f8c27f]"
                  : "",
              ].join(" ")}
              aria-label="Shuffle playlist"
            >
              <Shuffle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              <span>Shuffle Play</span>
            </button>
            <div ref={actionMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsActionMenuOpen((current) => !current)}
                className="inline-flex h-10 items-center justify-center rounded-full px-2 text-white/76 transition hover:text-white sm:h-11"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={isActionMenuOpen}
              >
                <MoreHorizontal className="h-6 w-6 sm:h-7 sm:w-7" />
              </button>

              {isActionMenuOpen ? (
                <div
                  className="
                    absolute left-0 top-full z-20 mt-2 min-w-[230px] overflow-hidden rounded-2xl
                    border border-white/10 bg-[#2f2f2f] py-2 shadow-[0_20px_45px_rgba(0,0,0,0.4)]
                  "
                  role="menu"
                  aria-label="Playlist actions"
                >
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-base font-medium text-white transition hover:bg-white/8"
                    role="menuitem"
                  >
                    <Pencil className="h-4.5 w-4.5 text-white/82" />
                    Sửa thông tin chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDeleteModal}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-base font-medium text-white transition hover:bg-white/8"
                    role="menuitem"
                  >
                    <CircleMinus className="h-4.5 w-4.5 text-white/82" />
                    Xóa
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <TrackListSection
            type="withoutLike"
            isLoading={isLoading}
            errorMessage={errorMessage}
            loadingMessage="Loading tracks..."
            mobileLabel="Track list"
            headerColumns={trackListHeaderColumns}
            emptyMessage="No tracks available for this playlist yet."
            hasItems={trackItems.length > 0}
          >
            {trackItems.map((trackItem, index) => {
              const track = getTrackEntity(trackItem);
              const trackId = getTrackId(track);
              const isTrackBlocked = isBlockedTrack(trackItem);

              return (
                <TrackCard
                  key={trackId || `${trackItem?.trackId || "track"}-${index}`}
                  index={trackItem?.order || index + 1}
                  track={track}
                  image={getTrackImage(track)}
                  title={track?.title || track?.name || ""}
                  artist={getTrackArtistName(track, playlistOwnerLabel)}
                  artistId={getTrackArtistId(track)}
                  duration={formatTrackDuration(track?.duration)}
                  explicit={false}
                  liked={false}
                  isBlocked={isTrackBlocked}
                  href={trackId ? routePaths.trackDetail(trackId) : undefined}
                  isPlaybackActive={currentTrack?.id === trackId}
                  isPlaying={isPlaying}
                  onPlaybackAction={() => handlePlayTrack(track, index)}
                  mobileLayoutClassName="grid-cols-[2rem_minmax(0,1fr)]"
                  desktopLayoutClassName="sm:grid-cols-[2.5rem_minmax(0,1fr)_3.25rem_2.75rem]"
                  desktopMetaColumns={[
                    {
                      content: formatTrackDuration(track?.duration),
                    },
                    {
                      content: isTrackBlocked ? null : (
                        <TrackTwoLevelMenu
                          trackId={trackId}
                          track={track}
                          playlists={availableTargetPlaylists}
                          onTrackAdded={(updatedPlaylist, targetPlaylist) =>
                            handleTrackAddedToPlaylist(updatedPlaylist, targetPlaylist, track)
                          }
                          onQueueChanged={handleTrackQueueChanged}
                          isUserOwnedPlaylist={isUserOwnedPlaylist}
                          onRemoveFromCurrentPlaylist={() =>
                            handleOpenRemoveTrackModal(track)
                          }
                          isRemovingFromCurrentPlaylist={isRemovingTrack}
                        />
                      ),
                      className: "flex items-center justify-end",
                    },
                  ]}
                />
              );
            })}
          </TrackListSection>
        </div>
      </div>

      <EditPlaylistModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={handlePlaylistUpdated}
        playlist={playlist}
        existingPlaylists={existingPlaylists}
      />

      <DeletePlaylistConfirmModal
        isOpen={isDeleteModalOpen}
        playlistTitle={playlistTitle}
        isDeleting={isDeletingPlaylist}
        errorMessage={deleteErrorMessage}
        onClose={() => {
          if (!isDeletingPlaylist) {
            setDeleteErrorMessage("");
            setIsDeleteModalOpen(false);
          }
        }}
        onConfirm={handleDeletePlaylist}
      />

      <DeletePlaylistConfirmModal
        isOpen={Boolean(pendingTrackRemoval)}
        playlistTitle={pendingTrackRemoval?.title || ""}
        title="Xóa khỏi playlist?"
        message={
          pendingTrackRemoval
            ? `Thao tác này sẽ xóa ${pendingTrackRemoval.title} khỏi ${playlistTitle}.`
            : ""
        }
        isDeleting={isRemovingTrack}
        errorMessage={removeTrackErrorMessage}
        onClose={() => {
          if (!isRemovingTrack) {
            setRemoveTrackErrorMessage("");
            setPendingTrackRemoval(null);
          }
        }}
        onConfirm={handleRemoveTrackFromCurrentPlaylist}
      />


      {trackActionFeedback?.message ? (
        trackActionFeedback.tone === "success" ? (
          <div className="pointer-events-none fixed left-1/2 top-5 z-[70] w-[min(calc(100vw-2rem),26rem)] -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[#111111] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              {trackActionFeedback.image ? (
                <img
                  src={trackActionFeedback.image}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-[10px] object-cover"
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-[10px] bg-[#e5e7eb]" />
              )}
              <p className="truncate text-[1.05rem] font-medium text-[#111111]">
                {trackActionFeedback.message}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fecaca]">
            {trackActionFeedback.message}
          </div>
        )
      ) : null}
    </section>
  );
};

export default UserPlaylistDetailPage;

