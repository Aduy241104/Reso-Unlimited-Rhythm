import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMinus,
  CirclePlus,
  Download,
  MoreHorizontal,
  Pencil,
  Shuffle,
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
  deleteUserPlaylist,
  getUserPlaylistDetail,
  getUserPlaylists,
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
  const actionMenuRef = useRef(null);
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
            emptyMessage="No tracks available for this playlist yet."
            hasItems={ trackItems.length > 0 }
          >
            { trackItems.map((trackItem, index) => {
              const track = getTrackEntity(trackItem);
              const trackId = getTrackId(track);

              return (
                <TrackCard
                  key={ trackId || `${trackItem?.trackId || "track"}-${index}` }
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
    </section>
  );
};

export default UserPlaylistDetailPage;
