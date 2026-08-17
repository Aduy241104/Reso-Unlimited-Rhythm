import { Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingState from "../../components/common/LoadingState";
import NotFoundPage from "../error/NotFoundPage";
import TrackTwoLevelMenu from "../../components/trackMenu/TrackTwoLevelMenu";
import CreateReportModal from "../../components/report/CreateReportModal";
import TrackDetailArtistCard from "../../components/trackDetail/TrackDetailArtistCard";
import TrackDetailHero from "../../components/trackDetail/TrackDetailHero";
import TrackDetailLikeSection from "../../components/trackDetail/TrackDetailLikeSection";
import TrackDetailLyrics from "../../components/trackDetail/TrackDetailLyrics";
import TrackInformationModal from "../../components/trackDetail/TrackInformationModal";
import { useAuth } from "../../hooks/useAuth";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { getTrackDetailService } from "../../services/trackService";
import {
  addTrackToFavorite,
  getTrackFavoriteStatus,
  removeTrackFromFavorite,
} from "../../services/userFavoriteService";
import {
  createPlaceholderImage,
  formatReleaseYear,
  formatTrackDuration,
} from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";
import { isResourceNotFoundError } from "../../utils/resourceError";
import { getTrackDisplayTitle } from "../../utils/trackTitle";

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

const getPlaylistTitle = (playlist) => {
  if (typeof playlist?.title === "string" && playlist.title.trim()) {
    return playlist.title.trim();
  }

  if (typeof playlist?.name === "string" && playlist.name.trim()) {
    return playlist.name.trim();
  }

  return "Danh s\u00e1ch ph\u00e1t ch\u01b0a \u0111\u1eb7t t\u00ean";
};

const getTrackArtistId = (track) => {
  const artistId =
    track?.artist?.id ||
    track?.artist?._id ||
    track?.artist?.artistId ||
    track?.artistId?.id ||
    track?.artistId?._id ||
    track?.artistId;

  return typeof artistId === "string" || typeof artistId === "number"
    ? String(artistId).trim()
    : "";
};

const TrackDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInformationModalOpen, setIsInformationModalOpen] = useState(false);
  const [playlistFeedback, setPlaylistFeedback] = useState(null);
  const { playTrack } = usePlayer();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const loadTrackDetail = async () => {
      setIsLoading(true);
      setIsNotFound(false);
      setErrorMessage("");
      setIsLikeLoading(false);

      try {
        const trackDetail = await getTrackDetailService(id);

        if (!isMounted) {
          return;
        }

        if (!trackDetail) {
          setTrack(null);
          setIsNotFound(true);
          return;
        }

        const baseLikeCount = Number(trackDetail?.stats?.totalLike) || 0;

        setTrack(trackDetail);
        setLikeCount(baseLikeCount);

        if (isAuthLoading || !isAuthenticated) {
          setIsLiked(false);
          return;
        }

        try {
          const favoriteStatus = await getTrackFavoriteStatus(id);

          if (!isMounted) {
            return;
          }

          const nextIsLiked = Boolean(favoriteStatus?.isFavorite);
          const detailHasFavoriteState = Boolean(trackDetail?.isFavorite);

          setIsLiked(nextIsLiked);
          setLikeCount(
            nextIsLiked && !detailHasFavoriteState
              ? baseLikeCount + 1
              : baseLikeCount
          );
        } catch {
          if (!isMounted) {
            return;
          }

          setIsLiked(false);
          setLikeCount(baseLikeCount);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTrack(null);
        setIsLiked(false);
        setLikeCount(0);
        setIsLikeLoading(false);
        if (isResourceNotFoundError(error)) {
          setIsNotFound(true);
          return;
        }

        setErrorMessage(
          getApiErrorMessage(
            error,
            "Kh\u00f4ng th\u1ec3 t\u1ea3i chi ti\u1ebft b\u00e0i h\u00e1t l\u00fac n\u00e0y."
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
      setIsLiked(false);
      setLikeCount(0);
      setIsLikeLoading(false);
      setIsNotFound(true);
      setErrorMessage("");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    loadTrackDetail();

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated, isAuthLoading]);

  const trackImage = useMemo(
    () =>
      (Array.isArray(track?.avatar) ? track.avatar[0] : track?.avatar) ||
      createPlaceholderImage(track?.title || "B\u00e0i h\u00e1t", "#1db954", "#07170c"),
    [track]
  );
  const trackCoverImage = useMemo(
    () =>
      (Array.isArray(track?.coverImage)
        ? track.coverImage[0]
        : track?.coverImage) || "",
    [track]
  );
  const artistAvatar = useMemo(
    () =>
      track?.artist?.avatar ||
      createPlaceholderImage(track?.artist?.name || "Ngh\u1ec7 s\u0129", "#334155", "#0f172a"),
    [track]
  );
  const artistName = track?.artist?.name || "Ngh\u1ec7 s\u0129 kh\u00f4ng x\u00e1c \u0111\u1ecbnh";
  const albumTitle = track?.album?.title || "\u0110\u0129a \u0111\u01a1n";
  const releaseYear = formatReleaseYear(track?.releaseDate);
  const duration = formatTrackDuration(track?.duration);
  const listensLabel = formatListenCount(track?.stats?.totalPlay);
  const lyrics = track?.lyrics?.static?.trim?.() || "";
  const artistRole = track?.artist?.role || "Ngh\u1ec7 s\u0129";
  const artistId = getTrackArtistId(track);
  const artistHref = artistId
    ? routePaths.artistBrowseProfile(artistId)
    : undefined;
  const albumHref = track?.album?.id ? routePaths.albumDetail(track.album.id) : undefined;
  const trackId = track?.id;

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
        title:
          track?.album?.title || getTrackDisplayTitle(track, "B\u00e0i h\u00e1t"),
        image: trackImage,
        artistName,
        listenSource: "track_detail",
      },
    });
  };

  const handleReportTrack = () => {
    if (!track?.id) {
      return;
    }

    setIsReportModalOpen(true);
  };

  const handleAddTrackToPlaylist = (playlist) => {
    if (!playlist) {
      return;
    }

    setPlaylistFeedback({
      tone: "success",
      message: `\u0110\u00e3 th\u00eam v\u00e0o ${getPlaylistTitle(playlist)}.`,
    });
  };

  const handleToggleLike = async () => {
    if (!track?.id || isLikeLoading || isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const wasLiked = isLiked;

    setIsLikeLoading(true);

    try {
      if (wasLiked) {
        await removeTrackFromFavorite(track.id);
        setIsLiked(false);
        setLikeCount((currentCount) => Math.max(currentCount - 1, 0));
        return;
      }

      await addTrackToFavorite(track.id);
      setIsLiked(true);
      setLikeCount((currentCount) => currentCount + 1);
    } catch (error) {
      console.error("Failed to toggle track favorite:", error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-[10px]">
        <LoadingState
          message="Đang tải chi tiết bài hát..."
          className="min-h-[20rem] rounded-[24px] bg-[#121212] px-6 py-20"
        />
      </section>
    );
  }

  if (isNotFound) {
    return (
      <NotFoundPage
        title="Không tìm thấy bài hát"
      />
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
          coverImage={ trackCoverImage }
          title={ getTrackDisplayTitle(track, "B\u00e0i h\u00e1t ch\u01b0a c\u00f3 t\u00ean") }
          artistName={ artistName }
          artistAvatar={ artistAvatar }
          artistHref={ artistHref }
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
            aria-label="Ph\u00e1t b\u00e0i h\u00e1t"
            className="
              inline-flex h-14 w-14 items-center justify-center self-start rounded-full bg-gradient-to-br from-[#ff8a3d] via-[#ff4fd8] to-[#7b61ff]
              text-black shadow-[0_18px_38px_rgba(30,215,96,0.28)] transition
              hover:scale-[1.03] hover:brightness-105
            "
          >
            <Play className="h-6 w-6 fill-current" />
          </button>

          <TrackTwoLevelMenu
            trackId={ trackId }
            track={ track }
            menuAlign="start"
            onViewInfo={ () => setIsInformationModalOpen(true) }
            onReport={ handleReportTrack }
            onTrackAdded={ (updatedPlaylist, playlist) => {
              if (typeof handleAddTrackToPlaylist === "function") {
                handleAddTrackToPlaylist(updatedPlaylist || playlist);
              }
            } }
          />
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
          title={ getTrackDisplayTitle(track, "B\u00e0i h\u00e1t ch\u01b0a c\u00f3 t\u00ean") }
          artistName={ artistName }
          image={ trackImage }
          isLiked={ isLiked }
          likeCount={ likeCount }
          isLikeLoading={ isLikeLoading }
          onToggleLike={ handleToggleLike }
        />

        <TrackDetailArtistCard
          avatar={ artistAvatar }
          name={ artistName }
          role={ artistRole }
          artistHref={ artistHref }
        />
      </div>

      <CreateReportModal
        isOpen={ isReportModalOpen }
        onClose={ () => setIsReportModalOpen(false) }
        targetId={ track?.id }
        targetType="track"
      />

      <TrackInformationModal
        isOpen={ isInformationModalOpen }
        onClose={ () => setIsInformationModalOpen(false) }
        track={ track }
        image={ trackImage }
        artistHref={ artistHref }
      />
    </section>
  );
};

export default TrackDetailPage;
