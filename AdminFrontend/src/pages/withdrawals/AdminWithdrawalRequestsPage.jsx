import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  Clock3,
  CreditCard,
  RefreshCcw,
  Search,
  UserRound,
  WalletCards,
} from "lucide-react";
import { getAdminWithdrawalRequests } from "../../services/adminWithdrawalService";
import { routePaths } from "../../routes/routePaths";

const statusFilters = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
];

const methodFilters = [
  { value: "", label: "Tất cả phương thức" },
  { value: "bank", label: "Bank" },
  { value: "momo", label: "Momo" },
];

const sortOrderFilters = [
  { value: "desc", label: "Mới nhất trước" },
  { value: "asc", label: "Cũ nhất trước" },
];

const statusConfig = {
  pending: {
    label: "Pending",
    badge: "bg-amber-50 text-amber-600 border-amber-100",
    dot: "bg-amber-500",
    accent: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    badge: "bg-blue-50 text-blue-600 border-blue-100",
    dot: "bg-blue-500",
    accent: "bg-blue-500",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-rose-50 text-rose-600 border-rose-100",
    dot: "bg-rose-500",
    accent: "bg-rose-500",
  },
  paid: {
    label: "Paid",
    badge: "bg-emerald-50 text-emerald-600 border-emerald-100",
    dot: "bg-emerald-500",
    accent: "bg-emerald-500",
  },
};

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getArtistUser = (withdrawal) => {
  const artist = withdrawal?.artistId && typeof withdrawal.artistId === "object"
    ? withdrawal.artistId
    : null;
  const user = artist?.userId && typeof artist.userId === "object"
    ? artist.userId
    : null;

  return { artist, user };
};

const getDisplayName = (withdrawal) => {
  const { artist, user } = getArtistUser(withdrawal);

  return (
    artist?.name ||
    artist?.stageName ||
    artist?.artistName ||
    user?.profile?.fullName ||
    user?.fullName ||
    user?.username ||
    user?.email ||
    "Unknown artist"
  );
};

const getUserSubtitle = (withdrawal) => {
  const { user, artist } = getArtistUser(withdrawal);
  return user?.email || user?.profile?.fullName || artist?._id || "—";
};

const getAvatar = (withdrawal) => {
  const { artist, user } = getArtistUser(withdrawal);
  return artist?.avatar || user?.avatar || "";
};

