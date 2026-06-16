import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    CheckCircle2,
    Clock,
    Disc3,
    Eye,
    FileSearch,
    ImageIcon,
    Loader2,
    Mic2,
    Music,
    XCircle,
} from "lucide-react";
import { getMyReportDetailService } from "../../services/report/user.myReportListService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorFullMessage } from "../../utils/apiError";

const ACCENT = {
    gold: "#d6b06a",
    goldSoft: "#e7c78d",
    goldBorder: "rgba(214,176,106,0.14)",
    surface: "rgba(255,255,255,0.03)",
};

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
    pending: {
        label: "Đang chờ",
        icon: Clock,
        badgeClass: "border-amber-300/18 bg-amber-300/10 text-amber-100",
        iconClass: "text-amber-200",
    },
    reviewing: {
        label: "Đang xem xét",
        icon: FileSearch,
        badgeClass: "border-blue-300/18 bg-blue-300/10 text-blue-100",
        iconClass: "text-blue-200",
    },
    resolved: {
        label: "Đã xử lý",
        icon: CheckCircle,
        badgeClass: "border-emerald-300/18 bg-emerald-300/10 text-emerald-100",
        iconClass: "text-emerald-200",
    },
    rejected: {
        label: "Bị từ chối",
        icon: XCircle,
        badgeClass: "border-rose-300/18 bg-rose-300/10 text-rose-100",
        iconClass: "text-rose-200",
    },
};

const RESOLUTION_LABELS = {
    remove_content: "Gỡ nội dung vi phạm",
    ignore: "Bỏ qua",
    warning: "Cảnh cáo",
    "": "—",
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

const SectionCard = ({ title, icon: Icon, children, subtitle }) => (
    <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(20,20,28,0.90),rgba(14,14,20,0.80))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl" style={{ backgroundColor: "rgba(214,176,106,0.08)" }} />
        <div className="relative mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
                <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl border bg-black/10 backdrop-blur-sm"
                    style={{ borderColor: ACCENT.goldBorder, color: ACCENT.gold, backgroundColor: "rgba(214,176,106,0.10)" }}
                >
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                </div>
                <div>
                    <h2 className="text-base font-semibold tracking-[0.01em] text-white">{title}</h2>
                    {subtitle ? <p className="mt-1 text-xs text-white/42">{subtitle}</p> : null}
                </div>
            </div>
        </div>
        <div className="relative space-y-4">{children}</div>
    </div>
);

const InfoRow = ({ label, value, className = "" }) => (
    <div className={`rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] ${className}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/36">{label}</p>
        <p className="mt-2 text-sm leading-6 text-white/84">{value || <span className="text-white/28">—</span>}</p>
    </div>
);

const ImageGallery = ({ images }) => {
    if (!images || images.length === 0) return null;

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((url, index) => (
                <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-black/30"
                >
                    <img
                        src={url}
                        alt={`Hình ảnh báo cáo ${index + 1}`}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                        <Eye className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" aria-hidden />
                    </div>
                </a>
            ))}
        </div>
    );
};

const StatusTimeline = ({ status }) => {
    const isResolved = status === "resolved";
    const isRejected = status === "rejected";
    const isReviewing = status === "reviewing";
    const isPending = status === "pending";

    const steps = [
        { key: "pending", label: "Gửi báo cáo", done: true },
        { key: "reviewing", label: "Đang xem xét", done: isReviewing || isResolved || isRejected },
        {
            key: "final",
            label: isResolved ? "Đã xử lý" : isRejected ? "Bị từ chối" : "Hoàn thành",
            done: isResolved || isRejected,
        },
    ];

    return (
        <div className="flex items-center justify-between">
            {steps.map((step, index) => (
                <div key={step.key} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                        <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                                step.done
                                    ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                                    : "border-white/20 bg-white/5 text-white/30"
                            }`}
                        >
                            {step.done ? (
                                <CheckCircle2 className="h-4 w-4" aria-hidden />
                            ) : (
                                <span>{index + 1}</span>
                            )}
                        </div>
                        <p className={`mt-2 text-center text-[11px] font-medium ${step.done ? "text-white/70" : "text-white/30"}`}>
                            {step.label}
                        </p>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`mx-2 h-0.5 flex-1 transition ${step.done ? "bg-emerald-400/40" : "bg-white/10"}`} />
                    )}
                </div>
            ))}
        </div>
    );
};

const CustomerReportDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchReport = async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const result = await getMyReportDetailService(id);
            setReport(result.data?.report || null);
        } catch (error) {
            setErrorMessage(getApiErrorFullMessage(error, "Không thể tải chi tiết báo cáo."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [id]);

    const statusConfig = STATUS_CONFIG[report?.status] || STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;
    const targetConfig = TARGET_TYPE_CONFIG[report?.targetType] || TARGET_TYPE_CONFIG.track;
    const TargetIcon = targetConfig.icon;

    return (
        <main className="min-h-full bg-[#0e0e12] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl space-y-6">
                {/* Page Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(routePaths.userReportList)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                    >
                        <ArrowLeft className="h-4.5 w-4.5" aria-hidden />
                    </button>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f5b66f]">
                            Báo cáo
                        </p>
                        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
                            Chi tiết báo cáo
                        </h1>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] py-24">
                        <Loader2 className="h-8 w-8 animate-spin text-[#f5b66f]" aria-hidden />
                        <p className="mt-3 text-sm text-white/55">Đang tải chi tiết báo cáo...</p>
                    </div>
                )}

                {/* Error */}
                {!loading && errorMessage && (
                    <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] py-24 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-300/20 bg-rose-500/10 text-rose-400">
                            <AlertCircle className="h-7 w-7" aria-hidden />
                        </div>
                        <p className="max-w-sm text-sm text-white/65">{errorMessage}</p>
                        <button
                            onClick={fetchReport}
                            className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.07]"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {/* Content */}
                {!loading && !errorMessage && report && (
                    <div className="space-y-5">
                        {/* Status Card */}
                        <SectionCard title="Trạng thái" icon={AlertTriangle} subtitle="Theo dõi tiến trình xử lý báo cáo">
                            <div className="mb-5 flex flex-wrap items-center gap-3">
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${statusConfig.badgeClass}`}
                                >
                                    <StatusIcon className={`h-4 w-4 ${statusConfig.iconClass}`} aria-hidden />
                                    {statusConfig.label}
                                </span>
                            </div>
                            <StatusTimeline status={report.status} />
                        </SectionCard>

                        {/* Report Info */}
                        <SectionCard title="Nội dung báo cáo" icon={AlertCircle}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <InfoRow label="Loại nội dung" value={
                                    <span className="inline-flex items-center gap-1.5">
                                        <TargetIcon className={`h-4 w-4 ${targetConfig.colorClass}`} aria-hidden />
                                        {targetConfig.label}
                                    </span>
                                } />
                                <InfoRow label="Lý do báo cáo" value={
                                    REPORT_REASON_LABELS[report.reason] || report.reason
                                } />
                            </div>
                            <InfoRow label="Mô tả chi tiết" value={report.description} />
                        </SectionCard>

                        {/* Evidence Images */}
                        {report.images && report.images.length > 0 && (
                            <SectionCard title="Hình ảnh minh chứng" icon={ImageIcon} subtitle={`${report.images.length} hình ảnh`}>
                                <ImageGallery images={report.images} />
                            </SectionCard>
                        )}

                        {/* Resolution */}
                        {(report.status === "resolved" || report.status === "rejected") && (
                            <SectionCard
                                title={report.status === "resolved" ? "Kết quả xử lý" : "Lý do từ chối"}
                                icon={report.status === "resolved" ? CheckCircle : XCircle}
                            >
                                <InfoRow label="Hình thức xử lý" value={RESOLUTION_LABELS[report.resolution] || report.resolution} />
                                <InfoRow label="Ghi chú từ quản trị viên" value={report.resolutionNote} />
                                {report.handledAt && (
                                    <InfoRow label="Thời gian xử lý" value={formatDate(report.handledAt)} />
                                )}
                            </SectionCard>
                        )}

                        {/* Timeline */}
                        <SectionCard title="Thông tin thời gian" icon={Clock}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <InfoRow label="Ngày gửi" value={formatDate(report.createdAt)} />
                                <InfoRow label="Cập nhật lần cuối" value={formatDate(report.updatedAt)} />
                            </div>
                        </SectionCard>

                        {/* Back Button */}
                        <div className="flex justify-start">
                            <button
                                onClick={() => navigate(routePaths.userReportList)}
                                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4" aria-hidden />
                                Quay lại danh sách
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default CustomerReportDetailPage;
