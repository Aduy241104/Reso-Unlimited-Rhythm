import { ArrowDown, ArrowUp, SearchX } from "lucide-react";
import SearchResultItem, { SEARCH_RESULT_TYPES } from "./SearchResultItem";

const MAX_VISIBLE_RESULTS = 8;

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

const SearchSuggestionDropdown = ({
  results,
  loading = false,
  visible = false,
  onSelect,
}) => {
  if (!visible) {
    return null;
  }

  const combinedResults = buildCombinedResults(results).slice(0, MAX_VISIBLE_RESULTS);
  const hasResults = combinedResults.length > 0;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-[24px] border border-white/10 bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 text-xs text-[#b3b3b3]">
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-medium text-white">
          Enter
        </span>
        <span>Tìm kiếm</span>
      </div>

      {loading ? (
        <div className="flex min-h-28 items-center justify-center px-4 py-6 text-sm text-[#b3b3b3]">
          Đang tìm kiếm...
        </div>
      ) : hasResults ? (
        <div className="max-h-[360px] overflow-y-auto px-2 py-2">
          {combinedResults.map(({ item, type }, index) => (
            <SearchResultItem
              key={item?._id || item?.id || `${type}-${index}`}
              item={item}
              type={type}
              compact
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-28 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-[#b3b3b3]">
            <SearchX className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-white">Không tìm thấy kết quả phù hợp</p>
        </div>
      )}
    </div>
  );
};

export default SearchSuggestionDropdown;
