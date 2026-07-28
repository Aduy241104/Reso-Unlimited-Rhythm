import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    Clock,
    Disc3,
    Eye,
    FileSearch,
    Loader2,
    Mic2,
    Music,
    Search,
    XCircle,
} from "lucide-react";
import { getMyReportsService } from "../../services/report/user.myReportListService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorFullMessage } from "../../utils/apiError";

const REPORT_REASON_LABELS = {
    copyright_infringement: "Vi phạm bản quyền",
    harassment_or_hate: "Quấy rối / thù ghét",
    nudity_or_sexual_content: "Nội dung nhạy cảm",
    violence_or_dangerous_content: "Bạo lực / nguy hiểm",
    spam_or_scam: "Spam / lừa đảo",
    misleading_information: "Thông tin sai lệch",
    impersonation: "Mạo danh",
    wrong_metadata: "Thông tin bài hát không chính xác",
    lyrics_issue: "Lời bài hát không phù hợp",
    audio_quality: "Chất lượng âm thanh kém",
    fake_artist: "Nghệ sĩ giả mạo",
    other: "Khác",
};

const TARGET_TYPE_CONFIG = {
    track: { label: "Bài hát", icon: Music, colorClass: "text-violet-400" },
    album: { label: "Album", icon: Disc3, colorClass: "text-blue-400" },
    artist: { label: "Nghệ sĩ", icon: Mic2, colorClass: "text-pink-400" },
};

const STATUS_CONFIG = {
    reviewing: {
        label: "Đang xem xét",
        icon: FileSearch,
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        iconClass: "text-blue-500",
    },
    resolved: {
        label: "Đã xử lý",
        icon: CheckCircle,
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        iconClass: "text-emerald-500",
    },
    rejected: {
        label: "Bị từ chối",
        icon: XCircle,
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        iconClass: "text-rose-500",
    },
};

const EMPTY_STATES = {
    reviewing: {
        title: "Chưa có báo cáo đang xem xét",
        description: "Không có báo cáo nào đang được xem xét.",
    },
    resolved: {
        title: "Chưa có báo cáo đã xử lý",
        description: "Không có báo cáo nào đã được xử lý.",
    },
    rejected: {
        title: "Chưa có báo cáo bị từ chối",
        description: "Không có báo cáo nào bị từ chối.",
    },
    all: {
        title: "Chưa có báo cáo nào",
        description: "Bạn chưa gửi báo cáo nào. Nếu phát hiện nội dung vi phạm, hãy báo cáo ngay!",
    },
};

const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(dateString));
};

const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.reviewing;
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.badgeClass}`}
        >
            <Icon className={`h-3.5 w-3.5 ${config.iconClass}`} aria-hidden />
            {config.label}
        </span>
    );
};

const TargetTypeBadge = ({ targetType }) => {
    const config = TARGET_TYPE_CONFIG[targetType] || TARGET_TYPE_CONFIG.track;
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/70`}
        >
            <Icon className={`h-3.5 w-3.5 ${config.colorClass}`} aria-hidden />
            {config.label}
        </span>
    );
};

const EmptyState = ({ statusFilter }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/30">
            <Search className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="text-lg font-semibold text-white/80">
            {EMPTY_STATES[statusFilter]?.title || EMPTY_STATES.all.title}
        </h3>
        <p className="mt-2 max-w-sm text-sm text-white/45">
            {EMPTY_STATES[statusFilter]?.description || EMPTY_STATES.all.description}
        </p>
    </div>
);

