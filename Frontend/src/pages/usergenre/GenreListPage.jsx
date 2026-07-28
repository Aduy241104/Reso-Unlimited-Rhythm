import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import GenreCard from "../../components/usergenre/GenreCard";
import { getUserGenres } from "../../services/userGenreService";
import { getApiErrorMessage } from "../../utils/apiError";

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
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
      </div>
    </section>
  );
};

const ErrorState = ({ message }) => {
  return (
    <section className="flex min-h-[280px] items-center justify-center rounded-3xl bg-[#121212] px-6 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">{ "Kh\u00f4ng th\u1ec3 t\u1ea3i th\u1ec3 lo\u1ea1i" }</h2>
        { message ? (
          <p className="text-sm text-white/60">{ message }</p>
        ) : null }
      </div>
    </section>
  );
};

const EmptyState = () => {
  return (
    <section className="flex min-h-[280px] items-center justify-center rounded-3xl bg-[#121212] px-6 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">{ "Ch\u01b0a c\u00f3 th\u1ec3 lo\u1ea1i n\u00e0o" }</h2>
        <p className="text-sm text-white/60">
          { "Danh s\u00e1ch th\u1ec3 lo\u1ea1i s\u1ebd xu\u1ea5t hi\u1ec7n t\u1ea1i \u0111\u00e2y khi d\u1eef li\u1ec7u s\u1eb5n s\u00e0ng." }
        </p>
      </div>
    </section>
  );
};

const GenreListPage = () => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setGenres([]);
        setError(
          getApiErrorMessage(
            requestError,
            "Không thể tải danh sác thể loại lúc này."
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

  return (
    <section className="space-y-8 bg-black px-1 py-2 sm:space-y-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          { "Duyệt tìm tất cả" }
        </h1>
      </div>

      { loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={ error } />
      ) : genres.length === 0 ? (
        <EmptyState />
      ) : (
        <section
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label={ "Danh sách thể lọai" }
        >
          { genres.map((genre, index) => (
            <GenreCard
              key={ genre?.genreId || genre?.id || genre?.name || `genre-${index}` }
              genre={ genre }
            />
          )) }
        </section>
      ) }
    </section>
  );
};

export default GenreListPage;
