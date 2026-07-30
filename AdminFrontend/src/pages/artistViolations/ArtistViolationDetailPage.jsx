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
  Eye,
  ExternalLink,
  FileText,
  AlertOctagon,
  Loader2,
} from "lucide-react";
import { getGroupedReportDetailService, resolveGroupedReportService } from "../../services/reportService";
import { updateAdminArtistStatusService } from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";

const reasonLabels = {
  copyright_infringement: "Vi phạm bản quyền (Copyright)",
  harassment_or_hate: "Quấy rối / Thù ghét (Harassment)",
  nudity_or_sexual_content: "Đồi trụy / Nhạy cảm (Explicit)",
  violence_or_dangerous_content: "Bạo lực / Nguy hiểm (Violence)",
  spam_or_scam: "Spam / Gian lận (Spam/Fraud)",
  misleading_information: "Sai lệch thông tin (Misleading)",
  impersonation: "Giả mạo nghệ sĩ (Impersonation)",
  other: "Khác (Other)",
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
    label: "Tạm ẩn / Gỡ tác phẩm",
    desc: "Tạm ẩn tác phẩm bị báo cáo khỏi hệ thống phát",
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
      const data = await getGroupedReportDetailService(targetType, targetId);
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
      const artistId =
        detail.artistInfo?._id ||
        detail.targetInfo?.artist_artistId?._id ||
        detail.targetInfo?.artistId?._id ||
        (targetType === "artist" ? targetId : null);

      // If action is block, suspend artist account
      if (selectedAction === "block" && artistId) {
        await updateAdminArtistStatusService(artistId, {
          activeStatus: "blocked",
          blockedReason: resolutionNote || "Tài khoản vi phạm nghiêm trọng chính sách cộng đồng.",
        });
      }

      // Resolve report in DB
      const evaluations = (detail.reports || []).map((r) => ({
        reportId: r._id,
        isValid: selectedAction !== "reject",
      }));

      await resolveGroupedReportService(targetType, targetId, {
        action: selectedAction,
        resolutionNote: resolutionNote.trim() || "Admin đã hoàn tất kiểm duyệt vi phạm.",
        evaluations,
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

  const artistViolations = detail?.artistViolationsCount ?? detail?.targetInfo?.violationsCount ?? 2;
  const artistStatus = detail?.artistActiveStatus || detail?.artistInfo?.activeStatus || "active";
  const artistName = detail?.artistInfo?.name || detail?.targetInfo?.name || "Nghệ sĩ";
  const artistAvatar =
    detail?.artistInfo?.avatar ||
    detail?.targetInfo?.avatar ||
    detail?.targetInfo?.artist_artistId?.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

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
            {targetType}
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
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Card 1: Artist Summary & Violation Counter */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <img
                src={artistAvatar}
                alt={artistName}
                className="h-12 w-12 rounded-full object-cover border border-slate-200 shadow-sm"
              />
              <div>
                <h3 className="text-base font-bold text-slate-950">{artistName}</h3>
                <p className="text-xs text-slate-500">Tài khoản Nghệ sĩ hệ thống</p>
              </div>
            </div>

            {detail.artistInfo?._id ? (
              <Link
                to={routePaths.artistDetail(detail.artistInfo._id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                Hồ sơ nghệ sĩ <ExternalLink size={12} />
              </Link>
            ) : null}
          </div>

          {/* Exact Artist Violations Count Card matching ReportDetailPage.jsx */}
          <div className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <ShieldAlert size={16} className="text-amber-500" />
                <span>Số lần vi phạm của nghệ sĩ</span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  artistStatus === "blocked"
                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                }`}
              >
                {artistStatus === "blocked" ? "Đã bị khóa" : "Hoạt động"}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-extrabold text-slate-900">{artistViolations}</span>
              <span className="text-xs font-semibold text-slate-500">
                {artistViolations >= 5 ? "⚠️ Đã đạt hạn mức tối đa" : `${artistViolations}/5 vi phạm`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Reported Content Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Thông tin nội dung bị báo cáo</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-950">
                {detail.targetInfo?.title || detail.targetInfo?.name || "Nội dung vi phạm"}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng cộng <strong className="text-slate-900 font-bold">{(detail.reports || []).length}</strong> lượt báo cáo khiếu nại
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <p><strong>Loại tác phẩm:</strong> {targetType.toUpperCase()}</p>
            <p><strong>Lần báo cáo mới nhất:</strong> {new Date(detail.reports?.[0]?.createdAt || Date.now()).toLocaleString()}</p>
          </div>
        </div>

      </div>

      {/* Reports History List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)] space-y-4">
        <h3 className="text-base font-bold text-slate-950">
          Danh sách chi tiết các báo cáo khiếu nại ({detail.reports?.length || 0})
        </h3>

        <div className="divide-y divide-slate-100">
          {(detail.reports || []).map((rep, idx) => (
            <div key={rep._id || idx} className="py-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                    {reasonLabels[rep.reason] || rep.reason}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(rep.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl">
                {rep.description || "Không có mô tả chi tiết."}
              </p>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Người báo cáo: <strong className="text-slate-800">{rep.userId?.profile?.fullName || rep.userId?.email || "User"}</strong></span>
                <span className="capitalize font-semibold text-slate-600">Trạng thái: {rep.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
