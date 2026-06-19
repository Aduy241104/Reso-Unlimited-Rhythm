import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import { Search, Plus, Trash2, Edit2, Eye, Check, X, CreditCard, TrendingUp } from "lucide-react";
import { getPlansService, getSubscriptionStatsService, deletePlanService } from "../../services/subscriptionService";
import { routePaths } from "../../routes/routePaths";

const PLAN_FEATURES = {
    NO_ADS: "Không quảng cáo",
    HIGH_QUALITY_AUDIO: "Chất lượng cao",
    LOSSLESS_AUDIO: "Âm thanh lossless",
    UNLIMITED_SKIP: "Bỏ qua không giới hạn",
    OFFLINE_DOWNLOAD: "Tải offline",
    BACKGROUND_PLAY: "Phát nền",
    AI_SMART_PLAYLIST: "Playlist thông minh AI",
    ADVANCED_RECOMMENDATION: "Đề xuất nâng cao",
    EARLY_ACCESS: "Truy cập sớm",
    EXCLUSIVE_CONTENT: "Nội dung độc quyền",
};

const formatCurrency = (value) => {
    if (value === undefined || value === null) return "—";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
};

const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
};

const getStatusConfig = (status) => {
    switch (status) {
        case "active":
            return {
                label: "Hoạt động",
                bg: "bg-emerald-50",
                text: "text-emerald-600",
                border: "border-emerald-100",
                dot: "bg-emerald-500",
            };
        case "inactive":
            return {
                label: "Tạm khóa",
                bg: "bg-slate-50",
                text: "text-slate-500",
                border: "border-slate-200",
                dot: "bg-slate-400",
            };
        default:
            return {
                label: status,
                bg: "bg-slate-50",
                text: "text-slate-500",
                border: "border-slate-200",
                dot: "bg-slate-400",
            };
    }
};

const HeaderStat = ({ label, value, icon: Icon }) => (
    <div className="rounded-xl bg-slate-100 px-4 py-2.5 min-w-[120px] text-center sm:text-left flex items-center gap-2">
        {Icon && <Icon size={18} className="text-slate-400" />}
        <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
        </div>
    </div>
);

