import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Disc3,
  ExternalLink,
  Eye,
  FileText,
  Flag,
  Image as ImageIcon,
  Loader2,
  Music2,
  User,
  XCircle,
} from "lucide-react";
import { getAdminAlbumDetailService } from "../../services/albumService";
import { getAdminArtistDetailService } from "../../services/artistService";
import { getReportDetailService, updateReportStatusService } from "../../services/reportService";
import { getAdminTrackDetailService } from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";
import toast from "react-hot-toast";

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

const resolutionLabels = {
  remove_content: "Gỡ bỏ nội dung vi phạm",
  ignore: "Bỏ qua báo cáo",
  warning: "Cảnh báo người dùng",
  resolved: "Đã xử lý",
  rejected: "Từ chối",
  "": "—",
};

const getStatusConfig = (status) => {
  switch (status) {
    case "pending":
    case "reviewing":
      return {
        label: "Đang xem xét",
        icon: Eye,
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-200",
      };
    case "resolved":
      return {
        label: "Đã xử lý",
        icon: CheckCircle,
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-200",
      };
    case "rejected":
      return {
        label: "Từ chối",
        icon: XCircle,
        bg: "bg-rose-50",
        text: "text-rose-600",
        border: "border-rose-200",
      };
    default:
      return {
        label: "Đang xem xét",
        icon: Eye,
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-200",
      };
  }
};

