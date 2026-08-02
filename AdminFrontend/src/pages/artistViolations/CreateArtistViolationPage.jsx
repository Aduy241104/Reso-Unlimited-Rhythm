import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  Upload,
  X,
  CheckCircle2,
  AlertOctagon,
  Search,
  UserCheck,
  FileText,
} from "lucide-react";
import { searchAdminArtistsService, updateAdminArtistStatusService } from "../../services/artistService";
import { resolveGroupedReportService } from "../../services/reportService";
import { routePaths } from "../../routes/routePaths";

const VIOLATION_TYPES = [
  { value: "copyright_infringement", label: "Vi phạm bản quyền" },
  { value: "harassment_or_hate", label: "Quấy rối / Phát ngôn thù ghét" },
  { value: "nudity_or_sexual_content", label: "Nội dung đồi trụy / Nhạy cảm" },
  { value: "violence_or_dangerous_content", label: "Bạo lực / Hành vi nguy hiểm" },
  { value: "spam_or_scam", label: "Spam / Gian lận lượt nghe" },
  { value: "misleading_information", label: "Thông tin sai lệch" },
  { value: "impersonation", label: "Giả mạo nghệ sĩ / Thương hiệu" },
  { value: "other", label: "Khác" },
];

const SEVERITY_LEVELS = [
  { value: "Low", label: "Thấp", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "Medium", label: "Trung bình", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "High", label: "Cao", bg: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "Critical", label: "Nghiêm trọng", bg: "bg-rose-50 text-rose-700 border-rose-200" },
];

const PENALTY_OPTIONS = [
  { value: "warning", label: "Gửi Cảnh báo chính thức (+1 Lượt vi phạm)" },
  { value: "hide_content", label: "Gỡ / Tạm ẩn tác phẩm vi phạm" },
  { value: "block", label: "Khóa / Đình chỉ tài khoản Nghệ sĩ" },
  { value: "none", label: "Chỉ lưu hồ sơ theo dõi (Không áp phạt ngay)" },
];

