import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import ReactPaginate from "react-paginate";
import { Bell, Plus, Trash2, Calendar, Search, Loader2, ArrowUpRight } from "lucide-react";
// 🛠️ ĐÃ FIX: Đảm bảo import đầy đủ service lấy và xóa thông báo
import { getAdminNotificationsService } from "../../services/notificationService";
import { routePaths } from "../../routes/routePaths";

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

const getReceiverBadge = (receiverType, item) => {
    switch (receiverType) {
        case "all":
            return (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Toàn bộ
                </span>
            );
        case "group":
            return (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Nhóm: {item.targetRoles?.join(", ") || "user"}
                </span>
            );
        case "single":
            return (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Đích danh
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    {receiverType}
                </span>
            );
    }
};

const getTypeLabel = (type) => {
    switch (type) {
        case "system": return "⚙️ Hệ thống";
        case "new_release": return "🎵 Phát hành mới";
        case "payment": return "💳 Thanh toán";
        case "subscription": return "⭐ Gói cước";
        default: return "📩 Thông báo";
    }
};

const getAccentClasses = (type) => {
    switch (type) {
        case "system": return "bg-slate-500";
        case "new_release": return "bg-blue-500";
        case "payment": return "bg-emerald-500";
        case "subscription": return "bg-amber-500";
        default: return "bg-indigo-500";
    }
};

const HeaderStat = ({ label, value }) => (
    <div className="rounded-xl bg-slate-100 px-4 py-2.5 min-w-[100px] text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
    </div>
);

const NotificationListPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterReceiver, setFilterReceiver] = useState("");

    const [query, setQuery] = useState({ search: "", type: "", receiver: "", page: 1, limit: 5 });
    const [pagination, setPagination] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState("");

    const loadNotifications = async (params = query) => {
        setIsLoading(true);
        setMessage("");
        try {
            const data = await getAdminNotificationsService();
            const allNotis = data?.notifications || data || [];

            const filtered = allNotis.filter(noti => {
                // 1. Lọc theo từ khóa Search tiêu đề / nội dung
                const matchesSearch = !params.search ||
                    noti.title?.toLowerCase().includes(params.search.toLowerCase()) ||
                    noti.content?.toLowerCase().includes(params.search.toLowerCase());

                // 2. Lọc theo loại thông báo (system, payment...)
                const matchesType = !params.type || noti.type === params.type;

                // 3. ✨ ĐÃ RÚT GỌN: Lọc chuẩn đét theo receiverType của DB
                let matchesReceiver = true;
                if (params.receiver) {
                    if (params.receiver === "all") {
                        matchesReceiver = noti.receiverType === "all" || noti.isGlobal === true;
                    } else {
                        matchesReceiver = noti.receiverType === params.receiver;
                    }
                }

                return matchesSearch && matchesType && matchesReceiver;
            });

            setNotifications(filtered);

            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / params.limit) || 1;

            setPagination({
                page: params.page,
                limit: params.limit,
                total: totalItems,
                totalPages: totalPages
            });
        } catch (error) {
            console.error(error);
            setMessage("Không thể tải danh sách thông báo hệ thống.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadNotifications(query); }, [query]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        setQuery((prev) => ({
            ...prev,
            search: searchTerm.trim(),
            type: filterType,
            receiver: filterReceiver,
            page: 1
        }));
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setFilterType("");
        setFilterReceiver("");
        setQuery({ search: "", type: "", receiver: "", page: 1, limit: 5 });
    };

    const handlePageChange = ({ selected }) => {
        setQuery((prev) => ({ ...prev, page: selected + 1 }));
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa thông báo này không? Người dùng sẽ không thể nhìn thấy nó nữa.")) return;

        try {
            await deleteAdminNotificationService(id);
            toast.success("Xóa thông báo thành công!");
            void loadNotifications(query);
        } catch (error) {
            toast.error("Xóa thông báo thất bại, vui lòng thử lại.");
        }
    };

    const total = pagination?.total ?? 0;
    const pageLabel = pagination ? `${pagination.page}/${pagination.totalPages}` : "1/1";
    
    const currentPageItems = notifications.slice((query.page - 1) * query.limit, query.page * query.limit);

    return (
        <section className="space-y-6 max-w-[1400px] mx-auto p-6 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">

            {/* Khung 1: Header Dashboard */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Quản trị thông báo</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">History Notifications</h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto">
                    <div className="grid gap-2 grid-cols-3">
                        <HeaderStat label="Tổng tin lọc" value={total} />
                        <HeaderStat label="Hiển thị" value={currentPageItems.length} />
                        <HeaderStat label="Trang" value={pageLabel} />
                    </div>

                    <Link
                        to={routePaths.createNotification || "/notifications/new"}
                        className="bg-slate-950 hover:bg-slate-800 text-white px-5 py-3 text-sm font-semibold rounded-xl shadow-sm transition whitespace-nowrap inline-block text-center h-[44px] flex items-center gap-2"
                    >
                        <Plus size={14} /> Tạo thông báo mới <ArrowUpRight size={14} />
                    </Link>
                </div>
            </div>

            {/* Khung 2: Thanh điều khiển bộ lọc */}
            <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.8fr_1fr_1fr_100px_100px]">
                <label className="relative block">
                    <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
                        className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
                    />
                </label>

                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer font-medium">
                    <option value="">Tất cả phân loại</option>
                    <option value="system">⚙️ Hệ thống</option>
                    <option value="new_release">🎵 Phát hành mới</option>
                    <option value="payment">💳 Thanh toán</option>
                    <option value="subscription">⭐ Gói cước</option>
                </select>

                {/* 📊 ĐÃ TINH CHỈNH: Chỉ giữ lại 3 trường cốt lõi đồng bộ trực tiếp với Schema DB */}
                <select value={filterReceiver} onChange={(e) => setFilterReceiver(e.target.value)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer font-medium">
                    <option value="">👥 Tất cả đối tượng nhận</option>
                    <option value="all">📢 Toàn bộ (All)</option>
                    <option value="group">👥 Theo nhóm (Group)</option>
                    <option value="single">🎯 Đích danh (Single)</option>
                </select>

                <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition py-3 cursor-pointer"
                >
                    Đặt lại
                </button>

                <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm cursor-pointer">
                    Tìm kiếm
                </button>
            </form>

            {message && <div className="border border-red-100 bg-red-50/50 px-4 py-3 text-sm rounded-xl text-red-600">{message}</div>}

            {/* Khung 3: Danh sách cấu trúc hàng Spaced Rows */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="grid min-w-[1020px] grid-cols-[180px_minmax(0,2fr)_180px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    <span>Loại & Đối tượng</span>
                    <span>Nội dung thông báo</span>
                    <span>Thời gian phát hành</span>
                    <span className="text-right pr-4">Hành động</span>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[1020px] divide-y divide-slate-100">
                        {isLoading ? (
                            <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={14} /> Đang tải danh sách dữ liệu...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 italic">Không tìm thấy lịch sử thông báo nào phù hợp.</div>
                        ) : (
                            currentPageItems.map((noti) => (
                                <article key={noti._id} className="relative grid grid-cols-[180px_minmax(0,2fr)_180px_120px] gap-4 px-6 py-5 transition hover:bg-slate-50/60 items-start">

                                    <div className={`absolute inset-y-2 left-0 w-1 rounded-r ${getAccentClasses(noti.type)}`} />

                                    <div className="space-y-1.5 pl-2">
                                        <p className="text-xs font-bold text-slate-900">{getTypeLabel(noti.type)}</p>
                                        <div>{getReceiverBadge(noti.receiverType, noti)}</div>
                                    </div>

                                    <div className="space-y-1 pr-4">
                                        <p className="text-sm font-bold text-slate-950 line-clamp-1">{noti.title}</p>
                                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{noti.content}</p>
                                        {noti.targetType && (
                                            <span className="inline-flex items-center text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded mt-1">
                                                🔗 Redirect: {noti.targetType}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-400 pt-0.5">
                                        <Calendar size={12} />
                                        {formatDate(noti.createdAt)}
                                    </div>

                                    <div className="flex justify-end pr-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(noti._id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                            title="Xóa thông báo"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Khung 4: Khối điều khiển Phân trang */}
            {pagination && notifications.length > 0 && (
                <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-sm text-slate-500 font-medium">
                        Trang {pagination.page} / {pagination.totalPages}
                        <span className="mx-2 text-slate-300">|</span>
                        Tổng cộng: {pagination.total} thông báo
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

export default NotificationListPage;