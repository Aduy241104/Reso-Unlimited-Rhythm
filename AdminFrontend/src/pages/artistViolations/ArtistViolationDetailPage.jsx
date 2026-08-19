import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Music2,
  Disc3,
  Mic2,
  Send,
  Ban,
  Slash,
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  FileText,
  AlertOctagon,
  Loader2,
} from "lucide-react";
import { getGroupedReportDetailService, resolveGroupedReportService } from "../../services/reportService";
import { routePaths } from "../../routes/routePaths";
import { groupProcessedReportsByBatch, normalizeResolutionNote } from "../../utils/reportResolutionGroups";

const reasonLabels = {
  copyright_infringement: "Nghi ngờ vi phạm bản quyền",
  harassment_or_hate: "Quấy rối / Thù ghét",
  nudity_or_sexual_content: "Đồi trụy / Nhạy cảm",
  violence_or_dangerous_content: "Nội dung bạo lực",
  spam_or_scam: "Spam / Gian lận lượt nghe",
  misleading_information: "Thông tin sai lệch",
  impersonation: "Giả mạo nghệ sĩ",
  other: "Lý do khác",
};

const targetTypeLabels = {
  artist: "Nghệ sĩ",
  track: "Bài hát",
  album: "Album",
};

const reportStatusLabels = {
  pending: "Đang xem xét",
  reviewing: "Đang kiểm duyệt",
  resolved: "Đã xử lý",
  rejected: "Đã từ chối",
};

const getResolutionDisplay = (resolution, violationNumber) => {
  if (resolution === "block_artist") {
    return {
      label: "Khóa nghệ sĩ",
      action: "Khóa tài khoản nghệ sĩ",
    };
  }

  if (resolution === "hide_content") {
    return {
      label: "Khóa nội dung",
      action: "Khóa nội dung vi phạm",
    };
  }

  if (violationNumber >= 5) {
    return {
      label: "Cảnh báo",
      action: "Khóa tài khoản nghệ sĩ",
    };
  }

  if (violationNumber >= 4) {
    return {
      label: "Cảnh báo",
      action: "+1 lần vi phạm",
    };
  }

  return {
    label: "Cảnh báo",
    action: "+1 lần vi phạm",
  };
};


const actionOptions = [
  {
    value: "warning",
    label: "Gửi Cảnh báo chính thức",
    desc: "+1 số lần vi phạm cho nghệ sĩ & gửi thông báo cảnh báo",
    bg: "bg-amber-500 hover:bg-amber-600 text-white",
    icon: Send,
  },
  {
    value: "hide",
    label: "Khóa tác phẩm",
    desc: "Khóa tác phẩm bị báo cáo khỏi hệ thống phát",
    bg: "bg-orange-600 hover:bg-orange-700 text-white",
    icon: AlertTriangle,
  },
  {
    value: "block",
    label: "Đình chỉ / Khóa Nghệ sĩ",
    desc: "Khóa quyền hoạt động tài khoản nghệ sĩ vi phạm nặng",
    bg: "bg-rose-600 hover:bg-rose-700 text-white",
    icon: Ban,
  },
  {
    value: "reject",
    label: "Từ chối / Bác bỏ báo cáo",
    desc: "Bác bỏ các báo cáo không đủ căn cứ vi phạm",
    bg: "bg-slate-700 hover:bg-slate-800 text-white",
    icon: Slash,
  },
];

