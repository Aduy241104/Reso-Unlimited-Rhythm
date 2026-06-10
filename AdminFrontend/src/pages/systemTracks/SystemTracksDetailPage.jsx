import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminTrackDetailService } from "../../services/trackService";

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
        case "verified":
            return "bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 font-semibold text-xs";
        case "pending":
            return "bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full px-2.5 py-0.5 font-semibold text-xs";
        case "rejected":
        case "disputed":
            return "bg-rose-100 text-rose-700 border border-rose-200 rounded-full px-2.5 py-0.5 font-semibold text-xs";
        case "hidden":
            return "bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2.5 py-0.5 font-semibold text-xs";
        case "blocked":
            return "bg-red-100 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5 font-semibold text-xs";
        default:
            return "bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-0.5 font-semibold text-xs";
    }
};

const TrackDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [track, setTrack] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTrackDetail = async () => {
            setIsLoading(true);
            try {
                const data = await getAdminTrackDetailService(id);
                setTrack(data);
            } catch (err) {
                setError("Failed to retrieve complete track information.");
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchTrackDetail();
    }, [id]);

    if (isLoading) {
        return <div className="p-8 text-center text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">Fetching full track context...</div>;
    }

    if (error || !track) {
        return (
            <div className="p-8 text-center border border-black bg-red-50 text-red-700 rounded-none">
                <p className="font-bold">{error || "Track not found."}</p>
                <button onClick={() => navigate(-1)} className="block mx-auto mt-4 border border-black bg-black px-4 py-2 text-xs font-bold text-white uppercase tracking-wider rounded-none">Go Back</button>
            </div>
        );
    }

    return (
        <section className="space-y-6 text-slate-800 antialiased font-sans rounded-none">
            {/* KHUNG 1: Header Trang Chi Tiết & Artwork Visual */}
            <div className="border border-black bg-white p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-none">
                <div className="flex items-center gap-5 rounded-none">
                    {track.avatar ? (
                        <img src={track.avatar} alt={track.title} className="w-20 h-20 object-cover border border-slate-200 rounded-none" />
                    ) : (
                        <div className="w-20 h-20 bg-slate-50 border flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase rounded-none">No Avatar</div>
                    )}
                    <div className="space-y-0.5 rounded-none">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Track Inspection</p>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{track.title}</h1>
                        <p className="text-xs font-medium text-slate-500">by <span className="font-bold text-slate-800">{track.artist?.name || "Unknown Artist"}</span></p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="border border-black bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition rounded-none self-start md:self-center"
                >
                    Back to List
                </button>
            </div>

            {/* KHUNG 2: Toàn bộ khối thông tin chi tiết */}
            <div className="border border-black bg-white p-8 space-y-8 rounded-none">
                
                {/* 1. Metadata chung & Thống kê số liệu */}
                <div className="rounded-none">
                    <h3 className="text-xs font-extrabold uppercase tracking-[0.15em] text-slate-900 mb-4">General Info & System Performance</h3>
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 rounded-none">
                        <div className="bg-slate-50 border border-slate-100 p-4 space-y-1 rounded-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Track ID</span>
                            <span className="text-xs font-mono text-slate-800 font-bold break-all block">{track.id}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 space-y-1 rounded-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Duration</span>
                            <span className="text-base font-bold text-slate-900 block">{formatDuration(track.duration)}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 space-y-1 rounded-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Total Listen Plays</span>
                            <span className="text-base font-bold text-slate-900 block">{(track.stats?.totalPlay || 0).toLocaleString()} hits</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 space-y-1 rounded-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Total Favorite Likes</span>
                            <span className="text-base font-bold text-slate-900 block">{(track.stats?.totalLike || 0).toLocaleString()} likes</span>
                        </div>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2 mt-4 rounded-none">
                        <div className="bg-slate-50 border border-slate-100 p-4 space-y-1 rounded-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Album Context</span>
                            <span className="text-sm font-bold text-slate-800 block">{track.album?.title || "Single / No Album"}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 space-y-1 rounded-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Genres Distribution</span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5 rounded-none">
                                {track.genres?.length > 0 ? track.genres.map(g => (
                                    <span key={g.id} className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 border border-slate-300 font-bold uppercase tracking-wider rounded-none">{g.name}</span>
                                )) : <span className="text-xs text-slate-400 font-mono">—</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. File âm thanh mã hóa chất lượng */}
                <div className="border-t border-slate-100 pt-6 rounded-none">
                    <h3 className="text-xs font-extrabold uppercase tracking-[0.15em] text-slate-900 mb-4">Audio Transcoding Source Nodes</h3>
                    <div className="grid gap-3 sm:grid-cols-2 rounded-none">
                        {track.audioFiles?.length > 0 ? track.audioFiles.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 text-xs font-bold rounded-none">
                                <div className="space-y-1 rounded-none">
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-wide">{file.label} Quality Node</span>
                                    <a href={file.url} target="_blank" rel="noreferrer" className="text-sky-700 font-bold hover:underline break-all">Click to preview audio file</a>
                                </div>
                                <span className="bg-white border px-3 py-1 font-mono text-[11px] text-slate-700 font-bold rounded-none">{file.bitrate} kbps ({file.format})</span>
                            </div>
                        )) : <p className="text-xs text-slate-400 font-mono italic">No audio files transcoded yet.</p>}
                    </div>
                </div>

                {/* 3. Bản quyền Tác giả nâng cao */}
                <div className="border-t border-slate-100 pt-6 space-y-4 rounded-none">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-4">Advanced Copyright Legal Context</h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs font-bold rounded-none">
                        <div className="p-4 bg-slate-50 border border-slate-100 space-y-1 rounded-none">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Composer (Nhạc sĩ)</span>
                            <span className="text-sm font-bold text-slate-800 block">{track.copyright?.composer || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 space-y-1 rounded-none">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Lyricist (Lời bài hát)</span>
                            <span className="text-sm font-bold text-slate-800 block">{track.copyright?.lyricist || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 space-y-1 rounded-none">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Producer (Sản xuất)</span>
                            <span className="text-sm font-bold text-slate-800 block">{track.copyright?.producer || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 space-y-1 rounded-none">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Copyright Owner</span>
                            <span className="text-sm font-bold text-slate-800 block">{track.copyright?.copyrightOwner || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 space-y-1 rounded-none">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Recording Master Owner</span>
                            <span className="text-sm font-bold text-slate-800 block">{track.copyright?.recordingOwner || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 flex flex-wrap gap-1.5 items-center rounded-none">
                            <span className={`px-2 py-0.5 border font-bold text-[9px] uppercase tracking-wider rounded-none ${track.copyright?.isOriginal ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>Original</span>
                            <span className={`px-2 py-0.5 border font-bold text-[9px] uppercase tracking-wider rounded-none ${track.copyright?.isCover ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>Cover</span>
                            <span className={`px-2 py-0.5 border font-bold text-[9px] uppercase tracking-wider rounded-none ${track.copyright?.isRemix ? "bg-sky-50 text-sky-700 border-sky-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>Remix</span>
                        </div>
                    </div>

                    {/* Meta nếu là bài Cover / Remix */}
                    {(track.copyright?.originalTrackTitle || track.copyright?.originalArtistName) && (
                        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-none text-xs font-bold grid sm:grid-cols-2 gap-2">
                            <div><span className="text-slate-400 uppercase text-[10px] font-bold mr-1">Original Track:</span> <span className="text-slate-900 uppercase">{track.copyright?.originalTrackTitle || "—"}</span></div>
                            <div><span className="text-slate-400 uppercase text-[10px] font-bold mr-1">Original Artist:</span> <span className="text-slate-900 uppercase">{track.copyright?.originalArtistName || "—"}</span></div>
                        </div>
                    )}

                    {/* Chứng từ đính kèm */}
                    {track.copyright?.licenseDocumentUrls?.length > 0 && (
                        <div className="border border-slate-200 bg-slate-50 p-4 text-xs font-bold space-y-1 rounded-none">
                            <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Verification Legal Documents</span>
                            <div className="flex flex-col gap-1 rounded-none">
                                {track.copyright.licenseDocumentUrls.map((doc, i) => (
                                    <a key={i} href={doc} target="_blank" rel="noreferrer" className="text-sky-700 font-bold hover:underline">📄 Open System Attachment Proof #{i + 1}</a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-none flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-500 uppercase text-[10px] tracking-wide">Copyright Verification Status</span>
                        <span className={getStatusClasses(track.copyright?.copyrightStatus)}>
                            {track.copyright?.copyrightStatus || "pending"}
                        </span>
                    </div>
                </div>

                {/* 4. Lời bài hát (Static & Synced) */}
                <div className="border-t border-slate-100 pt-6 grid gap-6 md:grid-cols-2 rounded-none">
                    <div className="rounded-none">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-3">Static Plain Lyrics</h3>
                        <div className="border border-slate-200 bg-slate-50 p-4 h-48 overflow-y-auto font-mono text-xs leading-relaxed text-slate-600 rounded-none">
                            {track.lyricsStatic || "No static text lyrics provided for this track."}
                        </div>
                    </div>
                    <div className="rounded-none">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-3">Synced Lyrics (LRC File Node)</h3>
                        <div className="border border-slate-200 bg-slate-50 p-4 h-48 flex flex-col justify-center items-center text-center font-bold rounded-none">
                            {track.lyricsSyncUrl ? (
                                <div className="space-y-2 rounded-none">
                                    <span className="text-emerald-700 text-xl font-black">✓ SUCCESS</span>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Timed LRC structural file is hosted on server.</p>
                                    <a href={track.lyricsSyncUrl} target="_blank" rel="noreferrer" className="inline-block text-[10px] uppercase tracking-wider bg-white border border-black px-4 py-2 font-bold hover:bg-slate-50 transition rounded-none">Download LRC File</a>
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400 font-mono italic rounded-none">No synced dynamic timeline lyrics available.</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. Trạng thái kiểm duyệt hệ thống nâng cao */}
                <div className="border-t border-slate-100 pt-6 space-y-4 rounded-none">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-4">Moderation Registry Logs</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs font-bold rounded-none">
                        <div className="p-4 bg-slate-50 border border-slate-100 flex flex-col justify-between gap-1 rounded-none">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wide">Approval Review Status</span>
                            <span className={`inline-flex ${getStatusClasses(track.approvalStatus)}`}>{track.approvalStatus}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 flex flex-col justify-between gap-1 rounded-none">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wide">Active Visibility State</span>
                            <span className={`inline-flex ${getStatusClasses(track.activeStatus)}`}>{track.activeStatus}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 flex flex-col justify-between gap-1 rounded-none">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wide">Reviewed By Admin</span>
                            <span className="font-mono text-slate-700 block mt-1 truncate rounded-none">{track.moderation?.reviewedBy?.email || "Not reviewed / Automated system"}</span>
                        </div>
                    </div>

                    {/* Nhật ký Violation Flags */}
                    {track.moderation?.violationFlags?.length > 0 && (
                        <div className="border border-rose-300 bg-rose-50 p-4 text-xs font-bold space-y-2 rounded-none">
                            <span className="text-rose-800 text-[10px] uppercase tracking-wide block">Detected System Violation Flags</span>
                            <div className="flex flex-wrap gap-1.5 rounded-none">
                                {track.moderation.violationFlags.map((flag, idx) => (
                                    <span key={idx} className="bg-rose-100 border border-rose-200 text-rose-700 text-[9px] uppercase tracking-wider px-2 py-0.5 font-bold rounded-none">{flag.replace(/_/g, " ")}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {track.rejectReason && (
                        <div className="border border-slate-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 rounded-none">
                            <strong className="block uppercase text-[10px] tracking-wide mb-0.5">Rejection Reason context:</strong> {track.rejectReason}
                        </div>
                    )}
                    {track.hiddenReason && (
                        <div className="border border-slate-200 bg-orange-50 p-4 text-xs font-semibold text-orange-700 rounded-none">
                            <strong className="block uppercase text-[10px] tracking-wide mb-0.5">Hidden System Reason context:</strong> {track.hiddenReason}
                        </div>
                    )}
                    {track.blockedReason && (
                        <div className="border border-slate-200 bg-red-50 p-4 text-xs font-semibold text-red-700 rounded-none">
                            <strong className="block uppercase text-[10px] tracking-wide mb-0.5">Administrative Ban Blocked Reason:</strong> {track.blockedReason}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default TrackDetailPage;