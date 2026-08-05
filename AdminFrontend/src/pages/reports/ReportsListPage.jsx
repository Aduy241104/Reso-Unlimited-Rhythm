import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import { Search, CheckCircle, XCircle, Eye, ArrowRight, Layers } from "lucide-react";
import { getGroupedReportsService } from "../../services/reportService";
import { routePaths } from "../../routes/routePaths";

const statusFilters = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "pending", label: "Đang xem xét" },
    { value: "resolved", label: "Đã xử lý" },
    { value: "rejected", label: "Từ chối" },
];

const targetTypeFilters = [
    { value: "", label: "Tất cả loại" },
    { value: "track", label: "Bài hát" },
    { value: "album", label: "Album" },
    { value: "artist", label: "Nghệ sĩ" },
];

const TARGET_TYPE_LABELS = {
    track: "Bài hát",
    album: "Album",
    artist: "Nghệ sĩ",
};

const getTargetTypeLabel = (type) => TARGET_TYPE_LABELS[type] || "Nội dung";

const reasonLabels = {
    copyright_infringement: "Bản quyền",
    harassment_or_hate: "Quấy rối",
    nudity_or_sexual_content: "Đồi trụy",
    violence_or_dangerous_content: "Bạo lực",
    spam_or_scam: "Spam",
    misleading_information: "Sai lệch",
    impersonation: "Mạo danh",
    other: "Khác",
};

reasonLabels.fake_artist = "Nghệ sĩ giả mạo";
reasonLabels.wrong_metadata = "Thông tin bài hát không chính xác";
reasonLabels.lyrics_issue = "Lời bài hát không phù hợp";
reasonLabels.audio_quality = "Chất lượng âm thanh kém";

