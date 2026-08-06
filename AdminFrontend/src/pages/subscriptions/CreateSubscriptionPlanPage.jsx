import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Save, X } from "lucide-react";
import { createPlanService } from "../../services/subscriptionService";
import { routePaths } from "../../routes/routePaths";

const ALL_FEATURES = [
  "NO_ADS",
  "HIGH_QUALITY_AUDIO",
  "LOSSLESS_AUDIO",
  "UNLIMITED_SKIP",
  "OFFLINE_DOWNLOAD",
  "BACKGROUND_PLAY",
  "AI_SMART_PLAYLIST",
  "ADVANCED_RECOMMENDATION",
  "EARLY_ACCESS",
  "EXCLUSIVE_CONTENT",
];

const PRESET_DAYS = [
  { value: 7, label: "7 ngày" },
  { value: 30, label: "30 ngày" },
  { value: 90, label: "90 ngày" },
  { value: 180, label: "180 ngày" },
  { value: 365, label: "365 ngày" },
];

const IntegratedDurationPicker = ({ value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-[260px]">
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          name="durationDays"
          value={value || ""}
          onKeyDown={(e) => {
            if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const digitsOnly = e.target.value.replace(/\D/g, "");
            onChange(digitsOnly);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="30"
          className={`w-full rounded-xl border pl-4 pr-16 py-3 text-sm font-semibold text-slate-900 outline-none transition shadow-sm ${error
            ? "border-red-300 bg-red-50 focus:border-red-500"
            : "border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            }`}
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-3 flex items-center gap-1 text-slate-400 hover:text-slate-600 transition"
        >
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">ngày</span>
          <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Chọn nhanh số ngày:
          </div>
          <div className="grid grid-cols-1 gap-0.5">
            {PRESET_DAYS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  onChange(preset.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full rounded-lg px-3 py-2 text-xs font-semibold transition ${Number(value) === preset.value
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <span>{preset.label}</span>
                {Number(value) === preset.value ? (
                  <Check size={14} className="text-blue-600" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CreateSubscriptionPlanPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    durationDays: 30,
    description: "",
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
        features: ALL_FEATURES,
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
          className={`rounded-xl border px-4 py-3 text-sm ${message.type === "success"
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
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-700">
              Tên gói <span className="text-red-500">*</span>
            </label>
            <span className="text-xs font-medium text-slate-400">
              {formData.name.length}/100 ký tự
            </span>
          </div>
          <input
            type="text"
            name="name"
            maxLength={100}
            value={formData.name}
            onChange={handleChange}
            placeholder="VD: Premium, Basic, VIP..."
            className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition ${errors.name
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
              className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition ${errors.price
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
            <IntegratedDurationPicker
              value={formData.durationDays}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, durationDays: val }));
                if (errors.durationDays) {
                  setErrors((prev) => ({ ...prev, durationDays: undefined }));
                }
              }}
              error={errors.durationDays}
            />
            {errors.durationDays ? (
              <p className="text-xs text-red-500">{errors.durationDays}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">Mô tả</label>
              <span className="text-xs font-medium text-slate-400">
                {formData.description.length}/500 ký tự
              </span>
            </div>
            <textarea
              name="description"
              maxLength={500}
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả ngắn về gói đăng ký (tối đa 500 ký tự)..."
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
