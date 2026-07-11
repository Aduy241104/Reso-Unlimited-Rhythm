import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight, ShieldCheck, ArrowLeft } from "lucide-react";
import { getUsersService } from "../../services/userService";
import { routePaths } from "../../routes/routePaths";

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
          Tạm ngưng
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

const getAccentClasses = (status) => {
  switch (status) {
    case "active": return "bg-emerald-500";
    case "inactive": return "bg-amber-500";
    case "blocked": return "bg-rose-500";
    default: return "bg-slate-300";
  }
};

const HeaderStat = ({ label, value }) => (
  <div className="rounded-xl bg-slate-100 px-4 py-2.5 min-w-[100px] text-center sm:text-left">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
  </div>
);

const AdminListPage = () => {
  const [admins, setAdmins] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [query, setQuery] = useState({ search: "", status: "", page: 1, limit: 10 });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadAdmins = async (params = query) => {
    setIsLoading(true);
    setMessage("");
    try {
      const result = await getUsersService({
        q: params.search,
        role: "admin",
        status: params.status
      });

      const cleanAdmins = (result ?? []).filter((u) => u.role === "admin");
      setAdmins(cleanAdmins);

      const totalItems = cleanAdmins.length;
      const totalPages = Math.ceil(totalItems / params.limit) || 1;

      setPagination({
        page: params.page,
        limit: params.limit,
        total: totalItems,
        totalPages: totalPages
      });
    } catch (error) {
      setMessage("Không thể tải danh sách tài khoản quản trị viên.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadAdmins(query); }, [query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => ({
      ...prev,
      search: searchTerm.trim(),
      status: filterStatus,
      page: 1
    }));
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatus("");
    setQuery({ search: "", status: "", page: 1, limit: 10 });
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({ ...prev, page: selected + 1 }));
  };

  const total = pagination?.total ?? 0;
  const pageLabel = pagination ? `${pagination.page}/${pagination.totalPages}` : "1/1";

  return (
    <section className="space-y-6 max-w-[1400px] mx-auto p-6 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
      
      {/* Khung 1: Header Dashboard tích hợp nút Quay lại bất đối xứng sang phải */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-600">Hệ thống điều hành</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Admin Personnel Registry</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto">
          <div className="grid gap-2 grid-cols-3">
            <HeaderStat label="Tổng quản trị" value={total} />
            <HeaderStat label="Hiển thị" value={admins.length} />
            <HeaderStat label="Trang" value={pageLabel} />
          </div>

          {/* NÚT QUAY LẠI DANH SÁCH THÀNH VIÊN ĐƯỢC TÍCH HỢP ĐỒNG BỘ */}
          <Link 
            to={routePaths.users || "/users"} 
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 h-[44px]"
          >
            <ArrowLeft size={16} className="mr-1.5" /> Quay lại
          </Link>
        </div>
      </div>

      {/* Khung 2: Thanh điều khiển chứa bộ tìm kiếm và lọc trạng thái */}
      <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-3 md:grid-cols-[2fr_1fr_120px_120px]">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Tìm theo tên hoặc địa chỉ email quản trị..." 
            className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-indigo-50/50" 
          />
        </label>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-indigo-50/50 cursor-pointer font-medium">
          <option value="">Tất cả trạng thái</option>
          {statuses.slice(1).map((status) => (
            <option key={status} value={status}>
              {status === "active" ? "Hoạt động" : status === "inactive" ? "Tạm ngưng" : "Đã khóa"}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleResetFilters}
          className="rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition py-3"
        >
          Đặt lại
        </button>

        <button type="submit" className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-sm">
          Tìm kiếm
        </button>
      </form>

      {message && <div className="border border-red-100 bg-red-50/50 px-4 py-3 text-sm rounded-xl text-red-600">{message}</div>}

      {/* Khung 3: Danh sách cấu trúc hàng Spaced Rows */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)] border border-slate-100">
        <div className="grid min-w-[1020px] grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_120px_160px_180px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
          <span>Tài khoản quản trị</span>
          <span>Họ và tên</span>
          <span>Cấp bậc</span>
          <span>Trạng thái hoạt động</span>
          <span>Ngày bổ nhiệm</span>
          <span className="text-right pr-4">Hành động</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1020px] divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Đang kết xuất nhân sự quản trị...</div>
            ) : admins.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">Không tìm thấy tài khoản quản trị nào phù hợp.</div>
            ) : (
              admins.slice((query.page - 1) * query.limit, query.page * query.limit).map((admin) => (
                <article key={admin._id} className="relative grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_120px_160px_180px_120px] gap-4 px-6 py-4 transition hover:bg-slate-50/60 items-center">
                  
                  {/* Vạch chỉ thị trạng thái */}
                  <div className={`absolute inset-y-2 left-0 w-1 rounded-r ${getAccentClasses(admin.activeStatus)}`} />
                  
                  <div className="flex min-w-0 items-center gap-3 pl-2">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
                      <ShieldCheck size={16} />
                    </div>
                    <span className="truncate text-sm font-bold text-slate-950">{admin.email}</span>
                  </div>

                  <span className="truncate text-sm text-slate-600 font-semibold">{admin.profile?.fullName || "—"}</span>
                  
                  <div>
                    <span className="inline-flex items-center bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      SUPER ADMIN
                    </span>
                  </div>
                  
                  <div>{getStatusBadge(admin.activeStatus)}</div>
                  <span className="text-xs font-mono font-medium text-slate-400">{formatDate(admin.createdAt)}</span>
                  
                  <div className="flex justify-end pr-2">
                    <Link 
                      to={routePaths.userDetail(admin._id)} 
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
      {pagination && admins.length > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between shadow-[0_12px_30px_rgba(15,23,42,0.05)] border border-slate-100">
          <p className="text-sm text-slate-500 font-medium">
            Trang {pagination.page} / {pagination.totalPages}
            <span className="mx-2 text-slate-300">|</span>
            Tổng cộng: {pagination.total} nhân sự
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

export default AdminListPage;