const getStatusConfig = (status) => {
    switch (status) {
        case "pending":
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
                label: "Đang xem xét",
                icon: Eye,
                bg: "bg-blue-50",
                text: "text-blue-600",
                border: "border-blue-100",
                dot: "bg-blue-500",
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
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${colors[type] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
            {getTargetTypeLabel(type)}
        </span>
    );
};

const HeaderStat = ({ label, value }) => (
    <div className="rounded-xl bg-slate-100 px-4 py-2.5 min-w-[110px] text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
    </div>
);

const ReportsListPage = () => {
    const [groups, setGroups] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterTargetType, setFilterTargetType] = useState("");
    const [query, setQuery] = useState({ search: "", status: "", targetType: "", page: 1, limit: 10 });
    const [pagination, setPagination] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const loadGroupedReports = async (params = query) => {
        setIsLoading(true);
        setMessage("");
        try {
            const result = await getGroupedReportsService({
                search: params.search,
                status: params.status,
                targetType: params.targetType,
                page: params.page,
                limit: params.limit,
            });

            setGroups(result.groups || []);
            setPagination(result.meta || null);
        } catch (error) {
            setMessage("Không thể tải danh sách báo cáo.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadGroupedReports(query);
    }, [query]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        setQuery((prev) => ({
            ...prev,
            search: searchTerm.trim(),
            status: filterStatus,
            targetType: filterTargetType,
            page: 1,
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

    const total = pagination?.total ?? 0;
    const totalPages = pagination?.totalPages ?? 1;

    return (
        <section className="space-y-5 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-1">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Quản lý nội dung
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                        Danh sách báo cáo vi phạm
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto">
                    <div className="grid gap-2 grid-cols-3">
                        <HeaderStat label="Nội dung vi phạm" value={total} />
                        <HeaderStat label="Hiển thị" value={groups.length} />
                        <HeaderStat label="Trang" value={`${query.page}/${totalPages}`} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <form
                onSubmit={handleSearchSubmit}
                className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_100px_100px]"
            >
                <label className="relative block">
                    <Search
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm nội dung, tác giả..."
                        className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
                    />
                </label>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer"
                >
                    {statusFilters.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>

                <select
                    value={filterTargetType}
                    onChange={(e) => setFilterTargetType(e.target.value)}
                    className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer"
                >
                    {targetTypeFilters.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
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

            {/* Grouped Table */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="grid min-w-[1000px] grid-cols-[minmax(0,1.8fr)_100px_120px_minmax(0,1.5fr)_140px_160px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    <span>Nội dung bị báo cáo</span>
                    <span>Loại</span>
                    <span>Tổng lượt</span>
                    <span>Lý do báo cáo</span>
                    <span>Trạng thái</span>
                    <span>Báo cáo mới nhất</span>
                    <span className="text-right pr-4">Hành động</span>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[1000px] divide-y divide-slate-100">
                        {isLoading ? (
                            <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Đang tải danh sách báo cáo gom nhóm...
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 italic">
                                Không có nội dung bị báo cáo nào phù hợp điều kiện.
                            </div>
                        ) : (
                            groups.map((group) => {
                                const statusConfig = getStatusConfig(group.groupStatus);
                                const StatusIcon = statusConfig.icon;
                                const target = group.targetInfo;
                                const title = target?.title || target?.name || "Nội dung không còn tồn tại";
                                const artistName =
                                    target?.artist_artistId?.name || target?.artistId?.name || (group.targetType === "artist" ? target?.name : null);
                                const avatar = target?.avatar || target?.coverImage || "";

                                const latestDate = group.latestReportAt
                                    ? new Date(group.latestReportAt).toLocaleString("vi-VN", {
                                          year: "numeric",
                                          month: "2-digit",
                                          day: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : "—";

                                return (
                                    <div
                                        key={`${group.targetType}-${group.targetId}`}
                                        className="group grid items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                                        style={{
                                            gridTemplateColumns:
                                                "minmax(0,1.8fr) 100px 120px minmax(0,1.5fr) 140px 160px 120px",
                                        }}
                                    >
                                        {/* Target Info */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            {avatar ? (
                                                <img
                                                    src={avatar}
                                                    alt=""
                                                    className="h-10 w-10 rounded-xl object-cover shrink-0 shadow-sm"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                                    <Layers size={18} />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-900">
                                                    {title}
                                                </p>
                                                {artistName ? (
                                                    <p className="truncate text-xs text-slate-400">
                                                        {artistName}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Type */}
                                        <div>{getTargetTypeBadge(group.targetType)}</div>

                                        {/* Total Reports Count */}
                                        <div>
                                            <span className="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-100">
                                                {group.totalReports} lượt
                                            </span>
                                        </div>

                                        {/* Reasons breakdown tags */}
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(group.reasonCounts || {}).map(([reason, count]) => (
                                                <span
                                                    key={reason}
                                                    className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                                >
                                                    {reasonLabels[reason] || reason} ({count})
                                                </span>
                                            ))}
                                        </div>

                                        {/* Group Status */}
                                        <div>
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}
                                                ></span>
                                                <StatusIcon size={12} />
                                                {statusConfig.label}
                                            </span>
                                        </div>

                                        {/* Latest report date */}
                                        <div className="text-xs text-slate-400">{latestDate}</div>

                                        {/* Action link */}
                                        <div className="flex items-center justify-end">
                                            <Link
                                                to={routePaths.groupedReportDetail(group.targetType, group.targetId)}
                                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                                            >
                                                <span>Chi tiết</span>
                                                <ArrowRight size={14} />
                                            </Link>
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
                <div className="flex justify-center pt-2">
                    <ReactPaginate
                        previousLabel="Trở lại"
                        nextLabel="Tiếp"
                        onPageChange={handlePageChange}
                        pageCount={pagination.totalPages}
                        forcePage={query.page - 1}
                        containerClassName="flex items-center gap-1 text-sm font-medium text-slate-600"
                        pageClassName="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 transition cursor-pointer"
                        activeClassName="!bg-blue-600 !border-blue-600 !text-white"
                        previousClassName="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 transition cursor-pointer"
                        nextClassName="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 transition cursor-pointer"
                        disabledClassName="opacity-40 cursor-not-allowed"
                    />
                </div>
            )}
        </section>
    );
};

export default ReportsListPage;
