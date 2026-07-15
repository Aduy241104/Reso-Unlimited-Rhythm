import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import PlaylistCard from "../../components/userPlaylist/PlaylistCard";
import { getUserPlaylists } from "../../services/userPlaylistService";
import { getApiErrorMessage } from "../../utils/apiError";

const PLAYLISTS_PER_PAGE = 10;
const USER_PLAYLISTS_CHANGED_EVENT = "user-playlists:changed";

const normalizePlaylists = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.playlists)) {
    return payload.playlists;
  }

  return [];
};

const toPositiveNumber = (value) => {
  const normalizedValue = Number(value);

  return Number.isFinite(normalizedValue) && normalizedValue > 0
    ? normalizedValue
    : null;
};

const resolvePaginationSource = (payload) =>
  payload?.pagination || payload?.meta || payload || {};

const getPaginationMeta = (payload, currentPage, fallbackTotal) => {
  const source = resolvePaginationSource(payload);
  const page = toPositiveNumber(
    source?.page || source?.currentPage || source?.pageNumber
  );
  const limit = toPositiveNumber(source?.limit || source?.pageSize);
  const total = toPositiveNumber(
    source?.total || source?.totalItems || source?.count
  );
  const totalPages = toPositiveNumber(
    source?.totalPages || source?.pages || source?.totalPage
  );

  return {
    page: page || currentPage,
    limit: limit || PLAYLISTS_PER_PAGE,
    total: total || fallbackTotal,
    totalPages:
      totalPages ||
      Math.max(
        1,
        Math.ceil((total || fallbackTotal || 0) / (limit || PLAYLISTS_PER_PAGE))
      ),
  };
};

const getLocalPaginationMeta = (currentPage, totalItems) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / PLAYLISTS_PER_PAGE));
  const page = Math.min(Math.max(currentPage, 1), totalPages);

  return {
    page,
    limit: PLAYLISTS_PER_PAGE,
    total: totalItems,
    totalPages,
  };
};

const LoadingState = () => {
  return (
    <section className="flex min-h-[280px] items-center justify-center rounded-3xl bg-black">
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
        <h2 className="text-2xl font-bold text-white">Không thể tải playlist</h2>
        {message ? <p className="text-sm text-white/60">{message}</p> : null}
      </div>
    </section>
  );
};

const EmptyState = () => {
  return (
    <section className="flex min-h-[280px] items-center justify-center rounded-3xl bg-[#121212] px-6 text-center">
      <h2 className="text-2xl font-bold text-white">Chưa có playlist nào</h2>
    </section>
  );
};

const UserPlaylistPage = () => {
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PLAYLISTS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });

  const loadPlaylists = useCallback(async (page) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const payload = await getUserPlaylists({
        page,
        limit: PLAYLISTS_PER_PAGE,
      });
      const nextPlaylists = normalizePlaylists(payload);
      const paginationSource = resolvePaginationSource(payload);
      const hasBackendPagination =
        toPositiveNumber(paginationSource?.totalPages) !== null ||
        toPositiveNumber(paginationSource?.total) !== null ||
        toPositiveNumber(paginationSource?.totalItems) !== null;

      if (hasBackendPagination) {
        const nextPagination = getPaginationMeta(payload, page, nextPlaylists.length);

        setPlaylists(nextPlaylists);
        setPagination(nextPagination);

        if (nextPagination.page !== page) {
          setCurrentPage(nextPagination.page);
        }

        return;
      }

      const nextPagination = getLocalPaginationMeta(page, nextPlaylists.length);
      const startIndex = (nextPagination.page - 1) * PLAYLISTS_PER_PAGE;

      setPlaylists(
        nextPlaylists.slice(startIndex, startIndex + PLAYLISTS_PER_PAGE)
      );
      setPagination(nextPagination);

      if (nextPagination.page !== page) {
        setCurrentPage(nextPagination.page);
      }
    } catch (error) {
      setPlaylists([]);
      setPagination({
        page: 1,
        limit: PLAYLISTS_PER_PAGE,
        total: 0,
        totalPages: 1,
      });
      setErrorMessage(getApiErrorMessage(error, "Không thể tải playlist"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaylists(currentPage);
  }, [currentPage, loadPlaylists]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handlePlaylistsChanged = () => {
      void loadPlaylists(currentPage);
    };

    window.addEventListener(USER_PLAYLISTS_CHANGED_EVENT, handlePlaylistsChanged);

    return () => {
      window.removeEventListener(
        USER_PLAYLISTS_CHANGED_EVENT,
        handlePlaylistsChanged
      );
    };
  }, [currentPage, loadPlaylists]);

  const pageNumbers = useMemo(
    () =>
      Array.from(
        { length: Math.max(1, pagination.totalPages || 1) },
        (_, index) => index + 1
      ),
    [pagination.totalPages]
  );

  const handleChangePage = (nextPage) => {
    const normalizedPage = Number(nextPage);

    if (!Number.isFinite(normalizedPage)) {
      return;
    }

    const clampedPage = Math.min(
      Math.max(normalizedPage, 1),
      Math.max(1, pagination.totalPages || 1)
    );

    if (clampedPage === currentPage) {
      return;
    }

    setCurrentPage(clampedPage);
  };

  return (
    <section className="space-y-8 bg-black px-1 py-2 sm:space-y-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Playlist Công Khai
        </h1>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} />
      ) : playlists.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <section
            className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
            aria-label="Playlist Công khai"
          >
            {playlists.map((playlist, index) => (
              <PlaylistCard
                key={playlist?.playlistId || `${playlist?.name || "playlist"}-${index}`}
                playlist={playlist}
              />
            ))}
          </section>

          {pagination.totalPages > 1 ? (
            <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#121212] px-4 py-4 sm:flex-row sm:px-6">
              <p className="text-sm text-white/60">
                Trang {pagination.page} / {pagination.totalPages}
                {pagination.total > 0 ? ` • ${pagination.total} playlist` : ""}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChangePage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="inline-flex min-w-[78px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Trước
                </button>

                {pageNumbers.map((pageNumber) => {
                  const isActive = pageNumber === currentPage;

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => handleChangePage(pageNumber)}
                      className={[
                        "inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-medium transition",
                        isActive
                          ? "border-white bg-white text-[#111111]"
                          : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]",
                      ].join(" ")}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleChangePage(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages}
                  className="inline-flex min-w-[78px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default UserPlaylistPage;
