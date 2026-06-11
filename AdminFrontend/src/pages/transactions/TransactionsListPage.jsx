import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight } from "lucide-react";
import { getTransactionsService } from "../../services/transactionService";
import { routePaths } from "../../routes/routePaths";

const statuses = ["", "success", "pending", "failed"];

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

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
};

const getStatusBadge = (status) => {
  switch (status) {
    case "success":
      return (
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Thành công
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Chờ xử lý
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Thất bại
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
    case "success": return "bg-emerald-500";
    case "pending": return "bg-amber-500";
    case "failed": return "bg-rose-500";
    default: return "bg-slate-300";
  }
};

const HeaderStat = ({ label, value }) => (
  <div className="rounded-xl bg-slate-100 px-4 py-2.5 min-w-[100px] text-center sm:text-left">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
  </div>
);

const TransactionsListPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [query, setQuery] = useState({ search: "", status: "", page: 1, limit: 10 });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadTransactions = async (params = query) => {
    setIsLoading(true);
    setMessage("");
    try {
      // Gọi service lấy dữ liệu (Truyền đúng cấu trúc query cho Backend xử lý phân trang thực tế)
      const result = await getTransactionsService({
        search: params.search,
        status: params.status,
        page: params.page,
        limit: params.limit,
      });

      // LƯU Ý: Nếu API của bạn trả về dạng cả cục { data: { transactions: [], pagination: {} } }
      // Thì tùy thuộc vào AxiosClient giải nén. Ta bóc tách dữ liệu theo chuẩn phân trang backend:
      if (result && result.transactions) {
        setTransactions(result.transactions);
        setPagination(result.pagination);
      } else {
        // Trường hợp khẩn cấp nếu API chỉ trả về mảng đơn thuần như cũ
        setTransactions(result ?? []);
        const totalItems = result.length ?? 0;
        setPagination({
          page: params.page,
          limit: params.limit,
          total: totalItems,
          totalPages: Math.ceil(totalItems / params.limit) || 1,
        });
      }
    } catch (error) {
      setMessage("Không thể tải danh sách lịch sử giao dịch.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadTransactions(query); }, [query]);

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
      
      {/* Khung 1: Header Dashboard */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Quản lý dòng tiền</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Transaction History</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto">
          <div className="grid gap-2 grid-cols-3">
            <HeaderStat label="Tổng giao dịch" value={total} />
            <HeaderStat label="Hiển thị" value={transactions.length} />
            <HeaderStat label="Trang" value={pageLabel} />
          </div>
        </div>
      </div>

      {/* Khung 2: Thanh điều khiển & Bộ lọc */}
      <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-2 md:grid-cols-[2fr_1.2fr_100px_100px]">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Tìm theo mã hóa đơn hoặc email người dùng..." 
            className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50" 
          />
        </label>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer">
          <option value="">Tất cả trạng thái</option>
          {statuses.slice(1).map((status) => (
            <option key={status} value={status}>
              {status === "success" ? "Thành công" : status === "pending" ? "Chờ xử lý" : "Thất bại"}
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

        <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm">
          Tìm kiếm
        </button>
      </form>

      {message && <div className="border border-red-100 bg-red-50/50 px-4 py-3 text-sm rounded-xl text-red-600">{message}</div>}

      {/* Khung 3: Cấu trúc hàng Spaced Rows */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="grid min-w-[1020px] grid-cols-[180px_minmax(0,1.5fr)_150px_160px_180px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          <span>Mã hóa đơn</span>
          <span>Tài khoản khách hàng</span>
          <span>Số tiền</span>
          <span>Trạng thái</span>
          <span>Thời gian tạo</span>
          <span className="text-right pr-4">Hành động</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1020px] divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Đang tải lịch sử giao dịch...</div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">Không tìm thấy giao dịch nào phù hợp với điều kiện tìm kiếm.</div>
            ) : (
              transactions.map((tx) => (
                <article key={tx.id} className="relative grid grid-cols-[180px_minmax(0,1.5fr)_150px_160px_180px_120px] gap-4 px-6 py-4 transition hover:bg-slate-50/60 items-center">
                  
                  <div className={`absolute inset-y-2 left-0 w-1 rounded-r ${getAccentClasses(tx.status)}`} />
                  
                  {/* FIX 1: Đọc chính xác invoiceNumber hoặc id rút gọn từ Backend */}
                  <span className="text-xs font-mono font-bold text-slate-900 truncate pl-2" title={tx.invoiceNumber || tx.id}>
                    {tx.invoiceNumber || (tx.id ? tx.id.substring(0, 8).toUpperCase() : "—")}
                  </span>

                  {/* FIX 2: Đọc đúng object user lồng nhau được Backend định dạng */}
                  <span className="truncate text-sm font-semibold text-slate-750" title={tx.user?.name}>
                    {tx.user?.email || "Khách vãng lai"}
                  </span>
                  
                  {/* FIX 3: Hiển thị trường tổng tiền totalAmount nhận từ dữ liệu trả về */}
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {formatCurrency(tx.totalAmount ?? tx.amount ?? 0)}
                  </span>

                  <div>{getStatusBadge(tx.status)}</div>
                  
                  <span className="text-xs font-mono font-medium text-slate-400">{formatDate(tx.createdAt)}</span>
                  
                  <div className="flex justify-end pr-2">
                    <Link 
                      to={routePaths.transactionDetail(tx.id)} 
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
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-sm text-slate-500 font-medium">
            Trang {pagination.page} / {pagination.totalPages}
            <span className="mx-2 text-slate-300">|</span>
            Tổng cộng: {pagination.total} giao dịch
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

export default TransactionsListPage;