import { useEffect, useState } from "react";
import { Clock3, Heart, Music2 } from "lucide-react";
import PlayButton from "../../components/common/PlayButton";
import TrackListSection from "../../components/trackList/TrackListSection";
import UserFavoriteTrackRow from "../../components/userFavorite/UserFavoriteTrackRow";
import { usePlayer } from "../../hooks/usePlayer";
import { getFavoriteTracks } from "../../services/userFavoriteService";
import { getApiErrorMessage } from "../../utils/apiError";

const PAGE_LIMIT = 20;

const metaPillClassName = `
  inline-flex items-center rounded-full border border-white/14 bg-white/10
  px-3 py-1.5 text-xs text-white/88 backdrop-blur-sm sm:text-sm
`;

const getTrackFromFavoriteItem = (item) => item?.track || item?.song || item || null;

const getTrackId = (track) => track?.id || track?._id || track?.trackId || "";

const getFavoriteItemKey = (item, index = 0) => {
  const track = getTrackFromFavoriteItem(item);

  return (
    item?.id ||
    item?._id ||
    item?.favoriteId ||
    item?.favoriteTrackId ||
    getTrackId(track) ||
    `favorite-track-${index}`
  );
};

const getTrackTitle = (track) => track?.title || track?.name || "";

const getTrackArtistName = (track, item) => {
  if (typeof track?.artist?.name === "string" && track.artist.name.trim()) {
    return track.artist.name.trim();
  }

  if (Array.isArray(track?.artists) && track.artists.length > 0) {
    return track.artists
      .map((artist) => artist?.name)
      .filter(Boolean)
      .join(", ");
  }

  if (typeof track?.artistName === "string" && track.artistName.trim()) {
    return track.artistName.trim();
  }

  if (typeof item?.artistName === "string" && item.artistName.trim()) {
    return item.artistName.trim();
  }

  return "Nghệ sĩ không xác định";
};

const getTrackArtistId = (track, item) => {
  return (
    track?.artist?.id ||
    track?.artist?._id ||
    track?.artistId ||
    item?.artist?.id ||
    item?.artist?._id ||
    item?.artistId ||
    ""
  );
};

const resolveImageCandidate = (value) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .find((item) => typeof item === "string" && item.trim())
      ?.trim() || "";
  }

  return "";
};

const getTrackCoverImage = (track, item) => {
  const candidates = [
    track?.avatar,
    track?.coverImage,
    track?.image,
    track?.thumbnail,
    track?.imageUrl,
    track?.coverUrl,
    track?.artwork,
    track?.artworkUrl,
    track?.album?.coverImage,
    track?.album?.image,
    track?.album?.thumbnail,
    track?.albumImage,
    item?.coverImage,
    item?.image,
    item?.thumbnail,
    track?.artist?.avatar,
  ];

  return candidates.map(resolveImageCandidate).find(Boolean) || "";
};

const getTrackDurationValue = (track, item) => {
  const duration = Number(track?.duration ?? item?.duration);

  return Number.isFinite(duration) && duration >= 0 ? duration : null;
};

const normalizeFavoriteItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.tracks)) {
    return payload.tracks;
  }

  if (Array.isArray(payload?.favorites)) {
    return payload.favorites;
  }

  if (Array.isArray(payload?.favoriteTracks)) {
    return payload.favoriteTracks;
  }

  return [];
};

const normalizePagination = (payload, currentPage, totalItems) => {
  const rawPagination = payload?.pagination || payload?.meta || {};
  const page = Number(rawPagination.page || rawPagination.currentPage || currentPage) || currentPage;
  const totalPages =
    Number(rawPagination.totalPages || rawPagination.pages || rawPagination.totalPage) || 1;
  const total =
    Number(rawPagination.total || rawPagination.totalItems || rawPagination.count || totalItems) ||
    totalItems;
  const hasPrevPage =
    typeof rawPagination.hasPrevPage === "boolean"
      ? rawPagination.hasPrevPage
      : page > 1;
  const hasNextPage =
    typeof rawPagination.hasNextPage === "boolean"
      ? rawPagination.hasNextPage
      : page < totalPages;

  return {
    page,
    totalItems: total,
    totalPages,
    hasPrevPage,
    hasNextPage,
  };
};

