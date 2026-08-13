import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import ContentCard from "../../components/content/ContentCard";
import podcastService from "../../services/podcastService";
import { usePlayer } from "../../hooks/usePlayer";
import { mapPodcastsToContentCards } from "../../utils/podcastContent";

const PodcastListPage = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { playPodcast } = usePlayer();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    podcastService
      .listPublic({ q: debouncedQuery, page, limit: 24 })
      .then((result) => {
        if (mounted) {
          setPodcasts(result.podcasts || []);
          setPagination(result.pagination || null);
          setError("");
        }
      })
      .catch(() => {
        if (mounted) {
          setPodcasts([]);
          setPagination(null);
          setError("Không thể tải danh sách Podcast lúc này.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [debouncedQuery, page]);

  const podcastItems = mapPodcastsToContentCards(podcasts);

  return (
    <section className="min-w-0 space-y-6 p-5 text-[#f7f1ea] sm:space-y-8 lg:p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="space-y-1.5">
          <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#a1a1aa]">
            Reso Podcasts
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Những câu chuyện đáng nghe
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[#a1a1aa]">
            Khám phá các Podcast đã được kiểm duyệt và phát hành công khai trên Reso.
          </p>
        </div>

        <label className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[#a1a1aa] transition focus-within:border-[#f5b66f]/60 focus-within:bg-white/[0.06] lg:max-w-xs">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm Podcast..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#71717a]"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="aspect-square animate-pulse rounded-[9px] bg-white/[0.08]" />
              <div className="h-4 animate-pulse rounded bg-white/[0.08]" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      ) : podcastItems.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-sm text-[#a1a1aa]">
          Chưa có Podcast phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {podcastItems.map((item) => (
            <ContentCard
              key={item.id}
              image={item.image}
              title={item.title}
              subtitle={item.subtitle}
              type="Podcast"
              href={item.href}
              onPlay={() => {
                if (item.raw?.audioUrl) {
                  void playPodcast(item.raw);
                }
              }}
            />
          ))}
        </div>
      )}

      {pagination?.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4 text-sm text-[#a1a1aa]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>
          <span>Trang {page} / {pagination.totalPages}</span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default PodcastListPage;
