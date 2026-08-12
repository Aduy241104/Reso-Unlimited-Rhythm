import { ArrowRight, SearchX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ArtistCard from "../../components/libary/ArtistCard";
import ContentCard from "../../components/content/ContentCard";
import SearchResultItem from "../../components/search/SearchResultItem";
import {
  resolveSearchItemImage,
  resolveSearchItemPath,
  resolveSearchItemPrimaryText,
  resolveSearchItemSecondaryText,
  resolveSearchItemTypeLabel,
  SEARCH_RESULT_TYPES,
} from "../../components/search/searchResultUtils";
import CenteredLoadingState from "../../components/common/LoadingState";
import { useContentPlayback } from "../../hooks/useContentPlayback";
import { usePlayer } from "../../hooks/usePlayer";
import {
  normalizeSearchAllPayload,
  normalizeSearchCollection,
  searchAlbums,
  searchAll,
  searchArtists,
  searchPlaylists,
  searchPodcasts,
  searchSongs,
} from "../../services/searchService";
import { getApiErrorMessage } from "../../utils/apiError";
import { mapPodcastToContentCard } from "../../utils/podcastContent";

const EMPTY_RESULTS = {
  songs: [],
  artists: [],
  albums: [],
  podcasts: [],
  playlists: [],
};

const PREVIEW_LIMITS = {
  songs: 4,
  podcasts: 5,
  collections: 5,
  artists: 5,
};

const EXPANDED_LIMIT = 20;

const getItemId = (item) =>
  item?._id || item?.id || item?.trackId || item?.artistId || item?.albumId || "";

const buildCombinedResults = (results) => {
  const collections = [
    [results?.songs, SEARCH_RESULT_TYPES.song],
    [results?.artists, SEARCH_RESULT_TYPES.artist],
    [results?.albums, SEARCH_RESULT_TYPES.album],
    [results?.podcasts, SEARCH_RESULT_TYPES.podcast],
    [results?.playlists, SEARCH_RESULT_TYPES.playlist],
  ];

  return collections
    .flatMap(([items, type]) =>
      Array.isArray(items)
        ? items.map((item) => ({ item, type }))
        : []
    )
    .sort(
      (left, right) =>
        (Number(right.item?.searchScore) || 0) -
        (Number(left.item?.searchScore) || 0)
    );
};

const getPopularityCount = (item, type) => {
  if (type === SEARCH_RESULT_TYPES.song) {
    return Number(item?.stats?.totalPlay) || 0;
  }

  if (type === SEARCH_RESULT_TYPES.podcast) {
    return Number(item?.stats?.totalListen) || 0;
  }

  if (type === SEARCH_RESULT_TYPES.artist) {
    return Number(item?.stats?.followers) || 0;
  }

  return Number(item?.stats?.totalPlay || item?.stats?.totalListen) || 0;
};

const buildFeaturedResults = (results) => {
  const songs = Array.isArray(results?.songs)
    ? results.songs.map((item) => ({ item, type: SEARCH_RESULT_TYPES.song }))
    : [];

  if (songs.length > 0) {
    return songs
      .sort((left, right) => {
        const rightScore = Number(right.item?.searchScore) || 0;
        const leftScore = Number(left.item?.searchScore) || 0;

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        return (
          getPopularityCount(right.item, right.type) -
          getPopularityCount(left.item, left.type)
        );
      })
      .slice(0, 3);
  }

  return buildCombinedResults(results)
    .sort((left, right) => {
      const rightPopularity = getPopularityCount(right.item, right.type);
      const leftPopularity = getPopularityCount(left.item, left.type);

      if (rightPopularity !== leftPopularity) {
        return rightPopularity - leftPopularity;
      }

      return (
        (Number(right.item?.searchScore) || 0) -
        (Number(left.item?.searchScore) || 0)
      );
    })
    .slice(0, 3);
};

const getPagination = (payload) => {
  const containers = [
    payload,
    payload?.data,
    payload?.result,
    payload?.results,
  ].filter(Boolean);
  const pagination = containers.find((container) => container.pagination)?.pagination;

  if (!pagination) {
    return null;
  }

  return {
    page: Number(pagination.page) || 1,
    limit: Number(pagination.limit) || EXPANDED_LIMIT,
    total: Number(pagination.total) || 0,
    totalPages: Number(pagination.totalPages) || 1,
  };
};

const getCollectionPayload = (payload, type) => ({
  items: normalizeSearchCollection(payload, type),
  pagination: getPagination(payload),
});

const LoadingState = () => (
  <CenteredLoadingState
    message="Đang tải kết quả tìm kiếm..."
    className="min-h-[320px]"
  />
);

const EmptyState = () => (
  <section className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05] text-[#b3b3b3]">
      <SearchX className="h-6 w-6" />
    </div>
    <h2 className="mt-4 text-xl font-bold text-white">
      Không tìm thấy kết quả phù hợp
    </h2>
  </section>
);

const SearchSection = ({
  title,
  children,
  canViewAll = false,
  isExpanded = false,
  isLoading = false,
  onViewAll,
}) => (
  <section className="space-y-4 sm:space-y-5">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
        {title}
      </h2>
      {canViewAll ? (
        <button
          type="button"
          onClick={onViewAll}
          disabled={isLoading}
          className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a7a0b2] transition hover:text-white disabled:cursor-wait disabled:opacity-60 sm:text-xs"
        >
          {isExpanded ? "Thu gọn" : "Tất cả"}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
    {children}
  </section>
);

const PaginationControls = ({ pagination, loading, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 pt-2 text-sm text-[#a7a7a7]">
      <button
        type="button"
        disabled={loading || pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1)}
        className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Trước
      </button>
      <span>
        Trang {pagination.page} / {pagination.totalPages}
      </span>
      <button
        type="button"
        disabled={loading || pagination.page >= pagination.totalPages}
        onClick={() => onPageChange(pagination.page + 1)}
        className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sau
      </button>
    </div>
  );
};

const SearchContentCard = ({ item, type, onPlay }) => {
  const isPodcast = type === SEARCH_RESULT_TYPES.podcast;
  const isPlayableCollection =
    type === SEARCH_RESULT_TYPES.album || type === SEARCH_RESULT_TYPES.playlist;
  const contentCard = isPodcast
    ? mapPodcastToContentCard(item, { includeListenCount: false })
    : {
        id: getItemId(item),
        type: resolveSearchItemTypeLabel(type),
        image: resolveSearchItemImage(item, type),
        title: resolveSearchItemPrimaryText(item, type),
        subtitle: resolveSearchItemSecondaryText(item, type),
        href: resolveSearchItemPath(item, type),
        raw: item,
      };

  return (
    <ContentCard
      image={contentCard.image || resolveSearchItemImage(item, type)}
      title={contentCard.title}
      subtitle={
        isPodcast
          ? `Podcast · ${contentCard.subtitle}`
          : contentCard.subtitle
      }
      type={contentCard.type}
      href={contentCard.href || resolveSearchItemPath(item, type)}
      onPlay={
        isPodcast
          ? () => onPlay?.(item, type)
          : isPlayableCollection
            ? () => onPlay?.(contentCard, type)
            : undefined
      }
      playButtonAriaLabel={isPodcast || isPlayableCollection}
    />
  );
};

const FeaturedResultCard = ({ item, type, onSelect }) => {
  const imageSource = resolveSearchItemImage(item, type);
  const title = resolveSearchItemPrimaryText(item, type);
  const subtitle = resolveSearchItemSecondaryText(item, type);
  const detailPath = resolveSearchItemPath(item, type);
  const isArtist = type === SEARCH_RESULT_TYPES.artist;

  return (
    <button
      type="button"
      onClick={() => onSelect(item, type)}
      disabled={!detailPath}
      className="group flex min-w-0 items-center gap-3 rounded-lg bg-[#21172d] px-3 py-3 text-left transition hover:bg-[#2a1d38] disabled:cursor-default disabled:opacity-70 sm:gap-4 sm:px-4 sm:py-3.5"
    >
      <img
        src={imageSource}
        alt={title}
        className={`h-14 w-14 shrink-0 object-cover transition group-hover:scale-[1.03] sm:h-[4.5rem] sm:w-[4.5rem] ${
          isArtist ? "rounded-full" : "rounded-md"
        }`}
      />
      <span className="min-w-0">
        <span className="block truncate text-[11px] text-[#91879d] sm:text-xs">
          {resolveSearchItemTypeLabel(type)}
        </span>
        <span className="mt-1 block truncate text-sm font-bold text-white sm:text-base">
          {title}
        </span>
        <span className="mt-1 block truncate text-xs text-[#a7a0b2]">
          {subtitle}
        </span>
      </span>
    </button>
  );
};

const CardRail = ({ items, type, onPlay }) => (
  <div className="flex min-w-0 gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
    {items.map((item, index) => (
      <div
        key={`${type}-${getItemId(item) || index}`}
        className="h-[13.5rem] w-[9.25rem] min-w-[9.25rem] shrink-0 sm:h-[16rem] sm:w-[11rem] sm:min-w-[11rem] lg:h-[17rem] lg:w-[12rem] lg:min-w-[12rem]"
      >
        <SearchContentCard item={item} type={type} onPlay={onPlay} />
      </div>
    ))}
  </div>
);

const TypedCardRail = ({ items, onPlay }) => (
  <div className="flex min-w-0 gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
    {items.map(({ item, type }, index) => (
      <div
        key={`${type}-${getItemId(item) || index}`}
        className="h-[13.5rem] w-[9.25rem] min-w-[9.25rem] shrink-0 sm:h-[16rem] sm:w-[11rem] sm:min-w-[11rem] lg:h-[17rem] lg:w-[12rem] lg:min-w-[12rem]"
      >
        <SearchContentCard
          item={item}
          type={type}
          onPlay={(contentCard, contentType) =>
            onPlay?.(contentCard, contentType)
          }
        />
      </div>
    ))}
  </div>
);

const ArtistRail = ({ artists, onSelect }) => (
  <div className="flex min-w-0 gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
    {artists.map((artist, index) => (
      <div
        key={`artist-${getItemId(artist) || index}`}
        className="w-[10.5rem] min-w-[10.5rem] shrink-0 sm:w-[12.5rem] sm:min-w-[12.5rem]"
      >
        <ArtistCard
          artist={{
            ...artist,
            name: resolveSearchItemPrimaryText(artist, SEARCH_RESULT_TYPES.artist),
            avatar: resolveSearchItemImage(artist, SEARCH_RESULT_TYPES.artist),
          }}
          onClick={() => onSelect(artist)}
        />
      </div>
    ))}
  </div>
);

const SearchResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedSection, setExpandedSection] = useState("");
  const [expandedItems, setExpandedItems] = useState([]);
  const [expandedPagination, setExpandedPagination] = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedError, setExpandedError] = useState("");
  const requestIdRef = useRef(0);
  const expandedRequestIdRef = useRef(0);
  const keyword = (searchParams.get("q") || "").trim();
  const { playPodcast } = usePlayer();
  const { playAlbumItem, playPlaylistItem } = useContentPlayback();

  useEffect(() => {
    const requestId = ++requestIdRef.current;
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
      setExpandedSection("");
      setExpandedItems([]);
      setExpandedPagination(null);
      setExpandedError("");

      try {
        const payload = await searchAll(keyword);
        const nextResults = normalizeSearchAllPayload(payload);

        if (!isMounted || requestId !== requestIdRef.current) {
          return;
        }

        setResults(nextResults);
      } catch (error) {
        if (!isMounted || requestId !== requestIdRef.current) {
          return;
        }

        setResults(EMPTY_RESULTS);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải kết quả tìm kiếm lúc này.")
        );
      } finally {
        if (isMounted && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    void loadResults();

    return () => {
      isMounted = false;
    };
  }, [keyword]);

  const loadExpandedPage = async (section, page = 1) => {
    if (!keyword) {
      return;
    }

    const requestId = ++expandedRequestIdRef.current;
    setExpandedSection(section);
    setExpandedItems([]);
    setExpandedPagination(null);
    setExpandedLoading(true);
    setExpandedError("");

    try {
      let nextItems = [];
      let nextPagination = null;

      if (section === "collections") {
        const [albumsPayload, playlistsPayload] = await Promise.all([
          searchAlbums(keyword, page, EXPANDED_LIMIT),
          searchPlaylists(keyword, page, EXPANDED_LIMIT),
        ]);
        const albums = getCollectionPayload(albumsPayload, "album");
        const playlists = getCollectionPayload(playlistsPayload, "playlist");
        nextItems = [
          ...albums.items.map((item) => ({ item, type: SEARCH_RESULT_TYPES.album })),
          ...playlists.items.map((item) => ({
            item,
            type: SEARCH_RESULT_TYPES.playlist,
          })),
        ].sort(
          (left, right) =>
            (Number(right.item?.searchScore) || 0) -
            (Number(left.item?.searchScore) || 0)
        );
        nextPagination = {
          page,
          limit: EXPANDED_LIMIT,
          total: (albums.pagination?.total || 0) + (playlists.pagination?.total || 0),
          totalPages: Math.max(
            albums.pagination?.totalPages || 1,
            playlists.pagination?.totalPages || 1
          ),
        };
      } else {
        const endpointBySection = {
          songs: [searchSongs, "song"],
          podcasts: [searchPodcasts, "podcast"],
          artists: [searchArtists, "artist"],
        };
        const [request, type] = endpointBySection[section] || [];

        if (!request) {
          return;
        }

        const payload = await request(keyword, page, EXPANDED_LIMIT);
        const collection = getCollectionPayload(payload, type);
        nextItems = collection.items.map((item) => ({ item, type }));
        nextPagination = collection.pagination;
      }

      if (requestId !== expandedRequestIdRef.current) {
        return;
      }

      setExpandedItems(nextItems);
      setExpandedPagination(nextPagination);
    } catch (error) {
      if (requestId === expandedRequestIdRef.current) {
        setExpandedError(
          getApiErrorMessage(error, "Không thể tải thêm kết quả lúc này.")
        );
      }
    } finally {
      if (requestId === expandedRequestIdRef.current) {
        setExpandedLoading(false);
      }
    }
  };

  const combinedResults = useMemo(() => buildCombinedResults(results), [results]);
  const featuredResults = useMemo(() => buildFeaturedResults(results), [results]);
  const hasResults = combinedResults.length > 0;
  const collectionResults = useMemo(
    () => [
      ...results.playlists.map((item) => ({
        item,
        type: SEARCH_RESULT_TYPES.playlist,
      })),
      ...results.albums.map((item) => ({
        item,
        type: SEARCH_RESULT_TYPES.album,
      })),
    ].sort(
      (left, right) =>
        (Number(right.item?.searchScore) || 0) -
        (Number(left.item?.searchScore) || 0)
    ),
    [results.albums, results.playlists]
  );

  const getSectionItems = (section, initialItems) =>
    expandedSection === section ? expandedItems.map(({ item }) => item) : initialItems;

  const getSectionTypes = (section, initialItems, initialType) =>
    expandedSection === section
      ? expandedItems
      : initialItems.map((item) => ({ item, type: initialType }));

  const handleArtistSelect = (artist) => {
    const path = resolveSearchItemPath(artist, SEARCH_RESULT_TYPES.artist);

    if (path) {
      navigate(path);
    }
  };

  const handleFeaturedSelect = (item, type) => {
    const path = resolveSearchItemPath(item, type);

    if (path) {
      navigate(path);
    }
  };

  const renderExpandedState = () => {
    if (expandedLoading) {
      return <LoadingState />;
    }

    if (expandedError) {
      return (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {expandedError}
        </p>
      );
    }

    return null;
  };

  return (
    <section className="min-w-0 bg-[#160d23] px-4 py-5 pb-16 text-white sm:px-7 sm:py-7 lg:px-10">
      {!keyword ? (
        <EmptyState />
      ) : loading ? (
        <LoadingState />
      ) : errorMessage ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
          <h2 className="text-xl font-bold text-white">Không thể tải kết quả</h2>
          <p className="mt-2 max-w-md text-sm text-[#b3b3b3]">{errorMessage}</p>
        </section>
      ) : !hasResults ? (
        <EmptyState />
      ) : (
        <div className="mx-auto max-w-[1280px] space-y-9 sm:space-y-11">
          <header className="border-b border-white/[0.07] pb-5 sm:pb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a7a0b2]">
              Kết quả tìm kiếm
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              &quot;{keyword}&quot;
            </h1>
          </header>

          <SearchSection title="Nổi bật">
            <div className="grid gap-3 md:grid-cols-3">
              {featuredResults.map(({ item, type }, index) => (
                <FeaturedResultCard
                  key={`featured-${type}-${getItemId(item) || index}`}
                  item={item}
                  type={type}
                  onSelect={handleFeaturedSelect}
                />
              ))}
            </div>
          </SearchSection>

          {results.songs.length > 0 ? (
            <SearchSection
              title="Bài hát"
              canViewAll={results.songs.length > PREVIEW_LIMITS.songs || expandedSection === "songs"}
              isExpanded={expandedSection === "songs"}
              isLoading={expandedLoading && expandedSection === "songs"}
              onViewAll={() =>
                expandedSection === "songs"
                  ? setExpandedSection("")
                  : void loadExpandedPage("songs")
              }
            >
              {expandedSection === "songs" ? renderExpandedState() : null}
              <div className="grid gap-1 lg:grid-cols-2">
                {getSectionTypes("songs", results.songs, SEARCH_RESULT_TYPES.song)
                  .slice(
                    0,
                    expandedSection === "songs" ? expandedItems.length : PREVIEW_LIMITS.songs
                  )
                  .map(({ item, type }, index) => (
                    <SearchResultItem
                      key={`song-${getItemId(item) || index}`}
                      item={item}
                      type={type}
                      className="rounded-none border-b border-white/[0.06] px-2 py-3 first:border-t first:border-white/[0.06] hover:bg-[#21172d] sm:px-3"
                      showTrackMenu
                      showDuration
                    />
                  ))}
              </div>
              {expandedSection === "songs" ? (
                <PaginationControls
                  pagination={expandedPagination}
                  loading={expandedLoading}
                  onPageChange={(page) => void loadExpandedPage("songs", page)}
                />
              ) : null}
            </SearchSection>
          ) : null}

          {results.podcasts.length > 0 ? (
            <SearchSection
              title="Podcast"
              canViewAll={
                results.podcasts.length > PREVIEW_LIMITS.podcasts ||
                expandedSection === "podcasts"
              }
              isExpanded={expandedSection === "podcasts"}
              isLoading={expandedLoading && expandedSection === "podcasts"}
              onViewAll={() =>
                expandedSection === "podcasts"
                  ? setExpandedSection("")
                  : void loadExpandedPage("podcasts")
              }
            >
              {expandedSection === "podcasts" ? renderExpandedState() : null}
              <CardRail
                items={getSectionItems("podcasts", results.podcasts).slice(
                  0,
                  expandedSection === "podcasts"
                    ? expandedItems.length
                    : PREVIEW_LIMITS.podcasts
                )}
                type={SEARCH_RESULT_TYPES.podcast}
                onPlay={(podcast) => void playPodcast(podcast)}
              />
              {expandedSection === "podcasts" ? (
                <PaginationControls
                  pagination={expandedPagination}
                  loading={expandedLoading}
                  onPageChange={(page) => void loadExpandedPage("podcasts", page)}
                />
              ) : null}
            </SearchSection>
          ) : null}

          {collectionResults.length > 0 ? (
            <SearchSection
              title="Playlist / Album"
              canViewAll={
                collectionResults.length > PREVIEW_LIMITS.collections ||
                expandedSection === "collections"
              }
              isExpanded={expandedSection === "collections"}
              isLoading={expandedLoading && expandedSection === "collections"}
              onViewAll={() =>
                expandedSection === "collections"
                  ? setExpandedSection("")
                  : void loadExpandedPage("collections")
              }
            >
              {expandedSection === "collections" ? renderExpandedState() : null}
              <TypedCardRail
                items={
                  expandedSection === "collections"
                    ? expandedItems
                    : collectionResults.slice(0, PREVIEW_LIMITS.collections)
                }
                onPlay={(contentCard, type) =>
                  type === SEARCH_RESULT_TYPES.album
                    ? void playAlbumItem(contentCard)
                    : void playPlaylistItem(contentCard)
                }
              />
              {expandedSection === "collections" ? (
                <PaginationControls
                  pagination={expandedPagination}
                  loading={expandedLoading}
                  onPageChange={(page) => void loadExpandedPage("collections", page)}
                />
              ) : null}
            </SearchSection>
          ) : null}

          {results.artists.length > 0 ? (
            <SearchSection
              title="Nghệ sĩ"
              canViewAll={results.artists.length > PREVIEW_LIMITS.artists || expandedSection === "artists"}
              isExpanded={expandedSection === "artists"}
              isLoading={expandedLoading && expandedSection === "artists"}
              onViewAll={() =>
                expandedSection === "artists"
                  ? setExpandedSection("")
                  : void loadExpandedPage("artists")
              }
            >
              {expandedSection === "artists" ? renderExpandedState() : null}
              <ArtistRail
                artists={getSectionItems("artists", results.artists).slice(
                  0,
                  expandedSection === "artists"
                    ? expandedItems.length
                    : PREVIEW_LIMITS.artists
                )}
                onSelect={handleArtistSelect}
              />
              {expandedSection === "artists" ? (
                <PaginationControls
                  pagination={expandedPagination}
                  loading={expandedLoading}
                  onPageChange={(page) => void loadExpandedPage("artists", page)}
                />
              ) : null}
            </SearchSection>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default SearchResultPage;
