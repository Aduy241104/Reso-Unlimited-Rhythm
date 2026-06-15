import { AlertCircle, ImagePlus, Loader2, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createReportService } from "../../services/report/user.report.service";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorFullMessage } from "../../utils/apiError";

const REPORT_REASON_OPTIONS = [
  { value: "copyright_infringement", label: "Vi phạm bản quyền" },
  { value: "harassment_or_hate", label: "Quấy rối / thù ghét" },
  { value: "nudity_or_sexual_content", label: "Nội dung nhạy cảm" },
  { value: "violence_or_dangerous_content", label: "Bạo lực / nguy hiểm" },
  { value: "spam_or_scam", label: "Spam / lừa đảo" },
  { value: "misleading_information", label: "Thông tin sai lệch" },
  { value: "impersonation", label: "Mạo danh" },
  { value: "wrong_metadata", label: "Thông tin bài hát không chính xác" },
  { value: "lyrics_issue", label: "Lời bài hát không phù hợp" },
  { value: "audio_quality", label: "Chất lượng âm thanh kém" },
  { value: "fake_artist", label: "Nghệ sĩ giả mạo" },
  { value: "other", label: "Khác" },
];

const TARGET_TYPE_OPTIONS = [
  { value: "track", label: "Bài hát" },
  { value: "album", label: "Album" },
  { value: "artist", label: "Nghệ sĩ" },
];

const initialFormState = {
  targetId: "",
  targetType: "track",
  reason: "",
  description: "",
  images: [],
};

const FieldLabel = ({ children, required = false }) => (
  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
    {children}
    {required ? <span className="ml-1 text-rose-300">*</span> : null}
  </label>
);

const fieldClassName =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#f5b66f]/50 focus:bg-white/[0.06]";

const CustomerCreateReportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState(() => ({
    ...initialFormState,
    targetId: searchParams.get("targetId") || "",
    targetType: searchParams.get("targetType") || "track",
  }));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const imageNames = useMemo(
    () => formData.images.map((file) => file?.name).filter(Boolean),
    [formData.images]
  );

  const handleChange = (event) => {
    const { name, value, files } = event.target;

    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setSubmitError("");

    if (name === "images") {
      setFormData((previous) => ({
        ...previous,
        images: Array.from(files || []).slice(0, 5),
      }));
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.targetId.trim()) {
      nextErrors.targetId = "Không xác định được nội dung cần báo cáo. Vui lòng quay lại và thử lại.";
    }

    if (!formData.targetType.trim()) {
      nextErrors.targetType = "Vui lòng chọn loại nội dung.";
    }

    if (!formData.reason.trim()) {
      nextErrors.reason = "Vui lòng chọn lý do báo cáo.";
    }

    if (!formData.description.trim()) {
      nextErrors.description = "Vui lòng mô tả vấn đề bạn gặp phải.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await createReportService(formData);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(
        getApiErrorFullMessage(error, "Không thể gửi báo cáo vào lúc này.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <main className="min-h-full bg-[#0e0e12] px-4 py-10 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(145deg,rgba(16,185,129,0.10),rgba(255,255,255,0.03))] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.36)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <Send className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold text-white">Gửi báo cáo thành công</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Cảm ơn bạn đã gửi báo cáo. Đội ngũ sẽ xem xét nội dung và xử lý trong thời gian sớm nhất.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(routePaths.home)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-white/80 transition hover:bg-white/[0.07]"
            >
              Về trang chủ
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#f5b66f] px-5 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789]"
            >
              Quay lại nội dung
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-[#0e0e12] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f5b66f]">
            Customer&apos;s Report Management
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            Gửi báo cáo nội dung hoặc vấn đề
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
            Sử dụng biểu mẫu này để báo cáo bài hát, album, nghệ sĩ hoặc các vấn đề liên quan đến nội dung trên nền tảng.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.36)] sm:p-8"
        >
          {errors.targetId ? (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{errors.targetId}</span>
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-1">
            <div>
              <FieldLabel required>Loại nội dung</FieldLabel>
              <select
                name="targetType"
                value={formData.targetType}
                onChange={handleChange}
                className={fieldClassName}
              >
                {TARGET_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#16161d]">
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.targetType ? (
                <p className="mt-2 text-xs text-rose-300">{errors.targetType}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <FieldLabel required>Lý do báo cáo</FieldLabel>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className={fieldClassName}
            >
              <option value="" className="bg-[#16161d]">
                Chọn lý do báo cáo
              </option>
              {REPORT_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#16161d]">
                  {option.label}
                </option>
              ))}
            </select>
            {errors.reason ? (
              <p className="mt-2 text-xs text-rose-300">{errors.reason}</p>
            ) : null}
          </div>

          <div className="mt-5">
            <FieldLabel required>Mô tả chi tiết</FieldLabel>
            <textarea
              name="description"
              rows={6}
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả cụ thể vấn đề hoặc nội dung bạn muốn báo cáo..."
              className={`${fieldClassName} resize-none leading-6`}
            />
            {errors.description ? (
              <p className="mt-2 text-xs text-rose-300">{errors.description}</p>
            ) : null}
          </div>

          <div className="mt-5">
            <FieldLabel>Ảnh minh chứng</FieldLabel>
            <label className="flex min-h-[58px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-3 transition hover:border-[#f5b66f]/40 hover:bg-white/[0.05]">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/85">
                  Tải lên tối đa 5 ảnh minh chứng
                </p>
                <p className="mt-1 text-xs text-white/45">
                  PNG, JPG hoặc WEBP
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5b66f]/12 text-[#f5b66f]">
                <ImagePlus className="h-5 w-5" aria-hidden />
              </div>
              <input
                type="file"
                name="images"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleChange}
              />
            </label>
            {imageNames.length > 0 ? (
              <div className="mt-3 space-y-2">
                {imageNames.map((name) => (
                  <p
                    key={name}
                    className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-white/70"
                  >
                    {name}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          {submitError ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-pre-line">{submitError}</span>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-white/80 transition hover:bg-white/[0.07]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#f5b66f] px-5 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden />
                  Gửi báo cáo
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default CustomerCreateReportPage;
