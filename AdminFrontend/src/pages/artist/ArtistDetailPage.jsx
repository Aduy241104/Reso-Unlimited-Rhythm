import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import artistService from "../../services/artistService";

const getStatusClasses = (status) => {
    switch (status) {
        case "verified":
        case "active":
        case "approved":
        case "calculated":
        case "paid":
            return "bg-emerald-100/70 text-emerald-700 border border-emerald-300 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
        case "pending":
            return "bg-yellow-100/70 text-yellow-800 border border-yellow-300 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
        case "rejected":
        case "inactive":
        case "disputed":
            return "bg-rose-100/70 text-rose-700 border-rose-300 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
        case "blocked":
            return "bg-red-100 text-red-700 border-red-300 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
        default:
            return "bg-slate-100 text-slate-700 border-slate-300 rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider";
    }
};

const ArtistDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [artist, setArtist] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

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

    if (isLoading) {
        return <div className="p-8 text-center text-xs font-bold font-mono text-slate-400">Fetching full artist context...</div>;
    }

    if (error || !artist) {
        return (
            <div className="p-8 text-center border border-black bg-red-50 text-red-700">
                <p className="font-bold">{error || "Artist database record not found."}</p>
                <button onClick={() => navigate(-1)} className="mt-4 border border-black bg-black px-4 py-2 text-xs font-bold text-white uppercase rounded-sm">Go Back</button>
            </div>
        );
    }

    return (
        <section className="space-y-6 text-black font-sans max-w-[1400px] mx-auto p-2 antialiased">
            
            {/* KHUNG 1: Header Top Bar */}
            <div className="border border-black bg-white p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    {artist.avatar ? (
                        <img src={artist.avatar} alt={artist.name} className="w-20 h-20 object-cover border border-slate-200" />
                    ) : (
                        <div className="w-20 h-20 bg-slate-50 border flex items-center justify-center text-xs text-slate-400 font-bold">No Avatar</div>
                    )}
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">Artist Inspection</p>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">{artist.name}</h1>
                        <p className="text-xs font-mono font-bold text-slate-400">{artist.email}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="border border-black bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition rounded-sm self-start sm:self-center"
                >
                    Back to List
                </button>
            </div>

            {/* KHUNG 2: Tháp thông tin tập trung bọc viền mảnh */}
            <div className="border border-black bg-white p-8 space-y-8">
                
                {/* 1. Tổng quan Metrics - TIÊU ĐỀ IN ĐẬM ĐÁNH HOA */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-4">General Info & System Performance</h3>
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Core Linked Login User</span>
                            <span className="text-xs font-mono text-slate-800 font-bold break-all block">{artist.email}</span>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Total Followers</span>
                            <span className="text-lg font-bold text-slate-950 block">{(artist.metrics?.followers || artist.stats?.followers || 0).toLocaleString()} hits</span>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Accumulated Stream Plays</span>
                            <span className="text-lg font-bold text-slate-950 block">{(artist.metrics?.totalStreams || artist.stats?.totalStreams || 0).toLocaleString()} hits</span>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Monthly Active Listeners</span>
                            <span className="text-lg font-bold text-slate-950 block">{(artist.metrics?.monthlyListeners || 0).toLocaleString()} listeners</span>
                        </div>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">System Account Created At</span>
                            <span className="text-sm font-bold text-slate-800 block">
                                {artist.createdAt ? new Date(artist.createdAt).toLocaleString("vi-VN") : "—"}
                            </span>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Releases Matrix Count</span>
                            <div className="flex gap-6 text-sm font-bold text-slate-800 pt-0.5">
                                <span>Tracks: <span className="text-slate-950 font-extrabold">{artist.metrics?.totalTracks || artist.totalTracks || 0}</span></span>
                                <span>Albums: <span className="text-slate-950 font-extrabold">{artist.metrics?.totalAlbums || 0}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Demographics - TIÊU ĐỀ IN ĐẬM ĐÁNH HOA */}
                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-4">Audience Demographics Distribution</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {artist.demographics && Object.keys(artist.demographics).length > 0 ? (
                            Object.entries(artist.demographics).map(([country, percentage]) => (
                                <div key={country} className="flex justify-between items-center bg-slate-50/70 border border-slate-100 rounded-xl p-4 text-xs font-bold">
                                    <span className="font-mono text-slate-400 uppercase block">📍 {country}</span>
                                    <span className="text-slate-950 font-extrabold bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-sm">{percentage}% share</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 italic font-mono pl-1">No demographic location analytics data tracked yet.</p>
                        )}
                    </div>
                </div>

                {/* 3. Đối soát tài chính - TIÊU ĐỀ IN ĐẬM ĐÁNH HOA */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-4">Advanced Financial Statement Ledger</h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs font-bold">
                        <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Available Wallet Amount (Khả dụng)</span>
                            <span className="text-base font-extrabold text-emerald-600 block">{(artist.finance?.availableAmount || 0).toLocaleString()} ₫</span>
                        </div>
                        <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Withdrawn Amount (Đã rút)</span>
                            <span className="text-base font-extrabold text-slate-800 block">{(artist.finance?.withdrawnAmount || 0).toLocaleString()} ₫</span>
                        </div>
                        <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Gross Revenue Amount (Tổng gộp)</span>
                            <span className="text-base font-extrabold text-slate-800 block">{(artist.finance?.grossRevenueAmount || 0).toLocaleString()} ₫</span>
                        </div>
                    </div>

                    {artist.finance && (
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold flex justify-between items-center">
                            <div><span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider mr-1">Last Calculations Settlement:</span> <span className="text-slate-700 font-mono font-bold">{artist.finance.lastCalculatedPeriod}</span></div>
                            <span className={getStatusClasses(artist.finance.status)}>
                                {artist.finance.status}
                            </span>
                        </div>
                    )}
                </div>

                {/* 4. Mạng xã hội - TIÊU ĐỀ IN ĐẬM ĐÁNH HOA */}
                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-3">External Verified Creator Identity Links</h3>
                    <div className="grid gap-3 sm:grid-cols-3 text-xs font-bold">
                        <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide mb-1">Facebook Endpoint</span>
                            {artist.socialLinks?.facebook ? <a href={artist.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-sky-600 font-bold hover:underline truncate block">{artist.socialLinks.facebook}</a> : <span className="text-slate-300 font-mono italic">— Connected</span>}
                        </div>
                        <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide mb-1">Instagram Node</span>
                            {artist.socialLinks?.instagram ? <a href={artist.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-sky-600 font-bold hover:underline truncate block">{artist.socialLinks.instagram}</a> : <span className="text-slate-300 font-mono italic">— Connected</span>}
                        </div>
                        <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide mb-1">YouTube Channel</span>
                            {artist.socialLinks?.youtube ? <a href={artist.socialLinks.youtube} target="_blank" rel="noreferrer" className="text-sky-600 font-bold hover:underline truncate block">{artist.socialLinks.youtube}</a> : <span className="text-slate-300 font-mono italic">— Connected</span>}
                        </div>
                    </div>
                </div>

                {/* 5. Tiểu sử - TIÊU ĐỀ IN ĐẬM ĐÁNH HOA */}
                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-2">Creator Biography Context</h3>
                    <div className="border border-slate-100 bg-slate-50/40 p-4 font-mono text-xs font-medium leading-relaxed text-slate-600 whitespace-pre-line rounded-xl">
                        {artist.bio || "No biography text records written for this active creator profile record."}
                    </div>
                </div>

                {/* 6. Quản trị hệ thống - TIÊU ĐỀ IN ĐẬM ĐÁNH HOA */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-4">Account System Governance</h3>
                    <div className="grid gap-4 sm:grid-cols-2 text-xs font-bold">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Verification Identity</span>
                            <span className={getStatusClasses(artist.verificationStatus)}>{artist.verificationStatus || "pending"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Visibility Active State</span>
                            <span className={getStatusClasses(artist.activeStatus)}>{artist.activeStatus || "active"}</span>
                        </div>
                    </div>

                    {artist.blockedReason && (
                        <div className="border border-red-200 bg-red-50 p-4 rounded-xl text-xs font-medium text-red-800">
                            <strong className="block uppercase text-[10px] font-black tracking-wider mb-1">Administrative Ban Blocked Reason:</strong> {artist.blockedReason}
                        </div>
                    )}
                </div>

            </div>
        </section>
    );
};

export default ArtistDetailPage;