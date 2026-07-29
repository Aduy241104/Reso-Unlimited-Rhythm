import { SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchResultItem, {
  SEARCH_RESULT_TYPES,
} from "../../components/search/SearchResultItem";
import { normalizeSearchAllPayload, searchAll } from "../../services/searchService";
import { getApiErrorMessage } from "../../utils/apiError";

const EMPTY_RESULTS = {
  songs: [],
  artists: [],
  albums: [],
};

const buildCombinedResults = (results) => {
  const songs = Array.isArray(results?.songs)
    ? results.songs.map((item) => ({ item, type: SEARCH_RESULT_TYPES.song }))
    : [];
  const artists = Array.isArray(results?.artists)
    ? results.artists.map((item) => ({ item, type: SEARCH_RESULT_TYPES.artist }))
    : [];
  const albums = Array.isArray(results?.albums)
    ? results.albums.map((item) => ({ item, type: SEARCH_RESULT_TYPES.album }))
    : [];

  return [...songs, ...artists, ...albums];
};

const LoadingState = () => (
  <section className="space-y-4 py-2">
    <div className="h-4 w-24 animate-pulse rounded-full bg-[#232323]" />
    <div className="space-y-2">
      <div className="h-16 animate-pulse rounded-2xl bg-[#1a1a1a]" />
      <div className="h-16 animate-pulse rounded-2xl bg-[#1a1a1a]" />
      <div className="h-16 animate-pulse rounded-2xl bg-[#1a1a1a]" />
    </div>
  </section>
);

const EmptyState = () => (
  <section className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05] text-[#b3b3b3]">
      <SearchX className="h-6 w-6" />
    </div>
    <h2 className="mt-4 text-xl font-bold text-white">Không tìm thấy kết quả phù hợp</h2>
  </section>
);

const SearchResultPage = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const keyword = (searchParams.get("q") || "").trim();

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
        const payload = await searchAll(keyword);
        const nextResults = normalizeSearchAllPayload(payload);

        if (!isMounted) {
          return;
        }

        setResults(nextResults);
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

  const combinedResults = useMemo(() => buildCombinedResults(results), [results]);

  return (
    <section className="space-y-6 bg-black px-1 py-2 sm:space-y-8">
      {!keyword ? (
        <EmptyState />
      ) : loading ? (
        <LoadingState />
      ) : errorMessage ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
          <h2 className="text-xl font-bold text-white">Không thể tải kết quả</h2>
          <p className="mt-2 max-w-md text-sm text-[#b3b3b3]">{errorMessage}</p>
        </section>
      ) : combinedResults.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="py-2">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">Tất cả</h2>
          </div>

          <div className="space-y-1">
            {combinedResults.map(({ item, type }, index) => (
              <SearchResultItem
                key={item?._id || item?.id || `${type}-${index}`}
                item={item}
                type={type}
                showTrackMenu
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
};

export default SearchResultPage;
