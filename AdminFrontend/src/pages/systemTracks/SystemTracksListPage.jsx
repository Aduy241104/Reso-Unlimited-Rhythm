import { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // Sửa đổi: Sử dụng Link thay vì useNavigate thủ công
import {
    searchAdminTracksService,
    updateAdminTrackApprovalStatusService,
    updateAdminTrackVisibilityService,
} from "../../services/trackService";
import { routePaths } from "../../routes/routePaths"; // Import routePaths giống file Genre

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
            return "bg-emerald-100 text-emerald-700";
        case "pending":
            return "bg-yellow-100 text-yellow-800";
        case "rejected":
            return "bg-rose-100 text-rose-700";
        case "hidden":
            return "bg-orange-100 text-orange-700";
        case "blocked":
            return "bg-red-100 text-red-700";
        default:
            return "bg-slate-100 text-slate-700";
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

    // Modal state duyệt nhanh
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [modalType, setModalType] = useState(null); 
    const [rejectReason, setRejectReason] = useState("");
    const [hiddenReason, setHiddenReason] = useState("");

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

    const updateApprovalStatus = async (trackId, status, rejectReason = "") => {
        setProcessingTrackId(trackId);
        try {
            const updatedTrack = await updateAdminTrackApprovalStatusService(trackId, { status, rejectReason });
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

    const updateTrackVisibility = async (trackId, action, hiddenReason = "") => {
        setProcessingTrackId(trackId);
        try {
            const updatedTrack = await updateAdminTrackVisibilityService(trackId, { action, hiddenReason });
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
        setRejectReason("");
        setHiddenReason("");
    };

    const confirmAction = async () => {
        if (!selectedTrack || !modalType) return;
        if (modalType === "approve") await updateApprovalStatus(selectedTrack.id, "approved");
        if (modalType === "reject") await updateApprovalStatus(selectedTrack.id, "rejected", rejectReason);
        if (modalType === "hide") await updateTrackVisibility(selectedTrack.id, "hide", hiddenReason);
        closeModal();
    };

    const handleApprove = (track) => { setSelectedTrack(track); setModalType("approve"); };
    const handleReject = (track) => { setSelectedTrack(track); setRejectReason(""); setModalType("reject"); };
    const handleHide = (track) => { setSelectedTrack(track); setHiddenReason(""); setModalType("hide"); };
    const handleUnhide = async (track) => { await updateTrackVisibility(track.id, "unhide"); };

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
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClasses(track.approvalStatus)}`}>{track.approvalStatus}</span>
                                    </td>
                                    <td className="border-b border-black/10 px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClasses(track.activeStatus)}`}>{track.activeStatus}</span>
                                    </td>
                                    <td className="border-b border-black/10 px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {track.approvalStatus !== "approved" ? (
                                                <>
                                                    <button type="button" onClick={() => handleApprove(track)} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Approve</button>
                                                    <button type="button" onClick={() => handleReject(track)} className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">Reject</button>
                                                </>
                                            ) : track.activeStatus === "hidden" ? (
                                                <button type="button" onClick={() => handleUnhide(track)} className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">Unhide</button>
                                            ) : (
                                                <button type="button" onClick={() => handleHide(track)} className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white">Hide</button>
                                            )}
                                            
                                            {/* CHỈNH SỬA TẠI ĐÂY: Dùng Link và routePaths động y hệt trang Genre */}
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

            {/* Cấu trúc Quick Action Modal cũ giữ nguyên bên dưới */}
            {modalType && selectedTrack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-[2rem] border border-black bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/50">Track Moderation</p>
                                <h2 className="mt-2 text-2xl font-semibold text-black">{modalType === "approve" ? "Approve Track" : modalType === "reject" ? "Reject Track" : "Hide Track"}</h2>
                            </div>
                            <button type="button" onClick={closeModal} className="flex h-10 w-10 items-center justify-center rounded-full text-black/50 hover:bg-slate-100">✕</button>
                        </div>
                        <div className="mt-5 rounded-2xl bg-slate-50 border border-black/5 p-4">
                            <p className="text-sm font-semibold text-black">{selectedTrack.title}</p>
                            <p className="mt-1 text-sm text-black/60">{selectedTrack.artist?.name || "Unknown Artist"}</p>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={closeModal} className="rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-slate-50">Cancel</button>
                            <button type="button" onClick={confirmAction} disabled={processingTrackId === selectedTrack.id} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-black hover:bg-black/90">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default SystemTracksListPage;