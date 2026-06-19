import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Edit2, Check, X, Clock, CreditCard, Users, AlertCircle } from "lucide-react";
import { getPlanDetailService } from "../../services/subscriptionService";
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
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getStatusConfig = (status) => {
    switch (status) {
        case "active":
            return {
                label: "Hoạt động",
                bg: "bg-emerald-50",
                text: "text-emerald-700",
                border: "border-emerald-200",
                icon: Check,
            };
        case "inactive":
            return {
                label: "Tạm khóa",
                bg: "bg-slate-100",
                text: "text-slate-600",
                border: "border-slate-200",
                icon: X,
            };
        default:
            return {
                label: status,
                bg: "bg-slate-100",
                text: "text-slate-600",
                border: "border-slate-200",
                icon: AlertCircle,
            };
    }
};

const SubscriptionPlanDetailPage = () => {
    const { planId } = useParams();
    const navigate = useNavigate();
    const [plan, setPlan] = useState(null);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadPlan = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await getPlanDetailService(planId);
                setPlan(result.plan);
                setStats(result.subscriptionStats);
            } catch (err) {
                setError("Không thể tải thông tin gói subscription.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        void loadPlan();
    }, [planId]);

    if (isLoading) {
        return (
            <section className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-3 text-slate-500">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    <span>Đang tải thông tin gói subscription...</span>
                </div>
            </section>
        );
    }

    if (error || !plan) {
        return (
            <section className="space-y-6 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(routePaths.subscriptions)}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
                    >
                        <ArrowLeft size={20} />
                        <span className="text-sm font-medium">Quay lại</span>
                    </button>
                </div>
                <div className="rounded-2xl bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)] text-center">
                    <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
                    <p className="text-lg font-semibold text-slate-900">{error || "Gói subscription không tồn tại"}</p>
                </div>
            </section>
        );
    }

    const statusConfig = getStatusConfig(plan.status);
    const StatusIcon = statusConfig.icon;

    return (
        <section className="space-y-6 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(routePaths.subscriptions)}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
                >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-medium">Quay lại danh sách</span>
                </button>

                <Link
                    to={routePaths.subscriptionEdit(planId)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                    <Edit2 size={16} />
                    Chỉnh sửa
                </Link>
            </div>

            <div className="px-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Quản lý Subscription
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    Chi tiết gói: {plan.name}
                </h1>
            </div>

            {/* Main Content */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Plan Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)] space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
                                {plan.description && (
                                    <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                                )}
                            </div>
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                            >
                                <StatusIcon size={14} />
                                {statusConfig.label}
                            </span>
                        </div>

                        {/* Price & Duration */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 p-4">
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <CreditCard size={16} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Giá</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{formatCurrency(plan.price)}</p>
                                <p className="text-xs text-slate-400 mt-1">Giá mỗi gói</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-4">
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <Clock size={16} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Thời hạn</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{plan.durationDays}</p>
                                <p className="text-xs text-slate-400 mt-1">ngày</p>
                            </div>
                        </div>

                        {/* Features */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Tính năng bao gồm</h3>
                            <div className="flex flex-wrap gap-2">
                                {plan.features?.map((feature) => (
                                    <span
                                        key={feature}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 border border-violet-100"
                                    >
                                        <Check size={14} />
                                        {PLAN_FEATURES[feature] || feature}
                                    </span>
                                ))}
                                {(!plan.features || plan.features.length === 0) && (
                                    <span className="text-sm text-slate-400 italic">Không có tính năng</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats & Meta */}
                <div className="space-y-6">
                    {/* Subscription Stats */}
                    <div className="rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                        <div className="flex items-center gap-2 mb-4">
                            <Users size={18} className="text-slate-400" />
                            <h3 className="text-sm font-semibold text-slate-700">Thống kê Subscription</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">Tổng subscription</span>
                                <span className="text-lg font-bold text-slate-900">{stats?.total ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">Đang hoạt động</span>
                                <span className="text-lg font-bold text-emerald-600">{stats?.active ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">Đã hết hạn</span>
                                <span className="text-lg font-bold text-slate-600">{stats?.expired ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">Đã hủy</span>
                                <span className="text-lg font-bold text-slate-600">{stats?.cancelled ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-slate-500">Đang chờ</span>
                                <span className="text-lg font-bold text-amber-600">{stats?.pending ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">Thông tin hệ thống</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-slate-400">ID</p>
                                <p className="text-sm font-mono text-slate-600 truncate">{plan._id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Ngày tạo</p>
                                <p className="text-sm text-slate-700">{formatDate(plan.createdAt)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Cập nhật lần cuối</p>
                                <p className="text-sm text-slate-700">{formatDate(plan.updatedAt)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SubscriptionPlanDetailPage;
