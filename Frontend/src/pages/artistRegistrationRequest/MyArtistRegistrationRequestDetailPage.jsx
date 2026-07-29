import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileCheck2,
    FileText,
    FileX,
    Loader2,
    Music2,
    Star,
    User,
    X,
    XCircle,
} from "lucide-react";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorFullMessage } from "../../utils/apiError";
import { getMyArtistRegistrationRequestDetailService } from "../../services/artist/userArtistRegistrationListService";

const ACCENT = {
    gold: "#d6b06a",
    goldSoft: "#e7c78d",
    goldBorder: "rgba(214,176,106,0.14)",
    surface: "rgba(255,255,255,0.03)",
    surfaceStrong: "rgba(255,255,255,0.045)",
    lineSoft: "rgba(255,255,255,0.05)",
    textMuted: "rgba(255,255,255,0.58)",
};

const STATUS_CONFIG = {
    pending: {
        label: "Đang chờ duyệt",
        icon: Clock,
        badgeClass: "border-amber-300/18 bg-amber-300/10 text-amber-100",
        iconClass: "text-amber-200",
    },
    approved: {
        label: "Đã duyệt",
        icon: FileCheck2,
        badgeClass: "border-emerald-300/18 bg-emerald-300/10 text-emerald-100",
        iconClass: "text-emerald-200",
    },
    rejected: {
        label: "Bị từ chối",
        icon: FileX,
        badgeClass: "border-rose-300/18 bg-rose-300/10 text-rose-100",
        iconClass: "text-rose-200",
    },
};

const CHECKLIST_LABELS = {
    profileComplete: "Hồ sơ đầy đủ",
    identityVerified: "Xác minh danh tính",
    hasMusicActivity: "Hoạt động âm nhạc",
    socialLinksValid: "Liên kết mạng xã hội hợp lệ",
    noImpersonation: "Không mạo danh",
    acceptedCopyrightPolicy: "Chấp nhận chính sách bản quyền",
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-black/10 backdrop-blur-sm" style={{ borderColor: ACCENT.goldBorder, color: ACCENT.gold, backgroundColor: "rgba(214,176,106,0.10)" }}>
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

const StatPill = ({ label, value }) => (
    <div className="rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.022))] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/36">{label}</p>
        <p className="mt-1 text-sm font-medium text-white/84">{value}</p>
    </div>
);

const SocialLinkRow = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-1 rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/36">{label}</span>
            <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm underline underline-offset-2 transition hover:text-white"
                style={{ color: ACCENT.goldSoft }}
            >
                {value}
            </a>
        </div>
    );
};

const ChecklistItem = ({ label, checked }) => (
    <div className="flex items-center gap-3 rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
        {checked ? (
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-300" aria-hidden />
        ) : (
            <X className="h-4.5 w-4.5 shrink-0 text-white/22" aria-hidden />
        )}
        <span className={`text-sm ${checked ? "text-white/82" : "text-white/34"}`}>{label}</span>
    </div>
);

const ImagePreviewCard = ({ label, src, alt }) => {
    if (!src) return null;

    return (
        <div className="overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="px-4 py-3 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/36">{label}</p>
            </div>
            <div className="bg-black/15 p-4">
                <img src={src} alt={alt} className="h-48 w-full rounded-[20px] bg-white/[0.03] object-contain shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]" />
            </div>
        </div>
    );
};

