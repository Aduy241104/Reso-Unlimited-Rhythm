import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMinus,
  CirclePlus,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shuffle,
  Trash2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DeletePlaylistConfirmModal from "../../components/userPlaylist/DeletePlaylistConfirmModal";
import EditPlaylistModal from "../../components/userPlaylist/EditPlaylistModal";
import PlayButton from "../../components/common/PlayButton";
import TrackCard from "../../components/TrackCard";
import TrackListSection from "../../components/trackList/TrackListSection";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import {
  addTrackToUserPlaylist,
  deleteUserPlaylist,
  getUserPlaylistDetail,
  getUserPlaylists,
  removeTrackFromUserPlaylist,
} from "../../services/userPlaylistService";
import { formatTrackDuration } from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  formatPlaylistDate,
  formatPlaylistDuration,
} from "../../utils/playlistDetail";

const actionButtonClassName = `
  inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8
  bg-white/70 text-[#18181b] transition hover:scale-[1.03] hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] sm:h-11 sm:w-11
`;

const metaPillClassName = `
  inline-flex items-center rounded-full border border-white/14 bg-white/10
  px-3 py-1.5 text-xs text-white/88 backdrop-blur-sm sm:text-sm
`;

const trackListHeaderGridClassName = `
  mb-2 hidden grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_3.25rem_2.75rem] items-center gap-3
  border-b border-black/6 px-3 pb-3 text-xs font-medium uppercase tracking-[0.24em]
  text-[#71717a] dark:border-white/10 dark:text-[#a1a1aa] md:grid
`;

const trackListHeaderColumns = [
  { label: "#" },
  { label: "Title" },
  { label: "Saved", className: "text-center" },
  { label: "Time", className: "text-right" },
  { label: "" },
];

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

