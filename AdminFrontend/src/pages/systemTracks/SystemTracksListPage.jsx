import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    searchAdminTracksService,
    updateAdminTrackApprovalStatusService,
    updateAdminTrackVisibilityService,
} from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";

// Cấu hình cờ vi phạm dành cho việc từ chối (Reject)
const VIOLATION_OPTIONS = [
    { value: "copyright", label: "Copyright Infringement (Vi phạm bản quyền)" },
    { value: "missing_rights_proof", label: "Missing Rights Proof (Thiếu chứng từ sở hữu)" },
    { value: "wrong_metadata", label: "Wrong Metadata (Sai thông tin bài hát/ca sĩ)" },
    { value: "low_audio_quality", label: "Low Audio Quality (Chất lượng âm thanh kém)" },
    { value: "explicit_content", label: "Explicit Content (Nội dung nhạy cảm/độc hại)" },
    { value: "duplicate_track", label: "Duplicate Track (Trùng lặp dữ liệu bài hát)" },
    { value: "other", label: "Other (Các lý do vi phạm hệ thống khác)" },
];

// 🔴 THIẾT KẾ MỚI: Cấu hình danh sách cờ lý do dành cho việc ẩn bài hát (Hide)
const HIDE_REASON_OPTIONS = [
    { value: "artist_request", label: "Artist Request (Nghệ sĩ yêu cầu tạm ẩn)" },
    { value: "pending_investigation", label: "Under Investigation (Tạm ẩn để xác minh vi phạm)" },
    { value: "metadata_revision", label: "Metadata Revision (Tạm ẩn để chỉnh sửa thông tin)" },
    { value: "audio_issue", label: "Audio File Issue (Sự cố tệp âm thanh lỗi)" },
    { value: "other", label: "Operational Reasons (Các lý do vận hành khác)" },
];