const StatusTimeline = ({ status }) => {
    const isApproved = status === "approved";
    const isRejected = status === "rejected";

    return (
        <div className="rounded-[30px] bg-[linear-gradient(180deg,rgba(18,18,26,0.92),rgba(13,13,18,0.84))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
            <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Tiến trình xét duyệt</p>
                <p className="mt-2 text-sm text-white/50">Theo dõi trạng thái hiện tại của yêu cầu đăng kí nghệ sĩ.</p>
            </div>
            <div className="space-y-0">
                <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-emerald-300/45 bg-emerald-300/10">
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-300" />
                        </div>
                        <div className="h-10 w-px bg-emerald-300/25" />
                    </div>
                    <div className="pb-10">
                        <p className="text-sm font-semibold text-emerald-300">Đã gửi hồ sơ</p>
                        <p className="mt-1 text-xs leading-6 text-white/40">Hệ thống đã ghi nhận yêu cầu đăng kí nghệ sĩ của bạn.</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${status === "pending" ? "bg-amber-200/10 shadow-[0_0_18px_rgba(231,199,141,0.12)]" : "border-emerald-300/45 bg-emerald-300/10"}`} style={status === "pending" ? { borderColor: "rgba(231,199,141,0.42)" } : undefined}>
                            {status === "pending" ? <Loader2 className="h-4.5 w-4.5 animate-spin" style={{ color: ACCENT.goldSoft }} /> : <CheckCircle2 className="h-4.5 w-4.5 text-emerald-300" />}
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                    </div>
                    <div className="pb-10">
                        <p className="text-sm font-semibold" style={{ color: status === "pending" ? ACCENT.goldSoft : "rgb(110 231 183)" }}>Đang xem xét</p>
                        <p className="mt-1 text-xs leading-6 text-white/40">Đội ngũ đang kiểm tra hồ sơ, thông tin cá nhân và hoạt động âm nhạc của bạn.</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${isApproved ? "border-emerald-300/45 bg-emerald-300/10" : isRejected ? "border-rose-300/45 bg-rose-300/10" : "border-white/16 bg-white/[0.03]"}`}>
                            {isApproved ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-300" /> : isRejected ? <XCircle className="h-4.5 w-4.5 text-rose-300" /> : <span className="text-xs font-bold text-white/28">3</span>}
                        </div>
                    </div>
                    <div>
                        <p className={`text-sm font-semibold ${isApproved ? "text-emerald-300" : isRejected ? "text-rose-300" : "text-white/32"}`}>{isApproved ? "Đã duyệt" : isRejected ? "Bị từ chối" : "Chờ kết quả"}</p>
                        <p className="mt-1 text-xs leading-6 text-white/40">{isApproved ? "Yêu cầu đã được phê duyệt thành công." : isRejected ? "Yêu cầu chưa đạt điều kiện xét duyệt hiện tại." : "Kết quả sẽ được cập nhật sau khi hoàn tất quá trình xem xét."}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${config.badgeClass}`}
        >
            <Icon className={`h-4 w-4 ${config.iconClass}`} aria-hidden />
            {config.label}
        </span>
    );
};

const MyArtistRegistrationRequestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchDetail = async () => {
            setLoading(true);
            setErrorMessage("");

            try {
                const result = await getMyArtistRegistrationRequestDetailService(id);
                if (isMounted) {
                    setRequest(result.data?.request || null);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(
                        getApiErrorFullMessage(error, "Không thể tải chi tiết yêu cầu.")
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchDetail();
        return () => {
            isMounted = false;
        };
    }, [id]);

    if (loading) {
        return (
            <main className="min-h-full bg-[#0e0e12] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-5xl flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-[#f5b66f]" aria-hidden />
                    <p className="mt-3 text-sm text-white/55">Đang tải chi tiết...</p>
                </div>
            </main>
        );
    }

    if (errorMessage) {
        return (
            <main className="min-h-full bg-[#0e0e12] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-5xl flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-300/20 bg-rose-500/10 text-rose-400">
                        <XCircle className="h-7 w-7" aria-hidden />
                    </div>
                    <p className="max-w-sm text-sm text-white/65">{errorMessage}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.07]"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Quay lại
                    </button>
                </div>
            </main>
        );
    }

    if (!request) {
        return (
            <main className="min-h-full bg-[#0e0e12] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-5xl flex-col items-center justify-center py-20 text-center">
                    <p className="text-sm text-white/55">Không tìm thấy yêu cầu.</p>
                    <button
                        onClick={() => navigate(routePaths.artistRegistrationRequestsList)}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.07]"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Quay lại danh sách
                    </button>
                </div>
            </main>
        );
    }

    const checklist = request.review?.checklist || {};

    return (
        <main className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(214,176,106,0.14),_transparent_18%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.05),_transparent_16%),radial-gradient(circle_at_bottom_right,_rgba(124,92,255,0.10),_transparent_24%),linear-gradient(145deg,_#060608_0%,_#0b0b11_42%,_#12121a_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <button
                    onClick={() => navigate(routePaths.artistRegistrationRequestsList)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/[0.035] px-4 py-2 text-xs font-medium text-white/62 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition hover:bg-white/[0.06] hover:text-white"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    Quay lại danh sách yêu cầu
                </button>

                <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,rgba(18,18,26,0.96),rgba(12,12,18,0.88))] shadow-[0_24px_90px_rgba(0,0,0,0.34)]">
                    <div className="pointer-events-none absolute -left-20 top-6 h-48 w-48 rounded-full blur-3xl" style={{ backgroundColor: "rgba(214,176,106,0.10)" }} />
                    <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-[#7c5cff]/10 blur-3xl" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
                    <div className="relative grid gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
                        <div>
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/[0.035] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/52 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                                Chi tiết yêu cầu nghệ sĩ
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-semibold leading-tight tracking-[0.015em] text-white sm:text-3xl">
                                    {request.stageName || "Không có tên nghệ sĩ"}
                                </h1>
                                <StatusBadge status={request.status} />
                            </div>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/52">
                                Xem lại toàn bộ thông tin hồ sơ đăng kí nghệ sĩ, trạng thái xét duyệt và phản hồi từ quản trị viên tại một nơi duy nhất.
                            </p>

                            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <StatPill label="Ngày gửi" value={formatDate(request.createdAt)} />
                                <StatPill label="Ngày cập nhật" value={formatDate(request.updatedAt || request.createdAt)} />
                                <StatPill label="Ngày duyệt" value={request.reviewedAt ? formatDate(request.reviewedAt) : "Chưa có"} />
                            </div>
                        </div>

                        <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.025))] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Trạng thái hiện tại</p>
                            <div className="mt-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border backdrop-blur-sm" style={{ borderColor: ACCENT.goldBorder, color: ACCENT.goldSoft, backgroundColor: "rgba(214,176,106,0.10)" }}>
                                    {request.status === "approved" ? (
                                        <FileCheck2 className="h-6 w-6" aria-hidden />
                                    ) : request.status === "rejected" ? (
                                        <FileX className="h-6 w-6" aria-hidden />
                                    ) : (
                                        <Clock className="h-6 w-6" aria-hidden />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">
                                        {(STATUS_CONFIG[request.status] || STATUS_CONFIG.pending).label}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-white/44">
                                        {request.status === "approved"
                                            ? "Hồ sơ đã được xác nhận và phê duyệt."
                                            : request.status === "rejected"
                                              ? "Hồ sơ cần được cập nhật và gửi lại sau khi chỉnh sửa."
                                              : "Hồ sơ đang trong hàng chờ để được đội ngũ xem xét."}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                <button
                                    onClick={() => navigate(routePaths.artistRegistrationRequestsList)}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-[#151618] transition hover:brightness-105"
                                    style={{ background: "linear-gradient(135deg, #e7c78d 0%, #d6b06a 100%)" }}
                                >
                                    <FileText className="h-4 w-4" aria-hidden />
                                    Xem danh sách yêu cầu
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <StatusTimeline status={request.status} />

                {request.status === "rejected" && request.rejectReason && (
                    <section className="rounded-[30px] border border-rose-300/14 bg-[linear-gradient(135deg,rgba(244,63,94,0.10),rgba(244,63,94,0.03))] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-200/90">Lý do từ chối</p>
                        <p className="mt-3 text-sm leading-7 text-white/82">{request.rejectReason}</p>
                    </section>
                )}

                {request.review?.adminNote && (
                    <section className="rounded-[30px] border p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:p-6" style={{ borderColor: ACCENT.goldBorder, background: "linear-gradient(135deg, rgba(214,176,106,0.12), rgba(214,176,106,0.04))" }}>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT.goldSoft }}>Ghi chú từ quản trị viên</p>
                        <p className="mt-3 text-sm leading-7 text-white/82">{request.review.adminNote}</p>
                    </section>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                    <div className="space-y-6">
                        <SectionCard title="Thông tin nghệ sĩ" icon={Star} subtitle="Tổng quan hồ sơ công khai của nghệ sĩ.">
                            {request.avatar && (
                                <div className="flex items-center gap-4 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                                    <img
                                        src={request.avatar}
                                        alt={request.stageName}
                                        className="h-20 w-20 rounded-2xl object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-white">{request.stageName || "Nghệ sĩ"}</p>
                                        <p className="mt-1 text-xs leading-6 text-white/42">Ảnh đại diện được gửi kèm trong hồ sơ đăng kí nghệ sĩ.</p>
                                    </div>
                                </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-2">
                                <InfoRow label="Tên nghệ sĩ" value={request.stageName} />
                                <InfoRow label="Thể loại" value={request.genres?.length > 0 ? request.genres.join(", ") : "-"} />
                            </div>
                            <InfoRow label="Bio" value={request.bio} />
                        </SectionCard>

                        <SectionCard title="Thông tin CCCD" icon={User} subtitle="Thông tin định danh được dùng để xác minh hồ sơ.">
                            <div className="grid gap-4 md:grid-cols-2">
                                <InfoRow label="Họ và tên" value={request.identityInfo?.fullName} />
                                <InfoRow label="Số CCCD" value={request.identityInfo?.idNumber} />
                                <InfoRow
                                    label="Ngày sinh"
                                    value={request.identityInfo?.dateOfBirth ? formatDate(request.identityInfo.dateOfBirth) : "-"}
                                    className="md:col-span-2"
                                />
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
                                <ImagePreviewCard label="Ảnh mặt trước CCCD" src={request.identityInfo?.frontImage} alt="CCCD mặt trước" />
                                <ImagePreviewCard label="Ảnh mặt sau CCCD" src={request.identityInfo?.backImage} alt="CCCD mặt sau" />
                            </div>
                        </SectionCard>

                        {Object.values(request.socialLinks || {}).some(Boolean) && (
                            <SectionCard title="Liên kết mạng xã hội" icon={FileText} subtitle="Các kênh công khai giúp xác thực hoạt động nghệ thuật của bạn.">
                                <div className="space-y-3">
                                    <SocialLinkRow label="Spotify" value={request.socialLinks?.spotify} />
                                    <SocialLinkRow label="YouTube" value={request.socialLinks?.youtube} />
                                    <SocialLinkRow label="TikTok" value={request.socialLinks?.tiktok} />
                                    <SocialLinkRow label="Facebook" value={request.socialLinks?.facebook} />
                                    <SocialLinkRow label="Instagram" value={request.socialLinks?.instagram} />
                                    <SocialLinkRow label="SoundCloud" value={request.socialLinks?.soundcloud} />
                                    <SocialLinkRow label="Website" value={request.socialLinks?.website} />
                                    <SocialLinkRow label="Khác" value={request.socialLinks?.other} />
                                </div>
                            </SectionCard>
                        )}

                        {(request.portfolio?.demoTrackUrls?.length > 0 ||
                            request.portfolio?.musicLinks?.length > 0 ||
                            request.portfolio?.description) && (
                            <SectionCard title="Portfolio" icon={Music2} subtitle="Các liên kết và mô tả thể hiện năng lực âm nhạc của bạn.">
                                {request.portfolio?.description && <InfoRow label="Mô tả" value={request.portfolio.description} />}

                                {request.portfolio?.demoTrackUrls?.length > 0 && (
                                    <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/36">Demo track URLs</p>
                                        <div className="mt-3 space-y-2">
                                            {request.portfolio.demoTrackUrls.map((url, idx) => (
                                                <a
                                                    key={idx}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block break-all text-sm underline underline-offset-2 transition hover:text-white"
                                                    style={{ color: ACCENT.goldSoft }}
                                                >
                                                    {url}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {request.portfolio?.musicLinks?.length > 0 && (
                                    <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/36">Music links</p>
                                        <div className="mt-3 space-y-2">
                                            {request.portfolio.musicLinks.map((url, idx) => (
                                                <a
                                                    key={idx}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block break-all text-sm underline underline-offset-2 transition hover:text-white"
                                                    style={{ color: ACCENT.goldSoft }}
                                                >
                                                    {url}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </SectionCard>
                        )}
                    </div>

                    <div className="space-y-6 xl:sticky xl:top-6">
                        {request.status !== "pending" && (
                            <SectionCard title="Kết quả xét duyệt" icon={FileCheck2} subtitle="Checklist đánh giá từ đội ngũ xét duyệt.">
                                {Object.entries(CHECKLIST_LABELS).map(([key, label]) => (
                                    <ChecklistItem
                                        key={key}
                                        label={label}
                                        checked={checklist[key] === true}
                                    />
                                ))}
                            </SectionCard>
                        )}

                        <SectionCard title="Hành động nhanh" icon={FileText} subtitle="Đi tới các tác vụ liên quan đến yêu cầu này.">
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate(routePaths.artistRegistrationRequestsList)}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.035] px-5 py-3 text-sm font-medium text-white/78 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition hover:bg-white/[0.06]"
                                >
                                    <ArrowLeft className="h-4 w-4" aria-hidden />
                                    Quay lại danh sách
                                </button>
                            </div>
                        </SectionCard>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default MyArtistRegistrationRequestDetailPage;
