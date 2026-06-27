import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { createPlanService } from "../../services/subscriptionService";
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

const CreateSubscriptionPlanPage = () => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Tên gói là bắt buộc";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Tên gói phải có ít nhất 3 ký tự";
    }

    const price = Number(formData.price);
    if (!formData.price || Number.isNaN(price)) {
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFeatureToggle = (featureValue) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(featureValue)
        ? prev.features.filter((feature) => feature !== featureValue)
        : [...prev.features, featureValue],
    }));
    if (errors.features) {
      setErrors((prev) => ({ ...prev, features: undefined }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      await createPlanService({
        name: formData.name.trim(),
        price: Number(formData.price),
        durationDays: Number(formData.durationDays),
        description: formData.description.trim(),
        features: formData.features,
        status: formData.status,
      });

      setMessage({ type: "success", text: "Tạo gói đăng ký thành công!" });
      setTimeout(() => navigate(routePaths.subscriptions), 1500);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Tạo gói đăng ký thất bại.";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen space-y-6 bg-slate-50/50 p-3 font-sans text-slate-800 antialiased lg:p-5">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(routePaths.subscriptions)}
          className="flex items-center gap-2 text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Quay lại</span>
        </button>
      </div>

      <div className="flex flex-col gap-4 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Quản lý gói đăng ký
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Tạo gói đăng ký mới
          </h1>
        </div>
      </div>

      {message.text ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-600"
              : "border-red-100 bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="w-full space-y-6 rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
      >
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
          {errors.name ? <p className="text-xs text-red-500">{errors.name}</p> : null}
        </div>

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
            {errors.price ? <p className="text-xs text-red-500">{errors.price}</p> : null}
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
              {DURATIONS.map((duration) => (
                <option key={duration.value} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
            {errors.durationDays ? (
              <p className="text-xs text-red-500">{errors.durationDays}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả ngắn về gói đăng ký..."
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Trạng thái</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            >
              <option value="active">Hoạt động</option>
              <option value="inactive">Ẩn</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Tính năng <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {PLAN_FEATURES.map((feature) => (
              <label
                key={feature.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
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
          {errors.features ? <p className="text-xs text-red-500">{errors.features}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => navigate(routePaths.subscriptions)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <X size={16} />
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={16} />
            {isSubmitting ? "Đang lưu..." : "Tạo gói"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreateSubscriptionPlanPage;
