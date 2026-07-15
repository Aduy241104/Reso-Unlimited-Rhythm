import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
    getAdminTrackDetailService,
    updateAdminTrackApprovalStatusService,
    updateAdminTrackVisibilityService
} from "../../services/trackService";

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
    if (typeof seconds !== "number" || Number.isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

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
    const [modalType, setModalType] = useState(null); // 'approve' | 'reject' | 'hide' | 'unhide' | 'block'
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [adminNote, setAdminNote] = useState("");
    const [violationFlags, setViolationFlags] = useState([]);
    const [hideReasons, setHideReasons] = useState([]);

    const fetchTrackDetail = async () => {
        setIsLoading(true);
        try {
            const data = await getAdminTrackDetailService(id);
            setTrack(data);
        } catch (err) {
            setError("Không thể tải đầy đủ thông tin bài hát.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchTrackDetail();
    }, [id]);

    const closeModal = () => {
        setModalType(null);
        setAdminNote("");
        setViolationFlags([]);
        setHideReasons([]);
    };

    const handleConfirmAction = async () => {
        if (!modalType || !id) return;
        setIsActionLoading(true);

        try {
            if (modalType === "approve") {
                const updatedTrack = await updateAdminTrackApprovalStatusService(id, { 
                    status: "approved", 
                    adminNote 
                });
                if (updatedTrack) setTrack(updatedTrack);
            } 
            else if (modalType === "reject") {
                const updatedTrack = await updateAdminTrackApprovalStatusService(id, { 
                    status: "rejected", 
                    adminNote, 
                    violationFlags 
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
            closeModal();
        } catch (err) {
            alert(err?.response?.data?.message || "Có lỗi xảy ra khi thực hiện tác vụ.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const openModerationModal = (type) => {
        setModalType(type);
        setAdminNote("");
        setViolationFlags([]);
        setHideReasons([]);
    };

    const isPendingApproval = track?.approvalStatus === "pending";
    const isApproved = track?.approvalStatus === "approved";
    const isRejected = track?.approvalStatus === "rejected";
    const isActive = track?.activeStatus === "active";
    const isHidden = track?.activeStatus === "hidden";
    const isBlocked = track?.activeStatus === "blocked";

    if (isLoading) {
        return <div className="p-8 text-center text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">Đang tải chi tiết bài hát...</div>;
    }

    if (error || !track) {
        return (
            <div className="p-8 text-center border border-red-100 bg-red-50 text-red-700 rounded-2xl max-w-md mx-auto mt-12 shadow-sm">
                <p className="font-bold text-sm">{error || "Track not found."}</p>
                <button onClick={() => navigate(-1)} className="mt-4 bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition">Quay lại</button>
            </div>
        );
    }

    return (
        <section className="space-y-6 text-slate-800 antialiased font-sans max-w-[1400px] mx-auto p-6 bg-slate-50/50 min-h-screen">
            
            {/* KHUNG 1: Header Trang Chi Tiết & Ảnh đại diện tác phẩm */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    {track.avatar ? (
                        <img src={track.avatar} alt={track.title} className="w-16 h-16 object-cover border border-slate-100 rounded-xl shadow-inner" />
                    ) : (
                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase rounded-xl">Chưa có ảnh</div>
                    )}
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hồ sơ âm nhạc</p>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{track.title}</h1>
                        <p className="text-xs font-medium text-slate-500">Bởi <span className="font-semibold text-blue-600">{track.artist?.name || "Nghệ sĩ không xác định"}</span></p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl transition self-start md:self-center"
                >
                    Trở lại danh sách
                </button>
            </div>

            {/* KHUNG 2: Bảng Điều Khiển Kiểm Duyệt Tác Vụ (Bố cục nút bấm thanh lịch, hiện đại) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Hệ thống tác vụ kiểm duyệt</h3>
                        <p className="text-xs text-slate-400">Thay đổi trạng thái phê duyệt bản phát hành hoặc điều tiết hiển thị trên nền tảng.</p>
                    </div>
                    
                    {/* HỆ THỐNG NÚT BẤM ĐIỀU HƯỚNG SANG MODAL XỬ LÝ (BO GÓC X-LARGE) */}
                    <div className="flex flex-wrap gap-2">
                        {isPendingApproval && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => openModerationModal("approve")}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition"
                                >
                                    Duyệt
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openModerationModal("reject")}
                                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition"
                                >
                                    Từ chối
                                </button>
                            </>
                        )}

                        {isApproved && isActive && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => openModerationModal("hide")}
                                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition"
                                >
                                    Ẩn
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openModerationModal("block")}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition"
                                >
                                    Khóa
                                </button>
                            </>
                        )}

                        {isApproved && isHidden && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => openModerationModal("unhide")}
                                    className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition"
                                >
                                    Hiện lại
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openModerationModal("block")}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition"
                                >
                                    Khóa
                                </button>
                            </>
                        )}

                        {isApproved && isBlocked && (
                            <span className="inline-flex items-center rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                                Bài hát đã khóa
                            </span>
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
                    <div className="p-4 bg-slate-50/70 border border-slate-100 flex flex-col justify-between gap-1.5 rounded-xl">
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wide">Trạng thái phê duyệt</span>
                        <div>{getStatusBadge(track.approvalStatus)}</div>
                    </div>
                    <div className="p-4 bg-slate-50/70 border border-slate-100 flex flex-col justify-between gap-1.5 rounded-xl">
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wide">Trạng thái hiển thị</span>
                        <div>{getStatusBadge(track.activeStatus)}</div>
                    </div>
                    <div className="p-4 bg-slate-50/70 border border-slate-100 flex flex-col justify-between gap-1.5 rounded-xl">
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wide">Quản trị viên rà soát</span>
                        <span className="font-mono font-bold text-slate-700 truncate mt-0.5">{track.moderation?.reviewedBy?.email || "Chưa rà soát / Hệ thống tự động"}</span>
                    </div>
                </div>

                {/* Nhật ký cờ vi phạm (Violation Flags) */}
                {track.moderation?.violationFlags?.length > 0 && (
                    <div className="border border-rose-100 bg-rose-50/50 p-4 text-xs space-y-2 rounded-xl">
                        <span className="text-rose-700 font-bold text-[10px] uppercase tracking-wide block">Hồ sơ ghi nhận các cờ vi phạm:</span>
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
                        <strong className="block uppercase text-[10px] tracking-wide mb-1 text-red-800">Lý do ban tài khóa hành chính (Ban Log):</strong> {track.blockedReason}
                    </div>
                )}
            </div>

            {/* KHUNG 3: Chi tiết siêu dữ liệu kỹ thuật và bản quyền pháp lý */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-8">
                
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
                            <span className="text-base font-bold text-slate-900 block">{(track.stats?.totalPlay || 0).toLocaleString()} plays</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-4 space-y-1 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Lượt yêu thích</span>
                            <span className="text-base font-bold text-slate-900 block">{(track.stats?.totalLike || 0).toLocaleString()} likes</span>
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
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Tệp tin âm thanh máy chủ (Transcoding Quality Nodes)</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {track.audioFiles?.length > 0 ? track.audioFiles.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50/60 border border-slate-100 p-4 text-xs font-bold rounded-xl">
                                <div className="space-y-1">
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-wide">{file.label} Node</span>
                                    <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline break-all">🔗 Nghe thử tệp âm thanh gốc</a>
                                </div>
                                <span className="bg-white border px-3 py-1 font-mono text-[11px] text-slate-600 font-bold rounded-lg shadow-sm">{file.bitrate} kbps ({file.format})</span>
                            </div>
                        )) : <p className="text-xs text-slate-400 italic">Hệ thống chưa mã hóa tệp âm thanh này.</p>}
                    </div>
                </div>

                {/* 3. Bản quyền tác giả nâng cao */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Xác minh hồ sơ sở hữu trí tuệ & Bản quyền</h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs font-bold">
                        <div className="p-4 bg-slate-50/60 border border-slate-100 space-y-1 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Nhạc sĩ (Composer)</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.copyright?.composer || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50/60 border border-slate-100 space-y-1 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Tác giả lời (Lyricist)</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.copyright?.lyricist || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50/60 border border-slate-100 space-y-1 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Nhà sản xuất (Producer)</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.copyright?.producer || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50/60 border border-slate-100 space-y-1 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Chủ sở hữu bản quyền</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.copyright?.copyrightOwner || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50/60 border border-slate-100 space-y-1 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Chủ bản ghi (Master Recording)</span>
                            <span className="text-sm font-semibold text-slate-800 block">{track.copyright?.recordingOwner || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50/60 border border-slate-100 flex flex-wrap gap-1.5 items-center rounded-xl">
                            <span className={`px-2 py-0.5 border font-bold text-[9px] uppercase tracking-wider rounded-md ${track.copyright?.isOriginal ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>Original</span>
                            <span className={`px-2 py-0.5 border font-bold text-[9px] uppercase tracking-wider rounded-md ${track.copyright?.isCover ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>Cover</span>
                            <span className={`px-2 py-0.5 border font-bold text-[9px] uppercase tracking-wider rounded-md ${track.copyright?.isRemix ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>Remix</span>
                        </div>
                    </div>

                    {/* Dữ liệu nguồn gốc bài hát */}
                    {(track.copyright?.originalTrackTitle || track.copyright?.originalArtistName) && (
                        <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-xl text-xs font-semibold grid sm:grid-cols-2 gap-2">
                            <div><span className="text-slate-400 uppercase text-[10px] font-bold mr-1">Tác phẩm gốc:</span> <span className="text-slate-900 font-bold">{track.copyright?.originalTrackTitle || "—"}</span></div>
                            <div><span className="text-slate-400 uppercase text-[10px] font-bold mr-1">Nghệ sĩ gốc:</span> <span className="text-slate-900 font-bold">{track.copyright?.originalArtistName || "—"}</span></div>
                        </div>
                    )}

                    {/* Chứng từ tài liệu pháp lý đính kèm */}
                    {track.copyright?.licenseDocumentUrls?.length > 0 && (
                        <div className="border border-slate-100 bg-slate-50/60 p-4 text-xs font-medium space-y-2 rounded-xl">
                            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wide">Chứng từ pháp lý xác minh liên kết</span>
                            <div className="flex flex-col gap-1.5">
                                {track.copyright.licenseDocumentUrls.map((doc, i) => (
                                    <a key={i} href={doc} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">📄 Xem tài liệu chứng minh đính kèm #{i + 1}</a>
                                ))}
                            </div>
                        </div>
                    )}

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
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Lời đồng bộ (Synced LRC Nodes)</h3>
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
                                    {modalType === "approve" ? "Phê duyệt phát hành tác phẩm" : 
                                     modalType === "reject" ? "Từ chối hồ sơ & Gắn cờ vi phạm" : 
                                     modalType === "hide" ? "Tạm ẩn tác phẩm khỏi nền tảng" :
                                     modalType === "unhide" ? "Hiển thị lại tác phẩm" :
                                     "Khóa tài nguyên bài hát"}
                                </h2>
                            </div>
                            <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-lg font-bold transition">✕</button>
                        </div>

                        {/* Thẻ bọc tóm tắt bài nhạc */}
                        <div className="bg-slate-50 border border-slate-100 p-4 text-xs font-semibold rounded-xl text-slate-600">
                            Tác phẩm: <span className="text-slate-900 font-bold">{track.title}</span>
                            <span className="block text-[10px] text-slate-400 mt-1 uppercase">Nghệ sĩ: {track.artist?.name || "Nghệ sĩ không xác định"}</span>
                        </div>

                        <div className="space-y-4">
                            {/* KHỐI CHỌN CỜ LÝ DO KHI REJECT / BLOCK */}
                            {(modalType === "reject" || modalType === "block") && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">Danh mục cờ vi phạm rà soát</label>
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
                                                    className={`flex items-center text-left gap-3 p-3 rounded-xl border text-xs font-medium transition ${
                                                        isChecked ? "bg-rose-50 border-rose-400 text-rose-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
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
                                                    className={`flex items-center text-left gap-3 p-3 rounded-xl border text-xs font-medium transition ${
                                                        isChecked ? "bg-orange-50 border-orange-400 text-orange-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
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
                                    {modalType === "approve" || modalType === "unhide"
                                        ? "Nội dung ghi chú kèm theo (Tùy chọn)"
                                        : "Nội dung giải trình chi tiết hành động (Bắt buộc)"}
                                </label>
                                <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    rows={3}
                                    className="w-full border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition rounded-xl leading-relaxed"
                                    placeholder={
                                        modalType === "reject" ? "Cung cấp giải thích chi tiết về vi phạm để phản hồi cho creator..." : 
                                        modalType === "hide" ? "Cung cấp giải thích cụ thể lý do tạm ẩn hành chính..." :
                                        modalType === "block" ? "Cung cấp căn cứ chi tiết để ban/gỡ bỏ vĩnh viễn..." : "Nhập nội dung ghi chú lưu vết hệ thống..."
                                    }
                                    required={!["approve", "unhide"].includes(modalType)}
                                />
                            </div>
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
                                    (modalType === "reject" && (!adminNote.trim() || violationFlags.length === 0)) ||
                                    (modalType === "hide" && (!adminNote.trim() || hideReasons.length === 0)) ||
                                    (modalType === "block" && !adminNote.trim())
                                } 
                                className={`px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition disabled:opacity-40 ${
                                    modalType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : 
                                    modalType === "reject" ? "bg-rose-600 hover:bg-rose-700" : 
                                    modalType === "hide" ? "bg-orange-600 hover:bg-orange-700" :
                                    modalType === "unhide" ? "bg-sky-600 hover:bg-sky-700" :
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
