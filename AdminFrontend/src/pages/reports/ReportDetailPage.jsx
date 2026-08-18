import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
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
  CheckCheck,
  Tag,
} from "lucide-react";
import {
  getGroupedReportDetailService,
  getReportDetailService,
  resolveGroupedReportService,
} from "../../services/reportService";
import { routePaths } from "../../routes/routePaths";
import { useAuth } from "../../hooks/useAuth";

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

reasonLabels.fake_artist = "Nghệ sĩ giả mạo";
reasonLabels.wrong_metadata = "Thông tin bài hát không chính xác";
reasonLabels.lyrics_issue = "Lời bài hát không phù hợp";
reasonLabels.audio_quality = "Chất lượng âm thanh kém";

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

const TARGET_TYPE_LABELS = {
  track: "Bài hát",
  album: "Album",
  artist: "Nghệ sĩ",
};

const getTargetTypeLabel = (type) => TARGET_TYPE_LABELS[type] || "Nội dung";

const ACTION_LABELS = {
  warn: "Cảnh báo",
  block: "Khóa tài khoản nghệ sĩ",
  reject: "Từ chối báo cáo",
};

const getHideActionLabel = (targetType) => {
  if (targetType === "track") {
    return "Khóa bài hát";
  }

  if (targetType === "album") {
    return "Khóa album";
  }

  return "Khóa nội dung";
};

const getHideActionDescription = (targetType) => {
  if (targetType === "track") {
    return "Khóa bài hát này khỏi hệ thống công khai.";
  }

  if (targetType === "album") {
    return "Khóa album này khỏi hệ thống công khai.";
  }

  return "Khóa nội dung này khỏi hệ thống công khai.";
};