const getStatusBadge = (status) => {
  const config = statusConfig[status] || {
    label: status || "Unknown",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

const getMethodBadge = (method) => {
  const isMomo = method === "momo";
  const Icon = isMomo ? WalletCards : CreditCard;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${
      isMomo
        ? "border-pink-100 bg-pink-50 text-pink-600"
        : "border-indigo-100 bg-indigo-50 text-indigo-600"
    }`}>
      <Icon size={12} />
      {method || "—"}
    </span>
  );
};

const HeaderStat = ({ label, value }) => (
  <div className="min-w-[112px] rounded-xl bg-slate-100 px-4 py-3">
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
      {label}
    </p>
    <p className="mt-1.5 text-lg font-semibold text-slate-900">{value}</p>
  </div>
);

const AdminWithdrawalRequestsPage = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [query, setQuery] = useState({
    q: "",
    status: "",
    method: "",
    page: 1,
    limit: 10,
    sortBy: "requestedAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadWithdrawals = async (params = query) => {
    setIsLoading(true);
    setError("");

    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== "")
      );
      const result = await getAdminWithdrawalRequests(cleanParams);

      setWithdrawals(result.withdrawals ?? []);
      setPagination(result.pagination ?? {
        page: params.page,
        limit: params.limit,
        total: result.withdrawals?.length ?? 0,
        totalPages: 1,
      });
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách yêu cầu rút tiền.");
      setWithdrawals([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWithdrawals(query);
  }, [query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => ({
      ...prev,
      q: searchTerm.trim(),
      status: filterStatus,
      method: filterMethod,
      sortOrder,
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatus("");
    setFilterMethod("");
    setSortOrder("desc");
    setQuery({
      q: "",
      status: "",
      method: "",
      page: 1,
      limit: 10,
      sortBy: "requestedAt",
      sortOrder: "desc",
    });
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({ ...prev, page: selected + 1 }));
  };

  const total = pagination?.total ?? 0;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const page = pagination?.page ?? query.page;
  const pageLabel = `${page}/${totalPages}`;

  return (
    <section className="mx-auto min-h-screen max-w-[1400px] space-y-6 bg-slate-50/50 p-6 text-slate-800 antialiased">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Quản lý doanh thu artist
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Withdrawal Requests
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Danh sách tổng quan. Bấm View Detail để xem đầy đủ thông tin và xử lý ở bước sau.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <HeaderStat label="Tổng yêu cầu" value={total} />
          <HeaderStat label="Hiển thị" value={withdrawals.length} />
          <HeaderStat label="Trang" value={pageLabel} />
        </div>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] md:grid-cols-[1.5fr_1fr_1fr_1fr_100px_100px]"
      >
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm artist, tên user hoặc email..."
            className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
          />
        </label>

        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="cursor-pointer rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
        >
          {statusFilters.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={filterMethod}
          onChange={(event) => setFilterMethod(event.target.value)}
          className="cursor-pointer rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
        >
          {methodFilters.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          className="cursor-pointer rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
        >
          {sortOrderFilters.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleResetFilters}
          className="rounded-lg border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Reset
        </button>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="grid min-w-[960px] grid-cols-[minmax(0,1.8fr)_160px_130px_140px_180px_130px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          <span>Artist</span>
          <span>Amount</span>
          <span>Method</span>
          <span>Status</span>
          <span>Created At</span>
          <span className="text-right pr-2">Action</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[960px] divide-y divide-slate-100">
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 p-12 text-xs font-bold uppercase tracking-wider text-slate-400">
                <RefreshCcw size={16} className="animate-spin" />
                Đang tải yêu cầu rút tiền...
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Banknote size={24} />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  Không có yêu cầu rút tiền phù hợp.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Thử đổi bộ lọc hoặc từ khóa tìm kiếm.
                </p>
              </div>
            ) : (
              withdrawals.map((withdrawal) => {
                const config = statusConfig[withdrawal.status] || {};
                const avatar = getAvatar(withdrawal);
                const withdrawalId = withdrawal._id || withdrawal.id;

                return (
                  <article
                    key={withdrawalId}
                    className="relative grid grid-cols-[minmax(0,1.8fr)_160px_130px_140px_180px_130px] items-center gap-4 px-6 py-4 transition hover:bg-slate-50/70"
                  >
                    <div className={`absolute inset-y-2 left-0 w-1 rounded-r ${config.accent || "bg-slate-300"}`} />

                    <div className="flex min-w-0 items-center gap-3 pl-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-white shadow-sm">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={getDisplayName(withdrawal)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserRound size={18} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {getDisplayName(withdrawal)}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {getUserSubtitle(withdrawal)}
                        </p>
                      </div>
                    </div>

                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {formatCurrency(withdrawal.amount)}
                    </p>

                    <div>{getMethodBadge(withdrawal.method)}</div>

                    <div>{getStatusBadge(withdrawal.status)}</div>

                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <Clock3 size={14} className="mt-0.5 shrink-0 text-slate-300" />
                      <span>{formatDateTime(withdrawal.createdAt || withdrawal.requestedAt)}</span>
                    </div>

                    <div className="flex justify-end pr-2">
                      <Link
                        to={routePaths.withdrawalRequestDetail(withdrawalId)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        View Detail
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>

      {pagination ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-500">
            Trang {page} / {totalPages}
            <span className="mx-2 text-slate-300">|</span>
            Tổng cộng: {total} bản ghi
          </p>

          <ReactPaginate
            breakLabel="..."
            nextLabel=">"
            previousLabel="<"
            forcePage={Math.max(page - 1, 0)}
            onPageChange={handlePageChange}
            pageRangeDisplayed={3}
            marginPagesDisplayed={1}
            pageCount={totalPages}
            renderOnZeroPageCount={null}
            containerClassName="flex flex-wrap items-center gap-2"
            pageLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            previousLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            nextLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            breakLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-500"
            activeLinkClassName="bg-blue-600 text-white hover:bg-blue-600"
            disabledLinkClassName="cursor-not-allowed opacity-40 hover:bg-slate-100"
          />
        </div>
      ) : null}
    </section>
  );
};

export default AdminWithdrawalRequestsPage;
