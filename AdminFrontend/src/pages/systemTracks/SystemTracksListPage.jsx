import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    searchAdminTracksService,
    updateAdminTrackApprovalStatusService,
    updateAdminTrackVisibilityService,
} from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";

const VIOLATION_OPTIONS = [
    { value: "copyright", label: "Copyright Infringement (Vi phạm bản quyền)" },
    { value: "missing_rights_proof", label: "Missing Rights Proof (Thiếu chứng từ sở hữu)" },
    { value: "wrong_metadata", label: "Wrong Metadata (Sai thông tin bài hát/ca sĩ)" },
    { value: "low_audio_quality", label: "Low Audio Quality (Chất lượng âm thanh kém)" },
    { value: "explicit_content", label: "Explicit Content (Nội dung nhạy cảm/độc hại)" },
    { value: "duplicate_track", label: "Duplicate Track (Trùng lặp dữ liệu bài hát)" },
    { value: "other", label: "Other (Các lý do vi phạm hệ thống khác)" },
];

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
            return "bg-emerald-100/70 text-emerald-600 border border-emerald-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
        case "pending":
            return "bg-yellow-100/70 text-yellow-800 border border-yellow-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
        case "rejected":
            return "bg-rose-100/70 text-rose-600 border border-rose-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
        case "hidden":
            return "bg-orange-100/70 text-orange-600 border border-orange-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
        case "blocked":
            return "bg-red-100 text-red-600 border border-red-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
        default:
            return "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
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

    const [selectedTrack, setSelectedTrack] = useState(null);
    const [modalType, setModalType] = useState(null); 
    const [adminNote, setAdminNote] = useState(""); 
    const [violationFlags, setViolationFlags] = useState([]);
    const [hideReasons, setHideReasons] = useState([]);

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
        setHideReasons([]);
    };

    const confirmAction = async () => {
        if (!selectedTrack || !modalType) return;
        if (modalType === "approve") await updateApprovalStatus(selectedTrack.id, "approved", adminNote, []);
        if (modalType === "reject") await updateApprovalStatus(selectedTrack.id, "rejected", adminNote, violationFlags);
        
        if (modalType === "hide") {
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

    const handleHideReasonToggle = (reasonValue) => {
        setHideReasons((prev) => 
            prev.includes(reasonValue) ? prev.filter((r) => r !== reasonValue) : [...prev, reasonValue]
        );
    };

    return (
        <section className="space-y-6 text-slate-800 font-sans antialiased max-w-[1400px] mx-auto p-2 rounded-none">
            {/* Khung 1: Header */}
            <div className="border border-black bg-white p-8 rounded-none">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">System Track Management</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase mt-1">Track Moderation List</h1>
            </div>

            {/* Khung 2: Search */}
            <form onSubmit={handleSearchSubmit} className="border border-black bg-white p-6 flex flex-col sm:flex-row gap-4 rounded-none">
                <div className="flex-1 space-y-1 rounded-none">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Search</label>
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold outline-none focus:bg-white rounded-none" placeholder="Search title or artist..." />
                </div>
                <div className="flex items-end rounded-none">
                    <button type="submit" className="w-full sm:w-36 border border-black bg-black py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 rounded-none">Search</button>
                </div>
            </form>

            {message && <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 rounded-none">{message}</div>}

            {/* Khung 3: Table List */}
            <div className="border border-black bg-white overflow-hidden rounded-none">
                <div className="overflow-x-auto rounded-none">
                    <table className="min-w-full text-left text-xs border-collapse rounded-none">
                        <thead className="bg-slate-50 font-bold uppercase text-slate-500 tracking-wider border-b border-black text-[11px]">
                            <tr>
                                <th className="px-6 py-4 font-semibold border-r border-slate-100">Title</th>
                                <th className="px-6 py-4 font-semibold border-r border-slate-100">Artist</th>
                                <th className="px-6 py-4 font-semibold border-r border-slate-100">Duration</th>
                                <th className="px-6 py-4 font-semibold border-r border-slate-100">Approval</th>
                                <th className="px-6 py-4 font-semibold border-r border-slate-100">Status</th>
                                <th className="px-6 py-4 text-center font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 rounded-none">
                            {tracks.map((track) => (
                                <tr key={track.id} className="hover:bg-slate-50/40 transition rounded-none">
                                    <td className="px-6 py-4 font-bold text-slate-900 border-r border-slate-100 text-sm tracking-tight rounded-none">{track.title}</td>
                                    <td className="px-6 py-4 text-slate-600 font-medium border-r border-slate-100 rounded-none">{track.artist?.name || "—"}</td>
                                    <td className="px-6 py-4 text-slate-500 font-mono font-bold border-r border-slate-100 rounded-none">{formatDuration(track.duration)}</td>
                                    <td className="px-6 py-4 border-r border-slate-100 rounded-none">
                                        <span className={getStatusClasses(track.approvalStatus)}>{track.approvalStatus}</span>
                                    </td>
                                    <td className="px-6 py-4 border-r border-slate-100 rounded-none">
                                        <span className={getStatusClasses(track.activeStatus)}>{track.activeStatus}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center rounded-none">
                                        <div className="flex items-center justify-center gap-1.5 rounded-none">
                                            {track.approvalStatus !== "approved" ? (
                                                <>
                                                    <button type="button" onClick={() => handleApprove(track)} className="border border-black bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-700 rounded-none">Approve</button>
                                                    <button type="button" onClick={() => handleReject(track)} className="border border-black bg-rose-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-rose-700 rounded-none">Reject</button>
                                                </>
                                            ) : track.activeStatus === "hidden" ? (
                                                <button type="button" onClick={() => handleUnhide(track)} className="border border-black bg-sky-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-sky-700 rounded-none">Unhide</button>
                                            ) : (
                                                <button type="button" onClick={() => handleHide(track)} className="border border-black bg-orange-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-orange-600 rounded-none">Hide</button>
                                            )}
                                            
                                            <Link
                                                to={routePaths.trackDetail(track.id)}
                                                className="border border-black bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-zinc-800 transition rounded-none"
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

            {/* MODAL KIỂM DUYỆT TÍCH HỢP CẠNH VUÔNG 90 ĐỘ */}
            {modalType && selectedTrack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm rounded-none">
                    <div className="w-full max-w-xl border border-black bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto rounded-none">
                        <div className="flex items-start justify-between rounded-none">
                            <div className="rounded-none">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Track Moderation</p>
                                <h2 className="mt-1 text-xl font-bold uppercase text-slate-900">
                                    {modalType === "approve" ? "Approve Track Release" : modalType === "reject" ? "Reject & Issue Violation Flags" : "Hide Track & Specify Reasons"}
                                </h2>
                            </div>
                            <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 font-bold transition rounded-none">✕</button>
                        </div>

                        <div className="border border-slate-200 bg-slate-50 p-4 text-xs font-bold rounded-none">
                            <p className="text-slate-900 uppercase tracking-tight rounded-none">{selectedTrack.title}</p>
                            <p className="mt-1 text-[10px] text-slate-400 uppercase rounded-none">Artist: {selectedTrack.artist?.name || "Unknown Artist"}</p>
                        </div>

                        <div className="space-y-4 rounded-none">
                            {modalType === "reject" && (
                                <div className="space-y-2 rounded-none">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reason Flags (Chọn cờ vi phạm)</label>
                                    <div className="grid gap-2 sm:grid-cols-2 rounded-none">
                                        {VIOLATION_OPTIONS.map((flag) => {
                                            const isChecked = violationFlags.includes(flag.value);
                                            return (
                                                <button
                                                    key={flag.value}
                                                    type="button"
                                                    onClick={() => handleFlagToggle(flag.value)}
                                                    className={`flex items-center text-left gap-3 p-3 border text-xs font-bold transition rounded-none ${
                                                        isChecked ? "bg-rose-50 border-rose-400 text-rose-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <div className={`w-3.5 h-3.5 flex items-center justify-center border text-[9px] rounded-none ${isChecked ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-300"}`}>
                                                        {isChecked && "✓"}
                                                    </div>
                                                    {flag.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {modalType === "hide" && (
                                <div className="space-y-2 rounded-none">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Visibility Action Flags (Chọn lý do ẩn bài)</label>
                                    <div className="grid gap-2 sm:grid-cols-2 rounded-none">
                                        {HIDE_REASON_OPTIONS.map((reason) => {
                                            const isChecked = hideReasons.includes(reason.value);
                                            return (
                                                <button
                                                    key={reason.value}
                                                    type="button"
                                                    onClick={() => handleHideReasonToggle(reason.value)}
                                                    className={`flex items-center text-left gap-3 p-3 border text-xs font-bold transition rounded-none ${
                                                        isChecked ? "bg-orange-50 border-orange-400 text-orange-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <div className={`w-3.5 h-3.5 flex items-center justify-center border text-[9px] rounded-none ${isChecked ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-slate-300"}`}>
                                                        {isChecked && "✓"}
                                                    </div>
                                                    {reason.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 rounded-none">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 rounded-none">
                                    {modalType === "approve" ? "Review Note (Ghi chú tùy chọn)" : modalType === "reject" ? "Detailed Rejection Explanation (Lý do bắt buộc)" : "Detailed Hiding Explanation (Lý do ẩn bắt buộc)"}
                                </label>
                                <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    rows={3}
                                    className="w-full border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 rounded-none"
                                    required={modalType === "reject" || modalType === "hide"}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 rounded-none">
                            <button type="button" onClick={closeModal} className="border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition rounded-none">
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={confirmAction} 
                                disabled={
                                    processingTrackId === selectedTrack.id || 
                                    (modalType === "reject" && (!adminNote.trim() || violationFlags.length === 0)) ||
                                    (modalType === "hide" && (!adminNote.trim() || hideReasons.length === 0))
                                } 
                                className={`border border-black px-5 py-2 text-xs font-black uppercase tracking-wider text-white transition disabled:opacity-40 rounded-none ${
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