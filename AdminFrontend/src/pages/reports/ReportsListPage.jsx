import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Search, AlertTriangle, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { getReportsService, updateReportStatusService } from "../../services/reportService";
import { routePaths } from "../../routes/routePaths";
import toast from "react-hot-toast";

const statusFilters = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "pending", label: "Đang chờ" },
    { value: "reviewing", label: "Đang xem xét" },
    { value: "resolved", label: "Đã xử lý" },
    { value: "rejected", label: "Từ chối" },
];

const targetTypeFilters = [
    { value: "", label: "Tất cả loại" },
    { value: "track", label: "Track" },
    { value: "album", label: "Album" },
    { value: "artist", label: "Artist" },
];

const reasonLabels = {
    copyright_infringement: "Vi phạm bản quyền",
    harassment_or_hate: "Quấy rối / Thù địch",
    nudity_or_sexual_content: "Nội dung đồi trụy",
    violence_or_dangerous_content: "Bạo lực / Nguy hiểm",
    spam_or_scam: "Spam / Lừa đảo",
    misleading_information: "Thông tin sai lệch",
    impersonation: "Mạo danh",
    other: "Khác",
};

const getStatusConfig = (status) => {
    switch (status) {
        case "pending":
            return {
                label: "Đang chờ",
                icon: Clock,
                bg: "bg-amber-50",
                text: "text-amber-600",
                border: "border-amber-100",
                dot: "bg-amber-500",
            };
        case "reviewing":
            return {
                label: "Đang xem xét",
                icon: Eye,
                bg: "bg-blue-50",
                text: "text-blue-600",
                border: "border-blue-100",
                dot: "bg-blue-500",
            };
        case "resolved":
            return {
                label: "Đã xử lý",
                icon: CheckCircle,
                bg: "bg-emerald-50",
                text: "text-emerald-600",
                border: "border-emerald-100",
                dot: "bg-emerald-500",
            };
        case "rejected":
            return {
                label: "Từ chối",
                icon: XCircle,
                bg: "bg-rose-50",
                text: "text-rose-600",
                border: "border-rose-100",
                dot: "bg-rose-500",
            };
        default:
            return {
                label: status,
                icon: AlertTriangle,
                bg: "bg-slate-50",
                text: "text-slate-600",
                border: "border-slate-200",
                dot: "bg-slate-400",
            };
    }
};

const getTargetTypeBadge = (type) => {
    const colors = {
        track: "bg-violet-50 text-violet-600 border-violet-100",
        album: "bg-orange-50 text-orange-600 border-orange-100",
        artist: "bg-cyan-50 text-cyan-600 border-cyan-100",
    };
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${colors[type] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
            {type}
        </span>
    );
};

const HeaderStat = ({ label, value }) => (
    <div className="rounded-xl bg-slate-100 px-4 py-2.5 min-w-[100px] text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
    </div>
);

