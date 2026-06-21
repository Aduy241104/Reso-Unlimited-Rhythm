import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import GenreTrackCard from "../../components/usergenre/GenreTrackCard";
import { getUserGenreTracks } from "../../services/userGenreService";
import { getApiErrorMessage } from "../../utils/apiError";

const PAGE_LIMIT = 20;

const normalizeGenre = (payload, genreId) => {
  const genre = payload?.genre;

  if (genre && typeof genre === "object") {
    return genre;
  }

  return {
    _id: genreId,
    name: "Thể loại",
    image: "",
  };
};

const normalizeTracks = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.tracks)) {
    return payload.tracks;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

const normalizePagination = (payload, currentPage, totalItems) => {
  const rawPagination = payload?.pagination || payload?.meta || {};
  const page = Number(rawPagination.page || rawPagination.currentPage || currentPage) || currentPage;
  const totalPages = Number(rawPagination.totalPages || rawPagination.pages || rawPagination.totalPage) || 1;
  const total = Number(rawPagination.total || rawPagination.totalItems || totalItems) || totalItems;
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
    totalPages,
    total,
    hasPrevPage,
    hasNextPage,
  };
};

const LoadingGrid = () => {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 10 }, (_, index) => (
        <div
          key={`genre-track-skeleton-${index}`}
          className="animate-pulse rounded-2xl bg-[#181818] p-3"
        >
          <div className="aspect-square rounded-xl bg-[#252525]" />
          <div className="mt-4 space-y-2 px-1 pb-1">
            <div className="h-4 w-4/5 rounded-full bg-[#2e2e2e]" />
            <div className="h-3 w-3/5 rounded-full bg-[#262626]" />
            <div className="h-3 w-2/5 rounded-full bg-[#222222]" />
          </div>
        </div>
      ))}
    </section>
  );
};

const GenreDetailPage = () => {
  const { id: routeGenreId } = useParams();
  const genreId = routeGenreId || "";
  const [genre, setGenre] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasPrevPage: false,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [genreId]);

  useEffect(() => {
    let isMounted = true;

    const loadGenreTracks = async () => {
      if (!genreId) {
        setGenre(null);
        setTracks([]);
        setPagination({
          page: 1,
          totalPages: 1,
          total: 0,
          hasPrevPage: false,
          hasNextPage: false,
        });
        setError("Thiếu mã thể loại.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const payload = await getUserGenreTracks(genreId, page, PAGE_LIMIT);
        const nextTracks = normalizeTracks(payload);
        const nextGenre = normalizeGenre(payload, genreId);
        const nextPagination = normalizePagination(payload, page, nextTracks.length);

        if (!isMounted) {
          return;
        }

        setGenre(nextGenre);
        setTracks(nextTracks);
        setPagination(nextPagination);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setGenre(null);
        setTracks([]);
        setPagination({
          page,
          totalPages: 1,
          total: 0,
          hasPrevPage: false,
          hasNextPage: false,
        });
        setError(
          getApiErrorMessage(
            requestError,
            "Không thể tải danh sách bài hát của thể lọai này."
          )
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadGenreTracks();

    return () => {
      isMounted = false;
    };
  }, [genreId, page]);

  const genreName =
    typeof genre?.name === "string" && genre.name.trim()
      ? genre.name.trim()
      : "The loai";
  const genreImage =
    typeof genre?.image === "string" && genre.image.trim()
      ? genre.image.trim()
      : "";
  const totalPages = Math.max(1, pagination?.totalPages || 1);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const basePaginationButtonClassName = "flex h-[42px] w-[42px] items-center justify-center rounded-md border font-semibold transition-all";

  return (
    <section className="space-y-8 bg-black px-1 py-2 sm:space-y-10">
      <section
        className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#1d4ed8_0%,#1e3a8a_52%,#07121f_100%)] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12"
      >
        {genreImage ? (
          <>
            <img
              src={genreImage}
              alt={genreName}
              className="absolute inset-0 h-full w-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,18,18,0.12)_0%,rgba(7,18,31,0.82)_100%)]" />
          </>
        ) : null}

        <div className="relative z-10 flex min-h-[220px] flex-col justify-end gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-white/72">
            Thể loại
          </span>
          <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-7xl">
            {genreName}
          </h1>
          <p className="text-sm text-white/72 sm:text-base">
            {pagination.total > 0
              ? `${pagination.total} bài hát đang có trong thể loại này`
              : "Khám phá những bài hát nổi bật trong thể loại này"}
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              {`${genreName} thịnh hành`}
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingGrid />
        ) : error ? (
          <section className="flex min-h-[220px] items-center justify-center rounded-3xl bg-[#121212] px-6 text-center">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Không thể tải thể loại</h3>
              <p className="text-sm text-white/60">{error}</p>
            </div>
          </section>
        ) : tracks.length === 0 ? (
          <section className="flex min-h-[220px] items-center justify-center rounded-3xl bg-[#121212] px-6 text-center">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Chưa có bài hát nào trong thể loại này</h3>
            </div>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
              {tracks.map((track, index) => (
                <GenreTrackCard
                  key={track?._id || track?.id || `${genreId}-track-${index}`}
                  track={track}
                />
              ))}
            </section>

            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                disabled={!pagination.hasPrevPage}
                className={[
                  basePaginationButtonClassName,
                  pagination.hasPrevPage
                    ? "bg-[#2A2A2A] border-[#4A4A4A] text-white shadow-md hover:-translate-y-[1px] hover:bg-[#3A3A3A] hover:border-[#6A6A6A]"
                    : "bg-[#1A1A1A] border-[#2A2A2A] text-[#666666] shadow-[0_6px_14px_rgba(0,0,0,0.24)]",
                ].join(" ")}
              >
                &lt;
              </button>

              {pageNumbers.map((pageNumber) => {
                const isActive = pageNumber === pagination.page;

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={[
                      basePaginationButtonClassName,
                      isActive
                        ? "bg-white border-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.25)]"
                        : "bg-[#1E1E1E] border-[#4A4A4A] text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] hover:-translate-y-[1px] hover:bg-[#2A2A2A] hover:border-[#6A6A6A]",
                    ].join(" ")}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className={[
                  basePaginationButtonClassName,
                  pagination.hasNextPage
                    ? "bg-[#2A2A2A] border-[#4A4A4A] text-white shadow-md hover:-translate-y-[1px] hover:bg-[#3A3A3A] hover:border-[#6A6A6A]"
                    : "bg-[#1A1A1A] border-[#2A2A2A] text-[#666666] shadow-[0_6px_14px_rgba(0,0,0,0.24)]",
                ].join(" ")}
              >
                &gt;
              </button>
            </div>
          </>
        )}
      </section>
    </section>
  );
};

export default GenreDetailPage;
