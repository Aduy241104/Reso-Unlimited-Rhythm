import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  CheckSquare,
  Clock,
  Eye,
  FileText,
  History,
  Image as ImageIcon,
  Layers,
  Loader2,
  ShieldAlert,
  User,
  X,
  XCircle,
  XSquare,
} from "lucide-react";
import {
  getGroupedReportDetailService,
  getReportDetailService,
  resolveGroupedReportService,
} from "../../services/reportService";
import { routePaths } from "../../routes/routePaths";

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

const getTargetTypeBadge = (type) => {
  const colors = {
    track: "bg-violet-50 text-violet-700 border-violet-200",
    album: "bg-orange-50 text-orange-700 border-orange-200",
    artist: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        colors[type] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {type}
    </span>
  );
};

const ReportDetailPage = () => {
  const params = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form states
  const [evaluations, setEvaluations] = useState({}); // { [reportId]: boolean }
  const [selectedAction, setSelectedAction] = useState("warn");
  const [resolutionNote, setResolutionNote] = useState("");

  // Preview Image Modal state
  const [previewImage, setPreviewImage] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError("");

    try {
      let targetType = params.targetType;
      let targetId = params.targetId;

      if (!targetType || !targetId) {
        const singleReport = await getReportDetailService(params.reportId);
        if (singleReport && singleReport.targetType && singleReport.targetId) {
          targetType = singleReport.targetType;
          targetId = String(singleReport.targetId);
        } else if (singleReport && singleReport.detail) {
          setDetail(singleReport.detail);
          initEvaluations(singleReport.detail.reports);
          setIsLoading(false);
          return;
        }
      }

      if (!targetType || !targetId) {
        setError("Không xác định được thông tin báo cáo.");
        setIsLoading(false);
        return;
      }

      const res = await getGroupedReportDetailService(targetType, targetId);
      setDetail(res);
      initEvaluations(res?.reports || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Không thể tải chi tiết báo cáo.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const initEvaluations = (reports = []) => {
    const initial = {};
    reports.forEach((r) => {
      // For pending reports, default to false (không vi phạm).
      // For handled reports, use saved isValidReason value.
      initial[r._id] = r.isValidReason === true;
    });
    setEvaluations(initial);
  };

  useEffect(() => {
    void loadData();
  }, [params.targetType, params.targetId, params.reportId]);

  const hasAnyValidEvaluation = Object.values(evaluations).some((v) => v === true);

  // Auto switch away from "reject" if any report is marked as Valid (Vi phạm)
  useEffect(() => {
    if (hasAnyValidEvaluation && selectedAction === "reject") {
      setSelectedAction("warn");
    }
  }, [hasAnyValidEvaluation, selectedAction]);

  const handleToggleEvaluation = (reportId, isValid) => {
    setEvaluations((prev) => ({
      ...prev,
      [reportId]: isValid,
    }));
  };

  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!detail) return;

    if (pendingReports.length === 0) {
      setError("Không có báo cáo mới nào đang chờ duyệt. Đợt báo cáo này đã được xử lý hoàn tất.");
      return;
    }

    if (hasAnyValidEvaluation && selectedAction === "reject") {
      setError("Không thể chọn Từ chối (Reject) khi có ít nhất 1 báo cáo được đánh giá là Vi phạm hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        evaluations: Object.entries(evaluations).map(([reportId, isValid]) => ({
          reportId,
          isValid,
        })),
        action: selectedAction,
        resolutionNote: resolutionNote.trim(),
      };

      const res = await resolveGroupedReportService(
        detail.targetType,
        detail.targetId,
        payload
      );

      const penaltyMsg = res.penaltyAppliedMessage
        ? ` (${res.penaltyAppliedMessage})`
        : "";
      setSuccessMessage(`Đã xử lý báo cáo thành công!${penaltyMsg}`);

      setTimeout(() => {
        void loadData();
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Xử lý báo cáo thất bại.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span>Đang tải thông tin chi tiết báo cáo...</span>
        </div>
      </section>
    );
  }

  if (error || !detail) {
    return (
      <section className="p-6 space-y-4">
        <button
          onClick={() => navigate(routePaths.reports)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={18} /> Quay lại danh sách
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">{error || "Không tìm thấy báo cáo."}</p>
        </div>
      </section>
    );
  }

  const target = detail.targetInfo;
  const title = target?.title || target?.name || "Nội dung không còn tồn tại";
  const avatar = target?.avatar || target?.coverImage || "";
  const artistName = detail.artistInfo?.name || "Nghệ sĩ";
  const artistViolations = detail.artistViolationsCount || 0;
  const artistStatus = detail.artistActiveStatus || "active";

  // Separate reports into Pending (Chưa xử lý) vs Processed (Lịch sử đã xử lý)
  const pendingReports = (detail.reports || []).filter(
    (r) => r.status === "pending" || r.status === "reviewing"
  );
  const processedReports = (detail.reports || []).filter(
    (r) => r.status === "resolved" || r.status === "rejected"
  );

  return (
    <section className="min-h-screen space-y-6 bg-slate-50/50 p-3 lg:p-5 font-sans text-slate-800 antialiased">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(routePaths.reports)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          <span>Quay lại danh sách báo cáo</span>
        </button>

        <div>{getTargetTypeBadge(detail.targetType)}</div>
      </div>

      {/* Target Content Banner */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="flex items-center gap-4 min-w-0">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-20 w-20 rounded-2xl object-cover shrink-0 shadow-md border border-slate-100"
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
              <Layers size={32} />
            </div>
          )}

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Nội dung bị báo cáo ({detail.targetType})
              </p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 truncate">
              {title}
            </h1>
            <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
              <span>Tác giả:</span>
              <span className="font-semibold text-slate-800">{artistName}</span>
            </p>
          </div>
        </div>

        {/* Artist Violation Stats Summary Card */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 min-w-[260px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-500" />
              Số lần vi phạm của Nghệ sĩ
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                artistStatus === "blocked"
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {artistStatus === "blocked" ? "Tài khoản bị khóa" : "Hoạt động"}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-extrabold text-slate-900">
              {artistViolations}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {artistViolations >= 5
                ? "Đã đạt ngưỡng Khóa tài khoản"
                : `${artistViolations}/5 vi phạm`}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* LEFT: Reports List */}
        <div className="space-y-6">
          {/* SECTION 1: Pending/New Reports */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1 border-b border-slate-200 pb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <span>Báo cáo mới cần xử lý ({pendingReports.length})</span>
              </h2>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm">
                Đợt xử lý hiện tại
              </span>
            </div>

            {pendingReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-400 italic text-sm">
                Không có báo cáo mới nào đang chờ duyệt.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingReports.map((report, idx) => {
                  const reporterName =
                    report.userId?.profile?.fullName || report.userId?.email || "Người dùng ẩn danh";
                  const reporterEmail = report.userId?.email || "";
                  const reportDate = report.createdAt
                    ? new Date(report.createdAt).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  const isEvalValid = evaluations[report._id] === true;

                  return (
                    <div
                      key={report._id}
                      className={`rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border transition ${
                        isEvalValid ? "border-amber-300 bg-amber-50/20" : "border-blue-200 bg-blue-50/10"
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                            <User size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">{reporterName}</p>
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                Mới gửi (Chưa xử lý)
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{reporterEmail}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-100">
                            {reasonLabels[report.reason] || report.reason}
                          </span>
                          <p className="mt-1 text-[11px] text-slate-400 flex items-center justify-end gap-1">
                            <Clock size={12} />
                            {reportDate}
                          </p>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="py-3 space-y-2">
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {report.description || "Người dùng không ghi thêm mô tả chi tiết."}
                        </p>

                        {report.images && report.images.length > 0 && (
                          <div className="pt-2">
                            <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                              <ImageIcon size={14} /> Hình ảnh đính kèm ({report.images.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {report.images.map((imgUrl, imgIdx) => (
                                <button
                                  key={imgIdx}
                                  type="button"
                                  onClick={() => setPreviewImage(imgUrl)}
                                  className="group relative overflow-hidden rounded-xl border border-slate-200 hover:border-blue-500 transition"
                                >
                                  <img
                                    src={imgUrl}
                                    alt="Report attachment"
                                    className="h-16 w-16 object-cover transition group-hover:scale-105"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Evaluation Toggle */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/80 -mx-5 -mb-5 px-5 py-3 rounded-b-2xl">
                        <span className="text-xs font-bold text-slate-600">
                          Đánh giá lý do báo cáo #{idx + 1}:
                        </span>

                        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleToggleEvaluation(report._id, true)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                              isEvalValid
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <CheckSquare size={14} />
                            Hợp lệ (Vi phạm)
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleEvaluation(report._id, false)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                              !isEvalValid
                                ? "bg-rose-600 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <XSquare size={14} />
                            Không hợp lệ
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: Processed Historical Reports */}
          {processedReports.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between px-1 border-b border-slate-200 pb-2">
                <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
                  <History size={18} className="text-slate-500" />
                  <span>Lịch sử các báo cáo đã xử lý trước đây ({processedReports.length})</span>
                </h2>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  Đã hoàn thành
                </span>
              </div>

              <div className="space-y-3 opacity-80 hover:opacity-100 transition">
                {processedReports.map((report) => {
                  const reporterName =
                    report.userId?.profile?.fullName || report.userId?.email || "Người dùng ẩn danh";
                  const reportDate = report.createdAt
                    ? new Date(report.createdAt).toLocaleDateString("vi-VN")
                    : "—";

                  const wasValid = report.isValidReason === true;

                  return (
                    <div
                      key={report._id}
                      className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{reporterName}</span>
                          {report.status === "resolved" ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              ✓ Đã xử lý {wasValid ? "(Xác nhận Vi phạm)" : ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                              ✕ Từ chối (Không vi phạm)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">{reportDate}</span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {report.description || "Không có mô tả chi tiết."}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Admin Action Decision Form */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)] border border-slate-200/80 sticky top-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <ShieldAlert size={20} className={pendingReports.length === 0 ? "text-emerald-600" : "text-amber-500"} />
                Quyết định xử lý
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {pendingReports.length === 0
                  ? "Trạng thái đợt kiểm duyệt hiện tại."
                  : "Chọn hình thức xử lý áp dụng cho nội dung và nghệ sĩ sở hữu."}
              </p>
            </div>

            {pendingReports.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3 text-xs text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>Đã hoàn thành đợt xử lý</span>
                </div>
                <p className="leading-relaxed text-[#234d38]">
                  Tất cả các báo cáo trong đợt này đã được duyệt xong. Hiện tại <strong>không có báo cáo mới nào đang chờ xử lý</strong> (`Báo cáo mới cần xử lý: 0`).
                </p>
                <div className="pt-2 border-t border-emerald-200/80 text-[11.5px] text-emerald-700 space-y-1">
                  <p>🔒 <strong>Quy tắc bảo vệ:</strong> Để tránh gửi cảnh báo hoặc tính số lần vi phạm trùng lặp cho nghệ sĩ khi không có báo cáo mới, form xử lý đã được tự động vô hiệu hóa.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Impact Notification Warning */}
                <div
                  className={`rounded-xl p-4 border text-xs space-y-1.5 transition ${
                    selectedAction === "reject"
                      ? "bg-slate-100 border-slate-300 text-slate-700"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={15} />
                    <span>
                      {selectedAction === "reject"
                        ? "Đang chọn Từ chối báo cáo (Reject)"
                        : "Xác nhận xử lý vi phạm"}
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    {selectedAction === "reject"
                      ? "👉 Báo cáo bị từ chối/bác bỏ. KHÔNG tăng số lần vi phạm và KHÔNG gửi cảnh báo tới nghệ sĩ."
                      : `👉 Số lần vi phạm của nghệ sĩ (${artistName}) sẽ TĂNG THÊM 1 (hiện tại: ${artistViolations} → ${
                          artistViolations + 1
                        }) và tự động gửi 1 thông báo cảnh báo/xử phạt tới nghệ sĩ.`}
                  </p>

                  <div className="text-[11px] opacity-90 pt-1 border-t border-amber-200/60 space-y-0.5">
                    <strong>Chính sách vi phạm 5 cấp độ (có gửi thông báo cho nghệ sĩ):</strong>
                    <ul className="list-disc list-inside text-[10.5px]">
                      <li><strong>1 lần:</strong> Cảnh báo lần 1</li>
                      <li><strong>2 lần:</strong> Cảnh báo mức cao hơn (Lần 2)</li>
                      <li><strong>3 lần:</strong> Cảnh báo mức nghiêm trọng (Lần 3)</li>
                      <li><strong>4 lần:</strong> Ẩn nội dung bị báo cáo</li>
                      <li><strong>5 lần:</strong> Khóa tài khoản nghệ sĩ</li>
                    </ul>
                  </div>
                </div>

                <form onSubmit={handleSubmitResolution} className="space-y-4">
                  {/* Action Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Hình thức xử lý chính <span className="text-red-500">*</span>
                    </label>

                    <div className="space-y-2">
                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                          selectedAction === "warn"
                            ? "border-blue-500 bg-blue-50/50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="action"
                          value="warn"
                          checked={selectedAction === "warn"}
                          onChange={(e) => setSelectedAction(e.target.value)}
                          className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Cảnh báo (Warn)</p>
                          <p className="text-xs text-slate-500">
                            Gửi thông báo cảnh báo vi phạm tới nghệ sĩ.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                          selectedAction === "hide"
                            ? "border-amber-500 bg-amber-50/50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="action"
                          value="hide"
                          checked={selectedAction === "hide"}
                          onChange={(e) => setSelectedAction(e.target.value)}
                          className="mt-0.5 h-4 w-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Ẩn nội dung (Hide)</p>
                          <p className="text-xs text-slate-500">
                            Ẩn bài hát / album này khỏi hệ thống công khai.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                          selectedAction === "block"
                            ? "border-red-500 bg-red-50/50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="action"
                          value="block"
                          checked={selectedAction === "block"}
                          onChange={(e) => setSelectedAction(e.target.value)}
                          className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Khóa tài khoản Nghệ sĩ (Block)</p>
                          <p className="text-xs text-slate-500">
                            Khóa trực tiếp tài khoản của nghệ sĩ và gửi thông báo khóa.
                          </p>
                        </div>
                      </label>

                      {/* Reject option */}
                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3 transition cursor-pointer ${
                          selectedAction === "reject"
                            ? "border-slate-400 bg-slate-100"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="action"
                          value="reject"
                          checked={selectedAction === "reject"}
                          onChange={(e) => setSelectedAction(e.target.value)}
                          className="mt-0.5 h-4 w-4 text-slate-600 focus:ring-slate-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Từ chối báo cáo (Reject)</p>
                          <p className="text-xs text-slate-500">
                            Báo cáo không đúng thực tế, từ chối xử lý nội dung.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Admin Note */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Ghi chú xử lý của Admin
                    </label>
                    <textarea
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Nhập ghi chú hoặc lý do xử lý..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-blue-500 resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang lưu xử lý...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Xác nhận xử lý báo cáo</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 transition p-1"
            >
              <X size={28} />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default ReportDetailPage;