const mergeFavoriteItems = (currentItems, nextItems) => {
  const mergedMap = new Map();

  [...currentItems, ...nextItems].forEach((item, index) => {
    mergedMap.set(getFavoriteItemKey(item, index), item);
  });

  return Array.from(mergedMap.values());
};

const getFavoriteDurationSeconds = (items) =>
  items.reduce((sum, item) => {
    const duration = getTrackDurationValue(getTrackFromFavoriteItem(item), item);
    return duration !== null ? sum + duration : sum;
  }, 0);

const formatDurationSummary = (totalSeconds) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }

  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`;
  }

  return `${seconds} giây`;
};

const UserFavoriteTracksPage = () => {
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalItems: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const {
    currentTrack,
    isPlaying,
    playCollection,
    playTrack,
    togglePlayPause,
  } = usePlayer();

  useEffect(() => {
    let isMounted = true;

    const loadInitialFavoriteTracks = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getFavoriteTracks({
          page: 1,
          limit: PAGE_LIMIT,
        });
        const nextItems = normalizeFavoriteItems(response);
        const nextPagination = normalizePagination(response, 1, nextItems.length);

        if (!isMounted) {
          return;
        }

        setFavoriteItems(nextItems);
        setPagination(nextPagination);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFavoriteItems([]);
        setPagination({
          page: 1,
          totalItems: 0,
          totalPages: 1,
          hasPrevPage: false,
          hasNextPage: false,
        });
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải danh sách bài hát yêu thích lúc này.")
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialFavoriteTracks();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalItems = pagination?.totalItems || favoriteItems.length;
  const totalDurationSeconds = getFavoriteDurationSeconds(favoriteItems);
  const totalDurationLabel = formatDurationSummary(totalDurationSeconds);
  const shouldRenderTrackList = isLoading || favoriteItems.length > 0 || !errorMessage;
  const collectionMeta = {
    id: "favorite-tracks",
    type: "playlist",
    title: "Bài hát đã thích",
    image: "",
    artistName: "Thư viện của bạn",
    listenSource: "favorites",
  };

  const handlePlayCollection = async () => {
    if (favoriteItems.length === 0) {
      return;
    }

    await playCollection(favoriteItems, {
      startIndex: 0,
      collection: collectionMeta,
    });
  };

  const handlePlayTrack = async (item, index) => {
    const track = getTrackFromFavoriteItem(item);
    const trackId = getTrackId(track);

    if (!trackId) {
      return;
    }

    if (currentTrack?.id && String(currentTrack.id) === String(trackId)) {
      await togglePlayPause();
      return;
    }

    await playTrack(track, {
      queue: favoriteItems,
      startIndex: index,
      collection: collectionMeta,
    });
  };

  const handleFavoriteChanged = (trackId, nextIsFavorite) => {
    if (!trackId || nextIsFavorite) {
      return;
    }

    setFavoriteItems((currentItems) =>
      currentItems.filter((item) => {
        const currentTrack = getTrackFromFavoriteItem(item);
        return String(getTrackId(currentTrack)) !== String(trackId);
      })
    );
    setPagination((currentPagination) => ({
      ...currentPagination,
      totalItems: Math.max(Number(currentPagination?.totalItems || 0) - 1, 0),
    }));
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !pagination?.hasNextPage) {
      return;
    }

    const nextPage = Number(pagination?.page || 1) + 1;
    setIsLoadingMore(true);
    setErrorMessage("");

    try {
      const response = await getFavoriteTracks({
        page: nextPage,
        limit: PAGE_LIMIT,
      });
      const nextItems = normalizeFavoriteItems(response);
      const mergedItems = mergeFavoriteItems(favoriteItems, nextItems);
      const nextPagination = normalizePagination(response, nextPage, mergedItems.length);

      setFavoriteItems(mergedItems);
      setPagination(nextPagination);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Không thể tải thêm bài hát yêu thích.")
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

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
            relative overflow-hidden bg-gradient-to-b from-[#f43f5e] via-[#be185d] to-transparent
            px-4 pb-5 pt-6 dark:from-[#f43f5e] dark:via-[#9d174d] dark:to-[#121212]
            sm:px-8 sm:pb-8 sm:pt-10
          "
        >
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_56%)]" />

          <div className="relative z-10 flex min-h-[18rem] flex-col items-center justify-end gap-5 text-center md:flex-row md:items-end md:justify-start md:text-left">
            <div
              className="
                flex h-32 w-32 shrink-0 items-center justify-center rounded-[18px]
                bg-[linear-gradient(135deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.08)_100%)]
                shadow-[0_24px_60px_rgba(0,0,0,0.28)] ring-1 ring-white/28 backdrop-blur
                min-[420px]:h-36 min-[420px]:w-36 sm:h-44 sm:w-44
              "
            >
              <Heart className="h-14 w-14 fill-current text-white sm:h-16 sm:w-16" />
            </div>

            <div className="min-w-0 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">
                Playlist
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-5xl lg:text-6xl">
                Bài hát đã thích
              </h1>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className={ `${metaPillClassName} font-medium text-white` }>
                  <Music2 className="mr-1.5 h-3.5 w-3.5" />
                  { totalItems } bài hát
                </span>
                { totalDurationLabel ? (
                  <span className={ metaPillClassName }>
                    <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                    { totalDurationLabel }
                  </span>
                ) : null }
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-0 pb-4 pt-4 sm:space-y-5 sm:px-8 sm:pb-8 sm:pt-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PlayButton
              onClick={ handlePlayCollection }
              size="compact"
              disabled={ isLoading || favoriteItems.length === 0 }
            />
          </div>

          { errorMessage ? (
            <div className="mx-4 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#b91c1c] dark:mx-0 dark:text-[#fecaca]">
              { errorMessage }
            </div>
          ) : null }

          { shouldRenderTrackList ? (
            <TrackListSection
              isLoading={ isLoading }
              loadingMessage="Đang tải bài hát yêu thích..."
              mobileLabel="Bài hát đã thích"
              emptyMessage="Chưa có bài hát yêu thích."
              hasItems={ favoriteItems.length > 0 }
            >
              { favoriteItems.map((item, index) => {
                const track = getTrackFromFavoriteItem(item);
                const trackId = getTrackId(track);

                return (
                  <UserFavoriteTrackRow
                    key={ getFavoriteItemKey(item, index) }
                    index={ index + 1 }
                    trackId={ trackId }
                    title={ getTrackTitle(track) }
                    artistName={ getTrackArtistName(track, item) }
                    artistId={ getTrackArtistId(track, item) }
                    coverImage={ getTrackCoverImage(track, item) }
                    duration={ getTrackDurationValue(track, item) }
                    isFavorite={ true }
                    onFavoriteChanged={ (nextIsFavorite) =>
                      handleFavoriteChanged(trackId, nextIsFavorite)
                    }
                    isPlaybackActive={ String(currentTrack?.id || "") === String(trackId || "") }
                    isPlaying={ isPlaying }
                    onPlaybackAction={ () => handlePlayTrack(item, index) }
                  />
                );
              }) }
            </TrackListSection>
          ) : null }

          { favoriteItems.length > 0 && pagination?.hasNextPage ? (
            <div className="flex justify-center px-4 pt-1 sm:px-0">
              <button
                type="button"
                onClick={ handleLoadMore }
                disabled={ isLoadingMore }
                className="
                  inline-flex min-w-[10rem] items-center justify-center rounded-full border border-black/8
                  bg-white/80 px-5 py-2.5 text-sm font-semibold text-[#18181b] transition
                  hover:scale-[1.02] hover:bg-white disabled:cursor-not-allowed disabled:opacity-70
                  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]
                "
              >
                { isLoadingMore ? "Đang tải..." : "Tải thêm" }
              </button>
            </div>
          ) : null }
        </div>
      </div>
    </section>
  );
};

export default UserFavoriteTracksPage;
