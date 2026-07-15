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

const statusMap = {
  pending: {
    label: "Chờ duyệt",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  approved: {
    label: "Đã duyệt",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  rejected: {
    label: "Đã từ chối",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
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
  if (!parts.length) return "AR";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
    <p className="text-xs font-medium text-slate-500">{ label }</p>
    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
      { value }
    </p>
  </div>
);

const StatusBadge = ({ status }) => {
  const config = statusMap[status] || {
    label: "-",
    className: "bg-slate-50 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={ `inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${config.className}` }
    >
      { config.label }
    </span>
  );
};

const EmptyState = ({ isLoading }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
    <p className="text-sm font-semibold text-slate-900">
      { isLoading ? "Đang tải danh sách..." : "Không tìm thấy yêu cầu nào" }
    </p>
    <p className="mt-2 text-sm text-slate-500">
      Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
    </p>
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
      setArtistRequests(result.artistRequests || []);
      setPagination(result.pagination);
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tải danh sách yêu cầu."
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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Đăng ký Artist
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Danh sách yêu cầu
          </h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Tổng số" value={ total } />
          <StatCard label="Đang hiển thị" value={ visibleCount } />
          <StatCard label="Trang" value={ pageLabel } />
        </div>
      </div>

      <form
        onSubmit={ handleSearchSubmit }
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]"
      >
        <label className="relative">
          <Search
            size={ 18 }
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={ searchTerm }
            onChange={ (event) => setSearchTerm(event.target.value) }
            placeholder="Tìm theo nghệ danh, người nộp, CCCD..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>

        <select
          value={ query.status }
          onChange={ handleStatusChange }
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        >
          { statusOptions.map((option) => (
            <option key={ option.value || "all" } value={ option.value }>
              { option.label }
            </option>
          )) }
        </select>

        <button
          type="submit"
          className="h-11 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Tìm kiếm
        </button>
      </form>

      { message && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          { message }
        </div>
      ) }

      { artistRequests.length === 0 ? (
        <EmptyState isLoading={ isLoading } />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-xs font-medium text-slate-500">
                  <th className="px-5 py-4">Artist</th>
                  <th className="px-5 py-4">Người nộp</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Ngày nộp</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                { artistRequests.map((request) => (
                  <tr
                    key={ request._id }
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        { request.avatar ? (
                          <img
                            src={ request.avatar }
                            alt={ request.stageName || "Artist avatar" }
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                            { getInitials(request.stageName) }
                          </div>
                        ) }

                        <p className="truncate text-sm font-semibold text-slate-950">
                          { request.stageName || "-" }
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="truncate text-sm text-slate-700">
                        { request.userId?.profile?.fullName || "-" }
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="truncate text-sm text-slate-700">
                        { request.userId?.email || "-" }
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={ request.status } />
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      { formatDate(request.createdAt) }
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <Link
                          to={ routePaths.artistRequestDetail(request._id) }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
                        >
                          Xem chi tiết
                          <ArrowUpRight size={ 15 } />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )) }
              </tbody>
            </table>
          </div>
        </div>
      ) }

      { pagination?.totalPages > 1 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Hiển thị{ " " }
            <span className="font-medium text-slate-900">
              { (pagination.page - 1) * pagination.limit + 1 }-
              { Math.min(pagination.page * pagination.limit, pagination.total) }
            </span>{ " " }
            trong tổng số{ " " }
            <span className="font-medium text-slate-900">
              { pagination.total }
            </span>
          </p>

          <ReactPaginate
            breakLabel="..."
            nextLabel=">"
            previousLabel="<"
            forcePage={ Math.max((query.page || 1) - 1, 0) }
            onPageChange={ handlePageChange }
            pageRangeDisplayed={ 3 }
            marginPagesDisplayed={ 1 }
            pageCount={ pagination.totalPages }
            renderOnZeroPageCount={ null }
            containerClassName="flex flex-wrap items-center gap-2"
            pageLinkClassName="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            previousLinkClassName="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            nextLinkClassName="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            breakLinkClassName="flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-400"
            activeLinkClassName="border-slate-950 bg-slate-950 text-white hover:bg-slate-950"
            disabledLinkClassName="cursor-not-allowed opacity-40 hover:bg-white"
          />
        </div>
      ) }
    </section>
  );
};

export default ArtistRequestsListPage;