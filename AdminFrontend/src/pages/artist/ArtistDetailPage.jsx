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
            return "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider inline-block";
        case "pending":
            return "bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider inline-block";
        case "rejected":
        case "inactive":
        case "disputed":
            return "bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider inline-block";
        case "blocked":
            return "bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider inline-block";
        default:
            return "bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider inline-block";
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

    const handleToggleBlockAction = async () => {
        if (!artist) return;

        if (artist.activeStatus !== "blocked") {
            setAdminNote("");
            setBlockReasons([]);
            setModalOpen(true);
            return;
        }

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
            <div className="mx-auto max-w-xl mt-12 p-6 rounded-2xl border border-rose-100 bg-rose-50 text-center text-rose-800 shadow-sm">
                <p className="font-bold text-sm">{error || "Artist database record not found."}</p>
                <button onClick={() => navigate(-1)} className="mt-4 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800">
                    Go Back
                </button>
            </div>
        );
    }

    const getStatusBorderColor = () => {
        if (artist?.activeStatus === "active") return "border-l-[4px] border-l-emerald-500";
        if (artist?.activeStatus === "blocked") return "border-l-[4px] border-l-rose-500";
        return "border-l-[4px] border-l-slate-300";
    };

    return (
        <section className="mx-auto max-w-7xl space-y-6 p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-800 antialiased">
            {error && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 shadow-sm">
                    {error}
                </div>
            )}
            
            {/* KHUNG 1: Header Top Bar */}
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between border border-slate-100">
                <div className="flex items-center gap-4">
                    {artist.avatar ? (
                        <img src={artist.avatar} alt={artist.name} className="w-16 h-16 object-cover rounded-full border border-slate-100" />
                    ) : (
                        <div className="w-16 h-16 bg-slate-900 flex items-center justify-center text-sm text-white font-bold rounded-full">
                            {artist.name?.[0]?.toUpperCase() || "?"}
                        </div>
                    )}
                    <div className="space-y-0.5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Hệ thống nghệ sĩ</p>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            {artist.name}
                            <span className={getStatusClasses(artist.activeStatus)}>
                                {artist.activeStatus || "active"}
                            </span>
                        </h1>
                        <p className="text-xs font-mono font-medium text-slate-400">{artist.email}</p>
                    </div>
                </div>

                <div className="flex gap-2.5 self-start sm:self-center">
                    <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleToggleBlockAction}
                        className={`rounded-xl px-5 py-2.5 text-xs font-bold shadow-sm transition disabled:opacity-50 text-white ${
                            artist.activeStatus === "blocked" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800"
                        }`}
                    >
                        {artist.activeStatus === "blocked" ? "Mở khóa nghệ sĩ ↗" : "Khóa nghệ sĩ ↗"}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                    >
                        Quay lại
                    </button>
                </div>
            </div>

            {/* HIỂN THỊ BANNER LÝ DO KHÓA NẾU BỊ ĐÌNH CHỈ */}
            {artist.activeStatus === "blocked" && artist.blockedReason && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-3 shadow-sm">
                    <span className="text-lg">⚠️</span>
                    <div>
                        <h3 className="font-bold text-sm">Hồ sơ nghệ sĩ này hiện đang bị đình chỉ hoạt động</h3>
                        <p className="mt-1 text-xs text-rose-700/90 leading-relaxed font-semibold">
                            <span className="underline">Lý do hệ thống trích xuất:</span> {artist.blockedReason}
                        </p>
                    </div>
                </div>
            )}

            {/* KHUNG SỐ LIỆU THỐNG KÊ CHI TIẾT (KPI METRICS) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng người theo dõi</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {(artist.metrics?.followers || artist.stats?.followers || 0).toLocaleString()} hits
                    </p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng lượt Stream Plays</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {(artist.metrics?.totalStreams || artist.stats?.totalStreams || 0).toLocaleString()} hits
                    </p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lượt nghe hàng tháng</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {(artist.metrics?.monthlyListeners || 0).toLocaleString()} người
                    </p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Danh mục phát hành</p>
                    <div className="mt-3 flex gap-4 text-xs font-bold text-slate-700">
                        <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Tracks: <span className="text-slate-950 font-extrabold">{artist.metrics?.totalTracks || artist.totalTracks || 0}</span></span>
                        <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Albums: <span className="text-slate-950 font-extrabold">{artist.metrics?.totalAlbums || 0}</span></span>
                    </div>
                </div>
            </div>

            {/* BỐ CỤC CARD KHỐI NỘI DUNG CHÍNH (2:1 Layout) */}
            <div className="grid gap-6 lg:grid-cols-3">
                
                {/* CỘT TRÁI (THÔNG TIN CƠ BẢN + DEMOGRAPHICS + TÀI CHÍNH) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Thông tin hồ sơ tổng quan */}
                    <div className={`rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all ${getStatusBorderColor()}`}>
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3">Hồ sơ & Phân quyền gốc</h2>
                        <div className="mt-4 grid gap-y-4 gap-x-6 sm:grid-cols-2">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Liên kết tài khoản email</label>
                                <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{artist.email || "-"}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngày thiết lập tài khoản</label>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                    {artist.createdAt ? new Date(artist.createdAt).toLocaleString("vi-VN") : "—"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Đối soát tài chính nâng cao */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3">Dữ liệu đối soát tài chính doanh thu</h2>
                        
                        <div className="grid gap-4 sm:grid-cols-3 text-xs font-bold mt-4">
                            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Ví khả dụng</span>
                                <span className="text-base font-extrabold text-emerald-600 block">{(artist.finance?.availableAmount || 0).toLocaleString()} ₫</span>
                            </div>
                            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Đã rút tiền</span>
                                <span className="text-base font-extrabold text-slate-800 block">{(artist.finance?.withdrawnAmount || 0).toLocaleString()} ₫</span>
                            </div>
                            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Doanh thu gộp (Gross)</span>
                                <span className="text-base font-extrabold text-slate-800 block">{(artist.finance?.grossRevenueAmount || 0).toLocaleString()} ₫</span>
                            </div>
                        </div>

                        {artist.finance && (
                            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold flex justify-between items-center">
                                <div>
                                    <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider mr-1">Chu kỳ đối soát gần nhất:</span> 
                                    <span className="text-slate-700 font-mono font-bold">{artist.finance.lastCalculatedPeriod || "N/A"}</span>
                                </div>
                                <span className={getStatusClasses(artist.finance.status)}>
                                    {artist.finance.status}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Phân phối khu vực Demographics */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3">Phân bổ vị trí khán giả (Demographics)</h2>
                        <div className="grid gap-3 sm:grid-cols-3 mt-4">
                            {artist.demographics && Object.keys(artist.demographics).length > 0 ? (
                                Object.entries(artist.demographics).map(([country, percentage]) => (
                                    <div key={country} className="flex justify-between items-center bg-slate-50/70 border border-slate-100 rounded-xl p-4 text-xs font-bold">
                                        <span className="font-mono text-slate-400 uppercase block">📍 {country}</span>
                                        <span className="text-slate-950 font-extrabold bg-white border border-slate-100 px-2 py-0.5 rounded-lg shadow-sm">{percentage}%</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 italic font-medium pl-1">Chưa có dữ liệu vị trí người nghe.</p>
                            )}
                        </div>
                    </div>

                </div>

                {/* CỘT PHẢI (GOVERNANCE + SOCIAL LINKS + BIO) */}
                <div className="space-y-6">
                    
                    {/* Quản trị & Xác minh hệ thống */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3">Trạng thái định danh quản trị</h2>
                        <div className="mt-4 space-y-3">
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-400 uppercase text-[10px] tracking-wider">Trạng thái tích xanh</span>
                                <span className={getStatusClasses(artist.verificationStatus)}>{artist.verificationStatus || "pending"}</span>
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-400 uppercase text-[10px] tracking-wider">Trạng thái hiển thị</span>
                                <span className={getStatusClasses(artist.activeStatus)}>{artist.activeStatus || "active"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Mạng xã hội liên kết */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3">Kênh định danh mạng xã hội</h2>
                        <div className="mt-4 space-y-3 text-xs font-bold">
                            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                                <span className="text-slate-400 block text-[10px] uppercase tracking-wide mb-1">Facebook Endpoint</span>
                                {artist.socialLinks?.facebook ? <a href={artist.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline truncate block">{artist.socialLinks.facebook}</a> : <span className="text-slate-300 font-medium italic">— Chưa liên kết</span>}
                            </div>
                            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                                <span className="text-slate-400 block text-[10px] uppercase tracking-wide mb-1">Instagram Node</span>
                                {artist.socialLinks?.instagram ? <a href={artist.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline truncate block">{artist.socialLinks.instagram}</a> : <span className="text-slate-300 font-medium italic">— Chưa liên kết</span>}
                            </div>
                            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                                <span className="text-slate-400 block text-[10px] uppercase tracking-wide mb-1">YouTube Channel</span>
                                {artist.socialLinks?.youtube ? <a href={artist.socialLinks.youtube} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline truncate block">{artist.socialLinks.youtube}</a> : <span className="text-slate-300 font-medium italic">— Chưa liên kết</span>}
                            </div>
                        </div>
                    </div>

                    {/* Tiểu sử Creator Biography */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3">Tiểu sử (Biography)</h2>
                        <div className="mt-3 border border-slate-100 bg-slate-50/40 p-4 font-mono text-xs font-medium leading-relaxed text-slate-500 whitespace-pre-line rounded-xl">
                            {artist.bio || "Không có dữ liệu văn bản tiểu sử nghệ sĩ."}
                        </div>
                    </div>

                </div>
            </div>

            {/* MODAL KHÓA TÀI KHOẢN NGHỆ SĨ CHUẨN ĐỒNG BỘ LAYOUT VỚI USER */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
                    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5 animate-scale-up">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">An toàn hệ thống</p>
                                <h2 className="mt-0.5 text-lg font-bold text-slate-900 uppercase">Khóa tài khoản nghệ sĩ</h2>
                            </div>
                            <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold transition">✕</button>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold">
                            <p className="text-slate-900 uppercase">{artist.name}</p>
                            <p className="mt-1 text-[10px] text-slate-400 uppercase font-mono">Email nhận dạng: {artist.email}</p>
                        </div>

                        <div className="space-y-4">
                            {/* PHẦN CHỌN NHIỀU CHECKBOX LÝ DO HỆ THỐNG */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Violation Reason Flags (Chọn lý do hệ thống)</label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {BLOCK_REASON_OPTIONS.map((reason) => {
                                        const isChecked = blockReasons.includes(reason.value);
                                        return (
                                            <button
                                                key={reason.value}
                                                type="button"
                                                onClick={() => handleReasonCheckboxToggle(reason.value)}
                                                className={`flex items-center text-left gap-3 p-3 border text-xs font-bold transition rounded-xl ${
                                                    isChecked 
                                                        ? "bg-rose-50 border-rose-300 text-rose-700" 
                                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 flex items-center justify-center border text-[9px] rounded-md ${
                                                    isChecked ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-300"
                                                }`}>
                                                    {isChecked && "✓"}
                                                </div>
                                                {reason.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Ô NHẬP GIẢI TRÌNH CHI TIẾT */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Detailed Enforcement Explanation (Giải trình chi tiết bắt buộc)</label>
                                <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    rows={3}
                                    className="w-full border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 rounded-xl resize-none transition"
                                    placeholder="Điền giải trình hoặc trích lục bằng chứng cụ thể để khóa tài khoản nghệ sĩ..."
                                    required
                                />
                            </div>
                        </div>

                        {/* CỤM NÚT ĐIỀU HƯỚNG CỦA MODAL */}
                        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                type="button" 
                                onClick={handleConfirmBlockEnforcement} 
                                disabled={isProcessing || !adminNote.trim() || blockReasons.length === 0} 
                                className="rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? "Đang xử lý..." : "Xác nhận khóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ArtistDetailPage;