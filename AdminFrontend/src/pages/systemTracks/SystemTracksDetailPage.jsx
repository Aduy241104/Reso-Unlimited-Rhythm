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
            return "bg-emerald-100 text-emerald-700 border-emerald-200";
        case "pending":
            return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "rejected":
        case "disputed":
            return "bg-rose-100 text-rose-700 border-rose-200";
        case "hidden":
            return "bg-orange-100 text-orange-700 border-orange-200";
        case "blocked":
            return "bg-red-100 text-red-700 border-red-200";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
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
        return <div className="p-8 text-center text-sm font-semibold text-slate-500">Fetching full track context...</div>;
    }

    if (error || !track) {
        return (
            <div className="p-8 text-center border border-red-200 bg-red-50 rounded-[2rem] text-red-700">
                {error || "Track not found."}
                <button onClick={() => navigate(-1)} className="block mx-auto mt-4 rounded-xl bg-black px-4 py-2 text-xs text-white">Go Back</button>
            </div>
        );
    }

    return (
        <section className="space-y-6">
            {/* KHUNG 1: Header Trang Chi Tiết & Artwork Visual */}
            <div className="rounded-[2rem] border border-black bg-white p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    {track.avatar ? (
                        <img src={track.avatar} alt={track.title} className="w-24 h-24 rounded-2xl object-cover border-2 border-black" />
                    ) : (
                        <div className="w-24 h-24 rounded-2xl bg-slate-100 border border-black/10 flex items-center justify-center text-xs text-black/40">No Avatar</div>
                    )}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">Track Inspection</p>
                        <h1 className="mt-2 text-4xl font-semibold text-black">{track.title}</h1>
                        <p className="mt-1 text-sm text-black/60">by <span className="font-semibold text-black">{track.artist?.name || "Unknown Artist"}</span></p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="rounded-xl border border-black bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-50 self-start md:self-center"
                >
                    Back to List
                </button>
            </div>

            {/* KHUNG 2: Toàn bộ khối thông tin chi tiết */}
            <div className="rounded-[2rem] border border-black bg-white p-8 space-y-8">
                
                {/* 1. Metadata chung & Thống kê số liệu */}
                <div>
                    <h3 className="text-sm font-semibold text-black uppercase tracking-wider mb-4">General Info & System Performance</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 border border-black/5 p-4">
                            <span className="text-xs font-medium text-black/40 block mb-1">Track ID</span>
                            <span className="text-xs font-mono text-black font-semibold break-all">{track.id}</span>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-black/5 p-4">
                            <span className="text-xs font-medium text-black/40 block mb-1">Duration</span>
                            <span className="text-base font-semibold text-black">{formatDuration(track.duration)}</span>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-black/5 p-4">
                            <span className="text-xs font-medium text-black/40 block mb-1">Total Listen Plays</span>
                            <span className="text-base font-semibold text-black">{track.stats?.totalPlay?.toLocaleString() || 0} hits</span>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-black/5 p-4">
                            <span className="text-xs font-medium text-black/40 block mb-1">Total Favorite Likes</span>
                            <span className="text-base font-semibold text-black">{track.stats?.totalLike?.toLocaleString() || 0} likes</span>
                        </div>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                        <div className="rounded-2xl bg-slate-50 border border-black/5 p-4">
                            <span className="text-xs font-medium text-black/40 block mb-1">Album Context</span>
                            <span className="text-sm font-semibold text-black">{track.album?.title || "Single / No Album"}</span>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-black/5 p-4">
                            <span className="text-xs font-medium text-black/40 block mb-1">Genres Distribution</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {track.genres?.length > 0 ? track.genres.map(g => (
                                    <span key={g.id} className="bg-slate-200 text-slate-800 text-[11px] px-2 py-0.5 rounded-md font-medium">{g.name}</span>
                                )) : <span className="text-xs text-black/50">—</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. File âm thanh mã hóa chất lượng */}
                <div className="border-t border-black/10 pt-6">
                    <h3 className="text-sm font-semibold text-black uppercase tracking-wider mb-4">Audio Transcoding Source Nodes</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {track.audioFiles?.length > 0 ? track.audioFiles.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 border border-black/5 rounded-2xl p-4 text-sm">
                                <div className="space-y-0.5">
                                    <span className="font-mono text-black/50 uppercase font-semibold text-xs block">{file.label} Quality Node</span>
                                    <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 font-medium hover:underline break-all">Click to preview audio file</a>
                                </div>
                                <span className="text-black font-semibold bg-white border border-black/10 rounded-xl px-3 py-1 text-xs">{file.bitrate} kbps ({file.format})</span>
                            </div>
                        )) : <p className="text-xs text-black/50 italic">No audio files transcoded yet.</p>}
                    </div>
                </div>

                {/* 3. Bản quyền Tác giả nâng cao */}
                <div className="border-t border-black/10 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-black uppercase tracking-wider">Advanced Copyright Legal Context</h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                        <div className="p-4 bg-slate-50 border border-black/5 rounded-2xl">
                            <span className="text-black/40 block mb-1">Composer (Nhạc sĩ)</span>
                            <span className="text-sm font-semibold text-black">{track.copyright?.composer || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-black/5 rounded-2xl">
                            <span className="text-black/40 block mb-1">Lyricist (Lời bài hát)</span>
                            <span className="text-sm font-semibold text-black">{track.copyright?.lyricist || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-black/5 rounded-2xl">
                            <span className="text-black/40 block mb-1">Producer (Sản xuất)</span>
                            <span className="text-sm font-semibold text-black">{track.copyright?.producer || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-black/5 rounded-2xl">
                            <span className="text-black/40 block mb-1">Copyright Owner</span>
                            <span className="text-sm font-semibold text-black">{track.copyright?.copyrightOwner || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-black/5 rounded-2xl">
                            <span className="text-black/40 block mb-1">Recording Master Owner</span>
                            <span className="text-sm font-semibold text-black">{track.copyright?.recordingOwner || "—"}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-black/5 rounded-2xl flex flex-wrap gap-1 items-center">
                            <span className={`px-2 py-1 rounded-md font-semibold text-[10px] ${track.copyright?.isOriginal ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>Original</span>
                            <span className={`px-2 py-1 rounded-md font-semibold text-[10px] ${track.copyright?.isCover ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>Cover</span>
                            <span className={`px-2 py-1 rounded-md font-semibold text-[10px] ${track.copyright?.isRemix ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-500"}`}>Remix</span>
                        </div>
                    </div>

                    {/* Meta nếu là bài Cover / Remix */}
                    {(track.copyright?.originalTrackTitle || track.copyright?.originalArtistName) && (
                        <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl text-xs grid sm:grid-cols-2 gap-2">
                            <div><span className="text-black/40">Original Track Reference:</span> <span className="font-semibold text-black">{track.copyright?.originalTrackTitle || "—"}</span></div>
                            <div><span className="text-black/40">Original Artist Reference:</span> <span className="font-semibold text-black">{track.copyright?.originalArtistName || "—"}</span></div>
                        </div>
                    )}

                    {/* Chứng từ đính kèm */}
                    {track.copyright?.licenseDocumentUrls?.length > 0 && (
                        <div className="rounded-2xl border border-black/5 bg-slate-50 p-4 text-xs">
                            <span className="text-black/40 block mb-2 font-medium">Verification Legal Documents</span>
                            <div className="flex flex-col gap-1">
                                {track.copyright.licenseDocumentUrls.map((doc, i) => (
                                    <a key={i} href={doc} target="_blank" rel="noreferrer" className="text-sky-600 font-semibold hover:underline">📄 Open System Attachment Proof #{i + 1}</a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-slate-50 border border-black/5 rounded-2xl flex justify-between items-center text-sm">
                        <span className="font-medium text-black/70">Copyright Verification Status</span>
                        <span className={`px-3 py-1 rounded-full font-semibold text-xs border ${getStatusClasses(track.copyright?.copyrightStatus)}`}>
                            {track.copyright?.copyrightStatus || "pending"}
                        </span>
                    </div>
                </div>

                {/* 4. Lời bài hát (Static & Synced) */}
                <div className="border-t border-black/10 pt-6 grid gap-6 md:grid-cols-2">
                    <div>
                        <h3 className="text-sm font-semibold text-black uppercase tracking-wider mb-3">Static Plain Lyrics</h3>
                        <div className="rounded-2xl border border-black/5 bg-slate-50 p-4 h-48 overflow-y-auto font-serif text-sm text-black/80 whitespace-pre-line leading-relaxed">
                            {track.lyricsStatic || "No static text lyrics provided for this track."}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-black uppercase tracking-wider mb-3">Synced Lyrics (LRC File Node)</h3>
                        <div className="rounded-2xl border border-black/5 bg-slate-50 p-4 h-48 flex flex-col justify-center items-center text-center">
                            {track.lyricsSyncUrl ? (
                                <div className="space-y-2">
                                    <span className="text-emerald-600 text-2xl">✓</span>
                                    <p className="text-xs text-black/60">Timed LRC structural file is hosted on server.</p>
                                    <a href={track.lyricsSyncUrl} target="_blank" rel="noreferrer" className="inline-block text-xs bg-white border border-black/10 px-3 py-1.5 rounded-xl font-semibold hover:bg-slate-100">Download LRC File</a>
                                </div>
                            ) : (
                                <span className="text-xs text-black/40 italic">No synced dynamic timeline lyrics available.</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. Trạng thái kiểm duyệt hệ thống nâng cao */}
                <div className="border-t border-black/10 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-black uppercase tracking-wider">Moderation Registry Logs</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                        <div className="p-4 bg-slate-50 border border-black/5 rounded-2xl">
                            <span className="text-black/40 block mb-1">Approval Review Status</span>
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 font-semibold text-xs border ${getStatusClasses(track.approvalStatus)}`}>{track.approvalStatus}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-black/5 rounded-2xl">
                            <span className="text-black/40 block mb-1">Active Visibility State</span>
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 font-semibold text-xs border ${getStatusClasses(track.activeStatus)}`}>{track.activeStatus}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-black/5 rounded-2xl">
                            <span className="text-black/40 block mb-1">Reviewed By Admin</span>
                            <span className="font-semibold text-black">{track.moderation?.reviewedBy?.email || "Not reviewed / Automated system"}</span>
                        </div>
                    </div>

                    {/* Nhật ký Violation Flags */}
                    {track.moderation?.violationFlags?.length > 0 && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-xs">
                            <span className="text-rose-800 font-bold block mb-2">Detected System Violation Flags</span>
                            <div className="flex flex-wrap gap-1.5">
                                {track.moderation.violationFlags.map((flag, idx) => (
                                    <span key={idx} className="bg-rose-100 border border-rose-200 text-rose-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold">{flag.replace(/_/g, " ")}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {track.rejectReason && (
                        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-800">
                            <strong className="block mb-1">Rejection Reason context:</strong> {track.rejectReason}
                        </div>
                    )}
                    {track.hiddenReason && (
                        <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 text-sm text-orange-800">
                            <strong className="block mb-1">Hidden System Reason context:</strong> {track.hiddenReason}
                        </div>
                    )}
                    {track.blockedReason && (
                        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-800">
                            <strong className="block mb-1">Administrative Ban Blocked Reason:</strong> {track.blockedReason}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default TrackDetailPage;