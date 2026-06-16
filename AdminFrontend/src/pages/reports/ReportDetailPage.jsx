import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
    ArrowLeft,
    User,
    Flag,
    Calendar,
    CheckCircle,
    XCircle,
    Eye,
    AlertTriangle,
    FileText,
    Image as ImageIcon,
} from "lucide-react";
import { getReportDetailService, updateReportStatusService } from "../../services/reportService";
import { routePaths } from "../../routes/routePaths";
import toast from "react-hot-toast";

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

const resolutionLabels = {
    remove_content: "Gỡ bỏ nội dung vi phạm",
    ignore: "Bỏ qua báo cáo",
    warning: "Cảnh cáo người dùng",
    resolved: "Đã xử lý",
    rejected: "Từ chối",
    "": "—",
};

const getStatusConfig = (status) => {
    switch (status) {
        case "pending":
        case "reviewing":
            return { label: "Đang xem xét", icon: Eye, bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" };
        case "resolved":
            return { label: "Đã xử lý", icon: CheckCircle, bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" };
        case "rejected":
            return { label: "Từ chối", icon: XCircle, bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" };
        default:
            return { label: "Đang xem xét", icon: Eye, bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" };
    }
};

const getTargetTypeBadge = (type) => {
    const colors = {
        track: "bg-violet-100 text-violet-700",
        album: "bg-orange-100 text-orange-700",
        artist: "bg-cyan-100 text-cyan-700",
    };
    return (
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${colors[type] || "bg-slate-100 text-slate-700"}`}>
            {type}
        </span>
    );
};

const InfoCard = ({ icon: Icon, title, children }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <Icon size={16} className="text-slate-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
        {children}
    </div>
);

const ReportDetailPage = () => {
    const { reportId } = useParams();
    const [report, setReport] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [messageTone, setMessageTone] = useState("error");
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectResolution, setRejectResolution] = useState("");
    const [rejectNote, setRejectNote] = useState("");
    const [rejectResolutionError, setRejectResolutionError] = useState("");
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolveNote, setResolveNote] = useState("");
    const [selectedResolution, setSelectedResolution] = useState("");
    const [resolutionError, setResolutionError] = useState("");

    const loadReport = async () => {
        if (!reportId) return;

        setIsLoading(true);
        setMessage("");

        try {
            const result = await getReportDetailService(reportId);
            setReport(result);
        } catch (error) {
            setMessageTone("error");
            setMessage(error?.response?.data?.message || error?.message || "Không thể tải chi tiết báo cáo.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadReport();
    }, [reportId]);

    const handleStatusUpdate = async (newStatus, note = "", resolution = "") => {
        setIsSubmitting(true);
        setMessage("");

        try {
            const result = await updateReportStatusService(reportId, { status: newStatus, resolutionNote: note, resolution });
            setReport(result);
            setMessageTone("success");
            setMessage("Cập nhật trạng thái thành công.");
            toast.success("Cập nhật trạng thái thành công");
        } catch (error) {
            setMessageTone("error");
            setMessage(error?.response?.data?.message || error?.message || "Cập nhật trạng thái thất bại.");
            toast.error("Cập nhật trạng thái thất bại");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectResolution.trim()) {
            toast.error("Vui lòng nhập hình thức từ chối");
            return;
        }

        setIsSubmitting(true);
        setMessage("");

        try {
            const result = await updateReportStatusService(reportId, {
                status: "rejected",
                resolution: rejectResolution.trim(),
                resolutionNote: rejectNote.trim(),
            });
            setReport(result);
            setShowRejectModal(false);
            setRejectReason("");
            setRejectResolution("");
            setRejectNote("");
            setRejectResolutionError("");
            setMessageTone("success");
            setMessage("Từ chối báo cáo thành công.");
            toast.success("Từ chối báo cáo thành công");
        } catch (error) {
            setMessageTone("error");
            setMessage(error?.response?.data?.message || error?.message || "Từ chối báo cáo thất bại.");
            toast.error("Từ chối báo cáo thất bại");
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusConfig = report ? getStatusConfig(report.status) : null;
    const StatusIcon = statusConfig?.icon;
    const reporter = report?.userId;
    const reporterName = reporter?.profile?.fullName || reporter?.email || "—";
    const handler = report?.handledBy;

    const formatDate = (date) => {
        if (!date) return "—";
        return new Date(date).toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <section className="space-y-5 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    to={routePaths.reports}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-50"
                >
                    <ArrowLeft size={18} className="text-slate-600" />
                </Link>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Quản lý nội dung</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Chi tiết báo cáo</h1>
                </div>
            </div>

            {/* Messages */}
            {message && (
                <div className={`rounded-xl px-5 py-4 text-sm ${messageTone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {message}
                </div>
            )}

            {isLoading ? (
                <div className="rounded-2xl bg-white px-6 py-20 text-center text-sm text-slate-600">
                    Đang tải chi tiết báo cáo...
                </div>
            ) : report ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
                    {/* Main Content */}
                    <div className="space-y-5">
                        {/* Resolution - Prominent Banner */}
                        {(report.status === "resolved" || report.status === "rejected") && (
                            <div className={`rounded-2xl p-5 shadow-lg ${
                                report.status === "resolved" 
                                    ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200" 
                                    : "bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200"
                            }`}>
                                <div className="flex items-center gap-3 mb-3">
                                    {report.status === "resolved" ? (
                                        <CheckCircle size={24} className="text-emerald-600" />
                                    ) : (
                                        <XCircle size={24} className="text-rose-600" />
                                    )}
                                    <h3 className={`text-lg font-semibold ${report.status === "resolved" ? "text-emerald-800" : "text-rose-800"}`}>
                                        {report.status === "resolved" ? "Kết quả xử lý" : "Lý do từ chối"}
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Hình thức xử lý</span>
                                        <span className={`text-sm font-semibold ${report.status === "resolved" ? "text-emerald-700" : "text-rose-700"}`}>
                                            {report.resolution || "—"}
                                        </span>
                                    </div>
                                    {report.resolutionNote && (
                                        <div className="pt-2 mt-2 border-t border-slate-200/50">
                                            <span className="text-sm text-slate-500">Ghi chú từ quản trị viên</span>
                                            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                                                {report.resolutionNote}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Report Info */}
                        <InfoCard icon={Flag} title="Thông tin báo cáo">
                            <div className="space-y-4">
                                {report.targetInfo && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">
                                                {report.targetType === "track" ? "Bài hát" : report.targetType === "album" ? "Album" : "Nghệ sĩ"}
                                            </span>
                                            <span className="text-sm font-medium text-slate-700 truncate max-w-[60%] text-right">
                                                {report.targetInfo.title || report.targetInfo.name}
                                            </span>
                                        </div>
                                        {(report.targetInfo.artist_artistId?.name || report.targetInfo.artistId?.name) && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-500">Nghệ sĩ</span>
                                                <span className="text-sm text-slate-700 truncate max-w-[60%] text-right">
                                                    {report.targetInfo.artist_artistId?.name || report.targetInfo.artistId?.name}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Trạng thái</span>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${statusConfig?.bg} ${statusConfig?.text} ${statusConfig?.border}`}>
                                        <StatusIcon size={14} />
                                        {statusConfig?.label}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Loại nội dung</span>
                                    {getTargetTypeBadge(report.targetType)}
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Lý do báo cáo</span>
                                    <span className="text-sm font-medium text-slate-700">
                                        {reasonLabels[report.reason] || report.reason}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Ngày tạo</span>
                                    <span className="text-sm text-slate-600">{formatDate(report.createdAt)}</span>
                                </div>

                                {report.handledAt && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Ngày xử lý</span>
                                        <span className="text-sm text-slate-600">{formatDate(report.handledAt)}</span>
                                    </div>
                                )}
                            </div>
                        </InfoCard>

                        {/* Description */}
                        <InfoCard icon={FileText} title="Mô tả chi tiết">
                            <p className="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed">
                                {report.description || "Không có mô tả."}
                            </p>
                        </InfoCard>

                        {/* Images */}
                        {report.images?.length > 0 && (
                            <InfoCard icon={ImageIcon} title={`Hình ảnh đính kèm (${report.images.length})`}>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {report.images.map((url, index) => (
                                        <a
                                            key={index}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:opacity-80"
                                        >
                                            <img
                                                src={url}
                                                alt={`Hình ảnh ${index + 1}`}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = "none";
                                                    e.target.parentElement.innerHTML = `<div class="flex h-full items-center justify-center text-slate-400 text-xs">Hình ảnh không tải được</div>`;
                                                }}
                                            />
                                        </a>
                                    ))}
                                </div>
                            </InfoCard>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-5">
                        {/* Reporter Info */}
                        <InfoCard icon={User} title="Người báo cáo">
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-slate-400">Họ và tên</span>
                                    <p className="text-sm font-medium text-slate-700">{reporterName}</p>
                                </div>
                                {reporter?.email && (
                                    <div>
                                        <span className="text-xs text-slate-400">Email</span>
                                        <p className="text-sm text-slate-600">{reporter.email}</p>
                                    </div>
                                )}
                            </div>
                        </InfoCard>

                        {/* Handler Info */}
                        {handler && (
                            <InfoCard icon={CheckCircle} title="Người xử lý">
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-xs text-slate-400">Họ và tên</span>
                                        <p className="text-sm font-medium text-slate-700">
                                            {handler?.profile?.fullName || handler?.email || "—"}
                                        </p>
                                    </div>
                                    {handler?.email && (
                                        <div>
                                            <span className="text-xs text-slate-400">Email</span>
                                            <p className="text-sm text-slate-600">{handler.email}</p>
                                        </div>
                                    )}
                                </div>
                            </InfoCard>
                        )}

                        {/* Target Info */}
                        <InfoCard icon={Flag} title="Nội dung bị báo cáo">
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-slate-400">Loại</span>
                                    <p className="text-sm font-medium capitalize text-slate-700">{report.targetType}</p>
                                </div>
                                {report.targetInfo && (
                                    <div>
                                        <span className="text-xs text-slate-400">
                                            {report.targetType === "track" ? "Bài hát" : report.targetType === "album" ? "Album" : "Nghệ sĩ"}
                                        </span>
                                        <p className="text-sm font-medium text-slate-700">
                                            {report.targetInfo.title || report.targetInfo.name}
                                        </p>
                                        {report.targetInfo.artist_artistId && (
                                            <p className="text-xs text-slate-500">
                                                by {report.targetInfo.artist_artistId.name || report.targetInfo.artistId?.name || ""}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </InfoCard>

                        {/* Actions */}
                        {report.status !== "resolved" && report.status !== "rejected" && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <h3 className="mb-4 text-sm font-semibold text-slate-700">Hành động</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setShowResolveModal(true)}
                                        disabled={isSubmitting}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                                    >
                                        <CheckCircle size={16} />
                                        Xác nhận đã xử lý
                                    </button>
                                    <button
                                        onClick={() => setShowRejectModal(true)}
                                        disabled={isSubmitting}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                                    >
                                        <XCircle size={16} />
                                        Từ chối báo cáo
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Resolve Modal */}
                        {showResolveModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                                    <h3 className="mb-4 text-lg font-semibold text-slate-900">Xác nhận đã xử lý</h3>
                                    <div className="mb-4 space-y-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Hình thức xử lý <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedResolution}
                                                onChange={(e) => {
                                                    setSelectedResolution(e.target.value);
                                                    setResolutionError("");
                                                }}
                                                placeholder="Nhập hình thức xử lý..."
                                                className={`w-full rounded-xl border p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${resolutionError ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-emerald-500"}`}
                                            />
                                            {resolutionError && (
                                                <p className="mt-1 text-xs text-rose-500">{resolutionError}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Ghi chú từ quản trị viên
                                            </label>
                                            <textarea
                                                value={resolveNote}
                                                onChange={(e) => setResolveNote(e.target.value)}
                                                placeholder="Nhập ghi chú về cách xử lý báo cáo..."
                                                rows={4}
                                                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setShowResolveModal(false);
                                                setResolveNote("");
                                                setSelectedResolution("");
                                                setResolutionError("");
                                            }}
                                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!selectedResolution.trim()) {
                                                    setResolutionError("Vui lòng nhập hình thức xử lý");
                                                    return;
                                                }
                                                void handleStatusUpdate("resolved", resolveNote.trim(), selectedResolution.trim());
                                                setShowResolveModal(false);
                                                setResolveNote("");
                                                setSelectedResolution("");
                                                setResolutionError("");
                                            }}
                                            disabled={isSubmitting}
                                            className="flex-1 rounded-xl border border-emerald-200 bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reject Modal */}
                        {showRejectModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                                    <h3 className="mb-4 text-lg font-semibold text-slate-900">Từ chối báo cáo</h3>
                                    <div className="mb-4 space-y-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Hình thức từ chối <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={rejectResolution}
                                                onChange={(e) => {
                                                    setRejectResolution(e.target.value);
                                                    setRejectResolutionError("");
                                                }}
                                                placeholder="Nhập hình thức từ chối..."
                                                className={`w-full rounded-xl border p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${rejectResolutionError ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-rose-500"}`}
                                            />
                                            {rejectResolutionError && (
                                                <p className="mt-1 text-xs text-rose-500">{rejectResolutionError}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Ghi chú từ quản trị viên
                                            </label>
                                            <textarea
                                                value={rejectNote}
                                                onChange={(e) => setRejectNote(e.target.value)}
                                                placeholder="Nhập ghi chú thêm (không bắt buộc)..."
                                                rows={4}
                                                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setShowRejectModal(false);
                                                setRejectReason("");
                                                setRejectResolution("");
                                                setRejectNote("");
                                                setRejectResolutionError("");
                                            }}
                                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!rejectResolution.trim()) {
                                                    setRejectResolutionError("Vui lòng nhập hình thức từ chối");
                                                    return;
                                                }
                                                void handleReject();
                                            }}
                                            disabled={isSubmitting}
                                            className="flex-1 rounded-xl border border-rose-200 bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Đang xử lý..." : "Từ chối"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl bg-white px-6 py-20 text-center text-sm text-slate-500">
                    Không tìm thấy báo cáo.
                </div>
            )}
        </section>
    );
};

export default ReportDetailPage;