const getTargetTypeBadge = (type) => {
  const colors = {
    track: "bg-violet-100 text-violet-700",
    album: "bg-orange-100 text-orange-700",
    artist: "bg-cyan-100 text-cyan-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${
        colors[type] || "bg-slate-100 text-slate-700"
      }`}
    >
      {type}
    </span>
  );
};

const getTargetEntityLabel = (type) => {
  switch (type) {
    case "track":
      return "Bài hát";
    case "album":
      return "Album";
    case "artist":
      return "Nghệ sĩ";
    default:
      return "Nội dung";
  }
};

const formatDate = (date) => {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateOnly = (date) => {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString("vi-VN");
};

const formatDuration = (seconds) => {
  const normalizedSeconds = Number(seconds);

  if (!Number.isFinite(normalizedSeconds) || normalizedSeconds <= 0) {
    return "00:00";
  }

  const minutes = Math.floor(normalizedSeconds / 60);
  const remainingSeconds = Math.floor(normalizedSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getTargetDetailRoute = (targetType, targetId) => {
  if (!targetId) {
    return "";
  }

  switch (targetType) {
    case "track":
      return routePaths.trackDetail(targetId);
    case "album":
      return routePaths.albumDetail(targetId);
    case "artist":
      return routePaths.artistDetail(targetId);
    default:
      return "";
  }
};

const getTargetPreviewImage = (targetType, preview, targetInfo) => {
  if (targetType === "track") {
    return preview?.avatar || preview?.coverImage || targetInfo?.avatar || "";
  }

  if (targetType === "album") {
    return preview?.coverImage || targetInfo?.coverImage || "";
  }

  if (targetType === "artist") {
    return preview?.avatar || targetInfo?.avatar || "";
  }

  return "";
};

const InfoCard = ({ icon: Icon, title, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="mb-4 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
        <Icon size={16} className="text-slate-600" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
    {children}
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-700 text-right">{value || "—"}</span>
  </div>
);

const ModalShell = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Quản lý nội dung
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
        >
          <XCircle size={18} />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
    </div>
  </div>
);

const renderTargetPreviewDetails = (targetType, preview, targetInfo) => {
  if (targetType === "track") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
          <DetailRow label="Tên bài hát" value={preview?.title || targetInfo?.title} />
          <DetailRow
            label="Nghệ sĩ"
            value={preview?.artist?.name || preview?.artist_artistId?.name || targetInfo?.artist_artistId?.name}
          />
          <DetailRow label="Thời lượng" value={formatDuration(preview?.duration)} />
          <DetailRow label="Ngày phát hành" value={formatDateOnly(preview?.releaseDate)} />
          <DetailRow label="Trạng thái duyệt" value={preview?.approvalStatus || "—"} />
          <DetailRow label="Trạng thái hiển thị" value={preview?.activeStatus || "—"} />
        </div>

        {preview?.stats ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Lượt nghe</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {(preview.stats.totalPlay || 0).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Lượt thích</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {(preview.stats.likes || 0).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Lượt chia sẻ</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {(preview.stats.shares || 0).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (targetType === "album") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
          <DetailRow label="Tên album" value={preview?.title || targetInfo?.title} />
          <DetailRow label="Nghệ sĩ" value={preview?.artist?.name || targetInfo?.artistId?.name} />
          <DetailRow label="Ngày phát hành" value={formatDateOnly(preview?.releaseDate)} />
          <DetailRow label="Trạng thái" value={preview?.status || "—"} />
          <DetailRow label="Số bài hát" value={String(preview?.trackCount || preview?.tracks?.length || 0)} />
          <DetailRow label="Tổng thời lượng" value={formatDuration(preview?.totalDuration)} />
        </div>

        {Array.isArray(preview?.tracks) && preview.tracks.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">Danh sách bài hát nổi bật</p>
            <div className="space-y-2">
              {preview.tracks.slice(0, 5).map((item) => (
                <div
                  key={`${item?.order}-${item?.track?.id || "track"}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {item?.order ? `${item.order}. ` : ""}
                      {item?.track?.title || "Bài hát không xác định"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {item?.track?.artist?.name || "Nghệ sĩ không xác định"}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {formatDuration(item?.track?.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (targetType === "artist") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
          <DetailRow label="Tên nghệ sĩ" value={preview?.name || targetInfo?.name} />
          <DetailRow label="Email liên kết" value={preview?.email || "—"} />
          <DetailRow label="Trạng thái hoạt động" value={preview?.activeStatus || "—"} />
          <DetailRow label="Xác minh" value={preview?.verificationStatus || "—"} />
          <DetailRow label="Tổng bài hát" value={String(preview?.metrics?.totalTracks || preview?.totalTracks || 0)} />
          <DetailRow label="Tổng album" value={String(preview?.metrics?.totalAlbums || 0)} />
        </div>

        {preview?.bio ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Tiểu sử</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {preview.bio}
            </p>
          </div>
        ) : null}

        {preview?.metrics ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Followers</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {(preview.metrics.followers || preview.stats?.followers || 0).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Streams</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {(preview.metrics.totalStreams || preview.stats?.totalStreams || 0).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Monthly listeners</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {(preview.metrics.monthlyListeners || 0).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
      Không có dữ liệu xem nhanh cho loại nội dung này.
    </div>
  );
};

const ReportDetailPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("error");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectResolution, setRejectResolution] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectResolutionError, setRejectResolutionError] = useState("");
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [selectedResolution, setSelectedResolution] = useState("");
  const [resolutionError, setResolutionError] = useState("");
  const [showTargetPreviewModal, setShowTargetPreviewModal] = useState(false);
  const [targetPreview, setTargetPreview] = useState(null);
  const [isTargetPreviewLoading, setIsTargetPreviewLoading] = useState(false);
  const [targetPreviewError, setTargetPreviewError] = useState("");

  const loadReport = async () => {
    if (!reportId) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const result = await getReportDetailService(reportId);
      setReport(result);
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tải chi tiết báo cáo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [reportId]);

  const targetDetailRoute = useMemo(
    () => getTargetDetailRoute(report?.targetType, report?.targetId),
    [report?.targetId, report?.targetType]
  );

  const loadTargetPreview = async () => {
    if (!report?.targetId || !report?.targetType) {
      setTargetPreview(null);
      setTargetPreviewError("Không xác định được nội dung bị báo cáo.");
      setShowTargetPreviewModal(true);
      return;
    }

    setShowTargetPreviewModal(true);
    setIsTargetPreviewLoading(true);
    setTargetPreviewError("");
    setTargetPreview(null);

    try {
      let result = null;

      switch (report.targetType) {
        case "track":
          result = await getAdminTrackDetailService(report.targetId);
          break;
        case "album":
          result = await getAdminAlbumDetailService(report.targetId);
          break;
        case "artist":
          result = await getAdminArtistDetailService(report.targetId);
          break;
        default:
          throw new Error("Loại nội dung chưa được hỗ trợ.");
      }

      setTargetPreview(result);
    } catch (error) {
      setTargetPreviewError(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tải chi tiết nội dung bị báo cáo."
      );
    } finally {
      setIsTargetPreviewLoading(false);
    }
  };

  const closeTargetPreviewModal = () => {
    setShowTargetPreviewModal(false);
    setTargetPreview(null);
    setTargetPreviewError("");
    setIsTargetPreviewLoading(false);
  };

  const handleOpenTargetDetailPage = () => {
    if (!targetDetailRoute) {
      return;
    }

    closeTargetPreviewModal();
    navigate(targetDetailRoute);
  };

  const handleStatusUpdate = async (newStatus, note = "", resolution = "") => {
    setIsSubmitting(true);
    setMessage("");

    try {
      const result = await updateReportStatusService(reportId, {
        status: newStatus,
        resolutionNote: note,
        resolution,
      });
      setReport(result);
      setMessageTone("success");
      setMessage("Cập nhật trạng thái thành công.");
      toast.success("Cập nhật trạng thái thành công");
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Cập nhật trạng thái thất bại."
      );
      toast.error("Cập nhật trạng thái thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectResolution.trim()) {
      toast.error("Vui lòng nhập hình thức từ chối");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const result = await updateReportStatusService(reportId, {
        status: "rejected",
        resolution: rejectResolution.trim(),
        resolutionNote: rejectNote.trim(),
      });
      setReport(result);
      setShowRejectModal(false);
      setRejectResolution("");
      setRejectNote("");
      setRejectResolutionError("");
      setMessageTone("success");
      setMessage("Từ chối báo cáo thành công.");
      toast.success("Từ chối báo cáo thành công");
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Từ chối báo cáo thất bại."
      );
      toast.error("Từ chối báo cáo thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusConfig = report ? getStatusConfig(report.status) : null;
  const StatusIcon = statusConfig?.icon || Eye;
  const reporter = report?.userId;
  const reporterName = reporter?.profile?.fullName || reporter?.email || "—";
  const handler = report?.handledBy;
  const targetImage = getTargetPreviewImage(report?.targetType, targetPreview, report?.targetInfo);
  const targetPreviewTitle =
    targetPreview?.title ||
    targetPreview?.name ||
    report?.targetInfo?.title ||
    report?.targetInfo?.name ||
    "Nội dung bị báo cáo";

  return (
    <section className="min-h-screen space-y-5 bg-slate-50/50 p-3 font-sans text-slate-800 antialiased lg:p-5">
      <div className="flex items-center gap-4">
        <Link
          to={routePaths.reports}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Quản lý nội dung
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Chi tiết báo cáo
          </h1>
        </div>
      </div>

      {message ? (
        <div
          className={`rounded-xl px-5 py-4 text-sm ${
            messageTone === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center text-sm text-slate-600">
          Đang tải chi tiết báo cáo...
        </div>
      ) : !report ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center text-sm text-slate-500">
          Không tìm thấy báo cáo.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            {(report.status === "resolved" || report.status === "rejected") ? (
              <div
                className={`rounded-2xl border p-5 shadow-lg ${
                  report.status === "resolved"
                    ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100"
                    : "border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100"
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  {report.status === "resolved" ? (
                    <CheckCircle size={24} className="text-emerald-600" />
                  ) : (
                    <XCircle size={24} className="text-rose-600" />
                  )}
                  <h3
                    className={`text-lg font-semibold ${
                      report.status === "resolved"
                        ? "text-emerald-800"
                        : "text-rose-800"
                    }`}
                  >
                    {report.status === "resolved" ? "Kết quả xử lý" : "Lý do từ chối"}
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500">Hình thức xử lý</span>
                    <span
                      className={`text-sm font-semibold ${
                        report.status === "resolved"
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {resolutionLabels[report.resolution] || report.resolution || "—"}
                    </span>
                  </div>
                  {report.resolutionNote ? (
                    <div className="mt-2 border-t border-slate-200/50 pt-2">
                      <span className="text-sm text-slate-500">Ghi chú từ quản trị viên</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {report.resolutionNote}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <InfoCard icon={Flag} title="Thông tin báo cáo">
              <div className="space-y-1">
                <DetailRow label="Trạng thái" value={statusConfig?.label} />
                <DetailRow label="Loại nội dung" value={getTargetEntityLabel(report.targetType)} />
                <DetailRow
                  label="Lý do báo cáo"
                  value={reasonLabels[report.reason] || report.reason}
                />
                <DetailRow label="Ngày tạo" value={formatDate(report.createdAt)} />
                <DetailRow label="Ngày xử lý" value={formatDate(report.handledAt)} />
              </div>
            </InfoCard>

            <InfoCard icon={FileText} title="Mô tả chi tiết">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {report.description || "Không có mô tả."}
              </p>
            </InfoCard>

            {report.images?.length > 0 ? (
              <InfoCard icon={ImageIcon} title={`Hình ảnh đính kèm (${report.images.length})`}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {report.images.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:opacity-80"
                    >
                      <img
                        src={url}
                        alt={`Hình ảnh ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </InfoCard>
            ) : null}
          </div>

          <div className="space-y-5">
            <InfoCard icon={User} title="Người báo cáo">
              <div className="space-y-1">
                <DetailRow label="Họ và tên" value={reporterName} />
                <DetailRow label="Email" value={reporter?.email} />
              </div>
            </InfoCard>

            {handler ? (
              <InfoCard icon={CheckCircle} title="Người xử lý">
                <div className="space-y-1">
                  <DetailRow
                    label="Họ và tên"
                    value={handler?.profile?.fullName || handler?.email || "—"}
                  />
                  <DetailRow label="Email" value={handler?.email} />
                </div>
              </InfoCard>
            ) : null}

            <InfoCard icon={Flag} title="Nội dung bị báo cáo">
              <div className="space-y-3">
                <DetailRow label="Loại" value={getTargetEntityLabel(report.targetType)} />
                <DetailRow
                  label={getTargetEntityLabel(report.targetType)}
                  value={report.targetInfo?.title || report.targetInfo?.name || "—"}
                />
                <DetailRow
                  label="Nghệ sĩ liên quan"
                  value={report.targetInfo?.artist_artistId?.name || report.targetInfo?.artistId?.name || "—"}
                />
                <DetailRow label="Mã nội dung" value={report.targetId} />
              </div>

              <button
                type="button"
                onClick={() => void loadTargetPreview()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Eye size={16} />
                Xem kỹ nội dung bị báo cáo
              </button>
            </InfoCard>

            {report.status !== "resolved" && report.status !== "rejected" ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold text-slate-700">Hành động</h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowResolveModal(true)}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    Xác nhận đã xử lý
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Từ chối báo cáo
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {showResolveModal ? (
        <ModalShell
          title="Xác nhận đã xử lý"
          subtitle="Ghi nhận kết quả xử lý để lưu lại lịch sử điều hành."
          onClose={() => {
            setShowResolveModal(false);
            setResolveNote("");
            setSelectedResolution("");
            setResolutionError("");
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Hình thức xử lý <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={selectedResolution}
                onChange={(event) => {
                  setSelectedResolution(event.target.value);
                  setResolutionError("");
                }}
                placeholder="Nhập hình thức xử lý..."
                className={`w-full rounded-xl border p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                  resolutionError
                    ? "border-rose-400 focus:border-rose-500"
                    : "border-slate-200 focus:border-emerald-500"
                }`}
              />
              {resolutionError ? (
                <p className="mt-1 text-xs text-rose-500">{resolutionError}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Ghi chú từ quản trị viên
              </label>
              <textarea
                value={resolveNote}
                onChange={(event) => setResolveNote(event.target.value)}
                placeholder="Nhập ghi chú về cách xử lý báo cáo..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowResolveModal(false);
                  setResolveNote("");
                  setSelectedResolution("");
                  setResolutionError("");
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedResolution.trim()) {
                    setResolutionError("Vui lòng nhập hình thức xử lý");
                    return;
                  }

                  void handleStatusUpdate(
                    "resolved",
                    resolveNote.trim(),
                    selectedResolution.trim()
                  );
                  setShowResolveModal(false);
                  setResolveNote("");
                  setSelectedResolution("");
                  setResolutionError("");
                }}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border border-emerald-200 bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {showRejectModal ? (
        <ModalShell
          title="Từ chối báo cáo"
          subtitle="Lưu lại lý do từ chối để hỗ trợ truy vết và phản hồi."
          onClose={() => {
            setShowRejectModal(false);
            setRejectResolution("");
            setRejectNote("");
            setRejectResolutionError("");
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Hình thức từ chối <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={rejectResolution}
                onChange={(event) => {
                  setRejectResolution(event.target.value);
                  setRejectResolutionError("");
                }}
                placeholder="Nhập hình thức từ chối..."
                className={`w-full rounded-xl border p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                  rejectResolutionError
                    ? "border-rose-400 focus:border-rose-500"
                    : "border-slate-200 focus:border-rose-500"
                }`}
              />
              {rejectResolutionError ? (
                <p className="mt-1 text-xs text-rose-500">{rejectResolutionError}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Ghi chú từ quản trị viên
              </label>
              <textarea
                value={rejectNote}
                onChange={(event) => setRejectNote(event.target.value)}
                placeholder="Nhập ghi chú thêm (không bắt buộc)..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectResolution("");
                  setRejectNote("");
                  setRejectResolutionError("");
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectResolution.trim()) {
                    setRejectResolutionError("Vui lòng nhập hình thức từ chối");
                    return;
                  }

                  void handleReject();
                }}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border border-rose-200 bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
              >
                {isSubmitting ? "Đang xử lý..." : "Từ chối"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {showTargetPreviewModal ? (
        <ModalShell
          title={`Xem nhanh ${getTargetEntityLabel(report?.targetType).toLowerCase()}`}
          subtitle="Kiểm tra kỹ nội dung bị báo cáo trước khi chuyển sang trang detail đầy đủ."
          onClose={closeTargetPreviewModal}
        >
          {isTargetPreviewLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-6 py-16 text-sm text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              Đang tải chi tiết nội dung bị báo cáo...
            </div>
          ) : (
            <div className="space-y-5">
              {targetPreviewError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {targetPreviewError}
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {targetImage ? (
                    <img
                      src={targetImage}
                      alt={targetPreviewTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-slate-400">
                      {report?.targetType === "artist" ? <User size={36} /> : report?.targetType === "album" ? <Disc3 size={36} /> : <Music2 size={36} />}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Nội dung bị báo cáo
                    </p>
                    <h4 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      {targetPreviewTitle}
                    </h4>
                    <p className="mt-2 text-sm text-slate-500">
                      {getTargetEntityLabel(report?.targetType)} • Mã {report?.targetId}
                    </p>
                  </div>

                  {renderTargetPreviewDetails(report?.targetType, targetPreview, report?.targetInfo)}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeTargetPreviewModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleOpenTargetDetailPage}
                  disabled={!targetDetailRoute}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mở trang chi tiết
                  <ExternalLink size={15} />
                </button>
              </div>
            </div>
          )}
        </ModalShell>
      ) : null}
    </section>
  );
};

export default ReportDetailPage;