const CustomerReportListPage = () => {
    const navigate = useNavigate();

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [meta, setMeta] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });

    const fetchReports = async (signal) => {
        setLoading(true);
        setErrorMessage("");

        try {
            const result = await getMyReportsService(
                {
                    page: meta.page,
                    limit: 10,
                    ...(statusFilter ? { status: statusFilter } : {}),
                },
                { signal }
            );
            setReports(result.data?.reports || []);
            setMeta(result.meta || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            });
        } catch (error) {
            if (error.name !== "CanceledError") {
                setErrorMessage(
                    getApiErrorFullMessage(error, "Không thể tải danh sách báo cáo.")
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchReports(controller.signal);
        return () => controller.abort();
    }, [statusFilter]);

    const handlePageChange = (newPage) => {
        setMeta((prev) => ({ ...prev, page: newPage }));
    };

    useEffect(() => {
        if (meta.page === 1) return;
        const controller = new AbortController();
        fetchReports(controller.signal);
        return () => controller.abort();
    }, [meta.page]);

    const handleViewDetail = (reportId) => {
        navigate(routePaths.userReportDetail(reportId));
    };

    return (
        <main className="min-h-full bg-[#0e0e12] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-6">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(routePaths.home)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                        >
                            <ArrowLeft className="h-4.5 w-4.5" aria-hidden />
                        </button>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f5b66f]">
                                Tài khoản
                            </p>
                            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                                Báo cáo của tôi
                            </h1>
                            <p className="mt-1 text-sm text-white/55">
                                Theo dõi trạng thái các báo cáo đã gửi.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: "", label: "Tất cả" },
                        { value: "reviewing", label: "Đang xem xét" },
                        { value: "resolved", label: "Đã xử lý" },
                        { value: "rejected", label: "Bị từ chối" },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => {
                                setStatusFilter(tab.value);
                                setMeta((prev) => ({ ...prev, page: 1 }));
                            }}
                            className={`inline-flex min-h-[40px] items-center gap-2 rounded-2xl px-4 text-sm font-medium transition ${
                                statusFilter === tab.value
                                    ? "border border-[#f5b66f]/40 bg-[#f5b66f]/12 text-[#f5b66f]"
                                    : "border border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90"
                            }`}
                        >
                            {tab.label}
                            {tab.value === "" && meta.total > 0 && (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                                    {meta.total}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] shadow-xl">
                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-[#f5b66f]" aria-hidden />
                            <p className="mt-3 text-sm text-white/55">Đang tải danh sách...</p>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && errorMessage && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-300/20 bg-rose-500/10 text-rose-400">
                                <AlertCircle className="h-7 w-7" aria-hidden />
                            </div>
                            <p className="max-w-sm text-sm text-white/65">{errorMessage}</p>
                            <button
                                onClick={() => fetchReports(new AbortController().signal)}
                                className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.07]"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !errorMessage && reports.length === 0 && (
                        <EmptyState
                            statusFilter={statusFilter}
                        />
                    )}

                    {/* List */}
                    {!loading && !errorMessage && reports.length > 0 && (
                        <div className="divide-y divide-white/[0.06]">
                            {reports.map((report) => (
                                <div
                                    key={report._id}
                                    className="flex flex-col gap-4 p-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-start sm:justify-between"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <TargetTypeBadge targetType={report.targetType} />
                                            <StatusBadge status={report.status} />
                                        </div>
                                        <p className="mt-2 text-sm font-medium text-white/90">
                                            {REPORT_REASON_LABELS[report.reason] || report.reason}
                                        </p>
                                        {report.description && (
                                            <p className="mt-1 line-clamp-2 text-xs text-white/45">
                                                {report.description}
                                            </p>
                                        )}
                                        <p className="mt-2 flex items-center gap-1.5 text-xs text-white/45">
                                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                            Gửi: {formatDate(report.createdAt)}
                                        </p>
                                        {report.status === "resolved" && report.resolutionNote && (
                                            <p className="mt-1 text-xs text-emerald-400/80">
                                                Phản hồi: {report.resolutionNote}
                                            </p>
                                        )}
                                        {report.status === "rejected" && report.resolutionNote && (
                                            <p className="mt-1 text-xs text-rose-400/80">
                                                Lý do từ chối: {report.resolutionNote}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <button
                                            onClick={() => handleViewDetail(report._id)}
                                            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                                        >
                                            <Eye className="h-3.5 w-3.5" aria-hidden />
                                            Chi tiết
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && !errorMessage && reports.length > 0 && meta.totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-4">
                            <p className="text-xs text-white/45">
                                Trang {meta.page} / {meta.totalPages} — {meta.total} báo cáo
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(meta.page - 1)}
                                    disabled={meta.page <= 1}
                                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    ← Trước
                                </button>
                                <button
                                    onClick={() => handlePageChange(meta.page + 1)}
                                    disabled={meta.page >= meta.totalPages}
                                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Sau →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default CustomerReportListPage;
