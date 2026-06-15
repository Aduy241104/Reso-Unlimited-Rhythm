import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight } from "lucide-react";
import { getUsersService } from "../../services/userService";
import { routePaths } from "../../routes/routePaths";

// Gỡ bỏ hoàn toàn 'admin' khỏi bộ lọc tìm kiếm cục bộ
const roles = ["", "user", "artist"];
const statuses = ["", "active", "inactive", "blocked"];

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

// Cấu hình Badge có chấm tròn chỉ thị trạng thái chuẩn xác như hình mẫu
const getStatusBadge = (status) => {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Hoạt động
        </span>
      );
    case "inactive":
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Chưa kích hoạt
        </span>
      );
    case "blocked":
      return (
        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Đã khóa
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          {status}
        </span>
      );
  }
};

// Đồng bộ màu thanh chỉ thị dọc sát rìa trái mỗi hàng
const getAccentClasses = (status) => {
  switch (status) {
    case "active": return "bg-emerald-500";
    case "inactive": return "bg-amber-500";
    case "blocked": return "bg-rose-500";
    default: return "bg-slate-300";
  }
};

const getRoleBadge = (role) => {
  if (role === "artist") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider">
        Artist
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider">
      User
    </span>
  );
};

const HeaderStat = ({ label, value }) => (
  <div className="rounded-xl bg-slate-100 px-4 py-2.5 min-w-[100px] text-center sm:text-left">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
  </div>
);

const UserListPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [query, setQuery] = useState({ search: "", role: "", status: "", page: 1, limit: 10 });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadUsers = async (params = query) => {
    setIsLoading(true);
    setMessage("");
    try {
      const result = await getUsersService({
        q: params.search,
        role: params.role,
        status: params.status
      });

      // Lọc sạch Admin hệ thống ngay tại Frontend tầng hiển thị
      const cleanUsers = (result ?? []).filter((u) => u.role !== "admin");
      setUsers(cleanUsers);

      const totalItems = cleanUsers.length;
      const totalPages = Math.ceil(totalItems / params.limit) || 1;

      setPagination({
        page: params.page,
        limit: params.limit,
        total: totalItems,
        totalPages: totalPages
      });
    } catch (error) {
      setMessage("Không thể tải danh sách tài khoản thành viên.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadUsers(query); }, [query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => ({
      ...prev,
      search: searchTerm.trim(),
      role: filterRole,
      status: filterStatus,
      page: 1
    }));
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterRole("");
    setFilterStatus("");
    setQuery({ search: "", role: "", status: "", page: 1, limit: 10 });
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({ ...prev, page: selected + 1 }));
  };

  const total = pagination?.total ?? 0;
  const pageLabel = pagination ? `${pagination.page}/${pagination.totalPages}` : "1/1";

  return (
    <section className="space-y-6 max-w-[1400px] mx-auto p-6 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">

      {/* Khung 1: Header Dashboard tích hợp khối thông số dồn phải kèm nút chuyển đổi Admin */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Hệ thống thành viên</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">User Account Registry</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto">
          <div className="grid gap-2 grid-cols-3">
            <HeaderStat label="Tổng hồ sơ" value={total} />
            <HeaderStat label="Hiển thị" value={users.length} />
            <HeaderStat label="Trang" value={pageLabel} />
          </div>

          {/* NÚT BẤM ĐIỀU HƯỚNG SANG TRANG ADMIN DANH SÁCH MỚI */}
          <Link
            to={routePaths.adminList || "/admins"}
            className="bg-slate-950 hover:bg-slate-800 text-white px-5 py-3 text-sm font-semibold rounded-xl shadow-sm transition whitespace-nowrap inline-block text-center h-[44px] flex items-center"
          >
            Danh sách Admin →
          </Link>
        </div>
      </div>

      {/* Khung 2: Thanh điều khiển chứa đầy đủ bộ lọc phối hợp có nút Đặt lại */}
      <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_100px_100px]">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc địa chỉ email..."
            className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
          />
        </label>

        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer">
          <option value="">Tất cả phân quyền</option>
          {roles.slice(1).map((role) => <option key={role} value={role}>{role}</option>)}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer">
          <option value="">Tất cả trạng thái</option>
          {statuses.slice(1).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>

        <button
          type="button"
          onClick={handleResetFilters}
          className="rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition py-3"
        >
          Đặt lại
        </button>

        <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm">
          Tìm kiếm
        </button>
      </form>

      {message && <div className="border border-red-100 bg-red-50/50 px-4 py-3 text-sm rounded-xl text-red-600">{message}</div>}

      {/* Khung 3: Danh sách cấu trúc hàng Spaced Rows tuyệt đẹp */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="grid min-w-[1020px] grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_120px_160px_180px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          <span>Tài khoản email</span>
          <span>Họ và tên</span>
          <span>Vai trò</span>
          <span>Trạng thái hoạt động</span>
          <span>Ngày đăng ký</span>
          <span className="text-right pr-4">Hành động</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1020px] divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Đang tải danh sách dữ liệu...</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">Không tìm thấy tài khoản người dùng phù hợp điều kiện lọc.</div>
            ) : (
              users.slice((query.page - 1) * query.limit, query.page * query.limit).map((user) => (
                <article key={user._id} className="relative grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_120px_160px_180px_120px] gap-4 px-6 py-4 transition hover:bg-slate-50/60 items-center">

                  {/* Vạch màu chỉ thị rìa trái đồng bộ trạng thái */}
                  <div className={`absolute inset-y-2 left-0 w-1 rounded-r ${getAccentClasses(user.activeStatus)}`} />

                  <div className="flex min-w-0 items-center gap-3 pl-2">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black text-white uppercase tracking-wider shadow-sm">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.profile?.fullName || user.email}
                          className="h-9 w-9 rounded-xl object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/default-avatar.png";
                          }}
                        />
                      ) : (
                        <span className="text-[9px] font-black">
                          {user.profile?.fullName?.charAt(0) || "U"}
                        </span>
                      )}
                    </div>
                    <span className="truncate text-sm font-semibold text-slate-950">{user.email}</span>
                  </div>

                  <span className="truncate text-sm text-slate-600 font-medium">{user.profile?.fullName || "—"}</span>
                  <div>{getRoleBadge(user.role)}</div>
                  <div>{getStatusBadge(user.activeStatus)}</div>
                  <span className="text-xs font-mono font-medium text-slate-400">{formatDate(user.createdAt)}</span>

                  <div className="flex justify-end pr-2">
                    <Link
                      to={routePaths.userDetail(user._id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-sm"
                    >
                      Chi tiết <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Khung 4: Khối điều khiển Phân trang */}
      {pagination && (
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-sm text-slate-500 font-medium">
            Trang {pagination.page} / {pagination.totalPages}
            <span className="mx-2 text-slate-300">|</span>
            Tổng cộng: {pagination.total} bản ghi
          </p>
          <ReactPaginate
            breakLabel="..."
            nextLabel=">"
            previousLabel="<"
            forcePage={Math.max(pagination.page - 1, 0)}
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
            activeLinkClassName="bg-blue-600 text-white hover:bg-blue-600"
            disabledLinkClassName="cursor-not-allowed opacity-40 hover:bg-slate-100"
          />
        </div>
      )}
    </section>
  );
};

export default UserListPage;