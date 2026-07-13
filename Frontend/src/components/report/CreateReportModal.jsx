import {
  AlertCircle,
  CheckCircle,
  ImagePlus,
  Loader2,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createReportService } from "../../services/report/user.report.service";
import { getApiErrorFullMessage } from "../../utils/apiError";
import ReportReasonSelect from "./ReportReasonSelect";

const ANIMATION_DURATION = 300;

const REPORT_REASON_GROUPS = [
  {
    label: "An toàn và nội dung",
    options: [
      { value: "harassment_or_hate", label: "Quấy rối / thù ghét" },
      { value: "nudity_or_sexual_content", label: "Nội dung nhạy cảm" },
      { value: "violence_or_dangerous_content", label: "Bạo lực / nguy hiểm" },
      { value: "spam_or_scam", label: "Spam / lừa đảo" },
    ],
  },
  {
    label: "Bản quyền và danh tính",
    options: [
      { value: "copyright_infringement", label: "Vi phạm bản quyền" },
      { value: "impersonation", label: "Mạo danh" },
      { value: "fake_artist", label: "Nghệ sĩ giả mạo" },
    ],
  },
  {
    label: "Thông tin và chất lượng",
    options: [
      { value: "misleading_information", label: "Thông tin sai lệch" },
      { value: "wrong_metadata", label: "Thông tin bài hát không chính xác" },
      { value: "lyrics_issue", label: "Lời bài hát không phù hợp" },
      { value: "audio_quality", label: "Chất lượng âm thanh kém" },
      { value: "other", label: "Khác" },
    ],
  },
];

const TARGET_TYPE_LABELS = {
  track: "Bài hát",
  album: "Album",
  artist: "Nghệ sĩ",
};

const getInitialFormState = (targetId, targetType) => ({
  targetId,
  targetType,
  reason: "",
  description: "",
  images: [],
});

const CreateReportModal = ({
  isOpen,
  onClose,
  targetId,
  targetType = "track",
  onSuccess,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState(() =>
    getInitialFormState(targetId, targetType),
  );
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormState(targetId, targetType));
      setErrors({});
      setSubmitError("");
      setIsSubmitted(false);
      setIsSubmitting(false);

      if (!shouldRender) {
        const mountId = window.requestAnimationFrame(() => {
          setShouldRender(true);
        });
        return () => window.cancelAnimationFrame(mountId);
      }

      const enterId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(enterId);
    }

    if (!shouldRender) return undefined;

    const exitId = window.requestAnimationFrame(() => setIsVisible(false));
    const timeoutId = window.setTimeout(
      () => setShouldRender(false),
      ANIMATION_DURATION,
    );

    return () => {
      window.cancelAnimationFrame(exitId);
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, shouldRender, targetId, targetType]);

  useEffect(() => {
    if (!shouldRender) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose?.();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shouldRender, isSubmitting, onClose]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose?.();
  };

  const imageNames = useMemo(
    () => formData.images.map((file) => file?.name).filter(Boolean),
    [formData.images],
  );

  const handleChange = (event) => {
    const { name, value, files } = event.target;

    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError("");

    if (name === "images") {
      setFormData((prev) => ({
        ...prev,
        images: Array.from(files || []).slice(0, 5),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReasonChange = (reason) => {
    setFormData((prev) => ({ ...prev, reason }));
    setErrors((prev) => ({ ...prev, reason: undefined }));
    setSubmitError("");
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

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

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await createReportService(formData);
      setIsSubmitted(true);
      onSuccess?.();
    } catch (error) {
      setSubmitError(
        getApiErrorFullMessage(error, "Không thể gửi báo cáo vào lúc này."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldRender || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm",
        "transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      onClick={handleClose}
      aria-hidden="true"
    >
      <div
        className={[
          "flex w-full max-w-[580px] flex-col rounded-3xl border border-white/10 bg-[#1e1e1e] shadow-2xl",
          "transition-all duration-300",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-report-modal-title"
      >
        <div className="flex items-center justify-between px-6 pb-4 pt-6 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5b66f]/20 bg-[#f5b66f]/10 text-[#f5b66f]">
              <ShieldAlert className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2
                id="create-report-modal-title"
                className="text-lg font-semibold text-white"
              >
                Gửi báo cáo
              </h2>
              <p className="text-xs text-white/45">
                Báo cáo: {TARGET_TYPE_LABELS[targetType] || targetType}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all duration-300 hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="flex flex-col items-center px-6 pb-8 pt-4 text-center sm:px-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
              <CheckCircle className="h-8 w-8" aria-hidden />
            </div>
            <h3 className="text-xl font-semibold text-white">
              Gửi báo cáo thành công
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Cảm ơn bạn đã gửi báo cáo. Đội ngũ sẽ xem xét nội dung và xử lý
              trong thời gian sớm nhất.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#f5b66f] px-6 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789]"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-5 px-6 pb-6 sm:px-8"
          >
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Lý do báo cáo <span className="ml-1 text-rose-300">*</span>
              </label>
              <ReportReasonSelect
                groups={REPORT_REASON_GROUPS}
                value={formData.reason}
                onChange={handleReasonChange}
                disabled={isSubmitting}
              />
              {errors.reason && (
                <p className="mt-2 text-xs text-rose-300">{errors.reason}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Mô tả chi tiết <span className="ml-1 text-rose-300">*</span>
              </label>
              <textarea
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="Mô tả cụ thể vấn đề hoặc nội dung bạn muốn báo cáo..."
                disabled={isSubmitting}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-[#f5b66f]/50 focus:bg-white/[0.06] disabled:opacity-60"
              />
              {errors.description && (
                <p className="mt-2 text-xs text-rose-300">
                  {errors.description}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Ảnh minh chứng
              </label>
              <label className="flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-3 transition hover:border-[#f5b66f]/40 hover:bg-white/[0.05]">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/85">
                    Tải lên tối đa 5 ảnh minh chứng
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">
                    PNG, JPG hoặc WEBP
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5b66f]/12 text-[#f5b66f]">
                  <ImagePlus className="h-4.5 w-4.5" aria-hidden />
                </div>
                <input
                  type="file"
                  name="images"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </label>
              {imageNames.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {imageNames.map((name, index) => (
                    <div
                      key={name + index}
                      className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2"
                    >
                      <span className="truncate text-sm text-white/70">
                        {name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="ml-2 shrink-0 text-white/40 transition hover:text-rose-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submitError && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="whitespace-pre-line">{submitError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-white/80 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#f5b66f] px-5 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789] disabled:cursor-not-allowed disabled:opacity-70"
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
        )}
      </div>
    </div>,
    document.body,
  );
};

export default CreateReportModal;
