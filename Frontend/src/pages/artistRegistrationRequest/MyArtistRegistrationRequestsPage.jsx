import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Eye, FileCheck2, FileX, Loader2, Plus, Search, XCircle } from "lucide-react";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorFullMessage } from "../../utils/apiError";
import {
    cancelArtistRegistrationRequestService,
    getMyArtistRegistrationRequestsService,
} from "../../services/artist/userArtistRegistrationListService";
import { useAuth } from "../../hooks/useAuth";

const STATUS_CONFIG = {
    pending: {
        label: "Đang chờ duyệt",
        icon: Clock,
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        iconClass: "text-amber-500",
    },
    approved: {
        label: "Đã duyệt",
        icon: FileCheck2,
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        iconClass: "text-emerald-500",
    },
    rejected: {
        label: "Bị từ chối",
        icon: FileX,
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        iconClass: "text-rose-500",
    },
};

const EMPTY_STATES = {
    pending: {
        title: "Chưa có yêu cầu nào",
        description: "Bạn chưa gửi yêu cầu đăng kí nghệ sĩ nào.",
    },
    approved: {
        title: "Không có yêu cầu đã duyệt",
        description: "Không có yêu cầu nào được duyệt.",
    },
    rejected: {
        title: "Không có yêu cầu bị từ chối",
        description: "Không có yêu cầu nào bị từ chối.",
    },
    all: {
        title: "Chưa có yêu cầu nào",
        description: "Bạn chưa gửi yêu cầu đăng kí nghệ sĩ nào. Hãy bắt đầu ngay!",
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
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
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

const EmptyState = ({ statusFilter, onNavigateToRegister, canCreateRequest }) => (
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
        {!statusFilter && canCreateRequest && (
            <button
                onClick={onNavigateToRegister}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#f5b66f] px-5 py-2.5 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789]"
            >
                <Plus className="h-4 w-4" aria-hidden />
                Đăng kí nghệ sĩ ngay
            </button>
        )}
    </div>
);

const ConfirmModal = ({ isOpen, onConfirm, onCancel, isLoading, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#1a1a22] p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-white/65">{message}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                Đang hủy...
                            </>
                        ) : (
                            "Hủy yêu cầu"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MyArtistRegistrationRequestsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isArtist = user?.role === "artist";

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

    const [cancelTarget, setCancelTarget] = useState(null);
    const [isCanceling, setIsCanceling] = useState(false);

    const fetchRequests = async (signal) => {
        setLoading(true);
        setErrorMessage("");

        try {
            const result = await getMyArtistRegistrationRequestsService(
                { page: meta.page, limit: 10, ...(statusFilter ? { status: statusFilter } : {}) },
                { signal }
            );
            setRequests(result.data?.requests || []);
            setMeta(result.meta || { page: 1, limit: 10, total: 0, totalPages: 0 });
        } catch (error) {
            if (error.name !== "CanceledError") {
                setErrorMessage(
                    getApiErrorFullMessage(error, "Không thể tải danh sách yêu cầu.")
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchRequests(controller.signal);
        return () => controller.abort();
    }, [statusFilter]);

    const handlePageChange = (newPage) => {
        setMeta((prev) => ({ ...prev, page: newPage }));
    };

    useEffect(() => {
        if (meta.page === 1) return;
        const controller = new AbortController();
        fetchRequests(controller.signal);
        return () => controller.abort();
    }, [meta.page]);

    const handleViewDetail = (requestId) => {
        navigate(routePaths.artistRegistrationRequestsDetail(requestId));
    };

    const handleCancelClick = (request) => {
        setCancelTarget(request);
    };

    const handleCancelConfirm = async () => {
        if (!cancelTarget) return;

        setIsCanceling(true);
        try {
            await cancelArtistRegistrationRequestService(cancelTarget._id);
            setRequests((prev) => prev.filter((r) => r._id !== cancelTarget._id));
            setMeta((prev) => ({ ...prev, total: prev.total - 1 }));
            setCancelTarget(null);
        } catch (error) {
            alert(getApiErrorFullMessage(error, "Không thể hủy yêu cầu."));
        } finally {
            setIsCanceling(false);
        }
    };

    const currentPage = meta.page;
    const totalPages = meta.totalPages;

    return (
        <main className="min-h-full bg-[#0e0e12] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-6">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f5b66f]">
                            Tài khoản
                        </p>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                            Yêu cầu đăng kí nghệ sĩ của tôi
                        </h1>
                        <p className="mt-1 text-sm text-white/55">
                            Theo dõi trạng thái các yêu cầu đăng kí nghệ sĩ đã gửi.
                        </p>
                    </div>
                    {!isArtist && (
                        <button
                            onClick={() => navigate(routePaths.artistRegistrationRequest)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-[#f5b66f] px-5 py-2.5 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789]"
                        >
                            <Plus className="h-4 w-4" aria-hidden />
                            Đăng kí mới
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: "", label: "Tất cả" },
                        { value: "pending", label: "Đang chờ" },
                        { value: "approved", label: "Đã duyệt" },
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
                                <XCircle className="h-7 w-7" aria-hidden />
                            </div>
                            <p className="max-w-sm text-sm text-white/65">{errorMessage}</p>
                            <button
                                onClick={() => fetchRequests(new AbortController().signal)}
                                className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.07]"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !errorMessage && requests.length === 0 && (
                        <EmptyState
                            statusFilter={statusFilter}
                            onNavigateToRegister={() => navigate(routePaths.artistRegistrationRequest)}
                            canCreateRequest={!isArtist}
                        />
                    )}

                    {/* List */}
                    {!loading && !errorMessage && requests.length > 0 && (
                        <div className="divide-y divide-white/[0.06]">
                            {requests.map((request) => (
                                <div
                                    key={request._id}
                                    className="flex flex-col gap-4 p-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-semibold text-white truncate max-w-[200px]">
                                                {request.stageName || "Không có tên"}
                                            </h3>
                                            <StatusBadge status={request.status} />
                                        </div>
                                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/45">
                                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                            Gửi: {formatDate(request.createdAt)}
                                        </p>
                                        {request.status === "rejected" && request.rejectReason && (
                                            <p className="mt-1 text-xs text-rose-400/80">
                                                Lý do: {request.rejectReason}
                                            </p>
                                        )}
                                        {request.status === "approved" && request.reviewedAt && (
                                            <p className="mt-1 text-xs text-emerald-400/80">
                                                Duyệt: {formatDate(request.reviewedAt)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <button
                                            onClick={() => handleViewDetail(request._id)}
                                            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                                        >
                                            <Eye className="h-3.5 w-3.5" aria-hidden />
                                            Chi tiết
                                        </button>
                                        {request.status === "pending" && (
                                            <button
                                                onClick={() => handleCancelClick(request)}
                                                className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-400 transition hover:bg-rose-500/20"
                                            >
                                                Hủy
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && !errorMessage && totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-white/[0.06] p-4">
                            <p className="text-xs text-white/45">
                                Trang {currentPage} / {totalPages} — {meta.total} kết quả
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="inline-flex min-h-[36px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 text-xs font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    ← Trước
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="inline-flex min-h-[36px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 text-xs font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    Sau →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Cancel Modal */}
            <ConfirmModal
                isOpen={!!cancelTarget}
                onConfirm={handleCancelConfirm}
                onCancel={() => setCancelTarget(null)}
                isLoading={isCanceling}
                title="Hủy yêu cầu đăng kí nghệ sĩ?"
                message={`Bạn có chắc muốn hủy yêu cầu "${cancelTarget?.stageName}"? Hành động này không thể hoàn tác.`}
            />
        </main>
    );
};

export default MyArtistRegistrationRequestsPage;
