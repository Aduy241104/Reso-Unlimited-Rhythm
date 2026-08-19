import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { ArrowLeft, Disc3, ShieldAlert, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { Section, StatusBadge } from "../albums/components/AlbumManagementPrimitives";
import { getTrackActiveStatusBadge, getTrackApprovalStatusBadge } from "../albums/utils";
import {
    getAdminTrackDetailService,
    startAdminTrackReviewSessionService,
    recordAdminTrackReviewEventService,
    updateAdminTrackApprovalStatusService,
    updateAdminTrackVisibilityService
} from "../../services/trackService";
import TrackEditReviewComparison from "./TrackEditReviewComparison";

// Cấu hình cờ vi phạm dành cho việc từ chối (Reject) hoặc Ban
const VIOLATION_OPTIONS = [
    { value: "copyright", label: "Vi phạm bản quyền" },
    { value: "missing_rights_proof", label: "Thiếu chứng từ sở hữu" },
    { value: "wrong_metadata", label: "Sai thông tin bài hát/ca sĩ" },
    { value: "low_audio_quality", label: "Chất lượng âm thanh kém" },
    { value: "explicit_content", label: "Nội dung nhạy cảm/độc hại" },
    { value: "duplicate_track", label: "Trùng lặp dữ liệu bài hát" },
    { value: "other", label: "Lý do khác" },
];

// Cấu hình danh sách cờ lý do dành cho việc ẩn bài hát (Hide)
const HIDE_REASON_OPTIONS = [
    { value: "artist_request", label: "Nghệ sĩ yêu cầu tạm ẩn" },
    { value: "pending_investigation", label: "Tạm ẩn để xác minh vi phạm" },
    { value: "metadata_revision", label: "Tạm ẩn để chỉnh sửa thông tin" },
    { value: "audio_issue", label: "Sự cố tệp âm thanh" },
    { value: "other", label: "Lý do vận hành khác" },
];

const formatDuration = (seconds) => {
    const totalSeconds = Math.floor(Number(seconds));
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getPrimaryCopyrightType = (copyright = {}) => (
    ["original", "cover", "remix"].includes(copyright.primaryCopyrightType)
        ? copyright.primaryCopyrightType
        : copyright.isCover
            ? "cover"
            : copyright.isRemix
                ? "remix"
                : "original"
);

const COPYRIGHT_TYPE_LABELS = {
    original: "Tác phẩm gốc",
    cover: "Bản hát lại",
    remix: "Bản phối lại",
};

const FINGERPRINT_STATUS_LABELS = {
    not_started: "Chưa bắt đầu",
    pending: "Đang chờ xử lý",
    processing: "Đang tạo dấu vân tay",
    completed: "Đã tạo dấu vân tay",
    failed: "Tạo dấu vân tay thất bại",
    unavailable: "Bộ máy không khả dụng",
};

const FINGERPRINT_SCREENING_STATUS_LABELS = {
    unknown: "Chưa có kết quả",
    pending: "Đang chờ sàng lọc",
    processing: "Đang sàng lọc",
    passed: "Không phát hiện trùng trong kho nội bộ",
    flagged: "Phát hiện dấu hiệu trùng, cần kiểm tra",
    failed: "Sàng lọc thất bại",
};

const FINGERPRINT_RISK_LABELS = {
    none: "Chưa phát hiện rủi ro trong kho nội bộ",
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
    critical: "Nghiêm trọng",
};

const FINGERPRINT_CLASSIFICATION_LABELS = {
    none: "Dưới ngưỡng cảnh báo",
    review: "Cần kiểm tra thủ công",
    high: "Tương đồng cao",
};

const MUSICBRAINZ_STATUS_LABELS = {
    pending: "Đang chờ đối chiếu",
    matched: "Tìm thấy bản ghi phù hợp",
    possible_match: "Đã tìm thấy dữ liệu tham khảo",
    not_found: "Không tìm thấy bản ghi phù hợp",
    failed: "Không thể đối chiếu với MusicBrainz",
};

const MUSICBRAINZ_FLAG_LABELS = {
    possible_existing_work: "Có thể đã tồn tại tác phẩm tương ứng",
    external_metadata_conflict: "Thông tin khai báo khác dữ liệu MusicBrainz",
    cover_source_mismatch: "Nguồn của bản hát lại không khớp",
    remix_isrc_mismatch: "Mã ISRC của bản phối lại không khớp",
    musicbrainz_unavailable: "Dịch vụ MusicBrainz không khả dụng",
};

const MUSICBRAINZ_REASON_LABELS = {
    MUSICBRAINZ_ARTIST_MISMATCH: "Nghệ sĩ khai báo không khớp",
    MUSICBRAINZ_RECORDING_MISMATCH: "Thông tin bản ghi không khớp",
    MUSICBRAINZ_METADATA_CONFLICT: "Có xung đột metadata cần kiểm tra",
    MUSICBRAINZ_STRONG_METADATA_CONFLICT: "Có xung đột metadata mạnh",
};

const MUSICBRAINZ_RISK_LABELS = {
    none: "Không phát hiện rủi ro",
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
};

const ACOUSTID_STATUS_LABELS = {
    pending: "Đang chờ đối chiếu âm thanh",
    matched: "Đã nhận diện bản ghi âm",
    possible_match: "Có kết quả tương đồng, cần kiểm tra",
    not_found: "Không tìm thấy bản ghi âm phù hợp",
    failed: "Không thể đối chiếu AcoustID",
};

const ACOUSTID_REASON_LABELS = {
    no_external_audio_match: "Không tìm thấy bản ghi âm bên ngoài phù hợp.",
    low_confidence_external_audio_match: "Kết quả có độ tin cậy thấp, cần kiểm tra thủ công.",
    declared_cover_external_audio_match: "Bản Cover trùng với bản ghi gốc; cần kiểm tra quyền sử dụng.",
    declared_remix_external_audio_match: "Bản Remix trùng với bản ghi gốc; cần kiểm tra quyền sử dụng.",
    similar_version_ambiguous: "Có thể là karaoke, instrumental, radio edit hoặc phiên bản tương tự.",
    external_match_needs_manual_review: "Kết quả nhận dạng cần quản trị viên xác minh.",
    external_audio_title_conflict: "Tên bài khai báo không khớp bản ghi âm nhận diện được.",
    external_audio_artist_conflict: "Nghệ sĩ khai báo không khớp bản ghi âm nhận diện được.",
    external_audio_match_consistent: "Thông tin khai báo phù hợp với bản ghi âm nhận diện được.",
    acoustid_disabled: "Đối chiếu AcoustID đang bị tắt trên máy chủ.",
    acoustid_missing_api_key: "Máy chủ chưa cấu hình khóa AcoustID.",
    acoustid_fingerprint_missing: "Chưa có dấu vân tay Chromaprint để đối chiếu.",
    acoustid_timeout: "AcoustID không phản hồi trong thời gian cho phép.",
    acoustid_lookup_failed: "Yêu cầu AcoustID thất bại.",
    ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY: "Điểm đối chiếu cao nhưng chưa xác định được bản ghi.",
};

const AUTOMATIC_DECISION_LABELS = {
    auto_clear: { label: "Hồ sơ sạch", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    auto_reject: { label: "Đã tự động trả về", className: "border-slate-200 bg-slate-100 text-slate-700" },
    manual_review: { label: "Cần kiểm tra", className: "border-amber-200 bg-amber-50 text-amber-700" },
    manual_review_high: { label: "Rủi ro cao", className: "border-rose-200 bg-rose-50 text-rose-700" },
    enforcement_block: { label: "Enforcement block", className: "border-red-300 bg-red-100 text-red-800" },
};

const AUTOMATIC_REASON_LABELS = {
    FINGERPRINT_CLEAN: "Fingerprint không phát hiện trùng",
    COPYRIGHT_DECLARATION_VALID: "Khai báo bản quyền hợp lệ",
    SAME_ARTIST_EXACT_DUPLICATE: "Trùng bản ghi âm với bài đã được duyệt của cùng nghệ sĩ",
    APPROVED_EXACT_CONFLICT_NO_EVIDENCE: "Trùng bản ghi đã được duyệt, chưa có bằng chứng quyền sử dụng",
    SAME_ARTIST_PERFECT_FINGERPRINT_DUPLICATE: "Fingerprint trùng hoàn toàn với bài đã được duyệt của cùng nghệ sĩ",
    APPROVED_PERFECT_FINGERPRINT_DUPLICATE: "Fingerprint trùng hoàn toàn với bài đã được duyệt",
    HIGH_SIMILARITY_NO_EXACT_DUPLICATE: "Fingerprint có độ tương đồng cao, cần kiểm tra",
    SIMILARITY_REQUIRES_REVIEW: "Fingerprint có dấu hiệu tương đồng, cần kiểm tra",
    PENDING_EXACT_DUPLICATE: "Có bản ghi trùng đang chờ duyệt",
    PENDING_PERFECT_FINGERPRINT_DUPLICATE: "Có fingerprint trùng hoàn toàn đang chờ duyệt",
    FINGERPRINT_INCOMPLETE: "Chưa đủ dữ liệu fingerprint",
    AUDIO_OR_METADATA_INVALID: "Audio hoặc metadata chưa hợp lệ",
    MISSING_COPYRIGHT_DECLARATION: "Thiếu khai báo bản quyền",
    MISSING_COPYRIGHT_EVIDENCE: "Thiếu bằng chứng bản quyền",
    CONTRADICTORY_DECLARATION: "Khai báo bản quyền mâu thuẫn",
    CONFIRMED_FINGERPRINT_BLOCKLIST: "Fingerprint nằm trong danh sách thực thi bản quyền",
    ACOUSTID_STRONG_EXTERNAL_MISMATCH: "AcoustID phát hiện xung đột mạnh",
    ACOUSTID_DECLARED_DERIVATIVE_WITH_EVIDENCE: "AcoustID nhận diện bản ghi gốc, cần kiểm tra bằng chứng sử dụng",
    ACOUSTID_STRONG_CONFLICT: "AcoustID phát hiện xung đột mạnh với khai báo",
    ACOUSTID_POSSIBLE_MATCH: "AcoustID phát hiện kết quả tương đồng, cần kiểm tra thủ công",
    ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY: "Điểm đối chiếu cao nhưng chưa xác định được bản ghi",
    MUSICBRAINZ_STRONG_EXTERNAL_MISMATCH: "MusicBrainz phát hiện xung đột metadata mạnh",
    MUSICBRAINZ_EXTERNAL_CONFLICT: "MusicBrainz phát hiện xung đột metadata cần kiểm tra",
    MUSICBRAINZ_ARTIST_MISMATCH: "Nghệ sĩ khai báo không khớp MusicBrainz",
    MUSICBRAINZ_RECORDING_MISMATCH: "Thông tin bản ghi không khớp MusicBrainz",
    MUSICBRAINZ_METADATA_CONFLICT: "Có xung đột metadata cần kiểm tra",
    MUSICBRAINZ_STRONG_METADATA_CONFLICT: "Có xung đột metadata mạnh",
    APPROVED_EXACT_CONFLICT_WITH_EVIDENCE: "Trùng bản ghi đã được duyệt nhưng có bằng chứng quyền sử dụng",
    APPROVED_PERFECT_FINGERPRINT_WITH_EVIDENCE: "Fingerprint trùng hoàn toàn nhưng có bằng chứng quyền sử dụng",
    COVER_MISSING_ORIGINAL_WORK: "Thiếu thông tin tác phẩm gốc cho bản cover",
    REMIX_MISSING_RIGHTS: "Thiếu bằng chứng quyền sử dụng cho bản remix",
    SAMPLE_MISSING_CLEARANCE: "Thiếu giấy phép sử dụng sample",
    LICENSED_BEAT_MISSING_LICENSE: "Thiếu giấy phép sử dụng beat",
};

const getAutomaticReasonLabels = (reasonCodes = []) => [
    ...new Set(
        (Array.isArray(reasonCodes) ? reasonCodes : []).map(
            (reasonCode) => AUTOMATIC_REASON_LABELS[reasonCode] || "Có tín hiệu cần kiểm tra thêm",
        ),
    ),
];

const getAcoustIdSuggestedAction = (result) => {
    if (result?.reasonCodes?.includes("ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY")) return "Kiểm tra thủ công vì điểm đối chiếu cao nhưng AcoustID chưa xác định được bản ghi hoặc nghệ sĩ.";
    if (result?.status === "failed" && result?.providerUnavailable) return "Nhà cung cấp không khả dụng; đây là tín hiệu trung lập, có thể tiếp tục checklist và thử lại sau.";
    if (result?.status === "failed") return "Thử lại lookup và ghi nhận kết quả kiểm tra thủ công nếu cần.";
    if (result?.decision === "blocked") return "Đề nghị đổi khai báo thành Cover/Remix hoặc yêu cầu bằng chứng bản quyền; chỉ override khi đã xác minh.";
    if (result?.status === "possible_match") return "Kiểm tra bản ghi tương đồng và yêu cầu bằng chứng bản quyền khi cần.";
    if (result?.status === "not_found") return "AcoustID không có dữ liệu đối sánh; Admin phải ghi căn cứ kiểm tra thủ công trước khi duyệt.";
    if (result?.decision === "review_required") return "Đối chiếu bản ghi gốc và giấy phép của bản Cover/Remix hoặc phiên bản tương tự.";
    return "Xác nhận thông tin người sở hữu và các bằng chứng bản quyền trước khi duyệt.";
};

const translateStatus = (labels, value, fallback) => labels[value] || fallback || value || "Chưa có dữ liệu";

const getMusicBrainzNotice = (result, declaredData) => {
    const flags = Array.isArray(result?.flags) ? result.flags : [];
    const reasonCodes = Array.isArray(result?.reasonCodes) ? result.reasonCodes : [];
    if (!flags.length && !reasonCodes.length) return null;
    if (flags.includes("musicbrainz_unavailable")) {
        return {
            level: "error",
            title: "Không thể cập nhật dữ liệu MusicBrainz",
            message: "Dịch vụ MusicBrainz đang không khả dụng. Bạn có thể thử đối chiếu lại sau.",
        };
    }

    const declaredArtist = declaredData?.artist;
    const referencedArtists = Array.isArray(result?.recording?.artists)
        ? result.recording.artists.filter(Boolean).join(", ")
        : "";
    if (flags.includes("external_metadata_conflict") || reasonCodes.some((code) => String(code).startsWith("MUSICBRAINZ_"))) {
        const artistDetail = declaredArtist && referencedArtists
            ? ` Nghệ sĩ khai báo: ${declaredArtist}; MusicBrainz: ${referencedArtists}.`
            : "";
        const similarity = Number(result?.metadataSimilarity ?? result?.confidence ?? 0);
        const similarityPercent = formatSimilarityPercent(similarity);
        const riskLevel = result?.riskLevel || (similarity >= 0.85 ? "high" : "medium");
        const signals = reasonCodes.map((code) => MUSICBRAINZ_REASON_LABELS[code]).filter(Boolean).join("; ");
        return {
            level: "review",
            title: `Mức rủi ro: ${MUSICBRAINZ_RISK_LABELS[riskLevel] || "Cần kiểm tra"}`,
            message: `Phát hiện metadata cần kiểm tra.${artistDetail} Mức tương đồng metadata: ${similarityPercent}. ${signals ? `Tín hiệu: ${signals}. ` : ""}Kết quả này không tự xác nhận vi phạm bản quyền nhưng làm tăng mức rủi ro của hồ sơ.`,
        };
    }

    return {
        level: "review",
        title: "Thông tin cần kiểm tra thêm",
        message: [...flags.map((flag) => MUSICBRAINZ_FLAG_LABELS[flag] || flag), ...reasonCodes.map((code) => MUSICBRAINZ_REASON_LABELS[code] || "Có tín hiệu metadata cần kiểm tra")].join(". "),
    };
};

const formatSimilarityPercent = (value) => `${((Number(value || 0) > 1 ? Number(value || 0) : Number(value || 0) * 100)).toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
})}%`;

const getRequestErrorMessage = (error, fallback) => (
    error?.response?.data?.message || error?.message || fallback
);

const REVIEW_MISSING_LABELS = {
    track_opened: "mở hồ sơ",
    copyright_viewed: "xem thông tin bản quyền",
    metadata_checked: "kiểm tra siêu dữ liệu",
    audio_reviewed: "nghe đủ thời lượng audio",
    fingerprint_viewed: "xem dấu vân tay nội bộ",
    acoustid_result_viewed: "xem kết quả AcoustID",
    acoustid_result: "có kết quả AcoustID hợp lệ",
    musicbrainz_result_viewed: "xem kết quả MusicBrainz",
    musicbrainz_result: "có kết quả MusicBrainz hợp lệ",
    lyrics_reviewed: "xem lời bài hát",
    lrc_reviewed: "xem lời đồng bộ LRC",
    copyright_evidence: "có tài liệu bản quyền",
    fingerprint_screening: "hoàn tất sàng lọc dấu vân tay",
    high_risk_fingerprint: "xử lý cảnh báo dấu vân tay rủi ro cao",
};

const getReviewMissingLabel = (item) => (
    item?.startsWith("evidence:") ? "mở đủ tài liệu bản quyền" : (REVIEW_MISSING_LABELS[item] || item)
);

// Cấu hình Badge có chấm tròn chỉ thị màu sắc dịu chuẩn SaaS mới
const getStatusBadge = (status) => {
    switch (status) {
        case "approved":
        case "active":
        case "verified":
            return (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-1 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Hoạt động
                </span>
            );
        case "pending":
            return (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2.5 py-1 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Chờ duyệt
                </span>
            );
        case "rejected":
        case "disputed":
            return (
                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2.5 py-1 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Từ chối / Tranh chấp
                </span>
            );
        case "hidden":
            return (
                <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-full px-2.5 py-1 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    Tạm ẩn
                </span>
            );
        case "blocked":
            return (
                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 rounded-full px-2.5 py-1 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    Đã khóa ban
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2.5 py-1 text-xs font-medium capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    {status}
                </span>
            );
    }
};

const TrackDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [track, setTrack] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // States quản lý Modal tác vụ điều hướng đồng bộ
    const [modalType, setModalType] = useState(null); // 'approve' | 'reject' | 'block' | 'unblock'
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [adminNote, setAdminNote] = useState("");
    const [violationFlags, setViolationFlags] = useState([]);
    const [hideReasons, setHideReasons] = useState([]);
    const [review, setReview] = useState(null);
    const [reviewError, setReviewError] = useState("");
    const [reviewActionError, setReviewActionError] = useState("");
    const [reviewEventLoading, setReviewEventLoading] = useState("");
    const [fingerprintOverrideReason, setFingerprintOverrideReason] = useState("");
    const [acoustIdOverrideChecked, setAcoustIdOverrideChecked] = useState(false);
    const [acoustIdOverrideReason, setAcoustIdOverrideReason] = useState("");
    const [finalConfirmationChecked, setFinalConfirmationChecked] = useState(false);
    const audioRef = useRef(null);
    const lastAudioTimeRef = useRef(0);
    const audioReviewStartedRef = useRef(false);
    const audioProgressInFlightRef = useRef(false);
    const reviewEventQueueRef = useRef(Promise.resolve());
    const recordedAutoReviewEventsRef = useRef(new Set());

    const initializeReviewSession = useCallback(async () => {
        if (!id) return null;
        setReviewError("");
        setReviewActionError("");
        audioReviewStartedRef.current = false;
        audioProgressInFlightRef.current = false;
        lastAudioTimeRef.current = audioRef.current?.currentTime || 0;
        try {
            const session = await startAdminTrackReviewSessionService(id);
            setReview(session);
            return session;
        } catch (requestError) {
            setReview(null);
            setReviewError(getRequestErrorMessage(
                requestError,
                "Không thể khởi tạo phiên kiểm duyệt. Dữ liệu bài hát vẫn được hiển thị, nhưng chưa thể phê duyệt."
            ));
            return null;
        }
    }, [id]);

    const fetchTrackDetail = useCallback(async () => {
        setIsLoading(true);
        setError("");
        setReviewError("");
        try {
            const data = await getAdminTrackDetailService(id);
            setTrack(data);
            if (!data?.isDeleted && (data?.reviewStatus === "pending" || data?.approvalStatus === "pending")) {
                await initializeReviewSession();
            } else {
                setReview(null);
            }
        } catch (requestError) {
            setTrack(null);
            setReview(null);
            setError(getRequestErrorMessage(requestError, "Không thể tải thông tin bài hát."));
        } finally {
            setIsLoading(false);
        }
    }, [id, initializeReviewSession]);

    useEffect(() => {
        if (id) fetchTrackDetail();
    }, [fetchTrackDetail, id]);

    const closeModal = () => {
        setModalType(null);
        setAdminNote("");
        setViolationFlags([]);
        setHideReasons([]);
        setFingerprintOverrideReason("");
        setAcoustIdOverrideChecked(false);
        setAcoustIdOverrideReason("");
        setFinalConfirmationChecked(false);
    };

    const handleConfirmAction = async () => {
        if (!modalType || !id) return;
        setIsActionLoading(true);

        try {
            if (modalType === "approve") {
                const confirmedReview = review?.checklist?.finalConfirmed
                    ? review
                    : await recordReviewEvent({ type: "FINAL_CONFIRMATION" });
                if (!confirmedReview?.id) {
                    throw new Error(reviewError || "Không thể xác nhận phiên kiểm duyệt. Vui lòng thử khởi tạo lại phiên duyệt.");
                }
                const updatedTrack = await updateAdminTrackApprovalStatusService(id, {
                    status: "approved",
                    adminNote,
                    fingerprintOverrideReason,
                    acoustIdOverride: acoustIdOverrideChecked,
                    acoustIdOverrideReason,
                    reviewSessionId: confirmedReview.id,
                });
                if (updatedTrack) setTrack(updatedTrack);
            }
            else if (modalType === "reject") {
                const rejectCategory = violationFlags.includes("copyright")
                    ? "copyright_conflict"
                    : violationFlags.includes("missing_rights_proof")
                        ? "missing_license"
                        : violationFlags.includes("duplicate_track")
                            ? "duplicate_audio"
                            : "other";
                const updatedTrack = await updateAdminTrackApprovalStatusService(id, {
                    status: "rejected",
                    adminNote,
                    rejectReason: adminNote,
                    rejectCategory,
                    violationFlags,
                });
                if (updatedTrack) setTrack(updatedTrack);
            }
            else if (modalType === "hide") {
                const selectedLabels = hideReasons.map(r => HIDE_REASON_OPTIONS.find(o => o.value === r)?.label || r);
                const combinedHiddenReason = selectedLabels.length > 0
                    ? `[${selectedLabels.join(", ")}] ${adminNote}`.trim()
                    : adminNote.trim();

                const updatedTrack = await updateAdminTrackVisibilityService(id, {
                    action: "hide",
                    hiddenReason: combinedHiddenReason
                });
                if (updatedTrack) setTrack(updatedTrack);
            }
            else if (modalType === "unhide") {
                const updatedTrack = await updateAdminTrackVisibilityService(id, {
                    action: "unhide",
                    adminNote
                });
                if (updatedTrack) {
                    setTrack((current) => ({
                        ...current,
                        ...updatedTrack,
                        activeStatus: "active",
                        hiddenReason: "",
                        hiddenAt: null
                    }));
                }
            }
            else if (modalType === "block") {
                const selectedLabels = violationFlags.map(f => VIOLATION_OPTIONS.find(o => o.value === f)?.label || f);
                const combinedBlockedReason = selectedLabels.length > 0
                    ? `[BAN - ${selectedLabels.join(", ")}] ${adminNote}`.trim()
                    : adminNote.trim();

                const updatedTrack = await updateAdminTrackVisibilityService(id, {
                    action: "block",
                    blockedReason: combinedBlockedReason
                });
                if (updatedTrack) setTrack(updatedTrack);
            }
            else if (modalType === "unblock") {
                const updatedTrack = await updateAdminTrackVisibilityService(id, {
                    action: "unblock"
                });
                if (updatedTrack) setTrack(updatedTrack);
            }
            closeModal();
        } catch (err) {
            alert(getRequestErrorMessage(err, "Có lỗi xảy ra khi thực hiện tác vụ."));
        } finally {
            setIsActionLoading(false);
        }
    };

    const openModerationModal = (type) => {
        setModalType(type);
        setAdminNote("");
        setViolationFlags([]);
        setHideReasons([]);
        setFingerprintOverrideReason("");
        setAcoustIdOverrideChecked(false);
        setAcoustIdOverrideReason("");
        setFinalConfirmationChecked(false);
    };

    const reviewStatus = track?.reviewStatus || track?.approvalStatus;
    const isPendingApproval = reviewStatus === "pending";
    const isApproved = reviewStatus === "approved";
    const isRejected = reviewStatus === "rejected";
    const isActive = track?.activeStatus === "active";
    const isHidden = track?.activeStatus === "hidden";
    const isBlocked = track?.activeStatus === "blocked";
    const isDeleted = track?.isDeleted === true;
    const isPendingUpdateReview = track?.reviewSource === "pending_update";
    const artistId = track?.artist?.id || track?.artist?._id;
    const automaticDecision = track?.moderation?.automatic || null;
    const automaticDecisionBadge = AUTOMATIC_DECISION_LABELS[automaticDecision?.decision] || null;
    const automaticReasonLabels = getAutomaticReasonLabels(automaticDecision?.reasonCodes);

    const recordReviewEvent = useCallback((payload) => {
        if (!id || !isPendingApproval) return null;
        const executeEvent = async () => {
            const sendEvent = async () => {
                const nextReview = await recordAdminTrackReviewEventService(id, payload);
                if (nextReview) {
                    setReview(nextReview);
                    setReviewError("");
                    setReviewActionError("");
                }
                return nextReview;
            };
            try {
                return await sendEvent();
            } catch (requestError) {
                const errorCode = requestError?.response?.data?.errors?.code;
                if (errorCode === "STALE_REVIEW_SESSION") {
                    const restoredReview = await initializeReviewSession();
                    if (restoredReview) {
                        try {
                            return await sendEvent();
                        } catch (retryError) {
                            setReviewActionError(getRequestErrorMessage(
                                retryError,
                                "Không thể hoàn tất thao tác kiểm tra. Vui lòng thử lại."
                            ));
                            return null;
                        }
                    }
                }
                setReviewActionError(getRequestErrorMessage(
                    requestError,
                    "Không thể hoàn tất thao tác kiểm tra. Vui lòng thử lại."
                ));
                return null;
            }
        };
        const queuedEvent = reviewEventQueueRef.current.then(executeEvent, executeEvent);
        reviewEventQueueRef.current = queuedEvent.catch(() => undefined);
        return queuedEvent;
    }, [id, initializeReviewSession, isPendingApproval]);

    const handleManualReviewEvent = useCallback(async (type) => {
        setReviewEventLoading(type);
        try {
            return await recordReviewEvent({ type });
        } finally {
            setReviewEventLoading("");
        }
    }, [recordReviewEvent]);

    const musicBrainzResult = review?.checklist?.musicBrainzResult
        || track?.musicBrainz?.externalResult
        || null;
    const musicBrainzNotice = getMusicBrainzNotice(
        musicBrainzResult,
        track?.musicBrainz?.artistDeclaredData
    );
    const acoustIdResult = review?.checklist?.acoustIdResult
        || track?.acoustId?.result
        || null;
    const acoustIdUnavailable = Boolean(
        acoustIdResult?.providerUnavailable ||
        acoustIdResult?.status === "unavailable" ||
        acoustIdResult?.reasonCodes?.some?.((code) => /timeout|unavailable|lookup_failed|missing_api_key|disabled|api_|http_/i.test(String(code)))
    );
    const acoustIdNeedsOverride = !acoustIdUnavailable && acoustIdResult?.decision === "blocked";
    const acoustIdNeedsManualReason = !acoustIdUnavailable && acoustIdResult?.decision === "review_required"
        && !["failed", "not_found", "unavailable"].includes(acoustIdResult?.status);
    const acoustIdReasonText = (acoustIdResult?.reasonCodes || [])
        .map((code) => ACOUSTID_REASON_LABELS[code] || code.replace(/_/g, " "))
        .join(" ");
    const approvalMissingItems = (review?.missing || []).filter(
        (item) =>
            item !== "final_confirmation" &&
            item !== "high_risk_fingerprint"
    );
    const approvalBlockingMessages = [
        ...(!review ? ["Phiên kiểm duyệt chưa sẵn sàng."] : []),
        ...(reviewError ? [reviewError] : []),
        ...(!finalConfirmationChecked ? ["Chưa xác nhận kiểm tra lần cuối."] : []),
        ...(approvalMissingItems.length > 0
            ? [`Checklist còn thiếu: ${approvalMissingItems.map(getReviewMissingLabel).join(", ")}.`]
            : []),
        ...(
            (
                review?.checklist?.mediumRisk ||
                review?.checklist?.highRisk
            ) &&
                fingerprintOverrideReason.trim().length < 10
                ? [
                    review?.checklist?.highRisk
                        ? "Fingerprint đang ở mức HIGH. Admin phải nhập căn cứ kiểm tra thủ công ít nhất 10 ký tự trước khi duyệt."
                        : "Lý do xử lý cảnh báo dấu vân tay phải có ít nhất 10 ký tự."
                ]
                : []
        ),
        ...(acoustIdNeedsManualReason && adminNote.trim().length < 10
            ? [`Căn cứ kiểm tra audio/bản quyền còn thiếu ${10 - adminNote.trim().length} ký tự.`]
            : []),
        ...(acoustIdNeedsOverride && !acoustIdOverrideChecked
            ? ["Chưa xác nhận override kết quả AcoustID."]
            : []),
        ...(acoustIdNeedsOverride && !acoustIdOverrideReason.trim()
            ? ["Chưa nhập lý do override kết quả AcoustID."]
            : []),
    ];

    const handleAudioPlay = async () => {
        lastAudioTimeRef.current = audioRef.current?.currentTime || 0;
        audioReviewStartedRef.current = false;
        const openedReview = await recordReviewEvent({ type: "OPEN_AUDIO" });
        if (!openedReview) return;
        const startedReview = await recordReviewEvent({ type: "AUDIO_PLAY_STARTED" });
        audioReviewStartedRef.current = Boolean(startedReview);
    };

    const handleAudioTimeUpdate = () => {
        if (!audioReviewStartedRef.current || audioProgressInFlightRef.current) return;
        const currentTime = audioRef.current?.currentTime || 0;
        const deltaSeconds = Math.max(0, Math.min(5, currentTime - lastAudioTimeRef.current));
        if (deltaSeconds >= 1) {
            audioProgressInFlightRef.current = true;
            void (async () => {
                try {
                    const nextReview = await recordReviewEvent({ type: "AUDIO_PLAY_PROGRESS", deltaSeconds });
                    if (nextReview) {
                        lastAudioTimeRef.current = currentTime;
                    }
                } finally {
                    audioProgressInFlightRef.current = false;
                }
            })();
        }
    };

    const handleAudioEnded = () => {
        audioReviewStartedRef.current = false;
        void recordReviewEvent({ type: "AUDIO_REVIEWED" });
    };

    useEffect(() => {
        const reviewSessionId = review?.id;
        if (!track || !reviewSessionId || !isPendingApproval) return;
        let cancelled = false;
        const markVisibleSections = async () => {
            const events = [
                { type: "OPEN_METADATA" },
                { type: "OPEN_COPYRIGHT_SECTION" },
                { type: "OPEN_FINGERPRINT_RESULT" },
                ...(track.lyricsStatic ? [{ type: "OPEN_LYRICS" }] : []),
                ...(track.lyricsSyncUrl ? [{ type: "OPEN_LRC" }] : []),
                ...(track.musicBrainz?.externalResult?.status && track.musicBrainz.externalResult.status !== "pending"
                    ? [{ type: "OPEN_MUSICBRAINZ_RESULT" }]
                    : []),
            ];
            const existingEvents = new Set((review?.events || []).map((event) => event.type));
            for (const event of events) {
                if (cancelled) return;
                const eventKey = `${reviewSessionId}:${event.type}`;
                if (existingEvents.has(event.type) || recordedAutoReviewEventsRef.current.has(eventKey)) continue;
                recordedAutoReviewEventsRef.current.add(eventKey);
                const nextReview = await recordReviewEvent(event);
                if (!nextReview) {
                    recordedAutoReviewEventsRef.current.delete(eventKey);
                    return;
                }
                existingEvents.add(event.type);
            }
        };
        void markVisibleSections();
        return () => {
            cancelled = true;
        };
    }, [
        isPendingApproval,
        recordReviewEvent,
        review?.events,
        review?.id,
        track,
    ]);

    if (isLoading) {
        return <div className="p-8 text-center text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">Đang tải chi tiết bài hát...</div>;
    }

    if (error || !track) {
        return (
            <div className="p-8 text-center border border-red-100 bg-red-50 text-red-700 rounded-2xl max-w-md mx-auto mt-12 shadow-sm">
                <p className="font-bold text-sm">{error || "Không tìm thấy bài hát."}</p>
                <button onClick={() => navigate(-1)} className="mt-4 bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition">Quay lại</button>
            </div>
        );
    }

    return (
        <section className="-mt-3 space-y-6 pb-6 font-sans text-slate-900 antialiased [&_.border-slate-100]:border-slate-200 [&_.text-slate-400]:text-slate-600 [&_.text-slate-500]:text-slate-700">

            {/* KHUNG 1: Header Trang Chi Tiết & Ảnh đại diện tác phẩm */}
            <Section
                title="Tổng quan bài hát"
                icon={Disc3}
                action={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {artistId ? (
                            <Link to={routePaths.artistDetail(artistId)} className="inline-flex h-10 items-center gap-2 border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                                <UserRound className="h-4 w-4" /> Chi tiết nghệ sĩ
                            </Link>
                        ) : null}
                        {!isDeleted && isApproved && (isActive || isHidden || isBlocked) ? (
                            <button type="button" onClick={() => openModerationModal(isBlocked ? "unblock" : "block")} disabled={isActionLoading} className={`inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold transition disabled:opacity-60 ${isBlocked ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-600 text-white hover:bg-rose-700"}`}>
                                <ShieldAlert className="h-4 w-4" />
                                {isActionLoading ? "Đang xử lý..." : isBlocked ? "Gỡ khóa bài hát" : "Khóa bài hát"}
                            </button>
                        ) : null}
                    </div>
                }
            >
                <button type="button" onClick={() => navigate(routePaths.systemTracks)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950">
                    <ArrowLeft className="h-4 w-4" /> Quay lại danh sách bài hát
                </button>
                <div className="mt-5 border-y border-slate-200 py-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5 min-w-0">
                        {track.avatar ? (
                            <img src={track.avatar} alt={track.title} className="w-16 h-16 object-cover border border-slate-100 rounded-xl shadow-inner" />
                        ) : (
                            <div className="w-20 h-20 bg-slate-950 flex items-center justify-center text-xs text-white font-bold uppercase">Chưa có ảnh</div>
                        )}
                        <div className="space-y-0.5">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Quản lý bài hát</p>
                            <h1 className="mt-1.5 text-2xl md:text-3xl font-semibold tracking-tight text-slate-950">{track.title}</h1>
                            <p className="mt-2 text-sm text-slate-600">
                                {artistId ? (
                                    <Link
                                        to={routePaths.artistDetail(artistId)}
                                        className="font-semibold text-sky-700 transition hover:text-sky-900 hover:underline"
                                    >
                                        {track.artist?.name || "Nghệ sĩ không xác định"}
                                    </Link>
                                ) : (
                                    track.artist?.name || "Nghệ sĩ không xác định"
                                )}
                                {track.artist?.email ? ` • ${track.artist.email}` : ""}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {isDeleted ? (
                            <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                                Nghệ sĩ đã xóa bài
                            </span>
                        ) : null}
                        <StatusBadge config={getTrackApprovalStatusBadge(reviewStatus)} />
                        <StatusBadge config={getTrackActiveStatusBadge(track.activeStatus)} />
                        {automaticDecisionBadge ? (
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${automaticDecisionBadge.className}`}>
                                {automaticDecisionBadge.label}
                            </span>
                        ) : null}
                    </div>
                </div>
            </Section>

            {isDeleted ? (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4 text-sm text-rose-900">
                    <p className="font-bold">Nghệ sĩ đã xóa bài</p>
                    <p className="mt-1">Track chỉ được mở để phục vụ audit. Các thao tác phê duyệt, kiểm duyệt và thay đổi hiển thị đều bị khóa.</p>
                    {track.deleteReason ? <p className="mt-2 text-xs">Lý do: {track.deleteReason}</p> : null}
                </div>
            ) : null}

            {track?.reviewSource === "pending_update" && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900">
                    <p className="font-semibold">Đây là bản chỉnh sửa của một bài hát đang phát hành.</p>
                    <p className="mt-1">
                        Người nghe hiện vẫn đang nghe phiên bản live cũ. Nếu admin duyệt, dữ liệu ở bản sửa này sẽ được áp dụng lên bài hát đang phát hành.
                    </p>
                    {track?.liveVersion ? (
                        <p className="mt-2 text-xs text-sky-800">
                            Phiên bản live hiện tại: <strong>{track.liveVersion.title || "Untitled track"}</strong>
                        </p>
                    ) : null}
                </div>
            )}

            <TrackEditReviewComparison track={track} />

            {/* KHUNG 2: Bảng Điều Khiển Kiểm Duyệt Tác Vụ (Bố cục nút bấm thanh lịch, hiện đại) */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Hệ thống tác vụ kiểm duyệt</h3>
                        <p className="text-sm text-slate-700">Phê duyệt bản phát hành và quản lý trạng thái khóa của bài hát.</p>
                    </div>

                    {/* HỆ THỐNG NÚT BẤM ĐIỀU HƯỚNG SANG MODAL XỬ LÝ (BO GÓC X-LARGE) */}
                    <div className="flex flex-wrap gap-2">
                        {!isDeleted && isPendingApproval && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => openModerationModal("approve")}
                                    disabled={!review || Boolean(reviewError)}
                                    title={!review ? "Cần khởi tạo phiên kiểm duyệt trước khi phê duyệt" : undefined}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {isPendingUpdateReview ? "Duyệt bản chỉnh sửa" : "Duyệt"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openModerationModal("reject")}
                                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition"
                                >
                                    {isPendingUpdateReview ? "Từ chối bản chỉnh sửa" : "Từ chối"}
                                </button>
                            </>
                        )}

                        {isRejected && (
                            <span className="inline-flex items-center rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">
                                Bài hát đã bị từ chối
                            </span>
                        )}
                    </div>
                </div>

                {/* Các khối trạng thái lưới mờ dịu mắt */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                    <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wide">Trạng thái phê duyệt</span>
                        <div>{getStatusBadge(reviewStatus)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wide">Trạng thái hiển thị</span>
                        <div>{getStatusBadge(track.activeStatus)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wide">Quản trị viên rà soát</span>
                        <span className="font-mono font-bold text-slate-700 truncate mt-0.5">{track.moderation?.reviewedBy?.email || "Chưa rà soát / Hệ thống tự động"}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wide">Quyết định tự động</span>
                        <div className="mt-1 flex min-w-0 flex-col gap-2">
                            <span className="font-semibold text-slate-700">
                                {automaticDecisionBadge?.label || "Chưa đánh giá"}
                            </span>
                            {automaticReasonLabels.length ? (
                                <div className="flex min-w-0 flex-wrap gap-1.5">
                                    {automaticReasonLabels.map((reason) => (
                                        <span
                                            key={reason}
                                            className="inline-flex max-w-full rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium leading-4 text-slate-600"
                                        >
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                {isPendingApproval && reviewError ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-bold">Phiên kiểm duyệt chưa sẵn sàng</p>
                            <p className="mt-1">{reviewError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void initializeReviewSession()}
                            className="shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-2 font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                            Thử khởi tạo lại
                        </button>
                    </div>
                ) : null}

                {isPendingApproval && reviewActionError ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-bold">Thao tác kiểm tra chưa hoàn tất</p>
                            <p className="mt-1">{reviewActionError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setReviewActionError("")}
                            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-800 transition hover:bg-amber-100"
                        >
                            Đóng thông báo
                        </button>
                    </div>
                ) : null}

                {isPendingApproval && review ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="font-bold uppercase tracking-wide text-indigo-800">Danh sách kiểm duyệt bắt buộc</p>
                                <p className="mt-1 text-indigo-700">Máy chủ sẽ kiểm tra lại toàn bộ mục này trước khi cho phép duyệt.</p>
                            </div>
                            <span className="font-semibold text-indigo-800">
                                {review.missing?.length ? `Còn thiếu ${review.missing.length} mục` : "Đã đủ điều kiện"}
                            </span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                ["trackOpened", "Đã mở hồ sơ"],
                                ["metadataChecked", "Đã kiểm tra siêu dữ liệu"],
                                ["copyrightViewed", "Đã xem bản quyền"],
                                ["audioReviewed", `Đã nghe âm thanh, không phải xác minh bản quyền (${Math.floor(review.checklist?.audioListenedSeconds || 0)}/${review.checklist?.minimumAudioSeconds || 15} giây)`],
                                ["fingerprintViewed", "Đã xem dấu vân tay âm thanh"],
                                ["acoustIdViewed", "Đã xem kết quả AcoustID"],
                                ["acoustIdReady", "Đã có kết quả AcoustID"],
                                ["musicBrainzViewed", "Đã xem kết quả MusicBrainz"],
                                ["musicBrainzReady", "Đã có kết quả MusicBrainz"],
                                ["evidenceReviewed", "Đã mở đủ tài liệu"],
                                ["lyricsReviewed", "Đã xem lời bài hát"],
                                ["lrcReviewed", "Đã xem lời đồng bộ LRC"],
                                ["finalConfirmed", "Đã xác nhận lần cuối"],
                            ].map(([key, label]) => (
                                <span key={key} className={`rounded-lg border px-3 py-2 font-semibold ${review.checklist?.[key] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                                    {review.checklist?.[key] ? "✓" : "○"} {label}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Nhật ký cờ vi phạm (Violation Flags) */}
                {track.moderation?.violationFlags?.length > 0 && (
                    <div className="border border-rose-100 bg-rose-50/50 p-4 text-xs space-y-2 rounded-xl">
                        <span className="text-rose-700 font-bold text-[10px] uppercase tracking-wide block">{track.moderation?.automatic?.decision === "enforcement_block" ? "Vi phạm được ghi nhận:" : "Vấn đề được ghi nhận:"}</span>
                        <div className="flex flex-wrap gap-1.5">
                            {track.moderation.violationFlags.map((flag, idx) => (
                                <span key={idx} className="bg-rose-100 text-rose-700 text-[10px] font-semibold border border-rose-200 rounded-lg px-2.5 py-0.5 capitalize">{flag.replace(/_/g, " ")}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Nhật ký phản hồi từ Admin */}
                {track.rejectReason && (
                    <div className="bg-rose-50/40 border border-rose-100 p-4 text-xs font-medium text-rose-700 rounded-xl leading-relaxed">
                        <strong className="block uppercase text-[10px] tracking-wide mb-1 text-rose-800">Lý do từ chối:</strong> {track.rejectReason}
                    </div>
                )}
                {track.hiddenReason && (
                    <div className="bg-orange-50/40 border border-orange-100 p-4 text-xs font-medium text-orange-700 rounded-xl leading-relaxed">
                        <strong className="block uppercase text-[10px] tracking-wide mb-1 text-orange-800">Lý do tạm ẩn:</strong> {track.hiddenReason}
                    </div>
                )}
                {track.blockedReason && (
                    <div className="bg-red-50/40 border border-red-100 p-4 text-xs font-medium text-red-700 rounded-xl leading-relaxed">
                        <strong className="block uppercase text-[10px] tracking-wide mb-1 text-red-800">Lý do khóa bài hát:</strong> {track.blockedReason}
                    </div>
                )}
            </div>

            {/* KHUNG 3: Chi tiết siêu dữ liệu kỹ thuật và bản quyền pháp lý */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-8">

                {/* 1. Tổng quan kỹ thuật */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Thông số kỹ thuật & Hiệu năng</h3>
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <div className="bg-slate-50/60 border border-slate-100 p-4 space-y-1 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Mã Tác Phẩm (ID)</span>
                            <span className="text-xs font-mono text-slate-800 font-bold break-all block">{track.id}</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-4 space-y-1 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Thời lượng</span>
                            <span className="text-base font-bold text-slate-900 block">{formatDuration(track.duration)}</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-4 space-y-1 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Tổng lượt nghe</span>
                            <span className="text-base font-bold text-slate-900 block">{(track.stats?.totalPlay || 0).toLocaleString("vi-VN")} lượt</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-4 space-y-1 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Lượt yêu thích</span>
                            <span className="text-base font-bold text-slate-900 block">{(track.stats?.totalLike || 0).toLocaleString("vi-VN")} lượt</span>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                        <div className="bg-slate-50/60 border border-slate-100 p-4 space-y-1 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Thuộc Album</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.album?.title || "Đĩa đơn"}</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-4 space-y-1 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Phân mục thể loại</span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {track.genres?.length > 0 ? track.genres.map(g => (
                                    <span key={g.id} className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">{g.name}</span>
                                )) : <span className="text-xs text-slate-400 font-mono">—</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. File âm thanh mã hóa chất lượng */}
                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Các phiên bản âm thanh trên máy chủ</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {track.audioFiles?.length > 0 ? track.audioFiles.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50/60 border border-slate-100 p-4 text-xs font-bold rounded-xl">
                                <div className="space-y-1">
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Phiên bản {file.label || idx + 1}</span>
                                    {idx === 0 ? (
                                        <audio
                                            ref={audioRef}
                                            src={file.url}
                                            controls
                                            preload="metadata"
                                            onPlay={handleAudioPlay}
                                            onTimeUpdate={handleAudioTimeUpdate}
                                            onEnded={handleAudioEnded}
                                            className="mt-2 h-9 max-w-full"
                                        />
                                    ) : null}
                                    <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline break-all">🔗 Mở tệp âm thanh</a>
                                </div>
                                <span className="bg-white border px-3 py-1 font-mono text-[11px] text-slate-600 font-bold rounded-lg shadow-sm">{file.bitrate} kbps ({file.format})</span>
                            </div>
                        )) : <p className="text-xs text-slate-400 italic">Hệ thống chưa mã hóa tệp âm thanh này.</p>}
                    </div>
                </div>

                {/* 2b. Kết quả sàng lọc dấu vân tay âm thanh */}
                <div className="border-t border-slate-100 pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dấu vân tay âm thanh và sàng lọc nội bộ</h3>
                            <p className="mt-1 text-[11px] text-slate-500">Chromaprint phân tích nội dung âm thanh và so với các bài đã duyệt hoặc đang chờ duyệt trong hệ thống.</p>
                        </div>
                        {isPendingApproval ? (
                            <button
                                type="button"
                                onClick={() => void handleManualReviewEvent("OPEN_FINGERPRINT_RESULT")}
                                disabled={!review || reviewEventLoading === "OPEN_FINGERPRINT_RESULT" || Boolean(review?.checklist?.fingerprintViewed)}
                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700 disabled:opacity-80"
                            >
                                {reviewEventLoading === "OPEN_FINGERPRINT_RESULT"
                                    ? "Đang đánh dấu..."
                                    : review?.checklist?.fingerprintViewed
                                        ? "✓ Đã xem kết quả"
                                        : "Đánh dấu đã xem kết quả"}
                            </button>
                        ) : null}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Bộ máy nhận dạng</span>
                            <span className="mt-1 block font-semibold text-slate-800">
                                Chromaprint · {translateStatus(FINGERPRINT_STATUS_LABELS, track.fingerprint?.status, "Chưa bắt đầu")}
                            </span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Kết quả sàng lọc</span>
                            <span className="mt-1 block font-semibold text-slate-800">
                                {translateStatus(FINGERPRINT_SCREENING_STATUS_LABELS, track.fingerprintScreening?.status, "Chưa có kết quả")}
                            </span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Mức rủi ro nội bộ</span>
                            <span className="mt-1 block font-semibold text-slate-800">
                                {translateStatus(FINGERPRINT_RISK_LABELS, track.fingerprintScreening?.riskLevel, "Chưa xác định")}
                            </span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Tương đồng cao nhất với bài đã duyệt</span>
                            <span className="mt-1 block font-semibold text-slate-800">
                                {formatSimilarityPercent(
                                    track.fingerprint?.comparison?.highestActiveCandidateSimilarity
                                    ?? track.fingerprintScreening?.highestSimilarity
                                )}
                            </span>
                            <span className="mt-1 block text-[10px] text-slate-500">
                                {translateStatus(
                                    FINGERPRINT_CLASSIFICATION_LABELS,
                                    track.fingerprint?.comparison?.highestActiveCandidateClassification,
                                    "Chưa có ứng viên"
                                )}
                            </span>
                            {track.fingerprint?.comparison?.highestActiveCandidate?.title ? (
                                <span className="mt-1 block text-[10px] text-slate-500">
                                    <span>Cao nhất với </span>
                                    {track.fingerprint.comparison.highestActiveCandidate.id ? (
                                        <Link
                                            to={routePaths.trackDetail(track.fingerprint.comparison.highestActiveCandidate.id)}
                                            className="font-semibold text-sky-700 transition hover:text-sky-900 hover:underline"
                                        >
                                            {`${track.fingerprint.comparison.highestActiveCandidate.title}${
                                                track.fingerprint.comparison.highestActiveCandidate.versionTitle
                                                    ? ` - ${track.fingerprint.comparison.highestActiveCandidate.versionTitle}`
                                                    : ""
                                            }`}
                                        </Link>
                                    ) : (
                                        <span>
                                            {`${track.fingerprint.comparison.highestActiveCandidate.title}${
                                                track.fingerprint.comparison.highestActiveCandidate.versionTitle
                                                    ? ` - ${track.fingerprint.comparison.highestActiveCandidate.versionTitle}`
                                                    : ""
                                            }`}
                                        </span>
                                    )}
                                    {track.fingerprint.comparison.highestActiveCandidate.artist?.name ? (
                                        <span>{` • ${track.fingerprint.comparison.highestActiveCandidate.artist.name}`}</span>
                                    ) : null}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Phạm vi đối chiếu</span>
                            <span className="mt-1 block font-semibold text-slate-800">Kho dấu vân tay âm thanh nội bộ</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Ứng viên bài đã duyệt</span>
                            <span className="mt-1 block font-semibold text-slate-800">{Number(track.fingerprint?.comparison?.comparedCandidateCount || 0).toLocaleString("vi-VN")} bản ghi</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Tương đồng cao nhất với bài đang chờ duyệt</span>
                            <span className="mt-1 block font-semibold text-slate-800">
                                {formatSimilarityPercent(track.fingerprint?.comparison?.highestPendingCandidateSimilarity)}
                            </span>
                            <span className="mt-1 block font-semibold text-slate-800">
                                {translateStatus(
                                    FINGERPRINT_CLASSIFICATION_LABELS,
                                    track.fingerprint?.comparison?.highestPendingCandidateClassification,
                                    "Chưa có ứng viên"
                                )}
                            </span>
                            <span className="mt-1 block text-[10px] text-slate-500">
                                {Number(track.fingerprint?.comparison?.pendingCandidateCount || 0).toLocaleString("vi-VN")} ứng viên đang chờ duyệt
                            </span>
                            {track.fingerprint?.comparison?.highestPendingCandidate?.title ? (
                                <span className="mt-1 block text-[10px] text-slate-500">
                                    <span>Cao nhất với </span>
                                    {track.fingerprint.comparison.highestPendingCandidate.id ? (
                                        <Link
                                            to={routePaths.trackDetail(track.fingerprint.comparison.highestPendingCandidate.id)}
                                            className="font-semibold text-sky-700 transition hover:text-sky-900 hover:underline"
                                        >
                                            {`${track.fingerprint.comparison.highestPendingCandidate.title}${
                                                track.fingerprint.comparison.highestPendingCandidate.versionTitle
                                                    ? ` - ${track.fingerprint.comparison.highestPendingCandidate.versionTitle}`
                                                    : ""
                                            }`}
                                        </Link>
                                    ) : (
                                        <span>
                                            {`${track.fingerprint.comparison.highestPendingCandidate.title}${
                                                track.fingerprint.comparison.highestPendingCandidate.versionTitle
                                                    ? ` - ${track.fingerprint.comparison.highestPendingCandidate.versionTitle}`
                                                    : ""
                                            }`}
                                        </span>
                                    )}
                                    {track.fingerprint.comparison.highestPendingCandidate.artist?.name ? (
                                        <span>{` • ${track.fingerprint.comparison.highestPendingCandidate.artist.name}`}</span>
                                    ) : null}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    {Number(track.fingerprint?.comparison?.activeExactFileMatchCount || 0) > 0 ? (
                        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-relaxed text-rose-900">
                            <span className="font-bold">Trùng bản ghi âm hoàn toàn:</span> Tìm thấy {Number(track.fingerprint.comparison.activeExactFileMatchCount).toLocaleString("vi-VN")} bài đã được duyệt. Khi nghệ sĩ gửi duyệt, hệ thống có thể tự động từ chối nếu không có bằng chứng quyền sử dụng hợp lệ.
                        </div>
                    ) : null}
                    {Number(track.fingerprint?.comparison?.pendingExactFileMatchCount || 0) > 0 ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
                            <span className="font-bold">Trùng với bài đang chờ duyệt:</span> Tìm thấy {Number(track.fingerprint.comparison.pendingExactFileMatchCount).toLocaleString("vi-VN")} bản ghi âm trùng hoàn toàn. Tình huống này cần Admin kiểm tra thứ tự gửi và quyền sở hữu thủ công.
                        </div>
                    ) : null}
                    {Number(track.fingerprint?.comparison?.historicalExactFileMatchCount || 0) > 0 ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
                            <span className="font-bold">Đối chiếu dữ liệu lịch sử:</span> Tìm thấy {Number(track.fingerprint.comparison.historicalExactFileMatchCount).toLocaleString("vi-VN")} tệp âm thanh trùng hoàn toàn với một bài đã xóa. Thông tin này không tự động chặn bài hiện tại và chỉ cần quản trị viên kiểm tra thêm.
                        </div>
                    ) : null}
                    <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/70 p-4 text-xs leading-relaxed text-sky-900">
                        <span className="font-bold">Phạm vi kết quả:</span> Khối này chỉ đối chiếu kho nội bộ. Kết quả nhận dạng âm thanh AcoustID được trình bày riêng bên dưới và không thay thế bước xác minh quyền sở hữu.
                    </div>
                </div>

                {/* 2c. AcoustID nhận dạng âm thanh từ Chromaprint hiện có */}
                <div className="border-t border-slate-100 pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Đối chiếu âm thanh AcoustID</h3>
                            <p className="mt-1 text-[11px] text-slate-500">Dùng dấu vân tay Chromaprint hiện có để nhận diện bản ghi; không tải hoặc gửi tệp âm thanh.</p>
                        </div>
                        {isPendingApproval ? (
                            <button
                                type="button"
                                onClick={() => void handleManualReviewEvent("OPEN_ACOUSTID_RESULT")}
                                disabled={!review || reviewEventLoading === "OPEN_ACOUSTID_RESULT"}
                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {reviewEventLoading === "OPEN_ACOUSTID_RESULT"
                                    ? "Đang đối chiếu..."
                                    : acoustIdResult?.status === "failed"
                                        ? "Thử lại lookup"
                                        : review?.checklist?.acoustIdViewed
                                            ? "Xem lại kết quả"
                                            : "Đối chiếu và đánh dấu đã xem"}
                            </button>
                        ) : null}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Trạng thái</span>
                            <span className="mt-1 block font-semibold text-slate-800">{translateStatus(ACOUSTID_STATUS_LABELS, acoustIdResult?.status, "Đang chờ đối chiếu")}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Điểm nhận dạng</span>
                            <span className="mt-1 block font-semibold text-slate-800">
                                {["matched", "possible_match"].includes(acoustIdResult?.status)
                                    ? `${Math.round(Number(acoustIdResult?.score || 0) * 100)}%`
                                    : "—"}
                            </span>
                            {acoustIdResult?.status === "not_found" ? (
                                <span className="mt-1 block text-[10px] text-slate-500">Không có kết quả để chấm điểm</span>
                            ) : null}
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Bản ghi nhận diện</span>
                            <span className="mt-1 block font-semibold text-slate-800">{acoustIdResult?.match?.title || "—"}</span>
                            <span className="mt-1 block text-[10px] text-slate-500">{acoustIdResult?.match?.artists?.join(", ") || "Chưa có nghệ sĩ"}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">MusicBrainz Recording ID</span>
                            <span className="mt-1 block break-all font-mono text-[11px] font-semibold text-slate-800">{acoustIdResult?.match?.mbid || acoustIdResult?.musicBrainzRecordingIds?.[0] || "—"}</span>
                        </div>
                    </div>
                    {acoustIdResult ? (
                        <div className={`mt-3 rounded-xl border p-4 text-xs leading-relaxed ${acoustIdResult?.decision === "blocked"
                            ? "border-rose-200 bg-rose-50 text-rose-900"
                            : acoustIdResult?.status === "failed" || acoustIdResult?.decision === "review_required"
                                ? "border-amber-200 bg-amber-50 text-amber-900"
                                : "border-sky-100 bg-sky-50/70 text-sky-900"
                            }`}>
                            <p><span className="font-bold">Kết quả:</span> {acoustIdReasonText || "Chưa có cảnh báo bổ sung."}</p>
                            <p className="mt-1"><span className="font-bold">Đề xuất:</span> {getAcoustIdSuggestedAction(acoustIdResult)}</p>
                            {acoustIdResult?.error ? <p className="mt-1"><span className="font-bold">Lỗi đã rút gọn:</span> {String(acoustIdResult.error)}</p> : null}
                        </div>
                    ) : null}
                </div>

                {/* 2d. MusicBrainz chỉ là tham chiếu siêu dữ liệu */}
                <div className="border-t border-slate-100 pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Đối chiếu siêu dữ liệu MusicBrainz</h3>
                            <p className="mt-1 text-[11px] text-slate-500">Chỉ so tên bài, nghệ sĩ, mã định danh và thời lượng; không nghe hoặc so sánh tệp âm thanh.</p>
                        </div>
                        {isPendingApproval ? (
                            <button
                                type="button"
                                onClick={() => void handleManualReviewEvent("OPEN_MUSICBRAINZ_RESULT")}
                                disabled={
                                    !review ||
                                    reviewEventLoading === "OPEN_MUSICBRAINZ_RESULT"
                                }
                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700 disabled:opacity-80"
                            >
                                {reviewEventLoading === "OPEN_MUSICBRAINZ_RESULT"
                                    ? "Đang đối chiếu..."
                                    : review?.checklist?.musicBrainzViewed && review?.checklist?.musicBrainzReady
                                        ? "Đối chiếu lại"
                                        : review?.checklist?.musicBrainzReady
                                            ? "Đánh dấu đã xem kết quả"
                                            : "Đối chiếu lại và đánh dấu"}
                            </button>
                        ) : null}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Trạng thái</span>
                            <span className="mt-1 block font-semibold text-slate-800">
                                {translateStatus(MUSICBRAINZ_STATUS_LABELS, musicBrainzResult?.status, "Đang chờ đối chiếu")}
                            </span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Mức tương đồng metadata</span>
                            <span className="mt-1 block font-semibold text-slate-800">{formatSimilarityPercent(musicBrainzResult?.metadataSimilarity ?? musicBrainzResult?.confidence)}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Mức rủi ro</span>
                            <span className="mt-1 block font-semibold text-slate-800">{MUSICBRAINZ_RISK_LABELS[musicBrainzResult?.riskLevel || "none"] || "Chưa đánh giá"}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Mã bản ghi MusicBrainz</span>
                            <span className="mt-1 block break-all font-mono text-[11px] font-semibold text-slate-800">{musicBrainzResult?.recording?.mbid || "—"}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Mã tác phẩm MusicBrainz</span>
                            <span className="mt-1 block break-all font-mono text-[11px] font-semibold text-slate-800">{musicBrainzResult?.work?.mbid || "—"}</span>
                        </div>
                    </div>
                    {musicBrainzNotice ? (
                        <div className={`mt-3 rounded-xl border p-4 text-xs leading-relaxed ${musicBrainzNotice.level === "error"
                            ? "border-rose-200 bg-rose-50 text-rose-900"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                            }`}>
                            <span className="font-bold">{musicBrainzNotice.title}:</span> {musicBrainzNotice.message}
                        </div>
                    ) : null}
                </div>

                {/* 3. Bản quyền tác giả nâng cao */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Xác minh hồ sơ sở hữu trí tuệ & Bản quyền</h3>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs font-bold">
                        <div className="p-4 bg-slate-50/60 border border-slate-100 space-y-1 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Nhạc sĩ / Người sáng tác</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.copyright?.composer || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50/60 border border-slate-100 space-y-1 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Người viết lời</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.copyright?.lyricist || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50/60 border border-slate-100 space-y-1 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Nhà sản xuất</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.copyright?.producer || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50/60 border border-slate-100 space-y-1 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Chủ sở hữu bản quyền</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.copyright?.copyrightOwner || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50/60 border border-slate-100 space-y-1 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Chủ sở hữu bản ghi âm</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.copyright?.recordingOwner || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50/60 border border-slate-100 flex flex-wrap gap-1.5 items-center rounded-xl">
                            <span className="px-2 py-0.5 border font-bold text-[9px] uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border-emerald-200">
                                {COPYRIGHT_TYPE_LABELS[getPrimaryCopyrightType(track.copyright)] || "Tác phẩm gốc"}
                            </span>
                            {track.copyright?.usesSample && getPrimaryCopyrightType(track.copyright) !== "sample" ? (
                                <span className="px-2 py-0.5 border font-bold text-[9px] uppercase tracking-wider rounded-md bg-amber-50 text-amber-700 border-amber-200">Sample</span>
                            ) : null}
                            {(track.copyright?.usesThirdPartyBeat || track.copyright?.usesLicensedBeat) ? (
                                <span className="px-2 py-0.5 border font-bold text-[9px] uppercase tracking-wider rounded-md bg-sky-50 text-sky-700 border-sky-200">Licensed beat</span>
                            ) : null}
                        </div>
                    </div>

                    {/* Dữ liệu nguồn gốc bài hát */}
                    {(track.copyright?.originalTrackTitle || track.copyright?.originalArtistName) && (
                        <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-xl text-xs font-semibold grid sm:grid-cols-2 gap-2">
                            <div><span className="text-slate-400 uppercase text-[10px] font-bold mr-1">Tác phẩm gốc:</span> <span className="text-slate-900 font-bold">{track.copyright?.originalTrackTitle || "—"}</span></div>
                            <div><span className="text-slate-400 uppercase text-[10px] font-bold mr-1">Nghệ sĩ gốc:</span> <span className="text-slate-900 font-bold">{track.copyright?.originalArtistName || "—"}</span></div>
                        </div>
                    )}

                    {(track.copyright?.usesSample || track.copyright?.usesThirdPartyBeat || track.copyright?.usesLicensedBeat) && (
                        <div className="grid gap-3 sm:grid-cols-2 text-xs">
                            {track.copyright?.usesSample ? (
                                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                                    <p className="font-bold uppercase tracking-wide text-[10px] text-amber-700">Sample</p>
                                    <p className="mt-1"><strong>Nguồn:</strong> {track.copyright.sampleSourceTitle || "—"}</p>
                                    <p><strong>Nghệ sĩ:</strong> {track.copyright.sampleSourceArtist || "—"}</p>
                                    <p><strong>ISRC:</strong> {track.copyright.sampleSourceISRC || "—"}</p>
                                </div>
                            ) : null}
                            {(track.copyright?.usesThirdPartyBeat || track.copyright?.usesLicensedBeat) ? (
                                <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                                    <p className="font-bold uppercase tracking-wide text-[10px] text-sky-700">Third-party beat</p>
                                    <p className="mt-1"><strong>Beat:</strong> {track.copyright.beatTitle || "—"}</p>
                                    <p><strong>Producer:</strong> {track.copyright.beatProducer || "—"}</p>
                                    <p><strong>License:</strong> {track.copyright.licenseType || "—"}</p>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Chứng từ tài liệu pháp lý đính kèm */}
                    <div className="border border-slate-100 bg-slate-50/60 p-4 text-xs font-medium space-y-2 rounded-xl">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wide">Tài liệu bản quyền / bằng chứng đã cung cấp</span>
                        {(track.copyright?.licenseDocumentUrls?.length > 0 || track.copyright?.copyrightEvidenceDocuments?.length > 0) ? (
                            <div className="flex flex-col gap-1.5">
                                {track.copyright.licenseDocumentUrls?.map((doc, i) => (
                                    <a key={`url-${i}`} href={doc} target="_blank" rel="noreferrer" onClick={() => void recordReviewEvent({ type: "OPEN_LICENSE_DOCUMENT", resourceId: doc })} className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">📄 Mở liên kết tài liệu #{i + 1}</a>
                                ))}
                                {track.copyright.copyrightEvidenceDocuments?.map((document) => (
                                    <a key={document.documentId} href={document.storageUrl} target="_blank" rel="noreferrer" onClick={() => void recordReviewEvent({ type: "OPEN_LICENSE_DOCUMENT", resourceId: document.documentId })} className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">
                                        📄 Mở {document.originalName || "tài liệu đã tải lên"} <span className="text-slate-400">({document.uploadStatus})</span>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                                Chưa có tài liệu bản quyền hợp lệ. Bài hát không đủ điều kiện phê duyệt; yêu cầu nghệ sĩ tải bằng chứng và gửi duyệt lại.
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-xl flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400 uppercase text-[10px] tracking-wide">Trạng thái rà soát bản quyền</span>
                        <div>{getStatusBadge(track.copyright?.copyrightStatus)}</div>
                    </div>
                </div>

                {/* 4. Lời bài hát (Static & Synced) */}
                <div className="border-t border-slate-100 pt-6 grid gap-6 md:grid-cols-2">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Lời bài hát (Static Plain Lyrics)</h3>
                        <div className="border border-slate-200 bg-slate-50/30 p-4 h-48 overflow-y-auto font-mono text-xs leading-relaxed text-slate-600 rounded-xl whitespace-pre-line">
                            {track.lyricsStatic || "Nghệ sĩ không cung cấp văn bản lời bài hát tĩnh cho bản ghi này."}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Lời bài hát đồng bộ theo thời gian (LRC)</h3>
                        <div className="border border-slate-200 bg-slate-50/30 p-4 h-48 flex flex-col justify-center items-center text-center rounded-xl">
                            {track.lyricsSyncUrl ? (
                                <div className="space-y-2">
                                    <span className="text-emerald-600 text-lg font-bold block">✓ CẤU TRÚC ĐỒNG BỘ ĐÃ KHỚP</span>
                                    <p className="text-[11px] text-slate-400 max-w-[280px]">Hồ sơ tệp tin thời gian LRC đã được đồng bộ hóa thành công trên máy chủ âm nhạc.</p>
                                    <a href={track.lyricsSyncUrl} target="_blank" rel="noreferrer" className="inline-block text-[11px] font-semibold bg-white border border-slate-200 shadow-sm px-4 py-2 hover:bg-slate-50 transition rounded-xl">Tải xuống tệp LRC</a>
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400 italic font-mono">Tác phẩm này chưa cấu hình lời chạy theo thời gian (LRC).</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* HỆ THỐNG CÁC MODAL XỬ LÝ KIỂM DUYỆT (THIẾT KẾ KHỐI SAAS BO TRÒN HIỆN ĐẠI) */}
            {modalType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl bg-white p-6 shadow-2xl rounded-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kiểm duyệt ấn phẩm hệ thống</p>
                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    {modalType === "approve"
                                        ? isPendingUpdateReview
                                            ? "Phê duyệt bản chỉnh sửa"
                                            : "Phê duyệt phát hành tác phẩm"
                                        : modalType === "reject"
                                            ? isPendingUpdateReview
                                                ? "Từ chối bản chỉnh sửa"
                                                : "Từ chối hồ sơ & Gắn cờ vi phạm"
                                            :
                                            modalType === "unblock" ? "Gỡ khóa bài hát" :
                                                modalType === "hide" ? "Tạm ẩn tác phẩm khỏi nền tảng" :
                                                    "Khóa bài hát"}
                                </h2>
                            </div>
                            <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-lg font-bold transition">✕</button>
                        </div>

                        {/* Thẻ bọc tóm tắt bài nhạc */}
                        <div className="bg-slate-50 border border-slate-100 p-4 text-xs font-semibold rounded-xl text-slate-600">
                            Tác phẩm: <span className="text-slate-900 font-bold">{track.title}</span>
                            <span className="block text-[10px] text-slate-400 mt-1 uppercase">
                                Nghệ sĩ:{" "}
                                {artistId ? (
                                    <Link
                                        to={routePaths.artistDetail(artistId)}
                                        className="font-bold text-sky-700 hover:underline"
                                    >
                                        {track.artist?.name || "Nghệ sĩ không xác định"}
                                    </Link>
                                ) : (
                                    track.artist?.name || "Nghệ sĩ không xác định"
                                )}
                            </span>
                            {isPendingUpdateReview ? (
                                <span className="mt-2 block text-sky-700">
                                    Xác nhận này áp dụng cho {track.pendingUpdate?.changedFields?.length || 0} trường thay đổi; bản live chỉ được cập nhật khi admin duyệt.
                                </span>
                            ) : null}
                        </div>

                        <div className="space-y-4">
                            {modalType === "approve" &&
                                (review?.checklist?.mediumRisk || review?.checklist?.highRisk) ? (
                                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                                    <label className="text-xs font-semibold text-amber-900">
                                        {review?.checklist?.highRisk
                                            ? "Căn cứ override fingerprint mức HIGH *"
                                            : "Lý do xử lý cảnh báo fingerprint mức MEDIUM *"}
                                    </label>

                                    <textarea
                                        value={fingerprintOverrideReason}
                                        onChange={(event) =>
                                            setFingerprintOverrideReason(event.target.value)
                                        }
                                        rows={3}
                                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                                        placeholder={
                                            review?.checklist?.highRisk
                                                ? "Nêu rõ bằng chứng đã kiểm tra, quyền sử dụng/license và lý do vẫn cho phép duyệt..."
                                                : "Nêu căn cứ kiểm tra thủ công và lý do vẫn cho phép duyệt..."
                                        }
                                    />

                                    {review?.checklist?.highRisk ? (
                                        <p className="text-[11px] leading-5 text-amber-800">
                                            Phát hiện này chỉ thể hiện audio trùng hoặc tương đồng cao.
                                            Không được kết luận quyền sở hữu chỉ dựa vào thời điểm upload.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            {modalType === "approve" && acoustIdNeedsOverride ? (
                                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                                    <label className="flex items-start gap-2 font-semibold">
                                        <input
                                            type="checkbox"
                                            checked={acoustIdOverrideChecked}
                                            onChange={(event) => setAcoustIdOverrideChecked(event.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600"
                                        />
                                        <span>Tôi xác nhận override kết quả AcoustID sau khi đã kiểm tra thủ công.</span>
                                    </label>
                                    <textarea
                                        value={acoustIdOverrideReason}
                                        onChange={(event) => setAcoustIdOverrideReason(event.target.value)}
                                        rows={2}
                                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                                        placeholder="Nhập căn cứ xác minh và lý do override..."
                                    />
                                </div>
                            ) : null}

                            {/* KHỐI CHỌN CỜ LÝ DO KHI REJECT / BLOCK */}
                            {(modalType === "reject" || modalType === "block") && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                        Danh mục cờ vi phạm rà soát
                                        {modalType === "reject" && isPendingUpdateReview ? " (Tùy chọn)" : ""}
                                    </label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {VIOLATION_OPTIONS.map((flag) => {
                                            const isChecked = violationFlags.includes(flag.value);
                                            return (
                                                <button
                                                    key={flag.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setViolationFlags((prev) =>
                                                            prev.includes(flag.value) ? prev.filter((f) => f !== flag.value) : [...prev, flag.value]
                                                        );
                                                    }}
                                                    className={`flex items-center text-left gap-3 p-3 rounded-xl border text-xs font-medium transition ${isChecked ? "bg-rose-50 border-rose-400 text-rose-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${isChecked ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-300"}`}>
                                                        {isChecked && "✓"}
                                                    </div>
                                                    {flag.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* KHỐI CHỌN CỜ LÝ DO KHI HIDE */}
                            {modalType === "hide" && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">Danh mục cờ lý do tạm ẩn</label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {HIDE_REASON_OPTIONS.map((reason) => {
                                            const isChecked = hideReasons.includes(reason.value);
                                            return (
                                                <button
                                                    key={reason.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setHideReasons((prev) =>
                                                            prev.includes(reason.value) ? prev.filter((r) => r !== reason.value) : [...prev, reason.value]
                                                        );
                                                    }}
                                                    className={`flex items-center text-left gap-3 p-3 rounded-xl border text-xs font-medium transition ${isChecked ? "bg-orange-50 border-orange-400 text-orange-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${isChecked ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-slate-300"}`}>
                                                        {isChecked && "✓"}
                                                    </div>
                                                    {reason.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Ô nhập giải trình văn bản chi tiết */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500">
                                    {modalType === "approve" && acoustIdNeedsManualReason
                                        ? "Căn cứ kiểm tra audio/bản quyền thủ công (Bắt buộc, tối thiểu 10 ký tự)"
                                        : modalType === "approve" || modalType === "unblock"
                                            ? "Nội dung ghi chú kèm theo (Tùy chọn)"
                                            : "Nội dung giải trình chi tiết hành động (Bắt buộc)"}
                                </label>
                                <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    rows={3}
                                    className="w-full border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition rounded-xl leading-relaxed"
                                    placeholder={
                                        modalType === "reject"
                                            ? isPendingUpdateReview
                                                ? "Nêu rõ trường nào chưa phù hợp để artist chỉnh sửa và gửi lại..."
                                                : "Cung cấp giải thích chi tiết về vi phạm để phản hồi cho creator..."
                                            :
                                            modalType === "hide" ? "Cung cấp giải thích cụ thể lý do tạm ẩn hành chính..." :
                                                modalType === "block" ? "Cung cấp căn cứ chi tiết để ban/gỡ bỏ vĩnh viễn..." :
                                                    acoustIdNeedsManualReason ? "Nêu cách đã kiểm tra bản ghi, quyền sử dụng hoặc tài liệu bản quyền..." : "Nhập nội dung ghi chú lưu vết hệ thống..."
                                    }
                                    required={!["approve", "unblock"].includes(modalType)}
                                />
                                {modalType === "approve" && acoustIdNeedsManualReason ? (
                                    <p className={`text-[11px] font-semibold ${adminNote.trim().length >= 10 ? "text-emerald-600" : "text-amber-700"}`}>
                                        {adminNote.trim().length}/10 ký tự tối thiểu
                                    </p>
                                ) : null}
                            </div>

                            {modalType === "approve" ? (
                                <label className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-xs text-indigo-900">
                                    <input
                                        type="checkbox"
                                        checked={finalConfirmationChecked}
                                        disabled={!review || Boolean(reviewError)}
                                        onChange={async (event) => {
                                            const checked = event.target.checked;
                                            if (!checked) {
                                                setFinalConfirmationChecked(false);
                                                return;
                                            }
                                            const confirmedReview = await recordReviewEvent({ type: "FINAL_CONFIRMATION" });
                                            setFinalConfirmationChecked(Boolean(confirmedReview));
                                        }}
                                        className="mt-0.5 h-4 w-4 rounded border-indigo-300 text-indigo-600"
                                    />
                                    <span>Tôi đã kiểm tra âm thanh, AcoustID, siêu dữ liệu, thông tin bản quyền, dấu vân tay nội bộ và toàn bộ tài liệu bắt buộc của phiên bản hiện tại.</span>
                                </label>
                            ) : null}

                            {modalType === "approve" && approvalBlockingMessages.length > 0 ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
                                    <p className="font-bold">Chưa thể duyệt:</p>
                                    <ul className="mt-1 list-disc space-y-1 pl-4">
                                        {approvalBlockingMessages.map((message) => <li key={message}>{message}</li>)}
                                    </ul>
                                </div>
                            ) : null}
                        </div>

                        {/* Thanh hành động chân Modal */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition">
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAction}
                                disabled={
                                    isActionLoading ||
                                    (modalType === "approve" && approvalBlockingMessages.length > 0) ||
                                    (modalType === "reject" && (
                                        !adminNote.trim() ||
                                        (!isPendingUpdateReview && violationFlags.length === 0)
                                    )) ||
                                    (modalType === "hide" && (!adminNote.trim() || hideReasons.length === 0)) ||
                                    (modalType === "block" && !adminNote.trim())
                                }
                                className={`px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition disabled:opacity-40 ${modalType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" :
                                    modalType === "reject" ? "bg-rose-600 hover:bg-rose-700" :
                                        modalType === "hide" ? "bg-orange-600 hover:bg-orange-700" :
                                            modalType === "unblock" ? "bg-emerald-600 hover:bg-emerald-700" :
                                                "bg-red-600 hover:bg-red-700"
                                    }`}
                            >
                                {isActionLoading ? "Đang xử lý..." : "Xác nhận thực thi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default TrackDetailPage;
