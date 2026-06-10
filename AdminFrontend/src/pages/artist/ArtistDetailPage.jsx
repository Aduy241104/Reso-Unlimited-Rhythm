import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import artistService, { updateAdminArtistStatusService } from "../../services/artistService";

// Danh sách tùy chọn lý do khóa tài khoản nghệ sĩ đồng bộ hệ thống
const BLOCK_REASON_OPTIONS = [
    { value: "fake_identity", label: "Fake Identity (Mạo danh nghệ sĩ khác)" },
    { value: "repost_copyright", label: "Mass Copyright Violation (Vi phạm bản quyền hàng loạt)" },
    { value: "spam_content", label: "Spam Content (Cố tình đăng tải rác dữ liệu)" },
    { value: "fraudulent_streams", label: "Streaming Fraud (Gian lận lượt nghe/ảo)" },
    { value: "other", label: "Other Violations (Các hành vi vi phạm quy chuẩn khác)" },
];

const getStatusClasses = (status) => {
    switch (status) {
        case "verified":
        case "active":
        case "approved":
        case "calculated":
        case "paid":
            return "bg-emerald-100/70 text-emerald-700 border border-emerald-300 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider inline-block";
        case "pending":
            return "bg-yellow-100/70 text-yellow-800 border border-yellow-300 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider inline-block";
        case "rejected":
        case "inactive":
        case "disputed":
            return "bg-rose-100/70 text-rose-700 border-rose-300 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider inline-block";
        case "blocked":
            return "bg-red-100 text-red-700 border-red-300 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider inline-block";
        default:
            return "bg-slate-100 text-slate-700 border-slate-300 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider inline-block";
    }
};

const ArtistDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [artist, setArtist] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // State phục vụ cho Modal Block
    const [modalOpen, setModalOpen] = useState(false);
    const [adminNote, setAdminNote] = useState("");
    const [blockReasons, setBlockReasons] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const fetchArtistDetail = async () => {
            setIsLoading(true);
            setError("");
            try {
                const response = await artistService.getAdminArtistDetailService(id);
                const finalData = response?.data?.artist || response?.artist || response?.data || response;
                if (isMounted) setArtist(finalData);
            } catch (err) {
                if (isMounted) setError("Failed to retrieve complete artist information ledger.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        if (id) fetchArtistDetail();
        return () => { isMounted = false; };
    }, [id]);

    // Xử lý trực tiếp hành động Mở khóa (Unblock) hoặc Kích hoạt mở Modal điền lý do Khóa (Block)
    const handleToggleBlockAction = async () => {
        if (!artist) return;

        if (artist.activeStatus !== "blocked") {
            setAdminNote("");
            setBlockReasons([]);
            setModalOpen(true);
            return;
        }

        // Thực thi Unblock tài khoản ngay lập tức
        setIsProcessing(true);
        setError("");
        try {
            const updated = await updateAdminArtistStatusService(id, { activeStatus: "active" });
            setArtist((prev) => ({
                ...prev,
                activeStatus: updated.activeStatus,
                blockedReason: ""
            }));
        } catch (err) {
            setError(err?.message || "Could not execute unblock pipeline operation.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Xác nhận gửi cấu hình dữ liệu từ Modal lên Server để Block tài khoản
    const handleConfirmBlockEnforcement = async () => {
        if (!artist) return;
        setIsProcessing(true);
        try {
            const selectedLabels = blockReasons.map(r => BLOCK_REASON_OPTIONS.find(o => o.value === r)?.label || r);
            const combinedReason = selectedLabels.length > 0 
                ? `[${selectedLabels.join(", ")}] ${adminNote}`.trim()
                : adminNote.trim();

            const updated = await updateAdminArtistStatusService(id, {
                activeStatus: "blocked",
                blockedReason: combinedReason
            });

            setArtist((prev) => ({
                ...prev,
                activeStatus: updated.activeStatus,
                blockedReason: combinedReason
            }));
            setModalOpen(false);
        } catch (err) {
            setError(err?.message || "Could not execute block pipeline operation.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReasonCheckboxToggle = (reasonValue) => {
        setBlockReasons((prev) => 
            prev.includes(reasonValue) ? prev.filter((r) => r !== reasonValue) : [...prev, reasonValue]
        );
    };

    if (isLoading) {
        return <div className="p-8 text-center text-xs font-bold font-mono text-slate-400">Fetching full artist context...</div>;
    }

    if (error && !artist) {
        return (
            <div className="p-8 text-center border border-black bg-red-50 text-red-700">
                <p className="font-bold">{error || "Artist database record not found."}</p>
                <button onClick={() => navigate(-1)} className="mt-4 border border-black bg-black px-4 py-2 text-xs font-bold text-white uppercase rounded-none">Go Back</button>
            </div>
        );
    }

    return (
        <section className="space-y-6 text-black font-sans max-w-[1400px] mx-auto p-2 antialiased rounded-none">
            {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 rounded-none">{error}</div>}
            
            {/* KHUNG 1: Header Top Bar */}
            <div className="border border-black bg-white p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-none">
                <div className="flex items-center gap-5">
                    {artist.avatar ? (
                        <img src={artist.avatar} alt={artist.name} className="w-20 h-20 object-cover border border-slate-200 rounded-none" />
                    ) : (
                        <div className="w-20 h-20 bg-slate-50 border flex items-center justify-center text-xs text-slate-400 font-bold rounded-none">No Avatar</div>
                    )}
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">Artist Inspection</p>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">{artist.name}</h1>
                        <p className="text-xs font-mono font-bold text-slate-400">{artist.email}</p>
                    </div>
                </div>

                <div className="flex gap-2 self-start sm:self-center rounded-none">
                    {/* NÚT BẤM BLOCK / UNBLOCK ĐỘNG KHỚP PHONG CÁCH HỆ THỐNG */}
                    <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleToggleBlockAction}
                        className={`border border-black px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition rounded-none disabled:opacity-50 ${
                            artist.activeStatus === "blocked" ? "bg-sky-600 hover:bg-sky-700" : "bg-rose-600 hover:bg-rose-700"
                        }`}
                    >
                        {artist.activeStatus === "blocked" ? "Unblock Artist" : "Block Artist"}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="border border-black bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition rounded-none"
                    >
                        Back to List
                    </button>
                </div>
            </div>

            {/* KHUNG 2: Tháp thông tin tập trung bọc viền mảnh */}
            <div className="border border-black bg-white p-8 space-y-8 rounded-none">
                
                {/* 1. Tổng quan Metrics */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-4">General Info & System Performance</h3>
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 rounded-none">
                        <div className="bg-slate-50/70 border border-slate-100 rounded-none p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Core Linked Login User</span>
                            <span className="text-xs font-mono text-slate-800 font-bold break-all block">{artist.email}</span>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-none p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Total Followers</span>
                            <span className="text-lg font-bold text-slate-950 block">{(artist.metrics?.followers || artist.stats?.followers || 0).toLocaleString()} hits</span>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-none p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Accumulated Stream Plays</span>
                            <span className="text-lg font-bold text-slate-950 block">{(artist.metrics?.totalStreams || artist.stats?.totalStreams || 0).toLocaleString()} hits</span>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-none p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Monthly Active Listeners</span>
                            <span className="text-lg font-bold text-slate-950 block">{(artist.metrics?.monthlyListeners || 0).toLocaleString()} listeners</span>
                        </div>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2 mt-4 rounded-none">
                        <div className="bg-slate-50/70 border border-slate-100 rounded-none p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">System Account Created At</span>
                            <span className="text-sm font-bold text-slate-800 block">
                                {artist.createdAt ? new Date(artist.createdAt).toLocaleString("vi-VN") : "—"}
                            </span>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-none p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Releases Matrix Count</span>
                            <div className="flex gap-6 text-sm font-bold text-slate-800 pt-0.5">
                                <span>Tracks: <span className="text-slate-950 font-extrabold">{artist.metrics?.totalTracks || artist.totalTracks || 0}</span></span>
                                <span>Albums: <span className="text-slate-950 font-extrabold">{artist.metrics?.totalAlbums || 0}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Demographics */}
                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-4">Audience Demographics Distribution</h3>
                    <div className="grid gap-3 sm:grid-cols-3 rounded-none">
                        {artist.demographics && Object.keys(artist.demographics).length > 0 ? (
                            Object.entries(artist.demographics).map(([country, percentage]) => (
                                <div key={country} className="flex justify-between items-center bg-slate-50/70 border border-slate-100 rounded-none p-4 text-xs font-bold">
                                    <span className="font-mono text-slate-400 uppercase block">📍 {country}</span>
                                    <span className="text-slate-950 font-extrabold bg-white border border-slate-200 px-2.5 py-0.5 rounded-none shadow-sm">{percentage}% share</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 italic font-mono pl-1">No demographic location analytics data tracked yet.</p>
                        )}
                    </div>
                </div>

                {/* 3. Đối soát tài chính */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-4">Advanced Financial Statement Ledger</h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs font-bold rounded-none">
                        <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-none space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Available Wallet Amount (Khả dụng)</span>
                            <span className="text-base font-extrabold text-emerald-600 block">{(artist.finance?.availableAmount || 0).toLocaleString()} ₫</span>
                        </div>
                        <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-none space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Withdrawn Amount (Đã rút)</span>
                            <span className="text-base font-extrabold text-slate-800 block">{(artist.finance?.withdrawnAmount || 0).toLocaleString()} ₫</span>
                        </div>
                        <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-none space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Gross Revenue Amount (Tổng gộp)</span>
                            <span className="text-base font-extrabold text-slate-800 block">{(artist.finance?.grossRevenueAmount || 0).toLocaleString()} ₫</span>
                        </div>
                    </div>

                    {artist.finance && (
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-none text-xs font-bold flex justify-between items-center">
                            <div><span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider mr-1">Last Calculations Settlement:</span> <span className="text-slate-700 font-mono font-bold">{artist.finance.lastCalculatedPeriod}</span></div>
                            <span className={getStatusClasses(artist.finance.status)}>
                                {artist.finance.status}
                            </span>
                        </div>
                    )}
                </div>

                {/* 4. Mạng xã hội */}
                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-3">External Verified Creator Identity Links</h3>
                    <div className="grid gap-3 sm:grid-cols-3 text-xs font-bold rounded-none">
                        <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-none">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide mb-1">Facebook Endpoint</span>
                            {artist.socialLinks?.facebook ? <a href={artist.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-sky-600 font-bold hover:underline truncate block">{artist.socialLinks.facebook}</a> : <span className="text-slate-300 font-mono italic">— Connected</span>}
                        </div>
                        <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-none">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide mb-1">Instagram Node</span>
                            {artist.socialLinks?.instagram ? <a href={artist.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-sky-600 font-bold hover:underline truncate block">{artist.socialLinks.instagram}</a> : <span className="text-slate-300 font-mono italic">— Connected</span>}
                        </div>
                        <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-none">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide mb-1">YouTube Channel</span>
                            {artist.socialLinks?.youtube ? <a href={artist.socialLinks.youtube} target="_blank" rel="noreferrer" className="text-sky-600 font-bold hover:underline truncate block">{artist.socialLinks.youtube}</a> : <span className="text-slate-300 font-mono italic">— Connected</span>}
                        </div>
                    </div>
                </div>

                {/* 5. Tiểu sử */}
                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-2">Creator Biography Context</h3>
                    <div className="border border-slate-100 bg-slate-50/40 p-4 font-mono text-xs font-medium leading-relaxed text-slate-600 whitespace-pre-line rounded-none">
                        {artist.bio || "No biography text records written for this active creator profile record."}
                    </div>
                </div>

                {/* 6. Quản trị hệ thống */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-4">Account System Governance</h3>
                    <div className="grid gap-4 sm:grid-cols-2 text-xs font-bold rounded-none">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-none flex justify-between items-center">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Verification Identity</span>
                            <span className={getStatusClasses(artist.verificationStatus)}>{artist.verificationStatus || "pending"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-none flex justify-between items-center">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Visibility Active State</span>
                            <span className={getStatusClasses(artist.activeStatus)}>{artist.activeStatus || "active"}</span>
                        </div>
                    </div>

                    {artist.blockedReason && (
                        <div className="border border-red-200 bg-red-50 p-4 rounded-none text-xs font-medium text-red-800">
                            <strong className="block uppercase text-[10px] font-black tracking-wider mb-1">Administrative Ban Blocked Reason:</strong> {artist.blockedReason}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL KHÓA TÀI KHOẢN NGHỆ SĨ CHUẨN ĐỒNG BỘ LAYOUT */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm rounded-none">
                    <div className="w-full max-w-xl border border-black bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto rounded-none">
                        <div className="flex items-start justify-between rounded-none">
                            <div className="rounded-none">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Security Enforcement</p>
                                <h2 className="mt-1 text-xl font-bold uppercase text-slate-900">Block Artist Account</h2>
                            </div>
                            <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold transition rounded-none">✕</button>
                        </div>

                        <div className="border border-slate-200 bg-slate-50 p-4 text-xs font-bold rounded-none">
                            <p className="text-slate-900 uppercase tracking-tight rounded-none">{artist.name}</p>
                            <p className="mt-1 text-[10px] text-slate-400 uppercase rounded-none">Email: {artist.email}</p>
                        </div>

                        <div className="space-y-4 rounded-none">
                            <div className="space-y-2 rounded-none">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Violation Reason Flags (Chọn lý do hệ thống)</label>
                                <div className="grid gap-2 sm:grid-cols-2 rounded-none">
                                    {BLOCK_REASON_OPTIONS.map((reason) => {
                                        const isChecked = blockReasons.includes(reason.value);
                                        return (
                                            <button
                                                key={reason.value}
                                                type="button"
                                                onClick={() => handleReasonCheckboxToggle(reason.value)}
                                                className={`flex items-center text-left gap-3 p-3 border text-xs font-bold transition rounded-none ${
                                                    isChecked ? "bg-rose-50 border-rose-400 text-rose-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 flex items-center justify-center border text-[9px] rounded-none ${isChecked ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-300"}`}>
                                                    {isChecked && "✓"}
                                                </div>
                                                {reason.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2 rounded-none">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 rounded-none">Detailed Enforcement Explanation (Lý do cụ thể bắt buộc)</label>
                                <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    rows={3}
                                    className="w-full border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 rounded-none"
                                    placeholder="Điền giải trình hoặc trích lục bằng chứng cụ thể để khóa tài khoản..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 rounded-none">
                            <button type="button" onClick={() => setModalOpen(false)} className="border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition rounded-none">
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={handleConfirmBlockEnforcement} 
                                disabled={isProcessing || !adminNote.trim() || blockReasons.length === 0} 
                                className="border border-black px-5 py-2 text-xs font-black uppercase tracking-wider text-white transition disabled:opacity-40 rounded-none bg-rose-600 hover:bg-rose-700"
                            >
                                {isProcessing ? "Enforcing..." : "Confirm Block"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ArtistDetailPage;