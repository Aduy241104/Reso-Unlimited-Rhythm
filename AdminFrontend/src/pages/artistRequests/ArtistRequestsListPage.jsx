import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import { getArtistRequestsService } from "../../services/artistRequestService";
import { routePaths } from "../../routes/routePaths";

const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Đã từ chối" },
];

const getStatusClasses = (status) => {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-amber-100 text-amber-800";
  }
};

const getAccentClasses = (status) => {
  switch (status) {
    case "approved":
      return "bg-emerald-500";
    case "rejected":
      return "bg-rose-500";
    default:
      return "bg-amber-500";
  }
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "AR";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
};

const HeaderStat = ({ label, value }) => (
  <div className="rounded-xl bg-slate-100 px-4 py-3">
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
      {label}
    </p>
    <p className="mt-1.5 text-lg font-semibold text-slate-900">{value}</p>
  </div>
);

const EmptyState = ({ isLoading }) => (
  <div className="rounded-[1.75rem] bg-white px-6 py-20 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <div>
      <p className="text-base font-semibold text-black">
        {isLoading ? "Đang tải danh sách..." : "Không tìm thấy yêu cầu nào."}
      </p>
      <p className="mt-2 text-sm text-black/45">
        Hãy thử từ khóa hoặc bộ lọc trạng thái khác.
      </p>
    </div>
  </div>
);

const ArtistRequestsListPage = () => {
  const [artistRequests, setArtistRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState({
    q: "",
    status: "",
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadArtistRequests = async (params = query) => {
    setIsLoading(true);
    setMessage("");

    try {
      const result = await getArtistRequestsService(params);
      setArtistRequests(result.artistRequests);
      setPagination(result.pagination);
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Khong the tai danh sach yeu cau."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadArtistRequests(query);
  }, [query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    setQuery((prev) => ({
      ...prev,
      q: searchTerm.trim(),
      page: 1,
    }));
  };

  const handleStatusChange = (event) => {
    setQuery((prev) => ({
      ...prev,
      status: event.target.value,
      page: 1,
    }));
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({
      ...prev,
      page: selected + 1,
    }));
  };

  const total = pagination?.total ?? 0;
  const visibleCount = artistRequests.length;
  const pageLabel = pagination
    ? `${pagination.page}/${pagination.totalPages}`
    : "1/1";

  const formatStatus = (status) => {
    if (status === "pending") return "Chờ duyệt";
    if (status === "approved") return "Đã duyệt";
    if (status === "rejected") return "Đã từ chối";
    return "-";
  };

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Đăng ký Artist
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Danh sách yêu cầu
            </h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <HeaderStat label="Tổng số" value={total} />
            <HeaderStat label="Hiển thị" value={visibleCount} />
            <HeaderStat label="Trang" value={pageLabel} />
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] md:grid-cols-[minmax(0,1fr)_220px_132px]"
      >
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo nghệ danh, người nộp hồ sơ, CCCD"
            className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
          />
        </label>

        <select
          value={query.status}
          onChange={handleStatusChange}
          className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
        >
          {statusOptions.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Tìm kiếm
        </button>
      </form>

      {message && (
        <div className="bg-red-50 px-5 py-4 text-sm text-red-700">{message}</div>
      )}

      {artistRequests.length === 0 ? (
        <EmptyState isLoading={isLoading} />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="grid min-w-[980px] grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_140px_170px_132px] gap-4 border-b border-slate-200 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            <span>Artist</span>
            <span>Người nộp</span>
            <span>Email</span>
            <span>Trạng thái</span>
            <span>Ngày nộp</span>
            <span className="text-right">Chi tiết</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[980px] divide-y divide-slate-100">
          {artistRequests.map((request) => (
            <article
              key={request._id}
              className="relative grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_140px_170px_132px] gap-4 px-5 py-4 transition hover:bg-slate-50"
            >
              <div
                className={`absolute inset-y-2 left-0 w-1 rounded-r ${getAccentClasses(
                  request.status
                )}`}
              />

              <div className="flex min-w-0 items-center gap-3">
                {request.avatar ? (
                  <img
                    src={request.avatar}
                    alt={request.stageName}
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-xs font-semibold text-white">
                    {getInitials(request.stageName)}
                  </div>
                )}

                <p className="truncate text-sm font-semibold text-slate-950">
                  {request.stageName || "-"}
                </p>
              </div>

              <p className="truncate text-sm text-slate-700">
                {request.userId?.profile?.fullName || "-"}
              </p>

              <p className="truncate text-sm text-slate-700">
                {request.userId?.email || "-"}
              </p>

              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                    request.status
                  )}`}
                >
                  {formatStatus(request.status)}
                </span>
              </div>

              <p className="text-sm text-slate-700">
                {formatDate(request.createdAt)}
              </p>

              <div className="flex justify-end">
                <Link
                  to={routePaths.artistRequestDetail(request._id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Xem
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </article>
          ))}
            </div>
          </div>
        </div>
      )}

      {pagination?.totalPages > 1 && (
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} /{" "}
            {pagination.total}
          </p>

          <ReactPaginate
            breakLabel="..."
            nextLabel=">"
            previousLabel="<"
            forcePage={Math.max((query.page || 1) - 1, 0)}
            onPageChange={handlePageChange}
            pageRangeDisplayed={3}
            marginPagesDisplayed={1}
            pageCount={pagination.totalPages}
            renderOnZeroPageCount={null}
            containerClassName="flex flex-wrap items-center gap-2"
            pageLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            previousLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            nextLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            breakLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-500"
            activeLinkClassName="bg-sky-600 text-white hover:bg-sky-600"
            disabledLinkClassName="cursor-not-allowed opacity-40 hover:bg-slate-100"
          />
        </div>
      )}
    </section>
  );
};

export default ArtistRequestsListPage;