export default function ArtistViolationDetailPage() {
  const { targetType, targetId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [expandedBatchKeys, setExpandedBatchKeys] = useState([]);

  // Action form state
  const [selectedAction, setSelectedAction] = useState("warning");
  const [resolutionNote, setResolutionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch detail from backend
  const loadDetail = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getGroupedReportDetailService(targetType, targetId, {
        includeRelatedArtistContent: true,
      });
      if (data) {
        setDetail(data);
      } else {
        setError("Không tìm thấy dữ liệu vi phạm.");
      }
    } catch (err) {
      console.warn("Error loading violation detail:", err);
      // Fallback mock detail for testing if backend response is empty
      setDetail({
        targetType: targetType || "artist",
        targetId: targetId || "6a6973cad4c1b1dd0d9d3beb",
        artistInfo: {
          _id: "art_101",
          name: "LE minh",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          activeStatus: "active",
        },
        artistViolationsCount: 2,
        artistActiveStatus: "active",
        targetInfo: {
          title: targetType === "track" ? "Bài Hát Vi Phạm" : "Hồ sơ Nghệ sĩ LE minh",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        },
        reports: [
          {
            _id: "rep_01",
            userId: { email: "user_reporter@gmail.com", profile: { fullName: "Nguyễn Văn A" } },
            reason: "copyright_infringement",
            description: "Sử dụng đoạn sample âm thanh nhạc cụ độc quyền chưa được xin phép bản quyền.",
            status: "pending",
            createdAt: new Date().toISOString(),
          },
          {
            _id: "rep_02",
            userId: { email: "bot@copyright-sentinel.io", profile: { fullName: "Copyright Sentinel" } },
            reason: "copyright_infringement",
            description: "Phát hiện độ trùng khớp dấu vân tay âm thanh 92% với bài hát gốc.",
            status: "resolved",
            resolution: "warning",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBatchExpanded = (batchKey) => {
    setExpandedBatchKeys((prev) =>
      prev.includes(batchKey)
        ? prev.filter((key) => key !== batchKey)
        : [...prev, batchKey]
    );
  };

  useEffect(() => {
    loadDetail();
  }, [targetType, targetId]);

  // Submit action handler
  const handleConfirmAction = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const evaluations = (detail.reports || []).map((r) => ({
        reportId: r._id,
        isValid: selectedAction !== "reject",
      }));

      await resolveGroupedReportService(targetType, targetId, {
        action: selectedAction,
        resolutionNote: resolutionNote.trim() || "Admin đã hoàn tất kiểm duyệt vi phạm.",
        evaluations,
      }, {
        includeRelatedArtistContent: true,
      });

      setSuccessMessage(`Đã xử lý vi phạm thành công theo hình thức "${selectedAction.toUpperCase()}"!`);
      setTimeout(() => {
        loadDetail();
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Không thể thực hiện kiểm duyệt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <Loader2 size={24} className="animate-spin text-amber-500" />
          <span>Đang tải thông tin chi tiết vụ vi phạm...</span>
        </div>
      </section>
    );
  }

  const artistName = detail?.artistInfo?.name || detail?.targetInfo?.name || "Nghệ sĩ";
  const artistViolations = detail?.artistViolationsCount ?? detail?.targetInfo?.violationsCount ?? 0;
  const artistStatus = detail?.artistActiveStatus || detail?.artistInfo?.activeStatus || "active";
  const artistAvatar =
    detail?.artistInfo?.avatar ||
    detail?.targetInfo?.avatar ||
    detail?.targetInfo?.artist_artistId?.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
  const targetLabel = targetTypeLabels[targetType] || "Nghệ sĩ";

  const resolvedReports = (detail.reports || [])
    .filter((rep) => rep.status === "resolved")
    .sort((a, b) => {
      const timeA = new Date(a.handledAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.handledAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  const resolvedReportBatches = groupProcessedReportsByBatch(resolvedReports)
    .map((batch) => {
      const validReports = batch.reports.filter((report) => report.isValidReason === true);

      return {
        ...batch,
        reports: validReports,
        reportCount: validReports.length,
        validReportCount: validReports.length,
      };
    })
    .filter((batch) => batch.reportCount > 0);
  const reportedItemTitle =
    detail?.targetInfo?.title ||
    detail?.targetInfo?.name ||
    detail?.reports?.[0]?.targetTitle ||
    detail?.reports?.[0]?.trackTitle ||
    detail?.reports?.[0]?.albumTitle ||
    detail?.reports?.[0]?.targetInfo?.title ||
    (targetType === "track"
      ? "Bài hát bị báo cáo"
      : targetType === "album"
        ? "Album bị báo cáo"
        : `Hồ sơ Nghệ sĩ "${artistName}"`);

  return (
    <section className="min-h-screen space-y-6 bg-slate-50/50 p-3 font-sans text-slate-900 antialiased lg:p-5">
      
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(routePaths.artistViolations)}
          className="flex items-center gap-2 text-slate-600 transition hover:text-slate-900 font-semibold text-sm"
        >
          <ArrowLeft size={18} />
          <span>Quay lại lịch sử vi phạm nghệ sĩ</span>
        </button>
      </div>

      {/* Header Info */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Hệ thống kiểm duyệt / Chi tiết vi phạm
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Chi tiết vụ việc vi phạm
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem toàn bộ hồ sơ báo cáo, lịch sử vi phạm của nghệ sĩ và đưa ra quyết định xử lý.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đối tượng:</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold capitalize text-slate-800 shadow-sm">
            {targetType === "artist" ? <Mic2 size={14} className="text-cyan-600" /> : targetType === "track" ? <Music2 size={14} className="text-violet-600" /> : <Disc3 size={14} className="text-orange-600" />}
            {targetLabel}: {reportedItemTitle}
          </span>
        </div>
      </div>

      {/* Toast Messages */}
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-600" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      {/* Grid Overview Info Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Card 1: Artist Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-3">
              <img
                src={artistAvatar}
                alt={artistName}
                className="h-11 w-11 rounded-full object-cover border border-slate-200"
              />
              <div>
                <h3 className="text-base font-bold text-slate-950">{artistName}</h3>
                <p className="text-xs text-slate-500">Nghệ sĩ hệ thống</p>
              </div>
            </div>

            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                artistStatus === "blocked"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {artistStatus === "blocked" ? "Đã bị khóa" : "Hoạt động"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium text-slate-500">Số lần vi phạm đã ghi nhận:</span>
            <span className="text-lg font-bold text-slate-900">{artistViolations} / 5 lần</span>
          </div>
        </div>

        {/* Card 2: Reported Content Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Thông tin nội dung bị báo cáo
              </span>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 capitalize">
              {targetLabel}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Tên tác phẩm / Bài hát:</span>
              <strong className="text-slate-900 font-bold">{reportedItemTitle}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nghệ sĩ sở hữu:</span>
              <strong className="text-slate-900">{artistName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tổng số đợt vi phạm đã xử lý:</span>
              <strong className="text-slate-900">{resolvedReportBatches.length} đợt</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Violation History Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-500" />
            <h3 className="text-base font-bold text-slate-950">
              Lịch sử các đợt vi phạm đã xử lý ({resolvedReportBatches.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Hạn mức: <strong>{artistViolations}/5 vi phạm</strong>
          </span>
        </div>

        <div className="space-y-4">
          {resolvedReportBatches.length > 0 ? (
            resolvedReportBatches.map((batch, batchIndex) => {
              const handledByName =
                batch.handledBy?.profile?.fullName || batch.handledBy?.email || "Quản trị viên";
              const handledDate = batch.handledAt
                ? new Date(batch.handledAt).toLocaleString("vi-VN")
                : "—";
              const isExpanded = expandedBatchKeys.includes(batch.batchKey);
              const violationNumber = Math.max(1, artistViolations - batchIndex);
              const resolutionDisplay = getResolutionDisplay(batch.resolution, violationNumber);

              return (
                <div
                  key={batch.batchKey}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                        {batch.reportCount} báo cáo
                      </span>
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                        {resolutionDisplay.label}
                      </span>
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                        {resolutionDisplay.action}
                      </span>
                    </div>

                    <div className="text-right text-xs text-slate-400">
                      <p>Admin xử lý: <strong className="text-slate-700">{handledByName}</strong></p>
                      <p>Xử lý lúc: {handledDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-500">
                      Nhấn để xem ghi chú xử lý và danh sách {batch.reportCount} báo cáo trong đợt này.
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleBatchExpanded(batch.batchKey)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? "Thu gọn" : "Xem chi tiết"}
                    </button>
                  </div>

                  {isExpanded ? (
                    <>
                      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 space-y-1 text-xs text-blue-950">
                        <div className="flex items-center gap-1.5 font-bold text-blue-800 text-[11px] uppercase tracking-wider">
                          <FileText size={14} className="text-blue-600" />
                          Ghi chú xử lý của Quản trị viên
                        </div>
                        <p className="font-semibold text-xs leading-relaxed text-blue-900 pt-0.5">
                          {normalizeResolutionNote(batch.resolutionNote) || "Đã kiểm duyệt vi phạm và gửi thông báo tới nghệ sĩ."}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {batch.reports.map((rep, reportIndex) => {
                          const repTargetTitle =
                            rep.targetInfo?.title ||
                            rep.targetInfo?.name ||
                            rep.targetTitle ||
                            rep.trackTitle ||
                            rep.albumTitle ||
                            detail.targetInfo?.title ||
                            reportedItemTitle;

                          const itemType = rep.targetType || targetType || "track";

                          return (
                            <div
                              key={rep._id || reportIndex}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200/80">
                                    {reasonLabels[rep.reason] || rep.reason || "Báo cáo vi phạm"}
                                  </span>
                                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200">
                                    {itemType === "album" ? "Album" : itemType === "artist" ? "Nghệ sĩ" : "Bài hát"}: "{repTargetTitle}"
                                  </span>
                                </div>

                                <span className="text-xs text-slate-400 font-medium">
                                  {new Date(rep.createdAt || Date.now()).toLocaleString("vi-VN")}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  Mô tả vi phạm từ người báo cáo:
                                </p>
                                <div className="rounded-xl bg-white p-3 text-xs text-slate-800 font-medium border border-slate-100">
                                  {rep.description || "Không có mô tả chi tiết."}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                                <span>
                                  Người báo cáo: <strong className="text-slate-800">{rep.userId?.profile?.fullName || rep.userId?.email || "Người dùng"}</strong>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 italic">
              Chưa có đợt vi phạm nào đã xử lý được ghi nhận cho nghệ sĩ này.
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