const getTrackImage = (track, playlistCoverImage) =>
  track?.coverImage ||
  track?.album?.coverImage ||
  track?.artist?.avatar ||
  playlistCoverImage ||
  "";

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
  const [playlist, setPlaylist] = useState(null);
  const [existingPlaylists, setExistingPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [openTrackMenuId, setOpenTrackMenuId] = useState("");
  const [trackMenuSearchValue, setTrackMenuSearchValue] = useState("");
  const [trackActionErrorMessage, setTrackActionErrorMessage] = useState("");
  const [trackActionFeedback, setTrackActionFeedback] = useState(null);
  const [submittingTrackActionId, setSubmittingTrackActionId] = useState("");
  const [pendingTrackRemoval, setPendingTrackRemoval] = useState(null);
  const [isRemovingTrack, setIsRemovingTrack] = useState(false);
  const [removeTrackErrorMessage, setRemoveTrackErrorMessage] = useState("");
  const actionMenuRef = useRef(null);
  const trackMenuRef = useRef(null);
  const {
    currentTrack,
    isPlaying,
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
    if (!openTrackMenuId) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!trackMenuRef.current?.contains(event.target)) {
        setOpenTrackMenuId("");
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenTrackMenuId("");
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
  }, [openTrackMenuId]);

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
  const filteredTargetPlaylists = useMemo(() => {
    const normalizedQuery = trackMenuSearchValue.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return availableTargetPlaylists;
    }

    return availableTargetPlaylists.filter((item) =>
      getPlaylistTitle(item).toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [availableTargetPlaylists, trackMenuSearchValue]);

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

  const handlePlayTrack = async (track, index) => {
    if (!track) {
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

  const handleLikeTrack = (track) => {
    console.log("Toggle like track:", track?.title || track?.name);
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

  const handleToggleTrackMenu = (trackId) => {
    setTrackActionErrorMessage("");
    setTrackActionFeedback(null);
    setTrackMenuSearchValue("");
    setOpenTrackMenuId((current) => (current === trackId ? "" : trackId));
  };

  const handleAddTrackToAnotherPlaylist = async (targetPlaylist, track) => {
    const targetPlaylistId = getPlaylistIdValue(targetPlaylist);
    const trackId = getTrackId(track);

    if (!targetPlaylistId || !trackId || submittingTrackActionId) {
      return;
    }

    setSubmittingTrackActionId(`${trackId}:${targetPlaylistId}`);
    setTrackActionErrorMessage("");
    setTrackActionFeedback(null);

    try {
      const updatedPlaylist = await addTrackToUserPlaylist(targetPlaylistId, trackId);
      updatePlaylistSummaryInList(targetPlaylistId, updatedPlaylist);
      setOpenTrackMenuId("");
      setTrackMenuSearchValue("");
      setTrackActionFeedback({
        tone: "success",
        message: `Đã thêm "${track?.title || track?.name || "bài hát"}" vào ${getPlaylistTitle(
          targetPlaylist
        )}.`,
        image: getTrackImage(track, playlistCoverImage),
      });
    } catch (error) {
      setTrackActionErrorMessage(
        getApiErrorMessage(error, "Không thể thêm bài hát vào playlist khác.")
      );
    } finally {
      setSubmittingTrackActionId("");
    }
  };

  const handleOpenRemoveTrackModal = (track) => {
    const trackId = getTrackId(track);

    if (!trackId) {
      return;
    }

    setOpenTrackMenuId("");
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
          className="
            bg-gradient-to-b from-[#0f766e] via-[#134e4a] to-transparent
            px-4 pb-5 pt-6 dark:from-[#14b8a6] dark:via-[#115e59] dark:to-[#121212]
            sm:px-8 sm:pb-8 sm:pt-10
          "
        >
          { isLoading ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="text-sm text-white/82">Loading playlist detail...</p>
            </div>
          ) : errorMessage ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="max-w-xl text-sm text-white/88">{ errorMessage }</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-end md:text-left">
              <button
                type="button"
                onClick={ handleOpenEditModal }
                className="group relative overflow-hidden rounded-[16px] focus:outline-none"
                aria-label="Edit playlist image"
              >
                { playlistCoverImage ? (
                  <img
                    src={ playlistCoverImage }
                    alt={ playlistTitle || "Playlist cover" }
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
                ) }

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
                  onClick={ handleOpenEditModal }
                  className="mt-2 text-left text-2xl font-semibold tracking-tight text-white transition hover:text-white/80 sm:mt-3 sm:text-5xl lg:text-6xl"
                >
                  { playlistTitle }
                </button>
                { playlistDescription ? (
                  <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-6 text-white/88 sm:mt-4 sm:line-clamp-none sm:text-base">
                    { playlistDescription }
                  </p>
                ) : null }
                { metaItems.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    { metaItems.map((item, index) => (
                      <div
                        key={ `${item}-${index}` }
                        className={ [
                          metaPillClassName,
                          index === 0 ? "font-medium text-white" : "",
                        ].join(" ") }
                      >
                        { item }
                      </div>
                    )) }
                  </div>
                ) : null }
              </div>
            </div>
          ) }
        </div>

        <div className="space-y-4 px-0 pb-4 pt-4 sm:space-y-5 sm:px-8 sm:pb-8 sm:pt-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PlayButton onClick={ handlePlayPlaylist } size="compact" />

            <button type="button" className={ actionButtonClassName } aria-label="Shuffle playlist">
              <Shuffle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Add playlist">
              <CirclePlus className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Download playlist">
              <Download className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <div ref={ actionMenuRef } className="relative">
              <button
                type="button"
                onClick={ () => setIsActionMenuOpen((current) => !current) }
                className="inline-flex h-10 items-center justify-center rounded-full px-2 text-white/76 transition hover:text-white sm:h-11"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={ isActionMenuOpen }
              >
                <MoreHorizontal className="h-6 w-6 sm:h-7 sm:w-7" />
              </button>

              { isActionMenuOpen ? (
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
                    onClick={ handleOpenEditModal }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-base font-medium text-white transition hover:bg-white/8"
                    role="menuitem"
                  >
                    <Pencil className="h-4.5 w-4.5 text-white/82" />
                    Sửa thông tin chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={ handleOpenDeleteModal }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-base font-medium text-white transition hover:bg-white/8"
                    role="menuitem"
                  >
                    <CircleMinus className="h-4.5 w-4.5 text-white/82" />
                    Xóa
                  </button>
                </div>
              ) : null }
            </div>
          </div>

          <TrackListSection
            isLoading={ isLoading }
            errorMessage={ errorMessage }
            loadingMessage="Loading tracks..."
            mobileLabel="Track list"
            headerColumns={ trackListHeaderColumns }
            headerGridClassName={ trackListHeaderGridClassName }
            emptyMessage="No tracks available for this playlist yet."
            hasItems={ trackItems.length > 0 }
          >
            { trackItems.map((trackItem, index) => {
              const track = getTrackEntity(trackItem);
              const trackId = getTrackId(track);
              const trackActionKey = trackId || `${trackItem?.trackId || "track"}-${index}`;
              const isTrackMenuOpen = openTrackMenuId === trackActionKey;

              return (
                <TrackCard
                  key={ trackActionKey }
                  index={ trackItem?.order || index + 1 }
                  image={ getTrackImage(track, playlistCoverImage) }
                  title={ track?.title || track?.name || "" }
                  artist={ getTrackArtistName(track, playlistOwnerLabel) }
                  artistId={ getTrackArtistId(track) }
                  duration={ formatTrackDuration(track?.duration) }
                  explicit={ false }
                  liked={ false }
                  href={ trackId ? routePaths.trackDetail(trackId) : undefined }
                  isPlaybackActive={ currentTrack?.id === trackId }
                  isPlaying={ isPlaying }
                  onPlaybackAction={ () => handlePlayTrack(track, index) }
                  onLike={ () => handleLikeTrack(track) }
                  mobileLayoutClassName="grid-cols-[2rem_minmax(0,1fr)_auto_auto]"
                  desktopLayoutClassName="sm:grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_3.25rem_2.75rem]"
                  desktopMetaColumns={ [
                    {
                      content: formatTrackDuration(track?.duration),
                    },
                    {
                      content: (
                        <div
                          ref={ isTrackMenuOpen ? trackMenuRef : null }
                          className="relative flex items-center justify-end"
                        >
                          <button
                            type="button"
                            onClick={ (event) => {
                              event.stopPropagation();
                              handleToggleTrackMenu(trackActionKey);
                            } }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#71717a] transition hover:bg-black/[0.06] hover:text-[#111111] dark:text-[#a1a1aa] dark:hover:bg-white/[0.08] dark:hover:text-white"
                            aria-label={ `Track options for ${track?.title || track?.name || "track"}` }
                            aria-haspopup="menu"
                            aria-expanded={ isTrackMenuOpen }
                          >
                            <MoreHorizontal className="h-4.5 w-4.5" />
                          </button>

                          { isTrackMenuOpen ? (
                            <div
                              className="
                                absolute bottom-full right-0 z-30 mb-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[20px]
                                border border-white/10 bg-[#2f2f2f] p-3 text-left shadow-[0_24px_60px_rgba(0,0,0,0.45)]
                              "
                              role="menu"
                              aria-label="Track actions"
                              onClick={ (event) => event.stopPropagation() }
                            >
                              <label className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-3 text-white/72">
                                <Search className="h-4.5 w-4.5 shrink-0" />
                                <input
                                  type="text"
                                  value={ trackMenuSearchValue }
                                  onChange={ (event) => setTrackMenuSearchValue(event.target.value) }
                                  placeholder="Tìm playlist khác"
                                  className="w-full bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
                                />
                              </label>

                              <div className="mt-3 space-y-1 border-b border-white/10 pb-3">
                                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
                                  Thêm vào playlist khác
                                </p>

                                { filteredTargetPlaylists.length > 0 ? (
                                  filteredTargetPlaylists.map((targetPlaylist) => {
                                    const targetPlaylistId = getPlaylistIdValue(targetPlaylist);
                                    const isSubmitting =
                                      submittingTrackActionId ===
                                      `${trackId}:${targetPlaylistId}`;

                                    return (
                                      <button
                                        key={ targetPlaylistId }
                                        type="button"
                                        onClick={ () =>
                                          handleAddTrackToAnotherPlaylist(targetPlaylist, track)
                                        }
                                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
                                        role="menuitem"
                                        disabled={ Boolean(submittingTrackActionId) }
                                      >
                                        <span className="truncate">
                                          { getPlaylistTitle(targetPlaylist) }
                                        </span>
                                        { isSubmitting ? (
                                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/72" />
                                        ) : (
                                          <Plus className="h-4 w-4 shrink-0 text-white/72" />
                                        ) }
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="px-3 py-3 text-sm text-white/55">
                                    Không có playlist khác phù hợp.
                                  </div>
                                ) }
                              </div>

                              <button
                                type="button"
                                onClick={ () => handleOpenRemoveTrackModal(track) }
                                className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-white transition hover:bg-white/8"
                                role="menuitem"
                              >
                                <Trash2 className="h-4.5 w-4.5 shrink-0 text-white/72" />
                                Xóa khỏi playlist hiện tại
                              </button>

                              { trackActionErrorMessage ? (
                                <div className="mt-3 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fecaca]">
                                  { trackActionErrorMessage }
                                </div>
                              ) : null }
                            </div>
                          ) : null }
                        </div>
                      ),
                      className: "flex items-center justify-end",
                    },
                  ] }
                />
              );
            }) }
          </TrackListSection>
        </div>
      </div>

      <EditPlaylistModal
        isOpen={ isEditModalOpen }
        onClose={ () => setIsEditModalOpen(false) }
        onUpdated={ handlePlaylistUpdated }
        playlist={ playlist }
        existingPlaylists={ existingPlaylists }
      />

      <DeletePlaylistConfirmModal
        isOpen={ isDeleteModalOpen }
        playlistTitle={ playlistTitle }
        isDeleting={ isDeletingPlaylist }
        errorMessage={ deleteErrorMessage }
        onClose={ () => {
          if (!isDeletingPlaylist) {
            setDeleteErrorMessage("");
            setIsDeleteModalOpen(false);
          }
        } }
        onConfirm={ handleDeletePlaylist }
      />

      <DeletePlaylistConfirmModal
        isOpen={ Boolean(pendingTrackRemoval) }
        playlistTitle={ pendingTrackRemoval?.title || "" }
        title="Xóa khỏi playlist?"
        message={
          pendingTrackRemoval
            ? `Thao tác này sẽ xóa ${pendingTrackRemoval.title} khỏi ${playlistTitle}.`
            : ""
        }
        isDeleting={ isRemovingTrack }
        errorMessage={ removeTrackErrorMessage }
        onClose={ () => {
          if (!isRemovingTrack) {
            setRemoveTrackErrorMessage("");
            setPendingTrackRemoval(null);
          }
        } }
        onConfirm={ handleRemoveTrackFromCurrentPlaylist }
      />

      { trackActionFeedback?.message ? (
        trackActionFeedback.tone === "success" ? (
          <div className="pointer-events-none fixed left-1/2 top-5 z-[70] w-[min(calc(100vw-2rem),26rem)] -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[#111111] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              { trackActionFeedback.image ? (
                <img
                  src={ trackActionFeedback.image }
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-[10px] object-cover"
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-[10px] bg-[#e5e7eb]" />
              ) }
              <p className="truncate text-[1.05rem] font-medium text-[#111111]">
                { trackActionFeedback.message }
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fecaca]">
            { trackActionFeedback.message }
          </div>
        )
      ) : null }
    </section>
  );
};

export default UserPlaylistDetailPage;
