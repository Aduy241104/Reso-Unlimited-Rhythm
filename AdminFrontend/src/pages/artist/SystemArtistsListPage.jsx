import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight } from "lucide-react";
import { searchAdminArtistsService } from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";

const getStatusBadge = (status) => {
    switch (status) {
        case "verified":
        case "active":
            return (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {status === "verified" ? "Đã xác minh" : "Hoạt động"}
                </span>
            );
        case "pending":
            return (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Chờ duyệt
                </span>
            );
        case "rejected":
        case "inactive":
            return (
                <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    {status === "rejected" ? "Từ chối" : "Tạm ngưng"}
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
                <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                    {status}
                </span>
            );
    }
};

// Cấu hình dải màu Accent Bar chạy dọc rìa trái mỗi hàng theo trạng thái hoạt động
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

const SystemArtistsListPage = () => {
    const [artists, setArtists] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterVerify, setFilterVerify] = useState("");
    const [filterActive, setFilterActive] = useState("");

    // Bộ Query chuẩn cấu hình phân trang gửi lên máy chủ
    const [query, setQuery] = useState({ q: "", verificationStatus: "", activeStatus: "", page: 1, limit: 10 });
    const [pagination, setPagination] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const loadArtists = async (params = query) => {
        setIsLoading(true);
        setMessage("");
        try {
            const cleanParams = Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== "")
            );
            const result = await searchAdminArtistsService(cleanParams);
            setArtists(result.artists ?? []);
            setPagination(result.pagination ?? null);
        } catch (error) {
            setMessage(error?.response?.data?.message || error?.message || "Could not load artists.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadTracksCatalog(query); }, [query]);

    // Kích hoạt hàm gọi dữ liệu qua API từ trang đầu tiên (page 1) tránh bị lệch chỉ mục
    const loadTracksCatalog = (params) => {
        void loadArtists(params);
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        setQuery((prev) => ({ 
            ...prev, 
            q: searchTerm.trim(), 
            verificationStatus: filterVerify,
            activeStatus: filterActive,
            page: 1 
        }));
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setFilterVerify("");
        setFilterActive("");
        setQuery({ q: "", verificationStatus: "", activeStatus: "", page: 1, limit: 10 });
    };

    const handlePageChange = ({ selected }) => {
        setQuery((prev) => ({ ...prev, page: selected + 1 }));
    };

    // SỬA LỖI LOGIC: Khắc chế hoàn toàn hiện tượng hiển thị sai lệch chỉ số dạng "1/0" khi danh sách rỗng
    const total = pagination?.total ?? 0;
    const totalPages = pagination?.totalPages ?? 0;
    const currentPage = total === 0 ? 0 : (pagination?.page ?? 1);
    const pageLabel = `${currentPage}/${totalPages}`;
    const visibleCount = artists.length;

    return (
        <section className="space-y-6 max-w-[1400px] mx-auto p-6 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
            
            {/* Khung 1: Tiêu đề trang & Khối thẻ thống kê Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Hệ thống nghệ sĩ</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Danh sách nghệ sĩ</h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
                    <div className="grid gap-2 grid-cols-3">
                        <HeaderStat label="Tổng hồ sơ" value={total} />
                        <HeaderStat label="Hiển thị" value={visibleCount} />
                        <HeaderStat label="Trang" value={pageLabel} />
                    </div>
                </div>
            </div>

            {/* Khung 2: Thanh Tìm kiếm & Bộ lọc phối hợp đồng bộ */}
            <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_100px_100px]">
                <label className="relative block">
                    <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Tìm kiếm theo tên nghệ danh, email..." 
                        className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50" 
                    />
                </label>

                <select value={filterVerify} onChange={(e) => setFilterVerify(e.target.value)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer">
                    <option value="">Tất cả xác minh</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="verified">Đã xác minh</option>
                    <option value="rejected">Đã từ chối</option>
                </select>

                <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer">
                    <option value="">Tất cả hiển thị</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                    <option value="blocked">Đã khóa ban</option>
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

            {/* Khung 3: Danh sách cấu trúc hàng Spaced Rows (Tuyệt đẹp như hình mẫu) */}
            {artists.length === 0 ? (
                <div className="rounded-2xl bg-white px-6 py-20 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-base font-semibold text-slate-900">Không tìm thấy hồ sơ nghệ sĩ nào.</p>
                    <p className="mt-1 text-sm text-slate-400">Hàng đợi trống hoặc không có bản ghi nào khớp điều kiện tra cứu.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                    <div className="grid min-w-[1020px] grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_120px_160px_160px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        <span>Nghệ sĩ</span>
                        <span>Email liên kết</span>
                        <span>Tổng tác phẩm</span>
                        <span>Xác minh danh tính</span>
                        <span>Trạng thái hoạt động</span>
                        <span className="text-right pr-4">Hành động</span>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[1020px] divide-y divide-slate-100">
                            {artists.map((artist) => (
                                <article key={artist.id} className="relative grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_120px_160px_160px_120px] gap-4 px-6 py-4 transition hover:bg-slate-50/60 items-center">
                                    
                                    {/* Thanh vạch chỉ thị màu bên rìa trái hàng */}
                                    <div className={`absolute inset-y-2 left-0 w-1 rounded-r ${getAccentClasses(artist.activeStatus)}`} />
                                    
                                    <div className="flex min-w-0 items-center gap-3 pl-2">
                                        {artist.avatar ? (
                                            <img src={artist.avatar} alt={artist.name} className="h-10 w-10 rounded-xl object-cover border border-slate-100 shadow-sm" />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-[9px] font-black text-white uppercase tracking-wider">ARTIST</div>
                                        )}
                                        <p className="truncate text-sm font-semibold text-slate-950">{artist.name}</p>
                                    </div>

                                    <p className="truncate text-sm text-slate-600 font-mono font-medium">{artist.email}</p>
                                    <p className="text-sm font-bold text-slate-900">{artist.totalTracks} bài hát</p>
                                    
                                    <div>{getStatusBadge(artist.verificationStatus)}</div>
                                    <div>{getStatusBadge(artist.activeStatus)}</div>

                                    <div className="flex justify-end pr-2">
                                        <Link
                                            to={routePaths.artistDetail ? routePaths.artistDetail(artist.id) : `/admin/artists/${artist.id}`}
                                            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-sm"
                                        >
                                            Chi tiết <ArrowUpRight size={14} />
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Khung 4: Khối điều khiển phân trang ReactPaginate ổn định ở chân trang */}
            {pagination && (
                <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-sm text-slate-500 font-medium">
                        Trang {currentPage} / {totalPages}
                        <span className="mx-2 text-slate-300">|</span>
                        Tổng cộng: {total} bản ghi
                    </p>

                    {totalPages > 1 && (
                        <ReactPaginate 
                            breakLabel="..." 
                            nextLabel=">" 
                            previousLabel="<" 
                            forcePage={Math.max(pagination.page - 1, 0)} 
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
                    )}
                </div>
            )}
        </section>
    );
};

export default SystemArtistsListPage;
