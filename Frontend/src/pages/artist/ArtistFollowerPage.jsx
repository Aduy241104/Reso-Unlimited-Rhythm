import { RefreshCcw, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ArtistFollowerEmpty from "../../components/artistfollower/ArtistFollowerEmpty";
import ArtistFollowerList from "../../components/artistfollower/ArtistFollowerList";
import ArtistFollowerPagination from "../../components/artistfollower/ArtistFollowerPagination";
import ArtistFollowerSkeleton from "../../components/artistfollower/ArtistFollowerSkeleton";
import { getArtistFollowers } from "../../services/artistFollowservice";
import { getApiErrorMessage } from "../../utils/apiError";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_PAGINATION = {
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  totalItems: 0,
  totalPages: 0,
};

const ArtistFollowerPage = () => {
  const [followers, setFollowers] = useState([]);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadFollowers = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await getArtistFollowers({
          page,
          limit: DEFAULT_LIMIT,
        });

        if (!isMounted) {
          return;
        }

        const items = payload?.items || [];
        const payloadPagination = payload?.pagination || {};
        const nextPagination = {
          page: Number(payloadPagination.page || page),
          limit: Number(payloadPagination.limit || DEFAULT_LIMIT),
          totalItems: Number(payloadPagination.totalItems || 0),
          totalPages: Math.max(
            Number(payloadPagination.totalPages || 0),
            items.length > 0 ? 1 : 0
          ),
        };

        setFollowers(items);
        setPagination(nextPagination);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFollowers([]);
        setPagination({
          ...DEFAULT_PAGINATION,
          page,
        });
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải danh sách người theo dõi.")
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadFollowers();

    return () => {
      isMounted = false;
    };
  }, [page, reloadKey]);

  const totalFollowers = Number(pagination?.totalItems || 0);
  const totalPages = Math.max(Number(pagination?.totalPages || 0), 1);
  const currentPage = Number(pagination?.page || page || DEFAULT_PAGE);
  const currentRangeLabel = useMemo(() => {
    if (totalFollowers === 0) {
      return "0";
    }

    const start = (currentPage - 1) * DEFAULT_LIMIT + 1;
    const end = Math.min(currentPage * DEFAULT_LIMIT, totalFollowers);

    return `${start}-${end}`;
  }, [currentPage, totalFollowers]);

  const handlePreviousPage = () => {
    setPage((current) => Math.max(DEFAULT_PAGE, current - 1));
  };

  const handleNextPage = () => {
    setPage((current) => Math.min(totalPages, current + 1));
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[#ebe6ff] bg-white shadow-[0_24px_60px_-36px_rgba(70,42,135,0.35)] dark:border-white/10 dark:bg-[#181818] dark:shadow-none">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(124,108,242,0.18),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(140,112,240,0.12),_transparent_35%),linear-gradient(135deg,#ffffff_0%,#fcfbff_56%,#f7f4ff_100%)] px-5 py-6 dark:bg-[radial-gradient(circle_at_top_left,_rgba(124,108,242,0.22),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(140,112,240,0.18),_transparent_35%),linear-gradient(135deg,#181818_0%,#1b1b1f_56%,#17171a_100%)] sm:px-7 sm:py-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#241b15] dark:text-white">
                Danh sách người theo dõi
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6a647d] dark:text-[#a1a1aa]">
                Theo dõi những người dùng đang quan tâm đến bạn và xem thời điểm họ bắt đầu theo dõi.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRetry}
              disabled={isLoading}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#e7e1ff] bg-white px-4 py-3 text-sm font-medium text-[#2f2747] shadow-sm transition hover:border-[#cbbfff] hover:bg-[#faf8ff] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            >
              <RefreshCcw className={["h-4 w-4", isLoading ? "animate-spin" : ""].join(" ")} />
              Tải lại danh sách
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[20px] border border-[#efeaff] bg-white/80 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-sm text-[#7c7891] dark:text-[#a1a1aa]">Tổng người theo dõi</p>
              <p className="mt-2 text-2xl font-semibold text-[#2f2747] dark:text-white">
                {totalFollowers}
              </p>
            </div>

            <div className="rounded-[20px] border border-[#efeaff] bg-white/80 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-sm text-[#7c7891] dark:text-[#a1a1aa]">Trang hiện tại</p>
              <p className="mt-2 text-2xl font-semibold text-[#2f2747] dark:text-white">
                {currentPage}
              </p>
            </div>

            <div className="rounded-[20px] border border-[#efeaff] bg-white/80 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-sm text-[#7c7891] dark:text-[#a1a1aa]">Đang hiển thị</p>
              <p className="mt-2 text-2xl font-semibold text-[#2f2747] dark:text-white">
                {currentRangeLabel}
              </p>
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[24px] border border-[#ebe6ff] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181818] sm:p-5">
        <div className="mb-5 flex flex-col gap-3 border-b border-[#f0ebff] pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[#6f5cf1] dark:text-[#c4bbff]">
              <Users className="h-4 w-4" />
              Người theo dõi gần đây
            </div>
            <p className="mt-2 text-sm text-[#7b7494] dark:text-[#a1a1aa]">
              Hiển thị tối đa {DEFAULT_LIMIT} người theo dõi trên mỗi trang.
            </p>
          </div>
        </div>

        {isLoading ? (
          <ArtistFollowerSkeleton />
        ) : errorMessage ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-rose-200 bg-rose-50/70 px-6 text-center dark:border-rose-400/20 dark:bg-rose-500/10">
            <p className="text-base font-semibold text-rose-900 dark:text-rose-100">
              Không thể tải danh sách người theo dõi
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-rose-700 dark:text-rose-200/90">
              Vui lòng thử lại sau ít phút hoặc tải lại danh sách để tiếp tục xem dữ liệu mới nhất.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#6f5cf1] px-5 text-sm font-semibold text-white transition hover:bg-[#5f4fe0]"
            >
              <RefreshCcw className="h-4 w-4" />
              Thử lại
            </button>
          </div>
        ) : followers.length === 0 ? (
          <ArtistFollowerEmpty />
        ) : (
          <ArtistFollowerList followers={followers} />
        )}
      </section>

      {!isLoading && !errorMessage && followers.length > 0 ? (
        <ArtistFollowerPagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalFollowers}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
          isLoading={isLoading}
        />
      ) : null}
    </section>
  );
};

export default ArtistFollowerPage;