const SubscriptionPlansPage = () => {
    const [plans, setPlans] = useState([]);
    const [stats, setStats] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [query, setQuery] = useState({ search: "", status: "", page: 1, limit: 10 });
    const [pagination, setPagination] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, planId: null, planName: "" });

    const loadPlans = async (params = query) => {
        setIsLoading(true);
        setMessage("");
        try {
            const result = await getPlansService({
                search: params.search,
                status: params.status,
                page: params.page,
                limit: params.limit,
            });
            setPlans(result.plans || []);
            setPagination(result.meta);
        } catch (error) {
            setMessage("Không thể tải danh sách gói subscription.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const statsData = await getSubscriptionStatsService();
            setStats(statsData);
        } catch (error) {
            console.error("Failed to load stats:", error);
        }
    };

    useEffect(() => {
        void loadPlans(query);
    }, [query]);

    useEffect(() => {
        void loadStats();
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setQuery((prev) => ({
            ...prev,
            search: searchTerm.trim(),
            status: filterStatus,
            page: 1,
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

    const openDeleteModal = (id, name) => {
        setDeleteModal({ isOpen: true, planId: id, planName: name });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, planId: null, planName: "" });
    };

    const handleConfirmDelete = async () => {
        const { planId } = deleteModal;
        if (!planId) return;
        setIsDeleting(true);
        try {
            await deletePlanService(planId);
            await loadPlans(query);
            void loadStats();
            closeDeleteModal();
        } catch (error) {
            const message = error?.response?.data?.message
                || error?.message
                || "Xóa gói subscription thất bại.";
            setMessage(message);
        } finally {
            setIsDeleting(false);
        }
    };

    const total = pagination?.total ?? 0;
    const totalPages = pagination?.totalPages ?? 0;
    const currentPage = total === 0 ? 0 : (pagination?.page ?? 1);

    return (
        <section className="space-y-5 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-1">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Quản lý Subscription
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                        Subscription Plans
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto">
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                        <HeaderStat label="Tổng gói" value={stats?.totalSubscriptions ?? 0} icon={CreditCard} />
                        <HeaderStat label="Đang hoạt động" value={stats?.byStatus?.active ?? 0} icon={Check} />
                        <HeaderStat label="Đã hết hạn" value={stats?.byStatus?.expired ?? 0} icon={X} />
                        <HeaderStat label="Đang chờ" value={stats?.byStatus?.pending ?? 0} icon={TrendingUp} />
                    </div>
                    <Link
                        to={routePaths.subscriptionNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Plus size={16} /> Thêm gói mới
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <form
                onSubmit={handleSearchSubmit}
                className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-[1.5fr_1fr_100px_100px]"
            >
                <label className="relative block">
                    <Search
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm theo tên gói..."
                        className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
                    />
                </label>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm khóa</option>
                </select>

                <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition py-3"
                >
                    Đặt lại
                </button>

                <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm"
                >
                    Tìm kiếm
                </button>
            </form>

            {message && (
                <div className="border border-red-100 bg-red-50/50 px-4 py-3 text-sm rounded-xl text-red-600">
                    {message}
                </div>
            )}

            {/* Plans List */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="grid min-w-[1200px] grid-cols-[minmax(0,1.5fr)_120px_100px_140px_minmax(0,2fr)_180px_180px_140px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    <span>Tên gói</span>
                    <span>Giá</span>
                    <span>Thời hạn</span>
                    <span>Trạng thái</span>
                    <span>Tính năng</span>
                    <span>Ngày tạo</span>
                    <span>Cập nhật</span>
                    <span className="text-right pr-4">Hành động</span>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[1200px] divide-y divide-slate-100">
                        {isLoading ? (
                            <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Đang tải danh sách gói subscription...
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 italic">
                                Không tìm thấy gói subscription nào phù hợp.
                            </div>
                        ) : (
                            plans.map((plan) => {
                                const statusConfig = getStatusConfig(plan.status);
                                return (
                                    <div
                                        key={plan._id}
                                        className="group grid items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                                        style={{
                                            gridTemplateColumns:
                                                "minmax(0,1.5fr) 120px 100px 140px minmax(0,2fr) 180px 180px 140px",
                                        }}
                                    >
                                        {/* Name */}
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{plan.name}</p>
                                            {plan.description && (
                                                <p className="truncate text-xs text-slate-400 mt-0.5">
                                                    {plan.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Price */}
                                        <div className="text-sm font-semibold text-slate-900">
                                            {formatCurrency(plan.price)}
                                        </div>

                                        {/* Duration */}
                                        <div className="text-sm text-slate-600">{plan.durationDays} ngày</div>

                                        {/* Status */}
                                        <div>
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}></span>
                                                {statusConfig.label}
                                            </span>
                                        </div>

                                        {/* Features */}
                                        <div className="flex flex-wrap gap-1">
                                            {plan.features?.slice(0, 4).map((feature) => (
                                                <span
                                                    key={feature}
                                                    className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600"
                                                >
                                                    {PLAN_FEATURES[feature] || feature}
                                                </span>
                                            ))}
                                            {plan.features?.length > 4 && (
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                                    +{plan.features.length - 4} khác
                                                </span>
                                            )}
                                        </div>

                                        {/* Created */}
                                        <div className="text-xs text-slate-400">{formatDate(plan.createdAt)}</div>

                                        {/* Updated */}
                                        <div className="text-xs text-slate-400">{formatDate(plan.updatedAt)}</div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-1.5 pr-2">
                                            <Link
                                                to={routePaths.subscriptionDetail(plan._id)}
                                                className="inline-flex items-center gap-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold rounded-xl transition shadow-sm"
                                            >
                                                <Eye size={12} /> Xem
                                            </Link>
                                            <Link
                                                to={routePaths.subscriptionEdit(plan._id)}
                                                className="inline-flex items-center gap-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold rounded-xl transition shadow-sm"
                                            >
                                                <Edit2 size={12} /> Sửa
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => openDeleteModal(plan._id, plan.name)}
                                                className="inline-flex items-center gap-1 border border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-50 px-3 py-1.5 text-xs font-semibold rounded-xl transition shadow-sm"
                                            >
                                                <Trash2 size={12} /> Xóa
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination */}
            {pagination && (
                <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-sm text-slate-500 font-medium">
                        Trang {currentPage} / {totalPages}
                        <span className="mx-2 text-slate-300">|</span>
                        Tổng cộng: {total} bản ghi
                    </p>

                    {totalPages > 1 && (
                        <ReactPaginate
                            previousLabel="←"
                            nextLabel="→"
                            pageCount={totalPages}
                            onPageChange={handlePageChange}
                            forcePage={pagination.page - 1}
                            containerClassName="flex items-center gap-1"
                            pageClassName="flex items-center justify-center w-9 h-9 text-sm font-semibold rounded-lg transition hover:bg-slate-100"
                            previousClassName="flex items-center justify-center w-9 h-9 text-sm font-semibold rounded-lg transition hover:bg-slate-100"
                            nextClassName="flex items-center justify-center w-9 h-9 text-sm font-semibold rounded-lg transition hover:bg-slate-100"
                            activeClassName="bg-blue-600 text-white hover:bg-blue-700"
                            disabledClassName="opacity-40 cursor-not-allowed"
                        />
                    )}
                </div>
            )}

            {/* Delete Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white p-6 shadow-xl rounded-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Xóa gói subscription?</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Hành động này không thể hoàn tác. Dữ liệu subscription của người dùng có thể bị
                                ảnh hưởng.
                            </p>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Xác nhận xóa gói{" "}
                            <span className="font-bold text-slate-950">"{deleteModal.planName}"</span>?
                        </p>
                        <div className="flex gap-2 justify-end pt-1">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
                            >
                                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default SubscriptionPlansPage;