const getTargetTypeBadge = (type) => {
  const colors = {
    track: "bg-violet-50 text-violet-700 border-violet-200",
    album: "bg-orange-50 text-orange-700 border-orange-200",
    artist: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${colors[type] || "bg-slate-100 text-slate-700 border-slate-200"
        }`}
    >
      {getTargetTypeLabel(type)}
    </span>
  );
};

const ReportDetailPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form states
  const [evaluations, setEvaluations] = useState({}); // { [reportId]: boolean }
  const [selectedAction, setSelectedAction] = useState("warn");
  const [resolutionNote, setResolutionNote] = useState("");

  // Modal form states
  const [modalViolationType, setModalViolationType] = useState("copyright_infringement");
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");

  // Preview Image Modal state
  const [previewImage, setPreviewImage] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [expandedProcessedReportIds, setExpandedProcessedReportIds] = useState([]);

  const pendingReportsForDecision = (detail?.reports || []).filter(
    (r) => r.status === "pending" || r.status === "reviewing"
  );

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

  const hasAnyValidPendingEvaluation = pendingReportsForDecision.some(
    (report) => evaluations[report._id] === true
  );

  // Auto switch action depending on evaluation status:
  useEffect(() => {
    if (hasAnyValidPendingEvaluation) {
      if (selectedAction === "reject") {
        setSelectedAction("warn");
      }
    } else if (pendingReportsForDecision.length > 0) {
      if (selectedAction !== "reject") {
        setSelectedAction("reject");
      }
    }
  }, [hasAnyValidPendingEvaluation, selectedAction, pendingReportsForDecision.length]);

  const handleToggleEvaluation = (reportId, isValid) => {
    setEvaluations((prev) => ({
      ...prev,
      [reportId]: isValid,
    }));
  };

  const handleSetAllEvaluations = (isValid) => {
    setEvaluations((prev) => {
      const updated = { ...prev };
      pendingReportsForDecision.forEach((r) => {
        updated[r._id] = isValid;
      });
      return updated;
    });
  };

  const handleSetGroupEvaluations = (groupReports, isValid) => {
    setEvaluations((prev) => {
      const updated = { ...prev };
      groupReports.forEach((r) => {
        updated[r._id] = isValid;
      });
      return updated;
    });
  };

  const toggleProcessedReportDetails = (reportId) => {
    setExpandedProcessedReportIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  };

  const validateBeforeSubmit = () => {
    if (!detail) {
      return false;
    }

    if (pendingReportsForDecision.length === 0) {
      setError("Không có báo cáo mới nào đang chờ duyệt. Đợt báo cáo này đã được xử lý hoàn tất.");
      return false;
    }

    if (hasAnyValidPendingEvaluation && selectedAction === "reject") {
      setError("Không thể chọn Từ chối báo cáo khi có ít nhất 1 báo cáo được đánh giá là vi phạm hợp lệ.");
      return false;
    }

    setError("");
    return true;
  };

  const handleOpenConfirmModal = (e) => {
    e.preventDefault();

    if (!validateBeforeSubmit()) {
      return;
    }

    const firstReason = pendingReportsForDecision[0]?.reason || "copyright_infringement";
    setModalViolationType(reasonLabels[firstReason] ? firstReason : "copyright_infringement");

    const contentTitle = detail?.targetInfo?.title || detail?.targetInfo?.name || "Nội dung";
    setModalTitle(`Báo cáo vi phạm đối với ${contentTitle}`);
    setModalDescription(resolutionNote.trim() || pendingReportsForDecision[0]?.description || "");

    setIsConfirmModalOpen(true);
  };

  const handleSubmitResolution = async () => {
    if (!validateBeforeSubmit()) {
      setIsConfirmModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      setIsConfirmModalOpen(false);

      const finalResolutionNote = modalTitle.trim()
        ? `${modalTitle.trim()}: ${modalDescription.trim() || resolutionNote.trim()}`
        : resolutionNote.trim();

      const payload = {
        evaluations: pendingReportsForDecision.map((report) => ({
          reportId: report._id,
          isValid: evaluations[report._id] === true,
        })),
        action: selectedAction,
        resolutionNote: finalResolutionNote,
      };

      const res = await resolveGroupedReportService(
        detail.targetType,
        detail.targetId,
        payload
      );

      const penaltyMsg = res.penaltyAppliedMessage
        ? ` (${res.penaltyAppliedMessage})`
        : "";
      setSuccessMessage(`Đã ghi nhận vi phạm & xử lý báo cáo thành công!${penaltyMsg}`);

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
  const violationLimit = 5;
  const violationProgress = Math.min((artistViolations / violationLimit) * 100, 100);
  const nextViolationAction =
    artistViolations >= violationLimit
      ? "Đã chạm ngưỡng khóa tài khoản"
      : artistViolations === violationLimit - 1
        ? "Chỉ còn 1 mốc nữa sẽ khóa tài khoản"
        : `Còn ${violationLimit - artistViolations} mốc trước khi khóa tài khoản`;
  const violationProgressColor =
    artistViolations >= violationLimit
      ? "bg-red-500"
      : artistViolations >= violationLimit - 1
        ? "bg-amber-500"
        : "bg-emerald-500";

  // Separate reports into Pending (Chưa xử lý) vs Processed (Lịch sử đã xử lý)
  const pendingReports = (detail.reports || []).filter(
    (r) => r.status === "pending" || r.status === "reviewing"
  );
  const processedReports = (detail.reports || [])
    .filter((r) => r.status === "resolved" || r.status === "rejected")
    .sort((a, b) => {
      const timeA = new Date(a.handledAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.handledAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  // Group pending reports by violation reason
  const groupedPendingReports = pendingReports.reduce((acc, report) => {
    const reasonKey = report.reason || "other";
    if (!acc[reasonKey]) {
      acc[reasonKey] = [];
    }
    acc[reasonKey].push(report);
    return acc;
  }, {});
  const selectedActionLabel =
    (selectedAction === "hide"
      ? getHideActionLabel(detail.targetType)
      : ACTION_LABELS[selectedAction]) || "Không xác định";
  const currentAdminName = user?.profile?.fullName || user?.email || "Quản trị viên";
  const currentAdminEmail = user?.email || "";

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
                Nội dung bị báo cáo ({getTargetTypeLabel(detail.targetType)})
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
        <div className="min-w-[280px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <ShieldAlert size={14} className="text-amber-500" />
                Theo dõi vi phạm nghệ sĩ
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Số lần vi phạm hiện tại
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${artistStatus === "blocked"
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
                }`}
            >
              {artistStatus === "blocked" ? "Đã khóa" : "Hoạt động"}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-extrabold leading-none text-slate-950">
                {artistViolations}
              </span>
              <span className="pb-1 text-sm font-medium text-slate-400">
                /{violationLimit}
              </span>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">
                {artistViolations >= violationLimit ? "Mức rất cao" : `${artistViolations}/${violationLimit} vi phạm`}
              </p>
              <p className="mt-1 text-xs text-slate-500">{nextViolationAction}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${violationProgressColor}`}
                style={{ width: `${violationProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Mốc an toàn</span>
              <span>Mốc khóa tài khoản</span>
            </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  <span>Báo cáo mới cần xử lý ({pendingReports.length})</span>
                </h2>
                {pendingReports.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đã gom thành {Object.keys(groupedPendingReports).length} nhóm theo loại vi phạm
                  </p>
                )}
              </div>

              {pendingReports.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 pl-1">Thao tác tất cả:</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllEvaluations(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition"
                    title="Đánh giá tất cả báo cáo mới là vi phạm hợp lệ"
                  >
                    <CheckCheck size={14} /> Tất cả Hợp lệ (Vi phạm)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllEvaluations(false)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition"
                    title="Đánh giá tất cả báo cáo mới là không hợp lệ"
                  >
                    <XSquare size={14} /> Tất cả Không hợp lệ
                  </button>
                </div>
              )}
            </div>

            {pendingReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-400 italic text-sm">
                Không có báo cáo mới nào đang chờ duyệt.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedPendingReports).map(([reason, groupReports]) => {
                  const reasonLabel = reasonLabels[reason] || reason;
                  const validCountInGroup = groupReports.filter((r) => evaluations[r._id] === true).length;
                  const allValid = validCountInGroup === groupReports.length;
                  const allInvalid = validCountInGroup === 0;

                  return (
                    <div
                      key={reason}
                      className="rounded-2xl bg-white shadow-sm border border-slate-200/90 overflow-hidden"
                    >
                      {/* Group Header Bar */}
                      <div className="bg-slate-50/90 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center p-2 rounded-xl bg-red-50 text-red-600 border border-red-100 font-bold">
                            <Tag size={16} />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">{reasonLabel}</h3>
                              <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                {groupReports.length} báo cáo
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Đã chọn vi phạm: <strong className="text-emerald-700">{validCountInGroup}</strong> / {groupReports.length}
                            </p>
                          </div>
                        </div>

                        {/* Group Quick Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetGroupEvaluations(groupReports, true)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition border ${allValid
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              }`}
                            title="Chọn tất cả báo cáo trong nhóm này là vi phạm"
                          >
                            <CheckCheck size={14} />
                            Duyệt nhóm: Tất cả Vi phạm
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetGroupEvaluations(groupReports, false)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition border ${allInvalid
                                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                              }`}
                            title="Chọn tất cả báo cáo trong nhóm này là không hợp lệ"
                          >
                            <XSquare size={14} />
                            Duyệt nhóm: Tất cả Không hợp lệ
                          </button>
                        </div>
                      </div>

                      {/* Group Reports Cards */}
                      <div className="p-4 space-y-4 bg-slate-50/30">
                        {groupReports.map((report, idx) => {
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
                              className={`rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] border transition ${isEvalValid ? "border-amber-300 bg-amber-50/20" : "border-slate-200 bg-white"
                                }`}
                            >
                              {/* Card Header */}
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
                                        Mới gửi
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400">{reporterEmail}</p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="text-[11px] font-bold text-slate-500">
                                    Báo cáo #{idx + 1}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-slate-400 flex items-center justify-end gap-1">
                                    <Clock size={12} />
                                    {reportDate}
                                  </p>
                                </div>
                              </div>

                              {/* Card Content */}
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
                                            alt="Ảnh minh chứng báo cáo"
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
                                  Đánh giá cá nhân báo cáo #{idx + 1}:
                                </span>

                                <div className="inline-flex rounded-xl bg-white p-1 shadow-sm border border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEvaluation(report._id, true)}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${isEvalValid
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
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${!isEvalValid
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
                  const handledDate = report.handledAt
                    ? new Date(report.handledAt).toLocaleString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "—";
                  const wasValid = report.isValidReason === true;
                  const isExpanded = expandedProcessedReportIds.includes(report._id);
                  const handledByName =
                    report.handledBy?.profile?.fullName || report.handledBy?.email || "Quản trị viên";

                  return (
                    <div
                      key={report._id}
                      className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">{reporterName}</span>
                            {report.status === "resolved" ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                ✓ Đã xử lý {wasValid ? "(Xác nhận vi phạm)" : "(Không ghi nhận vi phạm)"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                                ✕ Từ chối báo cáo
                              </span>
                            )}
                            <span className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 border border-red-100">
                              {reasonLabels[report.reason] || report.reason}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            {reporterEmail ? <span>{reporterEmail}</span> : null}
                            <span>Người dùng gửi lúc: {reportDate}</span>
                            <span>Đã xử lý lúc: {handledDate}</span>
                            <span>Admin xử lý: {handledByName}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleProcessedReportDetails(report._id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? "Thu gọn" : "Xem chi tiết"}
                        </button>
                      </div>

                      <p className={`text-sm text-slate-600 ${isExpanded ? "" : "line-clamp-2"}`}>
                        {report.description || "Không có mô tả chi tiết."}
                      </p>

                      {isExpanded ? (
                        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-white px-3 py-3 border border-slate-200">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Kết quả duyệt
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-800">
                                {report.status === "resolved"
                                  ? wasValid
                                    ? "Báo cáo hợp lệ, đã xác nhận vi phạm"
                                    : "Đã xử lý nhưng không ghi nhận vi phạm"
                                  : "Báo cáo bị từ chối"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-white px-3 py-3 border border-slate-200">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Quản trị viên xử lý
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-800">
                                {handledByName}
                              </p>
                            </div>
                          </div>

                          {report.resolutionNote ? (
                            <div className="rounded-xl bg-white px-3 py-3 border border-slate-200">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Ghi chú xử lý
                              </p>
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                {report.resolutionNote}
                              </p>
                            </div>
                          ) : null}

                          {report.images && report.images.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                                <ImageIcon size={14} /> Ảnh minh chứng đã gửi ({report.images.length})
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
                                      alt="Ảnh minh chứng báo cáo đã xử lý"
                                      className="h-16 w-16 object-cover transition group-hover:scale-105"
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
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
                  className={`rounded-xl p-4 border text-xs space-y-1.5 transition ${selectedAction === "reject"
                      ? "bg-slate-100 border-slate-300 text-slate-700"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={15} />
                    <span>
                      {selectedAction === "reject"
                        ? "Đang chọn từ chối báo cáo"
                        : "Xác nhận xử lý vi phạm"}
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    {selectedAction === "reject"
                      ? "Báo cáo sẽ bị từ chối. Hệ thống không tăng số lần vi phạm và không gửi cảnh báo tới nghệ sĩ."
                      : `Số lần vi phạm của nghệ sĩ (${artistName}) sẽ tăng thêm 1 (hiện tại: ${artistViolations} -> ${artistViolations + 1
                      }) và tự động gửi 1 thông báo cảnh báo hoặc xử phạt tới nghệ sĩ.`}
                  </p>

                  <div className="text-[11px] opacity-90 pt-1 border-t border-amber-200/60 space-y-0.5">
                    <strong>Chính sách vi phạm 5 cấp độ (có gửi thông báo cho nghệ sĩ):</strong>
                    <ul className="list-disc list-inside text-[10.5px]">
                      <li><strong>1 lần:</strong> Cảnh báo lần 1</li>
                      <li><strong>2 lần:</strong> Cảnh báo mức cao hơn (Lần 2)</li>
                      <li><strong>3 lần:</strong> Cảnh báo mức nghiêm trọng (Lần 3)</li>
                      <li><strong>4 lần:</strong> Khóa nội dung bị báo cáo</li>
                      <li><strong>5 lần:</strong> Khóa tài khoản nghệ sĩ</li>
                    </ul>
                  </div>
                </div>

                <form onSubmit={handleOpenConfirmModal} className="space-y-4">
                  {/* Action Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Hình thức xử lý chính <span className="text-red-500">*</span>
                    </label>

                    <div className="space-y-2">
                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3 transition ${selectedAction === "warn"
                            ? "border-blue-500 bg-blue-50/50"
                            : !hasAnyValidPendingEvaluation
                              ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                              : "border-slate-200 hover:border-slate-300 cursor-pointer"
                          }`}
                      >
                        <input
                          type="radio"
                          name="action"
                          value="warn"
                          checked={selectedAction === "warn"}
                          disabled={!hasAnyValidPendingEvaluation}
                          onChange={(e) => setSelectedAction(e.target.value)}
                          className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Cảnh báo</p>
                          <p className="text-xs text-slate-500">
                            Gửi thông báo cảnh báo vi phạm tới nghệ sĩ.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3 transition ${selectedAction === "hide"
                            ? "border-amber-500 bg-amber-50/50"
                            : !hasAnyValidPendingEvaluation
                              ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                              : "border-slate-200 hover:border-slate-300 cursor-pointer"
                          }`}
                      >
                        <input
                          type="radio"
                          name="action"
                          value="hide"
                          checked={selectedAction === "hide"}
                          disabled={!hasAnyValidPendingEvaluation}
                          onChange={(e) => setSelectedAction(e.target.value)}
                          className="mt-0.5 h-4 w-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{getHideActionLabel(detail.targetType)}</p>
                          <p className="text-xs text-slate-500">
                            {getHideActionDescription(detail.targetType)}
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3 transition ${selectedAction === "block"
                            ? "border-red-500 bg-red-50/50"
                            : !hasAnyValidPendingEvaluation
                              ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                              : "border-slate-200 hover:border-slate-300 cursor-pointer"
                          }`}
                      >
                        <input
                          type="radio"
                          name="action"
                          value="block"
                          checked={selectedAction === "block"}
                          disabled={!hasAnyValidPendingEvaluation}
                          onChange={(e) => setSelectedAction(e.target.value)}
                          className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Khóa tài khoản nghệ sĩ</p>
                          <p className="text-xs text-slate-500">
                            Khóa trực tiếp tài khoản của nghệ sĩ và gửi thông báo khóa.
                          </p>
                        </div>
                      </label>

                      {!hasAnyValidPendingEvaluation ? (
                        <p className="text-xs font-medium text-amber-700">
                          Tất cả báo cáo mới trong đợt này đều được đánh giá là không hợp lệ. Hệ thống sẽ tự động áp dụng hình thức Từ chối báo cáo.
                        </p>
                      ) : null}

                      {/* Reject option */}
                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3 transition cursor-pointer ${selectedAction === "reject"
                            ? "border-slate-400 bg-slate-100"
                            : hasAnyValidPendingEvaluation
                              ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <input
                          type="radio"
                          name="action"
                          value="reject"
                          checked={selectedAction === "reject"}
                          disabled={hasAnyValidPendingEvaluation}
                          onChange={(e) => setSelectedAction(e.target.value)}
                          className="mt-0.5 h-4 w-4 text-slate-600 focus:ring-slate-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Từ chối báo cáo</p>
                          <p className="text-xs text-slate-500">
                            Báo cáo không đúng thực tế, từ chối xử lý nội dung.
                          </p>
                        </div>
                      </label>
                      {hasAnyValidPendingEvaluation ? (
                        <p className="text-xs font-medium text-amber-700">
                          Chỉ có thể chọn từ chối báo cáo khi tất cả báo cáo mới trong đợt này đều được đánh giá là không hợp lệ.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Admin Note */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Ghi chú xử lý của quản trị viên
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

      {/* 1. Rejection Confirmation Modal (When selectedAction === "reject") */}
      {isConfirmModalOpen && selectedAction === "reject" ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <XCircle size={22} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">Xác nhận từ chối báo cáo</h3>
                  <p className="text-xs text-slate-500">Từ chối xử lý đợt báo cáo không hợp lệ này.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-full border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Target info card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs text-slate-700">
              <p><strong>Nghệ sĩ / Đối tượng:</strong> <span className="font-bold text-slate-900">{artistName}</span> ({getTargetTypeLabel(detail.targetType)}: {title})</p>
              <p className="text-slate-500 leading-relaxed">
                Đợt báo cáo này được xác nhận là <strong>Không hợp lệ / Không có vi phạm thực tế</strong>. Hệ thống sẽ <strong>KHÔNG</strong> tăng số lần vi phạm và <strong>KHÔNG</strong> gửi cảnh báo tới nghệ sĩ.
              </p>
            </div>

            {/* Optional Rejection Note */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Ghi chú lý do từ chối (Không bắt buộc)
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={2}
                placeholder="Nhập lý do từ chối báo cáo (ví dụ: Báo cáo không đúng thực tế)..."
                className="w-full resize-none rounded-xl border border-slate-200 p-3 text-xs outline-none transition focus:border-slate-400"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Quay lại
              </button>

              <button
                type="button"
                onClick={() => void handleSubmitResolution()}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Xác nhận từ chối báo cáo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Violation Recording & Handling Modal (When selectedAction !== "reject") */}
      {isConfirmModalOpen && selectedAction !== "reject" ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Ghi nhận vi phạm & Xác nhận xử lý</h3>
                  <p className="text-xs text-slate-500">Kiểm tra thông tin hồ sơ vi phạm trước khi gửi quyết định.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-full border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="space-y-4">
              {/* 1. Artist Info */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nghệ sĩ bị báo cáo
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <img
                    src={
                      detail.artistInfo?.avatar ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                    }
                    alt={artistName}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{artistName}</p>
                    <p className="text-xs text-slate-500">
                      Nội dung: <strong className="text-slate-700">{title}</strong> ({getTargetTypeLabel(detail.targetType)})
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Violation Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Loại vi phạm
                </label>
                <select
                  value={modalViolationType}
                  onChange={(e) => setModalViolationType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 cursor-pointer"
                >
                  {VIOLATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Admin Account */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tài khoản admin xử lý
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <p className="text-sm font-semibold text-slate-900">{currentAdminName}</p>
                  {currentAdminEmail ? (
                    <p className="mt-1 text-xs text-slate-500">{currentAdminEmail}</p>
                  ) : null}
                </div>
              </div>

              {/* 4. Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tiêu đề vụ vi phạm
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="VD: Vi phạm quy định nội dung trên tác phẩm..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-slate-400"
                />
                <p className="text-xs text-slate-500">
                  Thời gian xử lý sẽ được hệ thống ghi nhận tự động ngay lúc bạn bấm xác nhận và ghi nhận vi phạm.
                </p>
              </div>

              {/* 5. Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mô tả chi tiết vi phạm
                </label>
                <textarea
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  rows={3}
                  placeholder="Mô tả chi tiết diễn biến vụ việc..."
                  className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              {/* 6. Penalty / Action */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Hình thức xử lý / Áp phạt
                </label>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 font-medium">
                  Hình thức đã chọn: <strong className="text-amber-950 font-bold uppercase">{selectedActionLabel}</strong>
                  {selectedAction === "warn" && " — Gửi cảnh báo chính thức (+1 Lượt vi phạm của Nghệ sĩ)"}
                  {selectedAction === "hide" && ` — Gỡ/Tạm ẩn ${getTargetTypeLabel(detail.targetType)} khỏi hệ thống`}
                  {selectedAction === "block" && " — Khóa/Đình chỉ trực tiếp tài khoản Nghệ sĩ"}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Quay lại
              </button>

              <button
                type="button"
                onClick={() => void handleSubmitResolution()}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang gửi xử lý...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Xác nhận và Ghi nhận vi phạm</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              alt="Xem trước ảnh minh chứng"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default ReportDetailPage;