const ReportsListPage = () => {
    const [reports, setReports] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterTargetType, setFilterTargetType] = useState("");
    const [query, setQuery] = useState({ search: "", status: "", targetType: "", page: 1, limit: 10 });
    const [pagination, setPagination] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const loadReports = async (params = query) => {
        setIsLoading(true);
        setMessage("");
        try {
            const result = await getReportsService({
                q: params.search,
                status: params.status,
                targetType: params.targetType,
            });

            setReports(result.reports || []);

            const totalItems = result.meta?.total ?? result.reports?.length ?? 0;
            const totalPages = result.meta?.totalPages || Math.ceil(totalItems / params.limit) || 1;

            setPagination({
                page: params.page,
                limit: params.limit,
                total: totalItems,
                totalPages: totalPages
            });
        } catch (error) {
            setMessage("Không thể tải danh sách báo cáo.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadReports(query); }, [query]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        setQuery((prev) => ({
            ...prev,
            search: searchTerm.trim(),
            status: filterStatus,
            targetType: filterTargetType,
            page: 1
        }));
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setFilterStatus("");
        setFilterTargetType("");
        setQuery({ search: "", status: "", targetType: "", page: 1, limit: 10 });
    };

    const handlePageChange = ({ selected }) => {
        setQuery((prev) => ({ ...prev, page: selected + 1 }));
    };

    const handleQuickAction = async (reportId, newStatus) => {
        setUpdatingId(reportId);
        try {
            await updateReportStatusService(reportId, { status: newStatus });
            toast.success("Cập nhật trạng thái thành công");
            void loadReports(query);
        } catch (error) {
            toast.error("Cập nhật trạng thái thất bại");
            console.error(error);
        } finally {
            setUpdatingId(null);
        }
    };

    const total = pagination?.total ?? 0;
    const pageLabel = pagination ? `${pagination.page}/${pagination.totalPages}` : "1/1";

    return (
        <section className="space-y-5 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">

            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-1">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Quản lý nội dung</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Report Management</h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto">
                    <div className="grid gap-2 grid-cols-3">
                        <HeaderStat label="Tổng báo cáo" value={total} />
                        <HeaderStat label="Hiển thị" value={reports.length} />
                        <HeaderStat label="Trang" value={pageLabel} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_100px_100px]">
                <label className="relative block">
                    <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm báo cáo..."
                        className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
                    />
                </label>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer"
                >
                    {statusFilters.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                </select>

                <select
                    value={filterTargetType}
                    onChange={(e) => setFilterTargetType(e.target.value)}
                    className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer"
                >
                    {targetTypeFilters.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
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

            {/* Reports List */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="grid min-w-[1000px] grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px_120px_180px_200px_140px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    <span>Người báo cáo</span>
                    <span>Nội dung báo cáo</span>
                    <span>Loại</span>
                    <span>Lý do</span>
                    <span>Trạng thái</span>
                    <span>Ngày tạo</span>
                    <span className="text-right pr-4">Hành động</span>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[1000px] divide-y divide-slate-100">
                        {isLoading ? (
                            <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Đang tải danh sách báo cáo...
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 italic">
                                Không tìm thấy báo cáo nào phù hợp điều kiện lọc.
                            </div>
                        ) : (
                            reports.map((report) => {
                                const statusConfig = getStatusConfig(report.status);
                                const StatusIcon = statusConfig.icon;
                                const reporter = report.userId;
                                const reporterName = reporter?.profile?.fullName || reporter?.email || "—";
                                const createdDate = report.createdAt
                                    ? new Date(report.createdAt).toLocaleString("vi-VN", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })
                                    : "—";

                                return (
                                    <div
                                        key={report._id}
                                        className="group grid items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                                        style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr) 120px 120px 180px 200px 140px" }}
                                    >
                                        {/* Reporter */}
                                        <div>
                                            <p className="truncate text-sm font-medium text-slate-900">{reporterName}</p>
                                            <p className="truncate text-xs text-slate-400">{reporter?.email || ""}</p>
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <p className="line-clamp-2 text-sm text-slate-700">{report.description || "—"}</p>
                                            {report.images?.length > 0 && (
                                                <p className="mt-1 text-xs text-slate-400">
                                                    {report.images.length} hình ảnh đính kèm
                                                </p>
                                            )}
                                        </div>

                                        {/* Target Type */}
                                        <div>{getTargetTypeBadge(report.targetType)}</div>

                                        {/* Reason */}
                                        <div>
                                            <span className="text-xs font-medium text-slate-600">
                                                {reasonLabels[report.reason] || report.reason || "—"}
                                            </span>
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}></span>
                                                <StatusIcon size={12} />
                                                {statusConfig.label}
                                            </span>
                                        </div>

                                        {/* Created Date */}
                                        <div className="text-xs text-slate-400">{createdDate}</div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-2">
                                            {report.status === "pending" && (
                                                <button
                                                    onClick={() => void handleQuickAction(report._id, "reviewing")}
                                                    disabled={updatingId === report._id}
                                                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
                                                >
                                                    Xem xét
                                                </button>
                                            )}
                                            {report.status === "reviewing" && (
                                                <>
                                                    <button
                                                        onClick={() => void handleQuickAction(report._id, "resolved")}
                                                        disabled={updatingId === report._id}
                                                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                                                    >
                                                        Xử lý
                                                    </button>
                                                    <button
                                                        onClick={() => void handleQuickAction(report._id, "rejected")}
                                                        disabled={updatingId === report._id}
                                                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                                                    >
                                                        Từ chối
                                                    </button>
                                                </>
                                            )}
                                            {(report.status === "resolved" || report.status === "rejected") && (
                                                <span className="text-xs text-slate-400">Đã xử lý</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center">
                    <ReactPaginate
                        previousLabel="←"
                        nextLabel="→"
                        pageCount={pagination.totalPages}
                        onPageChange={handlePageChange}
                        forcePage={pagination.page - 1}
                        containerClassName="flex items-center gap-1"
                        pageClassName="flex items-center justify-center w-9 h-9 text-sm font-semibold rounded-lg transition hover:bg-slate-100"
                        previousClassName="flex items-center justify-center w-9 h-9 text-sm font-semibold rounded-lg transition hover:bg-slate-100"
                        nextClassName="flex items-center justify-center w-9 h-9 text-sm font-semibold rounded-lg transition hover:bg-slate-100"
                        activeClassName="bg-blue-600 text-white hover:bg-blue-700"
                        disabledClassName="opacity-40 cursor-not-allowed"
                    />
                </div>
            )}
        </section>
    );
};

export default ReportsListPage;
