import { useEffect, useState } from "react";
import {
  Check,
  CirclePlus,
  Download,
  Loader2,
  MoreHorizontal,
  ShieldAlert,
  Shuffle,
} from "lucide-react";
import PlayButton from "../../components/common/PlayButton";
import CreateReportModal from "../../components/report/CreateReportModal";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TrackCard from "../../components/TrackCard";
import TrackListSection from "../../components/trackList/TrackListSection";
import { useAuth } from "../../hooks/useAuth";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import {
  followAlbumService,
  getAlbumDetailService,
  getAlbumFollowStatusService,
  unfollowAlbumService,
} from "../../services/albumService";
import {
  createPlaceholderImage,
  formatAlbumDuration,
  formatReleaseYear,
  formatTrackDuration,
} from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";
import { isBlockedTrack } from "../../utils/trackStatus";

const actionButtonClassName = `
  inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8
  bg-white/70 text-[#18181b] transition hover:scale-[1.03] hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] sm:h-11 sm:w-11
`;

const shufflePlayButtonClassName = `
  inline-flex h-10 items-center gap-2 rounded-full border border-black/8 px-4
  bg-white/70 text-sm font-semibold text-[#18181b] transition hover:scale-[1.03] hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] sm:h-11 sm:px-5
`;

const followButtonClassName = `
  inline-flex h-10 items-center gap-2 rounded-full border border-black/8 px-4
  bg-white/70 text-sm font-semibold text-[#18181b] transition hover:scale-[1.03] hover:bg-white
  disabled:cursor-not-allowed disabled:opacity-70
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] sm:h-11 sm:px-5
`;

const metaPillClassName = `
  inline-flex items-center rounded-full border border-white/14 bg-white/10
  px-3 py-1.5 text-xs text-white/88 backdrop-blur-sm sm:text-sm
`;

const FOLLOW_LOGIN_NOTICE = "Vui lòng đăng nhập để theo dõi album này.";

const AlbumDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isFollowStatusLoading, setIsFollowStatusLoading] = useState(false);
  const [followErrorMessage, setFollowErrorMessage] = useState("");
  const {
    currentTrack,
    isPlaying,
    isShuffleEnabled,
    activeCollection,
    playAlbum,
    playTrack,
    togglePlayPause,
  } = usePlayer();

  useEffect(() => {
    let isMounted = true;

    const loadAlbumDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const albumDetail = await getAlbumDetailService(id);

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
            "Không thể tải chi tiết album lúc này."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setAlbum(null);
      setErrorMessage("Thiếu mã album.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    loadAlbumDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    setFollowErrorMessage("");
  }, [id]);

  useEffect(() => {
    if (isAuthLoading) {
      return undefined;
    }

    if (!isAuthenticated || !id) {
      setIsFollowing(false);
      setIsFollowStatusLoading(false);
      return undefined;
    }

    let isMounted = true;

    const loadFollowStatus = async () => {
      setIsFollowStatusLoading(true);
      setFollowErrorMessage("");

      try {
        const followState = await getAlbumFollowStatusService({ albumId: id });

        if (!isMounted) {
          return;
        }

        setIsFollowing(Boolean(followState?.isFollowing));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error?.response?.status === 401) {
          setIsFollowing(false);
          return;
        }

        setFollowErrorMessage(
          getApiErrorMessage(error, "Không thể tải trạng thái theo dõi album lúc này.")
        );
      } finally {
        if (isMounted) {
          setIsFollowStatusLoading(false);
        }
      }
    };

    loadFollowStatus();

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated, isAuthLoading]);

  const albumCoverImage =
    album?.coverImage || createPlaceholderImage(album?.title);

  const trackItems = album?.tracks ?? [];
  const albumArtistName = album?.artist?.name || "Nghệ sĩ không xác định";
  const releaseYear = formatReleaseYear(album?.releaseDate);
  const totalTracks = album?.trackCount ?? trackItems.length;
  const totalDuration = formatAlbumDuration(trackItems);

  const collectionMeta = {
    id: album?.id,
    type: "album",
    title: album?.title || "Album",
    image: albumCoverImage,
    artistName: albumArtistName,
  };
  const isAlbumShuffleActive =
    isShuffleEnabled &&
    activeCollection?.type === "album" &&
    String(activeCollection?.id || "") === String(collectionMeta.id || "");

  const handlePlayAlbum = async () => {
    await playAlbum(album, trackItems);
  };

  const handleShuffleAlbum = async () => {
    await playAlbum(album, trackItems, { shuffle: true });
  };

  const handlePlayTrack = async (track, index) => {
    if (!track) {
      return;
    }

    if (currentTrack?.id && currentTrack.id === track.id) {
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
    console.log("Toggle like track:", track?.title);
  };

  const redirectToLogin = () => {
    navigate(routePaths.login, {
      replace: false,
      state: {
        from: location,
        authNotice: FOLLOW_LOGIN_NOTICE,
      },
    });
  };

  const handleToggleFollow = async () => {
    const albumId = album?.id || id;

    if (!albumId || isFollowLoading || isFollowStatusLoading || isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    setIsFollowLoading(true);
    setFollowErrorMessage("");

    try {
      const followState = isFollowing
        ? await unfollowAlbumService({ albumId })
        : await followAlbumService({ albumId });

      setIsFollowing(Boolean(followState?.isFollowing ?? !isFollowing));
    } catch (error) {
      if (error?.response?.status === 401) {
        redirectToLogin();
        return;
      }

      setFollowErrorMessage(
        getApiErrorMessage(
          error,
          isFollowing
            ? "Không thể bỏ theo dõi album lúc này."
            : "Không thể theo dõi album lúc này."
        )
      );
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleReportAlbum = () => {
    if (!album?.id) {
      return;
    }

    setIsReportModalOpen(true);
  };

  const followButtonLabel =
    isFollowLoading || isFollowStatusLoading
      ? "Đang xử lý"
      : isFollowing
        ? "Đã theo dõi"
        : "Theo dõi";

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
            bg-gradient-to-b from-[#d97706] via-[#7c3f00] to-transparent
            px-4 pb-5 pt-6 dark:from-[#f59e0b] dark:via-[#8f4b13] dark:to-[#121212]
            sm:px-8 sm:pb-8 sm:pt-10
          "
        >
          
          { isLoading ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="text-sm text-white/82">Đang tải chi tiết album...</p>
            </div>
          ) : errorMessage ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="max-w-xl text-sm text-white/88">{ errorMessage }</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-end md:text-left">
              <img
                src={ albumCoverImage }
                alt={ album?.title || "Ảnh bìa album" }
                className="
                  h-32 w-32 rounded-[16px] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.28)]
                  min-[420px]:h-36 min-[420px]:w-36
                  sm:h-56 sm:w-56
                "
              />

              <div className="min-w-0 max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">
                  Album
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-5xl lg:text-6xl">
                  { album?.title || "Album chưa có tên" }
                </h1>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <span className={ `${metaPillClassName} font-medium text-white` }>
                    { albumArtistName }
                  </span>
                  <span className={ metaPillClassName }>{ releaseYear }</span>
                  <span className={ metaPillClassName }>{ totalTracks } bài hát</span>
                  <span className={ metaPillClassName }>{ totalDuration }</span>
                </div>
              </div>
            </div>
          ) }
        </div>

        <div className="space-y-4 px-0 pb-4 pt-4 sm:space-y-5 sm:px-8 sm:pb-8 sm:pt-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PlayButton onClick={ handlePlayAlbum } size="compact" />

            <button
              type="button"
              onClick={ handleShuffleAlbum }
              className={ [
                shufflePlayButtonClassName,
                isAlbumShuffleActive
                  ? "border-[#f5b66f]/70 bg-[#f5b66f] text-[#111111] hover:bg-[#f8c27f]"
                  : "",
              ].join(" ") }
              aria-label="Phát ngẫu nhiên album"
            >
              <Shuffle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              <span>Phát ngẫu nhiên</span>
            </button>
            <button
              type="button"
              onClick={ handleToggleFollow }
              disabled={ isFollowLoading || isFollowStatusLoading || isAuthLoading }
              className={ [
                followButtonClassName,
                isFollowing
                  ? "border-[#f5b66f]/70 bg-[#f5b66f] text-[#111111] hover:bg-[#f8c27f]"
                  : "",
              ].join(" ") }
              aria-label={ isFollowing ? "Bỏ theo dõi album" : "Theo dõi album" }
            >
              { isFollowLoading || isFollowStatusLoading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin sm:h-5 sm:w-5" />
              ) : isFollowing ? (
                <Check className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              ) : (
                <CirclePlus className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              ) }
              <span>{ followButtonLabel }</span>
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Tải album">
              <Download className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              className={ actionButtonClassName }
              aria-label="Report album"
              onClick={ handleReportAlbum }
            >
              <ShieldAlert className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="More options">
              <MoreHorizontal className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
          </div>

          { followErrorMessage ? (
            <p className="px-1 text-sm text-rose-600 dark:text-rose-300">
              { followErrorMessage }
            </p>
          ) : null }

          <TrackListSection
            isLoading={ isLoading }
            errorMessage={ errorMessage }
            loadingMessage="Đang tải bài hát..."
            mobileLabel="Danh sách bài hát"
            emptyMessage="Album này chưa có bài hát nào."
            hasItems={ trackItems.length > 0 }
          >
            { trackItems.map((trackItem, index) => {
              const track = trackItem?.track;
              const isTrackBlocked = isBlockedTrack(trackItem);

              return (
                <TrackCard
                  key={ track?.id || `${trackItem?.order}-${index}` }
                  index={ trackItem?.order || index + 1 }
                  track={ track }
                  image={
                    track?.coverImage ||
                    track?.artist?.avatar ||
                    albumCoverImage
                  }
                  title={ track?.title || "Untitled track" }
                  trackId={track?.id}
                  artist={ track?.artist?.name || albumArtistName }
                  duration={ formatTrackDuration(track?.duration) }
                  explicit={ false }
                  liked={ false }
                  isBlocked={ isTrackBlocked }
                  href={ track?.id ? routePaths.trackDetail(track.id) : undefined }
                  isPlaybackActive={ currentTrack?.id === track?.id }
                  isPlaying={ isPlaying }
                  onPlaybackAction={ () => handlePlayTrack(track, index) }
                  onLike={ () => handleLikeTrack(track) }
                />
              );
            }) }
          </TrackListSection>
        </div>
      </div>

      <CreateReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetId={album?.id}
        targetType="album"
      />
    </section>
  );
};

export default AlbumDetailPage;
