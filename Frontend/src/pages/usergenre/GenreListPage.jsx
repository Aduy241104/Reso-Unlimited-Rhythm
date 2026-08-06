import { useEffect, useState } from "react";
import CenteredLoadingState from "../../components/common/LoadingState";
import GenreCard from "../../components/usergenre/GenreCard";
import { getUserGenres } from "../../services/userGenreService";
import { getApiErrorMessage } from "../../utils/apiError";

const INITIAL_VISIBLE_GENRE_COUNT = 12;
const LOAD_MORE_GENRE_COUNT = 12;

const normalizeGenres = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.genres)) {
    return payload.genres;
  }

  return [];
};

const LoadingState = () => {
  return (
    <section className="flex min-h-[280px] items-center justify-center rounded-3xl bg-[#121212]">
      <CenteredLoadingState
        message="Đang tải thể loại..."
        spinnerClassName="h-7 w-7"
      />
    </section>
  );
};

const ErrorState = ({ message }) => {
  return (
    <section className="flex min-h-[280px] items-center justify-center rounded-3xl bg-[#121212] px-6 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Không thể tải thể loại</h2>
        {message ? (
          <p className="text-sm text-white/60">{message}</p>
        ) : null}
      </div>
    </section>
  );
};

const EmptyState = () => {
  return (
    <section className="flex min-h-[280px] items-center justify-center rounded-3xl bg-[#121212] px-6 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Chưa có thể loại nào</h2>
        <p className="text-sm text-white/60">
          Danh sách thể loại sẽ xuất hiện tại đây khi dữ liệu sẵn sàng.
        </p>
      </div>
    </section>
  );
};

const GenreListPage = () => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleGenreCount, setVisibleGenreCount] = useState(
    INITIAL_VISIBLE_GENRE_COUNT
  );

  useEffect(() => {
    let isMounted = true;

    const loadGenres = async () => {
      setLoading(true);
      setError("");

      try {
        const payload = await getUserGenres();
        const nextGenres = normalizeGenres(payload);

        if (!isMounted) {
          return;
        }

        setGenres(nextGenres);
        setVisibleGenreCount(INITIAL_VISIBLE_GENRE_COUNT);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setGenres([]);
        setVisibleGenreCount(INITIAL_VISIBLE_GENRE_COUNT);
        setError(
          getApiErrorMessage(
            requestError,
            "Không thể tải danh sách thể loại lúc này."
          )
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadGenres();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleGenres = genres.slice(0, visibleGenreCount);
  const shouldShowLoadMoreButton = visibleGenres.length < genres.length;

  const handleLoadMoreGenres = () => {
    setVisibleGenreCount((currentValue) => currentValue + LOAD_MORE_GENRE_COUNT);
  };

  return (
    <section className="space-y-8 bg-black px-1 py-2 sm:space-y-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Duyệt tìm tất cả
        </h1>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : genres.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <section
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            aria-label="Danh sách thể loại"
          >
            {visibleGenres.map((genre, index) => (
              <GenreCard
                key={genre?.genreId || genre?.id || genre?.name || `genre-${index}`}
                genre={genre}
              />
            ))}
          </section>

          {shouldShowLoadMoreButton ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLoadMoreGenres}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Xem thêm
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default GenreListPage;