export default function CreateArtistViolationPage() {
  const navigate = useNavigate();

  // Artist search state
  const [artists, setArtists] = useState([]);
  const [artistSearchQuery, setArtistSearchQuery] = useState("");
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [isSearchingArtist, setIsSearchingArtist] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    violationType: "copyright_infringement",
    severity: "Medium",
    title: "",
    description: "",
    violationDate: new Date().toISOString().slice(0, 16),
    adminNotes: "",
    penalty: "warning",
  });

  // File Upload State
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState("");

  // Validation & UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Fetch real artists for dropdown selection
  useEffect(() => {
    const fetchArtists = async () => {
      setIsSearchingArtist(true);
      try {
        const res = await searchAdminArtistsService({ q: artistSearchQuery, limit: 10 });
        setArtists(res.artists || []);
      } catch (err) {
        console.warn("Could not fetch artists list:", err);
      } finally {
        setIsSearchingArtist(false);
      }
    };

    const timer = setTimeout(fetchArtists, 300);
    return () => clearTimeout(timer);
  }, [artistSearchQuery]);

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle File Upload Preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setEvidenceFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setEvidencePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setEvidencePreview("");
    }
  };

  const handleRemoveFile = () => {
    setEvidenceFile(null);
    setEvidencePreview("");
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!selectedArtist) {
      newErrors.artist = "Vui lòng chọn nghệ sĩ vi phạm";
    }

    if (!formData.title.trim()) {
      newErrors.title = "Tiêu đề vụ vi phạm là bắt buộc";
    } else if (formData.title.trim().length < 5) {
      newErrors.title = "Tiêu đề phải có ít nhất 5 ký tự";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Mô tả chi tiết vi phạm là bắt buộc";
    }

    if (!formData.violationDate) {
      newErrors.violationDate = "Thời gian vi phạm là bắt buộc";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reset Form
  const handleReset = () => {
    setSelectedArtist(null);
    setArtistSearchQuery("");
    setFormData({
      violationType: "copyright_infringement",
      severity: "Medium",
      title: "",
      description: "",
      violationDate: new Date().toISOString().slice(0, 16),
      adminNotes: "",
      penalty: "warning",
    });
    setEvidenceFile(null);
    setEvidencePreview("");
    setErrors({});
  };

  // Submit Handler
  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      // 1. If penalty is block, block artist directly
      if (formData.penalty === "block" && selectedArtist) {
        await updateAdminArtistStatusService(selectedArtist._id || selectedArtist.id, {
          activeStatus: "blocked",
          blockedReason: formData.adminNotes || formData.description,
        });
      }

      // 2. Submit grouped report / violation record
      await resolveGroupedReportService("artist", selectedArtist._id || selectedArtist.id, {
        action: formData.penalty,
        resolutionNote: `[${formData.severity.toUpperCase()}] ${formData.title}: ${formData.description} | ${formData.adminNotes}`,
        evaluations: [{ isValid: true }],
      });

      setMessage({ type: "success", text: "Ghi nhận vi phạm nghệ sĩ thành công!" });
      setTimeout(() => navigate(routePaths.artistViolations), 1500);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Không thể ghi nhận vi phạm.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen space-y-6 bg-slate-50/50 p-3 font-sans text-slate-800 antialiased lg:p-5">
      
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(routePaths.artistViolations)}
          className="flex items-center gap-2 text-slate-600 transition hover:text-slate-900 font-semibold text-sm"
        >
          <ArrowLeft size={18} />
          <span>Quay lại danh sách</span>
        </button>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          Kiểm duyệt hệ thống
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Ghi nhận vi phạm nghệ sĩ
        </h1>
        <p className="text-sm text-slate-500">
          Tạo hồ sơ ghi nhận hành vi vi phạm điều khoản của nghệ sĩ và áp dụng hình thức xử lý kiểm duyệt.
        </p>
      </div>

      {/* Toast Message */}
      {message.text ? (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {/* Main Form */}
      <form
        onSubmit={handlePreSubmit}
        className="w-full space-y-6 rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)] border border-slate-200"
      >
        {/* 1. Artist Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Chọn nghệ sĩ vi phạm <span className="text-red-500">*</span>
          </label>

          {selectedArtist ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedArtist.avatar ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  }
                  alt={selectedArtist.name}
                  className="h-10 w-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selectedArtist.name}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedArtist(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
              <input
                type="text"
                maxLength={100}
                value={artistSearchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setArtistSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                placeholder="Bấm vào để xem gợi ý hoặc nhập tên nghệ sĩ để tìm kiếm..."
                className={`w-full rounded-xl border pl-10 pr-4 py-3 text-sm outline-none transition ${
                  errors.artist
                    ? "border-red-300 bg-red-50 focus:border-red-500"
                    : "border-slate-200 focus:border-slate-400"
                }`}
              />

              {/* Backdrop to close dropdown when clicking outside */}
              {isDropdownOpen ? (
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
              ) : null}

              {/* Suggested / Filtered Artists Dropdown */}
              {isDropdownOpen && artists.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in">
                  <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {artistSearchQuery.trim() ? "Kết quả tìm kiếm" : "Gợi ý nghệ sĩ nổi bật"}
                  </p>
                  <div className="divide-y divide-slate-50">
                    {artists.map((artist) => (
                      <div
                        key={artist._id || artist.id}
                        onClick={() => {
                          setSelectedArtist(artist);
                          setArtistSearchQuery("");
                          setIsDropdownOpen(false);
                          if (errors.artist) setErrors((prev) => ({ ...prev, artist: undefined }));
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition hover:bg-slate-100/80"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              artist.avatar ||
                              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                            }
                            alt={artist.name}
                            className="h-9 w-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{artist.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : isDropdownOpen && isSearchingArtist ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-400 shadow-xl">
                  Đang tìm kiếm nghệ sĩ...
                </div>
              ) : null}
            </div>
          )}
          {errors.artist ? <p className="text-xs text-red-500">{errors.artist}</p> : null}
        </div>

        {/* 2. Violation Type & Severity */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Violation Type */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Loại vi phạm <span className="text-red-500">*</span>
            </label>
            <select
              name="violationType"
              value={formData.violationType}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 cursor-pointer"
            >
              {VIOLATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Mức độ nghiêm trọng <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {SEVERITY_LEVELS.map((sev) => (
                <button
                  key={sev.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, severity: sev.value }))}
                  className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                    formData.severity === sev.value
                      ? `${sev.bg} ring-2 ring-slate-900/20`
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Title & Date */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Tiêu đề vụ vi phạm <span className="text-red-500">*</span>
              </label>
              <span className="text-xs font-medium text-slate-400">
                {formData.title.length}/150 ký tự
              </span>
            </div>
            <input
              type="text"
              name="title"
              maxLength={150}
              value={formData.title}
              onChange={handleChange}
              placeholder="VD: Sử dụng mẫu âm thanh không bản quyền trong Album..."
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                errors.title ? "border-red-300 bg-red-50 focus:border-red-500" : "border-slate-200 focus:border-slate-400"
              }`}
            />
            {errors.title ? <p className="text-xs text-red-500">{errors.title}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Thời gian vi phạm <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              name="violationDate"
              value={formData.violationDate}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                errors.violationDate ? "border-red-300 bg-red-50 focus:border-red-500" : "border-slate-200 focus:border-slate-400"
              }`}
            />
            {errors.violationDate ? <p className="text-xs text-red-500">{errors.violationDate}</p> : null}
          </div>
        </div>

        {/* 4. Detailed Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-700">
              Mô tả chi tiết vi phạm <span className="text-red-500">*</span>
            </label>
            <span className="text-xs font-medium text-slate-400">
              {formData.description.length}/1000 ký tự
            </span>
          </div>
          <textarea
            name="description"
            maxLength={1000}
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Cung cấp diễn biến chi tiết vụ việc, đường dẫn bài hát liên quan, tỷ lệ trùng lặp hoặc bằng chứng phát hiện (tối đa 1000 ký tự)..."
            className={`w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition ${
              errors.description ? "border-red-300 bg-red-50 focus:border-red-500" : "border-slate-200 focus:border-slate-400"
            }`}
          />
          {errors.description ? <p className="text-xs text-red-500">{errors.description}</p> : null}
        </div>

        {/* 5. File Evidence Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Tải lên tài liệu / Hình ảnh bằng chứng
          </label>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition hover:bg-slate-100/50">
            {evidenceFile ? (
              <div className="flex flex-col items-center gap-3">
                {evidencePreview ? (
                  <img
                    src={evidencePreview}
                    alt="Preview"
                    className="h-32 max-w-full rounded-xl object-cover border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
                    <FileText size={24} />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-slate-900">{evidenceFile.name}</p>
                  <p className="text-xs text-slate-400">{(evidenceFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  Xóa tập tin
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Kéo thả hoặc nhấp để tải bằng chứng</span>
                <span className="text-xs text-slate-400">Hỗ trợ các định dạng PNG, JPG, PDF, MP3 (Tối đa 10MB)</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf,audio/*"
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* 6. Admin Notes & Penalty Selection */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Penalty selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Hình thức xử lý / Áp phạt
            </label>
            <select
              name="penalty"
              value={formData.penalty}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 cursor-pointer"
            >
              {PENALTY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Admin notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Ghi chú nội bộ Quản trị viên
              </label>
              <span className="text-xs font-medium text-slate-400">
                {formData.adminNotes.length}/500 ký tự
              </span>
            </div>
            <input
              type="text"
              name="adminNotes"
              maxLength={500}
              value={formData.adminNotes}
              onChange={handleChange}
              placeholder="Ghi chú nội bộ cho ban quản trị (tối đa 500 ký tự)..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        {/* 7. Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={() => navigate(routePaths.artistViolations)}
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Đặt lại
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? "Đang xử lý..." : "Ghi nhận vi phạm"}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog Modal */}
      {showConfirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">Xác nhận ghi nhận vi phạm</h3>
                <p className="text-xs text-slate-500">Vui lòng kiểm tra kỹ thông tin trước khi áp dụng xử lý.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2 text-slate-700">
              <p><strong>Nghệ sĩ:</strong> {selectedArtist?.name}</p>
              <p><strong>Tiêu đề:</strong> {formData.title}</p>
              <p><strong>Mức độ:</strong> {formData.severity}</p>
              <p><strong>Hình thức phạt:</strong> <span className="font-bold text-rose-600">{formData.penalty.toUpperCase()}</span></p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Xem lại
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm"
              >
                Xác nhận tạo hồ sơ
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}