const formatDuration = (seconds) => {
    if (typeof seconds !== "number" || Number.isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getStatusClasses = (status) => {
    switch (status) {
        case "approved":
        case "active":
            return "bg-emerald-100 text-emerald-700 border-emerald-200";
        case "pending":
            return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "rejected":
            return "bg-rose-100 text-rose-700 border-rose-200";
        case "hidden":
            return "bg-orange-100 text-orange-700 border-orange-200";
        case "blocked":
            return "bg-red-100 text-red-700 border-red-200";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
    }
};

const SystemTracksListPage = () => {
    const [tracks, setTracks] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [query, setQuery] = useState({ q: "", page: 1, limit: 20 });
    const [pagination, setPagination] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [processingTrackId, setProcessingTrackId] = useState(null);

    // State quản lý Form Duyệt bài nâng cao của Modal
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [modalType, setModalType] = useState(null); 
    const [adminNote, setAdminNote] = useState(""); 
    const [violationFlags, setViolationFlags] = useState([]);
    const [hideReasons, setHideReasons] = useState([]); // 🔴 BỔ SUNG: Khởi tạo state lưu cờ ẩn bài hát

    const loadTracks = async (params = query) => {
        setIsLoading(true);
        setMessage("");
        try {
            const result = await searchAdminTracksService(params);
            setTracks(result.tracks ?? []);
            setPagination(result.pagination ?? null);
        } catch (error) {
            setMessage(error?.response?.data?.message || error?.message || "Could not load tracks.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadTracks(query); }, [query]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        setQuery((prev) => ({ ...prev, q: searchTerm.trim(), page: 1 }));
    };

    const updateApprovalStatus = async (trackId, status, note = "", flags = []) => {
        setProcessingTrackId(trackId);
        try {
            const updatedTrack = await updateAdminTrackApprovalStatusService(trackId, { 
                status, 
                adminNote: note, 
                violationFlags: flags 
            });
            setTracks((prev) => prev.map((t) => t.id === trackId ? {
                ...t,
                approvalStatus: updatedTrack?.approvalStatus,
                activeStatus: updatedTrack?.activeStatus,
                rejectReason: updatedTrack?.rejectReason || "",
            } : t));
            setMessage(status === "approved" ? "Track approved successfully." : "Track rejected successfully.");
        } catch (error) {
            setMessage(error?.message || "Could not update status.");
        } finally { setProcessingTrackId(null); }
    };

    const updateTrackVisibility = async (trackId, action, reason = "") => {
        setProcessingTrackId(trackId);
        try {
            const updatedTrack = await updateAdminTrackVisibilityService(trackId, { action, hiddenReason: reason });
            setTracks((prev) => prev.map((t) => t.id === trackId ? {
                ...t,
                activeStatus: updatedTrack?.activeStatus,
                hiddenReason: updatedTrack?.hiddenReason || "",
                hiddenAt: updatedTrack?.hiddenAt || null,
            } : t));
            setMessage(action === "hide" ? "Track hidden successfully." : "Track restored successfully.");
        } catch (error) {
            setMessage(error?.message || "Could not update visibility.");
        } finally { setProcessingTrackId(null); }
    };

    const closeModal = () => {
        setSelectedTrack(null);
        setModalType(null);
        setAdminNote("");
        setViolationFlags([]);
        setHideReasons([]); // 🔴 Xóa sạch mảng chọn cũ khi đóng modal
    };

    const confirmAction = async () => {
        if (!selectedTrack || !modalType) return;
        if (modalType === "approve") await updateApprovalStatus(selectedTrack.id, "approved", adminNote, []);
        if (modalType === "reject") await updateApprovalStatus(selectedTrack.id, "rejected", adminNote, violationFlags);
        
        if (modalType === "hide") {
            // 🔴 LUỒNG MỚI: Đọc danh sách nhãn cờ đã tích và gộp vào đoạn text ẩn gửi lên DB
            const selectedLabels = hideReasons.map(r => HIDE_REASON_OPTIONS.find(o => o.value === r)?.label || r);
            const combinedHiddenReason = selectedLabels.length > 0 
                ? `[${selectedLabels.join(", ")}] ${adminNote}`.trim()
                : adminNote.trim();
                
            await updateTrackVisibility(selectedTrack.id, "hide", combinedHiddenReason);
        }
        closeModal();
    };

    const handleApprove = (track) => { setSelectedTrack(track); setAdminNote(""); setModalType("approve"); };
    const handleReject = (track) => { setSelectedTrack(track); setAdminNote(""); setViolationFlags([]); setModalType("reject"); };
    const handleHide = (track) => { setSelectedTrack(track); setAdminNote(""); setHideReasons([]); setModalType("hide"); };
    const handleUnhide = async (track) => { await updateTrackVisibility(track.id, "unhide"); };

    const handleFlagToggle = (flagValue) => {
        setViolationFlags((prev) => 
            prev.includes(flagValue) ? prev.filter((f) => f !== flagValue) : [...prev, flagValue]
        );
    };

    // 🔴 THÊM HÀM: Toggle lựa chọn cho các cờ lý do ẩn bài hát
    const handleHideReasonToggle = (reasonValue) => {
        setHideReasons((prev) => 
            prev.includes(reasonValue) ? prev.filter((r) => r !== reasonValue) : [...prev, reasonValue]
        );
    };

    return (
        <section className="space-y-6">
            {/* Khung 1: Header */}
            <div className="rounded-[2rem] border border-black bg-white p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">System Track Management</p>
                <h1 className="mt-3 text-4xl font-semibold text-black">Track Moderation List</h1>
            </div>

            {/* Khung 2: Search */}
            <form onSubmit={handleSearchSubmit} className="grid gap-4 rounded-[2rem] border border-black bg-white p-6 md:grid-cols-[1.8fr_0.8fr]">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-black/70">Search</label>
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm" placeholder="Search title or artist..." />
                </div>
                <div className="flex items-end"><button type="submit" className="w-full rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white">Search</button></div>
            </form>

            {message && <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{message}</div>}

            {/* Khung 3: Table List */}
            <div className="overflow-hidden rounded-[2rem] border border-black bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-black">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-black/10">
                            <tr>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Artist</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4">Approval</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tracks.map((track) => (
                                <tr key={track.id} className="hover:bg-slate-50/50 transition">
                                    <td className="border-b border-black/10 px-6 py-4 font-medium">{track.title}</td>
                                    <td className="border-b border-black/10 px-6 py-4 text-black/80">{track.artist?.name || "—"}</td>
                                    <td className="border-b border-black/10 px-6 py-4 text-black/80">{formatDuration(track.duration)}</td>
                                    <td className="border-b border-black/10 px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusClasses(track.approvalStatus)}`}>{track.approvalStatus}</span>
                                    </td>
                                    <td className="border-b border-black/10 px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusClasses(track.activeStatus)}`}>{track.activeStatus}</span>
                                    </td>
                                    <td className="border-b border-black/10 px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {track.approvalStatus !== "approved" ? (
                                                <>
                                                    <button type="button" onClick={() => handleApprove(track)} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-95">Approve</button>
                                                    <button type="button" onClick={() => handleReject(track)} className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 active:scale-95">Reject</button>
                                                </>
                                            ) : track.activeStatus === "hidden" ? (
                                                <button type="button" onClick={() => handleUnhide(track)} className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 active:scale-95">Unhide</button>
                                            ) : (
                                                <button type="button" onClick={() => handleHide(track)} className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700 active:scale-95">Hide</button>
                                            )}
                                            
                                            <Link
                                                to={routePaths.trackDetail(track.id)}
                                                className="inline-flex rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-sm hover:bg-slate-50 transition duration-150"
                                            >
                                                Details
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL KIỂM DUYỆT TÍCH HỢP ĐỘNG CHO CẢ REJECT VÀ HIDE CORES */}
            {modalType && selectedTrack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-xl rounded-[2rem] border border-black bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/50">System Track Moderation</p>
                                <h2 className="mt-2 text-2xl font-semibold text-black">
                                    {modalType === "approve" ? "Approve Track Release" : modalType === "reject" ? "Reject & Issue Violation Flags" : "Hide Track & Specify Reasons"}
                               </h2>
                            </div>
                            <button type="button" onClick={closeModal} className="flex h-10 w-10 items-center justify-center rounded-full text-black/40 hover:bg-slate-100 transition">✕</button>
                        </div>

                        {/* Thông tin Track đang được chọn */}
                        <div className="rounded-2xl bg-slate-50 border border-black/5 p-4 text-sm">
                            <p className="font-semibold text-black">{selectedTrack.title}</p>
                            <p className="mt-0.5 text-xs text-black/60">Artist: {selectedTrack.artist?.name || "Unknown Artist"}</p>
                        </div>

                        {/* Phân vùng Form động dựa trên kiểu tác vụ điều hướng (Approve / Reject / Hide) */}
                        <div className="space-y-4">
                            {/* KHỐI 1: Hiện hộp cờ vi phạm nếu chọn Từ chối bài */}
                            {modalType === "reject" && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-black/60">Reason Flags (Chọn cờ vi phạm)</label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {VIOLATION_OPTIONS.map((flag) => {
                                            const isChecked = violationFlags.includes(flag.value);
                                            return (
                                                <button
                                                    key={flag.value}
                                                    type="button"
                                                    onClick={() => handleFlagToggle(flag.value)}
                                                    className={`flex items-center text-left gap-3 p-3 rounded-xl border text-xs font-medium transition ${
                                                        isChecked 
                                                            ? "bg-rose-50 border-rose-500 text-rose-800" 
                                                            : "bg-white border-black/10 text-black hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${isChecked ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-black/20"}`}>
                                                        {isChecked && "✓"}
                                                    </div>
                                                    {flag.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 🔴 KHỐI 2 (MỚI THÊM): Hiện hộp cờ lý do vận hành nếu chọn Ẩn bài */}
                            {modalType === "hide" && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-black/60">Visibility Action Flags (Chọn lý do ẩn bài)</label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {HIDE_REASON_OPTIONS.map((reason) => {
                                            const isChecked = hideReasons.includes(reason.value);
                                            return (
                                                <button
                                                    key={reason.value}
                                                    type="button"
                                                    onClick={() => handleHideReasonToggle(reason.value)}
                                                    className={`flex items-center text-left gap-3 p-3 rounded-xl border text-xs font-medium transition ${
                                                        isChecked 
                                                            ? "bg-orange-50 border-orange-500 text-orange-800" 
                                                            : "bg-white border-black/10 text-black hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${isChecked ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-black/20"}`}>
                                                        {isChecked && "✓"}
                                                    </div>
                                                    {reason.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Ô nhập văn bản giải trình chi tiết */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-black/60">
                                    {modalType === "approve" ? "Review Note (Ghi chú tùy chọn)" : modalType === "reject" ? "Detailed Rejection Explanation (Lý do bắt buộc)" : "Detailed Hiding Explanation (Lý do ẩn bắt buộc)"}
                                </label>
                                <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    placeholder={
                                        modalType === "reject" 
                                            ? "Cung cấp giải thích chi tiết về vi phạm để phản hồi lại cho nghệ sĩ chỉnh sửa..." 
                                            : modalType === "hide"
                                            ? "Cung cấp giải thích chi tiết về lý do ẩn bài hát để lưu lại lịch sử quản trị..."
                                            : "Nhập nội dung ghi chú lưu vết lịch sử hệ thống..."
                                    }
                                    rows={3}
                                    className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black"
                                    required={modalType === "reject" || modalType === "hide"}
                                />
                            </div>
                        </div>

                        {/* Nhóm nút lưu lệnh điều khiển */}
                        <div className="flex justify-end gap-3 pt-2 border-t border-black/5">
                            <button type="button" onClick={closeModal} className="rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-slate-50 transition">
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={confirmAction} 
                                // Khóa an toàn nút nếu chọn Từ chối/Ẩn bài mà bỏ trống cờ hoặc ô văn bản giải trình
                                disabled={
                                    processingTrackId === selectedTrack.id || 
                                    (modalType === "reject" && (!adminNote.trim() || violationFlags.length === 0)) ||
                                    (modalType === "hide" && (!adminNote.trim() || hideReasons.length === 0))
                                } 
                                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40 ${
                                    modalType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : modalType === "reject" ? "bg-rose-600 hover:bg-rose-700" : "bg-orange-600 hover:bg-orange-700"
                                }`}
                            >
                                {processingTrackId === selectedTrack.id ? "Processing..." : "Confirm Action"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default SystemTracksListPage;