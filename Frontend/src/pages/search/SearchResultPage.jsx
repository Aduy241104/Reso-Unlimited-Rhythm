import {
  ChevronRight,
  Disc3,
  Mic2,
  Music2,
  Play,
  Search,
  SearchX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import LoadingState from "../../components/common/LoadingState";
import {
  resolveSearchItemImage,
  resolveSearchItemPath,
  resolveSearchItemPrimaryText,
  resolveSearchItemTypeLabel,
  SEARCH_RESULT_TYPES,
} from "../../components/search/SearchResultItem";
import TrackTwoLevelMenu from "../../components/trackMenu/TrackTwoLevelMenu";
import { usePlayer } from "../../hooks/usePlayer";
import { getAlbumDetailService } from "../../services/albumService";
import {
  normalizeSearchAllPayload,
  normalizeSearchCollection,
  searchAlbums,
  searchAll,
  searchArtists,
  searchSongs,
} from "../../services/searchService";
import { formatReleaseYear } from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";
import { filterPlayableTracks } from "../../utils/trackStatus";

const FILTER_OPTIONS = [
  { id: "all", label: "Tất cả" },
];

const FILTER_META = {
  all: {
    title: "kết quả",
    emptyTitle: "Không tìm thấy kết quả",
  },
  songs: {
    title: "bài hát",
    emptyTitle: "Không tìm thấy bài hát",
  },
  artists: {
    title: "nghệ sĩ",
    emptyTitle: "Không tìm thấy nghệ sĩ",
  },
  albums: {
    title: "album",
    emptyTitle: "Không tìm thấy album",
  },
};

const EMPTY_RESULTS = {
  all: {
    songs: [],
    artists: [],
    albums: [],
  },
  songs: [],
  artists: [],
  albums: [],
};

const ALL_RESULTS_PREVIEW_LIMIT = 6;
const FULL_RESULTS_LIMIT = 20;
const MIXED_RESULTS_LIMIT = 12;

const getEntityId = (item) =>
  item?._id || item?.id || item?.trackId || item?.artistId || item?.albumId || "";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const collectArtistNames = (candidate) => {
  if (Array.isArray(candidate)) {
    return candidate
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        return normalizeText(
          item?.stageName ||
            item?.artistName ||
            item?.displayName ||
            item?.name ||
            item?.fullName
        );
      })
      .filter(Boolean);
  }

  if (typeof candidate === "string") {
    return candidate
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const resolveTrackArtistName = (track) => {
  const artistNames = collectArtistNames(
    track?.artists || track?.artistNames || track?.artistName || track?.artist
  );

  return artistNames.join(", ");
};

const resolveArtistFollowersText = (artist) => {
  const followers = Number(
    artist?.followers ??
      artist?.followersCount ??
      artist?.stats?.followers ??
      artist?.stats?.totalFollowers
  );

  if (!Number.isFinite(followers) || followers < 0) {
    return "Nghệ sĩ";
  }

  return `${new Intl.NumberFormat("vi-VN").format(followers)} người theo dõi`;
};

const resolveAlbumArtistName = (album) =>
  normalizeText(
    album?.artistName ||
      album?.artist?.name ||
      album?.artist?.stageName ||
      album?.artist?.artistName
  );

const resolveAlbumMeta = (album) => {
  const artistName = resolveAlbumArtistName(album);
  const yearSource = album?.releaseDate || album?.releasedAt || album?.year || "";
  const year = yearSource ? formatReleaseYear(yearSource) : "";

  return [artistName, year && year !== "Chưa rõ năm" ? year : ""]
    .filter(Boolean)
    .join(" • ");
};

const buildPreviewResults = (items = []) => items.slice(0, ALL_RESULTS_PREVIEW_LIMIT);

const buildTypedResults = (items = [], type) =>
  items.map((item, index) => ({
    id: `${type}-${getEntityId(item) || index}`,
    item,
    type,
  }));

const buildCombinedResults = (results) => [
  ...buildTypedResults(results?.songs, SEARCH_RESULT_TYPES.song),
  ...buildTypedResults(results?.albums, SEARCH_RESULT_TYPES.album),
  ...buildTypedResults(results?.artists, SEARCH_RESULT_TYPES.artist),
];

const getTopResultEntry = (results) =>
  buildCombinedResults({
    songs: results?.songs?.slice(0, 1) || [],
    albums: results?.albums?.slice(0, 1) || [],
    artists: results?.artists?.slice(0, 1) || [],
  })[0] || null;

const getResultMetaText = (item, type) => {
  if (type === SEARCH_RESULT_TYPES.song) {
    const artistNames = resolveTrackArtistName(item);
    return artistNames ? `Bài hát • ${artistNames}` : "Bài hát";
  }

  if (type === SEARCH_RESULT_TYPES.album) {
    return resolveAlbumMeta(item) || "Album";
  }

  return resolveArtistFollowersText(item);
};

const FilterButtonGroup = ({ activeFilter, onChange }) => (
  <div className="relative -mx-1 overflow-hidden">
    <div className="flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FILTER_OPTIONS.map((option) => {
        const isActive = option.id === activeFilter;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              if (!option.disabled) {
                onChange(option.id);
              }
            }}
            className={[
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
              option.disabled
                ? "bg-white/[0.06] text-[#d6d6d6] hover:bg-white/[0.08]"
                : "",
              isActive
                ? "bg-white text-[#111111]"
                : !option.disabled
                  ? "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                  : "",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

const SearchPromptState = () => (
  <section className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05] text-[#b3b3b3]">
      <Search className="h-6 w-6" />
    </div>
    <h2 className="mt-4 text-xl font-bold text-white">Nhập từ khóa để tìm kiếm</h2>
    <p className="mt-2 max-w-md text-sm text-[#b3b3b3]">
      Reso sẽ hiển thị bài hát, nghệ sĩ và album phù hợp với từ khóa của bạn.
    </p>
  </section>
);

const SearchEmptyState = ({ title, keyword }) => (
  <section className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05] text-[#b3b3b3]">
      <SearchX className="h-6 w-6" />
    </div>
    <h2 className="mt-4 text-xl font-bold text-white">{title}</h2>
    <p className="mt-2 max-w-md text-sm text-[#b3b3b3]">
      Không tìm thấy kết quả cho "{keyword}".
    </p>
  </section>
);

const SearchErrorState = ({ errorMessage }) => (
  <section className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
    <h2 className="text-xl font-bold text-white">Không thể tải kết quả tìm kiếm</h2>
    <p className="mt-2 max-w-md text-sm text-[#b3b3b3]">{errorMessage}</p>
  </section>
);

const SearchTopHeroCard = ({ entry, songResults = [] }) => {
  const navigate = useNavigate();
  const {
    activeCollection,
    currentTrack,
    isPlaying,
    playAlbum,
    playTrack,
    togglePlayPause,
  } = usePlayer();
  const [isPlayLoading, setIsPlayLoading] = useState(false);

  if (!entry) {
    return null;
  }

  const { item, type } = entry;
  const detailPath = resolveSearchItemPath(item, type);
  const primaryText = resolveSearchItemPrimaryText(item, type);
  const metaText = getResultMetaText(item, type);
  const imageSource = resolveSearchItemImage(item, type);
  const typeLabel = resolveSearchItemTypeLabel(type);
  const itemId = getEntityId(item);
  const canPlay =
    type === SEARCH_RESULT_TYPES.song || type === SEARCH_RESULT_TYPES.album;
  const isActiveSong =
    type === SEARCH_RESULT_TYPES.song &&
    itemId &&
    String(currentTrack?.id || "") === String(itemId);
  const isActiveAlbum =
    type === SEARCH_RESULT_TYPES.album &&
    itemId &&
    activeCollection?.type === "album" &&
    String(activeCollection?.id || "") === String(itemId);
  const isPlaybackActive = isActiveSong || isActiveAlbum;

  const handlePlay = async (event) => {
    event.stopPropagation();

    if (!canPlay || isPlayLoading) {
      return;
    }

    if (isPlaybackActive) {
      await togglePlayPause();
      return;
    }

    setIsPlayLoading(true);

    try {
      if (type === SEARCH_RESULT_TYPES.song) {
        const queue = songResults.length > 0 ? songResults : [item];
        const startIndex = Math.max(
          queue.findIndex(
            (track) => String(getEntityId(track)) === String(itemId)
          ),
          0
        );

        await playTrack(item, {
          queue,
          startIndex,
          collection: {
            id: `search:${itemId}`,
            type: "search",
            title: `Kết quả tìm kiếm cho ${primaryText}`,
            image: imageSource,
            artistName: resolveTrackArtistName(item),
            listenSource: "search",
          },
        });

        return;
      }

      const albumDetail = await getAlbumDetailService(itemId);
      const albumTracks = filterPlayableTracks(albumDetail?.tracks ?? []);

      if (albumDetail && albumTracks.length > 0) {
        await playAlbum(albumDetail, albumTracks);
      }
    } finally {
      setIsPlayLoading(false);
    }
  };

  return (
    <div
      role={detailPath ? "button" : undefined}
      tabIndex={detailPath ? 0 : undefined}
      onClick={() => {
        if (detailPath) {
          navigate(detailPath);
        }
      }}
      onKeyDown={(event) => {
        if (!detailPath) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(detailPath);
        }
      }}
      className={[
        "group flex w-full items-center gap-4 rounded-[18px] bg-[#2a2a2a] px-5 py-4 text-left transition",
        detailPath
          ? "cursor-pointer hover:bg-[#323232] focus:outline-none focus:ring-2 focus:ring-white/20"
          : "cursor-default opacity-70",
      ].join(" ")}
    >
      <img
        src={imageSource}
        alt={primaryText}
        className={[
          "h-16 w-16 shrink-0 bg-[#1a1a1a] object-cover shadow-[0_18px_36px_rgba(0,0,0,0.35)] sm:h-20 sm:w-20",
          type === SEARCH_RESULT_TYPES.artist ? "rounded-full" : "rounded-md",
        ].join(" ")}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-2xl font-bold tracking-tight text-white sm:text-[2rem]">
          {primaryText}
        </p>
        <p className="mt-1 truncate text-sm font-medium text-[#b3b3b3] sm:text-base">
          {metaText}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-[#d5d5d5]">
          {typeLabel}
        </span>
        {type === SEARCH_RESULT_TYPES.song && itemId ? (
          <div onClick={(event) => event.stopPropagation()}>
            <TrackTwoLevelMenu
              trackId={itemId}
              track={item}
              menuPlacement="bottom"
            />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handlePlay}
        disabled={!canPlay || isPlayLoading}
        className={[
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1ed760] text-black shadow-[0_18px_32px_rgba(30,215,96,0.28)] transition",
          canPlay ? "group-hover:scale-105" : "cursor-default opacity-70",
        ].join(" ")}
        aria-label={isPlaybackActive && isPlaying ? "Tạm dừng" : "Phát"}
      >
        <Play className="ml-0.5 h-6 w-6 fill-current" />
      </button>
    </div>
  );
};

const SearchResultRow = ({ item, type }) => {
  const navigate = useNavigate();
  const detailPath = resolveSearchItemPath(item, type);
  const primaryText = resolveSearchItemPrimaryText(item, type);
  const metaText = getResultMetaText(item, type);
  const imageSource = resolveSearchItemImage(item, type);
  const typeLabel = resolveSearchItemTypeLabel(type);
  const itemId = getEntityId(item);

  return (
    <div
      className={[
        "group flex items-center gap-4 rounded-[16px] px-4 py-3 transition",
        detailPath ? "hover:bg-white/[0.06]" : "opacity-70",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => {
          if (detailPath) {
            navigate(detailPath);
          }
        }}
        disabled={!detailPath}
        className={[
          "flex min-w-0 flex-1 items-center gap-4 text-left",
          detailPath
            ? "focus:outline-none focus:ring-2 focus:ring-white/15"
            : "cursor-default",
        ].join(" ")}
      >
        <img
          src={imageSource}
          alt={primaryText}
          className={[
            "h-14 w-14 shrink-0 bg-[#1a1a1a] object-cover",
            type === SEARCH_RESULT_TYPES.artist ? "rounded-full" : "rounded-md",
          ].join(" ")}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-white">{primaryText}</p>
          <p className="mt-1 truncate text-sm text-[#b3b3b3]">{metaText}</p>
        </div>
      </button>

      <div className="hidden shrink-0 items-center gap-4 md:flex">
        <span className="inline-flex items-center gap-2 rounded-md bg-white/[0.10] px-3 py-1.5 text-sm font-semibold text-[#d8d8d8]">
          {type === SEARCH_RESULT_TYPES.artist ? (
            <Mic2 className="h-4 w-4" />
          ) : type === SEARCH_RESULT_TYPES.album ? (
            <Disc3 className="h-4 w-4" />
          ) : (
            <Music2 className="h-4 w-4" />
          )}
          <span>{typeLabel}</span>
        </span>

        {type === SEARCH_RESULT_TYPES.song && itemId ? (
          <div onClick={(event) => event.stopPropagation()}>
            <TrackTwoLevelMenu trackId={itemId} track={item} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (detailPath) {
                navigate(detailPath);
              }
            }}
            disabled={!detailPath}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#b3b3b3] transition hover:bg-white/[0.08] hover:text-white disabled:cursor-default"
            aria-label={`Xem ${typeLabel.toLowerCase()}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

const SearchResultList = ({ items, type }) => (
  <div className="space-y-1 rounded-[18px] bg-transparent">
    {items.map((item, index) => (
      <SearchResultRow
        key={getEntityId(item) || `${type}-${index}`}
        item={item}
        type={type}
      />
    ))}
  </div>
);

const AllResultsView = ({ results }) => {
  const topResult = useMemo(() => getTopResultEntry(results), [results]);
  const mixedResults = useMemo(() => {
    const combinedResults = buildCombinedResults(results);

    if (!topResult) {
      return combinedResults.slice(0, MIXED_RESULTS_LIMIT);
    }

    return combinedResults
      .filter((entry) => entry.id !== topResult.id)
      .slice(0, MIXED_RESULTS_LIMIT);
  }, [results, topResult]);

  return (
    <div className="space-y-4">
      <SearchTopHeroCard entry={topResult} songResults={results.songs} />

      <div className="rounded-[20px] bg-transparent">
        {mixedResults.map(({ id, item, type }) => (
          <SearchResultRow key={id} item={item} type={type} />
        ))}
      </div>
    </div>
  );
};

const SearchResultPage = () => {
  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState("all");
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const keyword = (searchParams.get("q") || "").trim();

  useEffect(() => {
    setActiveFilter("all");
  }, [keyword]);

  useEffect(() => {
    let isMounted = true;

    const loadResults = async () => {
      if (!keyword) {
        setResults(EMPTY_RESULTS);
        setErrorMessage("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const settledResults = await Promise.allSettled([
          searchAll(keyword),
          searchSongs(keyword, 1, FULL_RESULTS_LIMIT),
          searchArtists(keyword, 1, FULL_RESULTS_LIMIT),
          searchAlbums(keyword, 1, FULL_RESULTS_LIMIT),
        ]);

        if (!isMounted) {
          return;
        }

        const [allResult, songsResult, artistsResult, albumsResult] = settledResults;
        const normalizedSongs =
          songsResult.status === "fulfilled"
            ? normalizeSearchCollection(songsResult.value, "song")
            : [];
        const normalizedArtists =
          artistsResult.status === "fulfilled"
            ? normalizeSearchCollection(artistsResult.value, "artist")
            : [];
        const normalizedAlbums =
          albumsResult.status === "fulfilled"
            ? normalizeSearchCollection(albumsResult.value, "album")
            : [];
        const normalizedAll =
          allResult.status === "fulfilled"
            ? normalizeSearchAllPayload(allResult.value)
            : {
                songs: buildPreviewResults(normalizedSongs),
                artists: buildPreviewResults(normalizedArtists),
                albums: buildPreviewResults(normalizedAlbums),
              };

        const hasAtLeastOneSuccess = settledResults.some(
          (result) => result.status === "fulfilled"
        );

        if (!hasAtLeastOneSuccess) {
          throw allResult.reason || songsResult.reason || artistsResult.reason || albumsResult.reason;
        }

        setResults({
          all: {
            songs:
              normalizedAll.songs.length > 0
                ? normalizedAll.songs
                : buildPreviewResults(normalizedSongs),
            artists:
              normalizedAll.artists.length > 0
                ? normalizedAll.artists
                : buildPreviewResults(normalizedArtists),
            albums:
              normalizedAll.albums.length > 0
                ? normalizedAll.albums
                : buildPreviewResults(normalizedAlbums),
          },
          songs:
            normalizedSongs.length > 0 ? normalizedSongs : normalizedAll.songs,
          artists:
            normalizedArtists.length > 0 ? normalizedArtists : normalizedAll.artists,
          albums:
            normalizedAlbums.length > 0 ? normalizedAlbums : normalizedAll.albums,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setResults(EMPTY_RESULTS);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải kết quả tìm kiếm lúc này.")
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadResults();

    return () => {
      isMounted = false;
    };
  }, [keyword]);

  const hasAnyResults = useMemo(
    () =>
      results.songs.length > 0 ||
      results.artists.length > 0 ||
      results.albums.length > 0,
    [results]
  );

  const activeResultItems = results[activeFilter] || [];
  const activeFilterMeta = FILTER_META[activeFilter] || FILTER_META.all;

  return (
    <section className="min-h-full bg-[#121212] px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="space-y-4">
          <FilterButtonGroup
            activeFilter={activeFilter}
            onChange={setActiveFilter}
          />

          {!keyword ? (
            <SearchPromptState />
          ) : loading ? (
            <LoadingState
              message="Đang tải kết quả tìm kiếm..."
              className="min-h-[320px] rounded-[18px] bg-[#181818]"
              spinnerClassName="h-7 w-7"
            />
          ) : errorMessage ? (
            <SearchErrorState errorMessage={errorMessage} />
          ) : !hasAnyResults ? (
            <SearchEmptyState title="Không tìm thấy kết quả" keyword={keyword} />
          ) : activeFilter === "all" ? (
            <AllResultsView results={results} />
          ) : activeResultItems.length === 0 ? (
            <SearchEmptyState title={activeFilterMeta.emptyTitle} keyword={keyword} />
          ) : activeFilter === "songs" ? (
            <SearchResultList items={results.songs} type={SEARCH_RESULT_TYPES.song} />
          ) : activeFilter === "artists" ? (
            <SearchResultList items={results.artists} type={SEARCH_RESULT_TYPES.artist} />
          ) : activeFilter === "albums" ? (
            <SearchResultList items={results.albums} type={SEARCH_RESULT_TYPES.album} />
          ) : (
            <div className="rounded-[18px] bg-[#181818] p-5 text-sm text-[#b3b3b3]">
              Bộ lọc này sẽ được hỗ trợ khi API tương ứng sẵn sàng.
            </div>
          )}
        </div>

        {keyword && hasAnyResults ? (
          <div className="hidden text-xs text-[#7f7f7f]">
            {`/search?q=${encodeURIComponent(keyword)}`}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default SearchResultPage;
