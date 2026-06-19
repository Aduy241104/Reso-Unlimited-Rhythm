import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X, Loader2 } from "lucide-react";
import { getPlanDetailService, updatePlanService } from "../../services/subscriptionService";
import { routePaths } from "../../routes/routePaths";

const PLAN_FEATURES = [
    { value: "NO_ADS", label: "Không quảng cáo" },
    { value: "HIGH_QUALITY_AUDIO", label: "Chất lượng cao" },
    { value: "LOSSLESS_AUDIO", label: "Âm thanh lossless" },
    { value: "UNLIMITED_SKIP", label: "Bỏ qua không giới hạn" },
    { value: "OFFLINE_DOWNLOAD", label: "Tải offline" },
    { value: "BACKGROUND_PLAY", label: "Phát nền" },
    { value: "AI_SMART_PLAYLIST", label: "Playlist thông minh AI" },
    { value: "ADVANCED_RECOMMENDATION", label: "Đề xuất nâng cao" },
    { value: "EARLY_ACCESS", label: "Truy cập sớm" },
    { value: "EXCLUSIVE_CONTENT", label: "Nội dung độc quyền" },
];

const DURATIONS = [
    { value: 7, label: "7 ngày (1 tuần)" },
    { value: 30, label: "30 ngày (1 tháng)" },
    { value: 90, label: "90 ngày (3 tháng)" },
    { value: 180, label: "180 ngày (6 tháng)" },
    { value: 365, label: "365 ngày (1 năm)" },
];

const EditSubscriptionPlanPage = () => {
    const { planId } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        price: "",
        durationDays: 30,
        description: "",
        features: [],
        status: "active",
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        const loadPlan = async () => {
            setIsLoading(true);
            try {
                const result = await getPlanDetailService(planId);
                const plan = result.plan;
                if (plan) {
                    setFormData({
                        name: plan.name || "",
                        price: plan.price?.toString() || "",
                        durationDays: plan.durationDays || 30,
                        description: plan.description || "",
                        features: plan.features || [],
                        status: plan.status || "active",
                    });
                }
            } catch (error) {
                setMessage({
                    type: "error",
                    text: "Không thể tải thông tin gói subscription.",
                });
            } finally {
                setIsLoading(false);
            }
        };
        void loadPlan();
    }, [planId]);

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = "Tên gói là bắt buộc";
        } else if (formData.name.trim().length < 3) {
            newErrors.name = "Tên gói phải có ít nhất 3 ký tự";
        }

        const price = Number(formData.price);
        if (!formData.price || isNaN(price)) {
            newErrors.price = "Giá là bắt buộc";
        } else if (price < 0) {
            newErrors.price = "Giá không được âm";
        }

        if (!formData.durationDays) {
            newErrors.durationDays = "Thời hạn là bắt buộc";
        }

        if (formData.features.length === 0) {
            newErrors.features = "Phải chọn ít nhất 1 tính năng";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    };

    const handleFeatureToggle = (featureValue) => {
        setFormData((prev) => ({
            ...prev,
            features: prev.features.includes(featureValue)
                ? prev.features.filter((f) => f !== featureValue)
                : [...prev.features, featureValue],
        }));
        if (errors.features) {
            setErrors((prev) => ({ ...prev, features: undefined }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        setMessage({ type: "", text: "" });

        try {
            await updatePlanService(planId, {
                name: formData.name.trim(),
                price: Number(formData.price),
                durationDays: Number(formData.durationDays),
                description: formData.description.trim(),
                features: formData.features,
                status: formData.status,
            });

            setMessage({ type: "success", text: "Cập nhật gói subscription thành công!" });
            setTimeout(() => navigate(routePaths.subscriptions), 1500);
        } catch (error) {
            const errorMsg = error?.response?.data?.message
                || error?.message
                || "Cập nhật gói subscription thất bại.";
            setMessage({ type: "error", text: errorMsg });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <section className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2 size={24} className="animate-spin" />
                    <span>Đang tải thông tin gói subscription...</span>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-6 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(routePaths.subscriptions)}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
                >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-medium">Quay lại</span>
                </button>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-1">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Quản lý Subscription
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                        Chỉnh sửa gói Subscription
                    </h1>
                </div>
            </div>

            {/* Message */}
            {message.text && (
                <div
                    className={`border px-4 py-3 text-sm rounded-xl ${
                        message.type === "success"
                            ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                            : "border-red-100 bg-red-50 text-red-600"
                    }`}
                >
                    {message.text}
                </div>
            )}

            {/* Form */}
            <form
                onSubmit={handleSubmit}
                className="max-w-3xl rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)] space-y-6"
            >
                {/* Name */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                        Tên gói <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="VD: Premium, Basic, VIP..."
                        className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition ${
                            errors.name
                                ? "border-red-300 bg-red-50 focus:border-red-500"
                                : "border-slate-200 focus:border-blue-500"
                        }`}
                    />
                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* Price & Duration */}
                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                            Giá (VND) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="VD: 99000"
                            min="0"
                            className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition ${
                                errors.price
                                    ? "border-red-300 bg-red-50 focus:border-red-500"
                                    : "border-slate-200 focus:border-blue-500"
                            }`}
                        />
                        {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                            Thời hạn <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="durationDays"
                            value={formData.durationDays}
                            onChange={handleChange}
                            className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition ${
                                errors.durationDays
                                    ? "border-red-300 bg-red-50 focus:border-red-500"
                                    : "border-slate-200 focus:border-blue-500"
                            }`}
                        >
                            {DURATIONS.map((d) => (
                                <option key={d.value} value={d.value}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                        {errors.durationDays && (
                            <p className="text-xs text-red-500">{errors.durationDays}</p>
                        )}
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Mô tả</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Mô tả ngắn về gói subscription..."
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 resize-none"
                    />
                </div>

                {/* Features */}
                <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">
                        Tính năng <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {PLAN_FEATURES.map((feature) => (
                            <label
                                key={feature.value}
                                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                                    formData.features.includes(feature.value)
                                        ? "border-blue-300 bg-blue-50"
                                        : "border-slate-200 hover:border-slate-300"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={formData.features.includes(feature.value)}
                                    onChange={() => handleFeatureToggle(feature.value)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm">{feature.label}</span>
                            </label>
                        ))}
                    </div>
                    {errors.features && <p className="text-xs text-red-500">{errors.features}</p>}
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Trạng thái</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                        <option value="active">Hoạt động</option>
                        <option value="inactive">Tạm khóa</option>
                    </select>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => navigate(routePaths.subscriptions)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                        <X size={16} />
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        <Save size={16} />
                        {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </div>
            </form>
        </section>
    );
};

export default EditSubscriptionPlanPage;
