import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight } from "lucide-react";
import { searchAdminTracksService } from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";

const formatDuration = (seconds) => {
    if (typeof seconds !== "number" || Number.isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getStatusBadge = (status, type) => {
    if (type === "approval") {
        return status === "approved" ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đã duyệt
            </span>
        ) : (
            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Đã từ chối
            </span>
        );
    }

    switch (status) {
        case "active":
            return (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Hoạt động
                </span>
            );
        case "hidden":
            return (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Tạm ẩn
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    Bản nháp
                </span>
            );
    }
};

const getAccentClasses = (approvalStatus) => {
    return approvalStatus === "approved" ? "bg-emerald-500" : "bg-rose-500";
};

const HeaderStat = ({ label, value }) => (
    <div className="rounded-xl bg-slate-100 px-4 py-3 min-w-[100px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <p className="mt-1.5 text-lg font-semibold text-slate-900">{value}</p>
    </div>
);

const SystemTracksListPage = () => {
    const [tracks, setTracks] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterApproval, setFilterApproval] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    
    const [query, setQuery] = useState({ q: "", approvalStatus: "", activeStatus: "", page: 1, limit: 10 });
    const [pagination, setPagination] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadTracks = async (params = query) => {
        setIsLoading(true);
        try {
            const cleanParams = Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== "")
            );
            const result = await searchAdminTracksService(cleanParams);
            setTracks(result.tracks ?? []);
            setPagination(result.pagination ?? null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadTracks(query); }, [query]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        setQuery((prev) => ({ 
            ...prev, 
            q: searchTerm.trim(), 
            approvalStatus: filterApproval,
            activeStatus: filterStatus, // Đã vá xịn lỗi ReferenceError ở đây
            page: 1 
        }));
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setFilterApproval("");
        setFilterStatus("");
        setQuery({ q: "", approvalStatus: "", activeStatus: "", page: 1, limit: 10 });
    };

    const handlePageChange = ({ selected }) => {
        setQuery((prev) => ({ ...prev, page: selected + 1 }));
    };

    const total = pagination?.total ?? 0;
    const visibleCount = tracks.length;
    const pageLabel = pagination ? `${pagination.page}/${pagination.totalPages}` : "1/1";

    return (
        <section className="space-y-8 max-w-[1400px] mx-auto p-6 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Hệ thống nhạc kho</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Danh sách bài hát</h1>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="grid gap-3 grid-cols-3">
                        <HeaderStat label="Tổng hồ sơ" value={total} />
                        <HeaderStat label="Hiển thị" value={visibleCount} />
                        <HeaderStat label="Trang" value={pageLabel} />
                    </div>
                    <Link 
                        to={routePaths.trackModeration || "/system-tracks/moderation"} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold rounded-xl shadow-sm transition whitespace-nowrap inline-block text-center"
                    >
                        Hàng đợi duyệt →
                    </Link>
                </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_100px_100px]">
                <label className="relative block">
                    <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm theo tên bài hát hoặc nghệ sĩ..." className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50" />
                </label>

                <select value={filterApproval} onChange={(e) => setFilterApproval(e.target.value)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer">
                    <option value="">Tất cả phê duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="rejected">Đã từ chối</option>
                </select>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer">
                    <option value="">Tất cả hiển thị</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="hidden">Đang tạm ẩn</option>
                </select>

                <button type="button" onClick={handleResetFilters} className="rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition py-3">
                    Đặt lại
                </button>

                <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                    Tìm kiếm
                </button>
            </form>

            {tracks.length === 0 ? (
                <div className="rounded-2xl bg-white px-6 py-20 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-base font-semibold text-slate-900">Không tìm thấy bài hát nào.</p>
                    <p className="mt-1 text-sm text-slate-400">Hồ sơ trống hoặc không có bản ghi nào khớp điều kiện lọc.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                    <div className="grid min-w-[1020px] grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_100px_140px_140px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        <span>Bài hát</span>
                        <span>Nghệ sĩ</span>
                        <span>Thời lượng</span>
                        <span>Kiểm duyệt</span>
                        <span>Hiển thị</span>
                        <span className="text-right pr-4">Hành động</span>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[1020px] divide-y divide-slate-100">
                            {tracks.map((track) => (
                                <article key={track.id} className="relative grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_100px_140px_140px_120px] gap-4 px-6 py-4 transition hover:bg-slate-50/60 items-center">
                                    <div className={`absolute inset-y-2 left-0 w-1 rounded-r ${getAccentClasses(track.approvalStatus)}`} />

                                    <div className="flex min-w-0 items-center gap-3 pl-2">
                                        {track.avatar ? (
                                            <img src={track.avatar} alt={track.title} className="h-10 w-10 rounded-xl object-cover border border-slate-100 shadow-sm" />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black text-white uppercase">TRACK</div>
                                        )}
                                        <p className="truncate text-sm font-semibold text-slate-950">{track.title}</p>
                                    </div>

                                    <p className="truncate text-sm text-slate-600 font-medium">{track.artist?.name || "—"}</p>
                                    <p className="text-sm font-mono font-medium text-slate-400">{formatDuration(track.duration)}</p>
                                    
                                    <div>{getStatusBadge(track.approvalStatus, "approval")}</div>
                                    <div>{getStatusBadge(track.activeStatus, "visibility")}</div>

                                    <div className="flex justify-end pr-2">
                                        <Link to={routePaths.trackDetail(track.id)} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-sm">
                                            Chi tiết <ArrowUpRight size={14} />
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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

export default SystemTracksListPage;
