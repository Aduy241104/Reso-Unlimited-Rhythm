import { CirclePlus, Download, Loader2, MoreHorizontal, Play, Plus, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TrackDetailArtistCard from "../../components/trackDetail/TrackDetailArtistCard";
import TrackDetailHero from "../../components/trackDetail/TrackDetailHero";
import TrackDetailLikeSection from "../../components/trackDetail/TrackDetailLikeSection";
import TrackDetailLyrics from "../../components/trackDetail/TrackDetailLyrics";
import CreatePlaylistModal from "../../components/userPlaylist/CreatePlaylistModal";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { getTrackDetailService } from "../../services/trackService";
import {
  addTrackToUserPlaylist,
  getUserPlaylists,
} from "../../services/userPlaylistService";
import {
  createPlaceholderImage,
  formatReleaseYear,
  formatTrackDuration,
} from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";

const secondaryActionClassName = `
  inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-black/8 bg-white/80 px-4
  text-sm font-medium text-[#18181b] transition hover:bg-white sm:w-auto
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]
`;

const iconActionClassName = `
  inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8
  bg-white/80 text-[#18181b] transition hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]
`;

const formatListenCount = (value) => {
  const listenCount = Number(value);

  if (!Number.isFinite(listenCount) || listenCount <= 0) {
    return "Ch\u01b0a c\u00f3 l\u01b0\u1ee3t nghe";
  }

  if (listenCount >= 1000000) {
    return `${(listenCount / 1000000).toFixed(listenCount >= 10000000 ? 0 : 1)}M l\u01b0\u1ee3t nghe`;
  }

  if (listenCount >= 1000) {
    return `${(listenCount / 1000).toFixed(listenCount >= 100000 ? 0 : 1)}K l\u01b0\u1ee3t nghe`;
  }

  return `${new Intl.NumberFormat("vi-VN").format(listenCount)} l\u01b0\u1ee3t nghe`;
};

const normalizePlaylists = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.playlists)) {
    return payload.playlists;
  }

  return [];
};

const getPlaylistId = (playlist) => playlist?.playlistId || playlist?.id || "";

const getPlaylistTitle = (playlist) => {
  if (typeof playlist?.title === "string" && playlist.title.trim()) {
    return playlist.title.trim();
  }

  if (typeof playlist?.name === "string" && playlist.name.trim()) {
    return playlist.name.trim();
  }

  return "Danh sách phát chưa đặt tên";
};

const TrackDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [playlists, setPlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [hasLoadedPlaylists, setHasLoadedPlaylists] = useState(false);
  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [playlistSearchValue, setPlaylistSearchValue] = useState("");
  const [playlistMenuError, setPlaylistMenuError] = useState("");
  const [playlistFeedback, setPlaylistFeedback] = useState(null);
  const [submittingPlaylistId, setSubmittingPlaylistId] = useState("");
  const moreMenuRef = useRef(null);
  const { playTrack } = usePlayer();

  useEffect(() => {
    let isMounted = true;

    const loadTrackDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const trackDetail = await getTrackDetailService(id);

        if (!isMounted) {
          return;
        }

        setTrack(trackDetail);
        setIsLiked(false);
        setLikeCount(Number(trackDetail?.stats?.totalLike) || 0);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTrack(null);
        setIsLiked(false);
        setLikeCount(0);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load track detail from the backend right now."
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

    loadTrackDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!isPlaylistMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!moreMenuRef.current?.contains(event.target)) {
        setIsPlaylistMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsPlaylistMenuOpen(false);
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
  }, [isPlaylistMenuOpen]);

  const trackImage = useMemo(
    () =>
      track?.coverImage ||
      track?.avatar ||
      track?.album?.coverImage ||
      track?.artist?.coverImage ||
      track?.artist?.avatar ||
      createPlaceholderImage(track?.title || "Track", "#1db954", "#07170c"),
    [track]
  );
  const artistAvatar = useMemo(
    () =>
      track?.artist?.avatar ||
      createPlaceholderImage(track?.artist?.name || "Artist", "#334155", "#0f172a"),
    [track]
  );
  const artistName = track?.artist?.name || "Unknown artist";
  const albumTitle = track?.album?.title || "Unknown album";
  const releaseYear = formatReleaseYear(track?.releaseDate);
  const duration = formatTrackDuration(track?.duration);
  const listensLabel = formatListenCount(track?.stats?.playCount);
  const lyrics = track?.lyrics?.static?.trim?.() || "";
  const artistRole = track?.artist?.role || "Ngh\u1ec7 s\u0129";
  const albumHref = track?.album?.id ? routePaths.albumDetail(track.album.id) : undefined;

  const playbackQueue = useMemo(() => {
    if (Array.isArray(track?.album?.tracks) && track.album.tracks.length > 0) {
      return track.album.tracks;
    }

    return track ? [track] : [];
  }, [track]);

  const startIndex = useMemo(() => {
    if (!track?.id || !Array.isArray(playbackQueue) || playbackQueue.length === 0) {
      return 0;
    }

    const matchedIndex = playbackQueue.findIndex((item) => {
      const candidate = item?.track ?? item;
      return candidate?.id === track.id;
    });

    return matchedIndex >= 0 ? matchedIndex : 0;
  }, [playbackQueue, track]);

  const filteredPlaylists = useMemo(() => {
    const normalizedQuery = playlistSearchValue.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return playlists;
    }

    return playlists.filter((playlist) =>
      getPlaylistTitle(playlist).toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [playlistSearchValue, playlists]);

  const loadUserPlaylistOptions = async () => {
    setIsLoadingPlaylists(true);
    setPlaylistMenuError("");

    try {
      const payload = await getUserPlaylists();
      setPlaylists(normalizePlaylists(payload));
      setHasLoadedPlaylists(true);
    } catch (error) {
      setPlaylists([]);
      setPlaylistMenuError(
        getApiErrorMessage(error, "Không thể tải danh sách phát lúc này.")
      );
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handlePlay = async () => {
    if (!track) {
      return;
    }

    await playTrack(track, {
      queue: playbackQueue,
      startIndex,
      collection: {
        id: track?.album?.id || track?.id,
        type: track?.album?.id ? "album" : "track",
        title: track?.album?.title || track?.title || "Track",
        image: trackImage,
        artistName,
        listenSource: "track_detail",
      },
    });
  };

  const handleAddToLibrary = () => {
    console.log("Add track to library:", track?.title);
  };

  const handleDownload = () => {
    console.log("Download track:", track?.title);
  };

  const handleReportTrack = () => {
    if (!track?.id) {
      return;
    }

    navigate(
      `${routePaths.userCreateReport}?targetId=${encodeURIComponent(track.id)}&targetType=track`
    );
  };

  const handleTogglePlaylistMenu = () => {
    setPlaylistFeedback(null);
    setPlaylistMenuError("");
    setIsPlaylistMenuOpen((current) => {
      const nextValue = !current;

      if (nextValue && !hasLoadedPlaylists && !isLoadingPlaylists) {
        void loadUserPlaylistOptions();
      }

      return nextValue;
    });
  };

  const handleAddTrackToPlaylist = async (playlist) => {
    const playlistId = getPlaylistId(playlist);
    const trackId = track?.id;

    if (!playlistId || !trackId || submittingPlaylistId) {
      return;
    }

    setSubmittingPlaylistId(playlistId);
    setPlaylistMenuError("");
    setPlaylistFeedback(null);

    try {
      const updatedPlaylist = await addTrackToUserPlaylist(playlistId, trackId);
      const resolvedPlaylist = updatedPlaylist || playlist;
      const resolvedPlaylistId = getPlaylistId(resolvedPlaylist);

      setPlaylists((current) =>
        current.map((item) =>
          getPlaylistId(item) === resolvedPlaylistId
            ? {
                ...item,
                ...resolvedPlaylist,
              }
            : item
        )
      );
      setPlaylistFeedback({
        tone: "success",
        message: `Đã thêm vào ${getPlaylistTitle(resolvedPlaylist)}.`,
      });
      setIsPlaylistMenuOpen(false);
      setPlaylistSearchValue("");
    } catch (error) {
      setPlaylistMenuError(
        getApiErrorMessage(error, "Không thể thêm bài hát vào danh sách phát.")
      );
    } finally {
      setSubmittingPlaylistId("");
    }
  };

  const handlePlaylistCreated = async (createdPlaylist) => {
    if (!createdPlaylist) {
      return;
    }

    setPlaylists((current) => [createdPlaylist, ...current]);
    setHasLoadedPlaylists(true);
    setPlaylistSearchValue("");
    setPlaylistFeedback(null);

    if (!track?.id) {
      return;
    }

    const createdPlaylistId = getPlaylistId(createdPlaylist);

    if (!createdPlaylistId) {
      return;
    }

    setSubmittingPlaylistId(createdPlaylistId);

    try {
      const updatedPlaylist = await addTrackToUserPlaylist(createdPlaylistId, track.id);
      const resolvedPlaylist = updatedPlaylist || createdPlaylist;
      const resolvedPlaylistId = getPlaylistId(resolvedPlaylist);

      setPlaylists((current) =>
        current.map((item) =>
          getPlaylistId(item) === resolvedPlaylistId
            ? {
                ...item,
                ...resolvedPlaylist,
              }
            : item
        )
      );
      setPlaylistFeedback({
        tone: "success",
        message: `Đã tạo playlist và thêm vào ${getPlaylistTitle(resolvedPlaylist)}.`,
      });
    } catch (error) {
      setPlaylistFeedback({
        tone: "error",
        message: getApiErrorMessage(
          error,
          "Đã tạo playlist nhưng chưa thể thêm bài hát vào đó."
        ),
      });
    } finally {
      setSubmittingPlaylistId("");
    }
  };

  const handleToggleLike = () => {
    setIsLiked((currentValue) => {
      const nextValue = !currentValue;

      setLikeCount((currentCount) =>
        nextValue ? currentCount + 1 : Math.max(currentCount - 1, 0)
      );

      return nextValue;
    });
  };

  if (isLoading) {
    return (
      <section className="rounded-[10px]">
        <div className="rounded-[24px] bg-[#121212] px-6 py-20 text-sm text-white/82">
          Loading track detail...
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-[10px]">
        <div className="rounded-[24px] bg-[#121212] px-6 py-20 text-sm text-white/88">
          { errorMessage }
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[10px]">
      <div className="space-y-5 sm:space-y-6">
        <TrackDetailHero
          image={ trackImage }
          title={ track?.title || "Untitled track" }
          artistName={ artistName }
          artistAvatar={ artistAvatar }
          albumTitle={ albumTitle }
          albumHref={ albumHref }
          releaseYear={ releaseYear }
          duration={ duration }
          listensLabel={ listensLabel }
        />

        <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
          <button
            type="button"
            onClick={ handlePlay }
            aria-label="Play track"
            className="
              inline-flex h-14 w-14 items-center justify-center self-start rounded-full bg-gradient-to-br from-[#ff8a3d] via-[#ff4fd8] to-[#7b61ff]
              text-black shadow-[0_18px_38px_rgba(30,215,96,0.28)] transition
              hover:scale-[1.03] hover:brightness-105
            "
          >
            <Play className="h-6 w-6 fill-current" />
          </button>

          <button type="button" onClick={ handleAddToLibrary } className={ secondaryActionClassName }>
            <CirclePlus className="h-4.5 w-4.5" />
            Add to Library
          </button>

          <button type="button" onClick={ handleDownload } className={ secondaryActionClassName }>
            <Download className="h-4.5 w-4.5" />
            Download
          </button>

          <button type="button" onClick={ handleReportTrack } className={ secondaryActionClassName }>
            <ShieldAlert className="h-4.5 w-4.5" />
            Report
          </button>

          <div ref={ moreMenuRef } className="relative self-start">
            <button
              type="button"
              onClick={ handleTogglePlaylistMenu }
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={ isPlaylistMenuOpen }
              className={ iconActionClassName }
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

            { isPlaylistMenuOpen ? (
              <div
                className="
                  absolute right-0 top-full z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[22px]
                  border border-white/10 bg-[#2c2c2c] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.48)]
                "
                role="menu"
                aria-label="Thêm vào danh sách phát"
              >
                <label className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-3 text-white/72">
                  <Search className="h-4.5 w-4.5 shrink-0" />
                  <input
                    type="text"
                    value={ playlistSearchValue }
                    onChange={ (event) => setPlaylistSearchValue(event.target.value) }
                    placeholder="Tìm một danh sách phát"
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={ () => {
                    setIsPlaylistMenuOpen(false);
                    setIsCreatePlaylistModalOpen(true);
                  } }
                  className="mt-3 flex w-full items-center gap-3 border-b border-white/10 px-3 py-3 text-left text-base font-semibold text-white transition hover:bg-white/8"
                  role="menuitem"
                >
                  <Plus className="h-5 w-5 shrink-0 text-white/78" />
                  Danh sách phát mới
                </button>

                { playlistMenuError ? (
                  <div className="mt-3 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fecaca]">
                    { playlistMenuError }
                  </div>
                ) : null }

                <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
                  { isLoadingPlaylists ? (
                    <div className="flex items-center gap-2 px-3 py-4 text-sm text-white/72">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải danh sách phát...
                    </div>
                  ) : filteredPlaylists.length > 0 ? (
                    filteredPlaylists.map((playlist) => {
                      const playlistId = getPlaylistId(playlist);
                      const isSubmitting = submittingPlaylistId === playlistId;

                      return (
                        <button
                          key={ playlistId || getPlaylistTitle(playlist) }
                          type="button"
                          onClick={ () => handleAddTrackToPlaylist(playlist) }
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-base font-semibold text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
                          role="menuitem"
                          disabled={ isSubmitting || Boolean(submittingPlaylistId) }
                        >
                          <span className="truncate">{ getPlaylistTitle(playlist) }</span>
                          { isSubmitting ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/72" />
                          ) : null }
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-4 text-sm text-white/64">
                      Không tìm thấy danh sách phát phù hợp.
                    </div>
                  ) }
                </div>
              </div>
            ) : null }
          </div>
        </section>

        { playlistFeedback?.message ? (
          <div
            className={[
              "rounded-2xl px-4 py-3 text-sm",
              playlistFeedback.tone === "error"
                ? "border border-[#ef4444]/20 bg-[#ef4444]/10 text-[#fecaca]"
                : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
            ].join(" ") }
          >
            { playlistFeedback.message }
          </div>
        ) : null }

        <TrackDetailLyrics lyrics={ lyrics } />

        <TrackDetailLikeSection
          title={ track?.title || "Untitled track" }
          artistName={ artistName }
          image={ trackImage }
          isLiked={ isLiked }
          likeCount={ likeCount }
          onToggleLike={ handleToggleLike }
        />
        
        <TrackDetailArtistCard
          avatar={ artistAvatar }
          name={ artistName }
          role={ artistRole }
        />

      </div>

      <CreatePlaylistModal
        isOpen={ isCreatePlaylistModalOpen }
        onClose={ () => setIsCreatePlaylistModalOpen(false) }
        existingPlaylists={ playlists }
        onCreated={ (createdPlaylist) => {
          setIsCreatePlaylistModalOpen(false);
          void handlePlaylistCreated(createdPlaylist);
        } }
      />
    </section>
  );
};

export default TrackDetailPage;
