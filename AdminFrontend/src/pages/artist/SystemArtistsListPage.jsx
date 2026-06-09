import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchAdminArtistsService } from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";

const getStatusClasses = (status) => {
    switch (status) {
        case "verified":
        case "active":
            return "bg-emerald-100/70 text-emerald-600 border border-emerald-200 rounded-full px-3 py-1 font-medium text-[11px] inline-block capitalize";
        case "pending":
            return "bg-yellow-100/70 text-yellow-700 border border-yellow-200 rounded-full px-3 py-1 font-medium text-[11px] inline-block capitalize";
        case "rejected":
        case "inactive":
            return "bg-rose-100/70 text-rose-600 border border-rose-200 rounded-full px-3 py-1 font-medium text-[11px] inline-block capitalize";
        case "blocked":
            return "bg-red-100 text-red-600 border border-red-200 rounded-full px-3 py-1 font-medium text-[11px] inline-block capitalize";
        default:
            return "bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-3 py-1 font-medium text-[11px] inline-block capitalize";
    }
};

const SystemArtistsListPage = () => {
    const [artists, setArtists] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    
    // State lưu bộ lọc tạm thời trên UI giống hệt trang Track
    const [filterVerify, setFilterVerify] = useState("");
    const [filterActive, setFilterActive] = useState("");

    // Query thực tế gửi lên API bổ sung các trường filter status
    const [query, setQuery] = useState({ q: "", verificationStatus: "", activeStatus: "", page: 1, limit: 20 });
    const [pagination, setPagination] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const loadArtists = async (params = query) => {
        setIsLoading(true);
        setMessage("");
        try {
            const cleanParams = Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== "")
            );
            const result = await searchAdminArtistsService(cleanParams);
            setArtists(result.artists ?? []);
            setPagination(result.pagination ?? null);
        } catch (error) {
            setMessage(error?.response?.data?.message || error?.message || "Could not load artists.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadArtists(query); }, [query]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        setQuery((prev) => ({ 
            ...prev, 
            q: searchTerm.trim(), 
            verificationStatus: filterVerify,
            activeStatus: filterActive,
            page: 1 
        }));
    };

    return (
        <section className="space-y-6 text-slate-800 font-sans antialiased max-w-[1400px] mx-auto p-2 rounded-none">
            {/* Khung 1: Header */}
            <div className="border border-black bg-white p-8 rounded-none">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">System Artist Management</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase mt-1">Artist Moderation List</h1>
            </div>

            {/* Khung 2: Search & Filter - Khớp 100% cấu trúc một hàng ngang kéo dài của trang Track */}
            <form onSubmit={handleSearchSubmit} className="border border-black bg-white p-6 flex flex-col sm:flex-row gap-4 rounded-none">
                {/* Thanh tìm kiếm chữ / thông tin chính */}
                <div className="flex-1 space-y-1 rounded-none">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Search</label>
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold outline-none focus:bg-white rounded-none" 
                        placeholder="Search by name, email or info..." 
                    />
                </div>

                {/* Dropdown 1: Lọc Verification Status */}
                <div className="w-full sm:w-48 space-y-1 rounded-none">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Verification</label>
                    <select 
                        value={filterVerify} 
                        onChange={(e) => setFilterVerify(e.target.value)}
                        className="w-full border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold outline-none focus:bg-white rounded-none h-[37px] cursor-pointer appearance-none"
                    >
                        <option value="">— All —</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                {/* Dropdown 2: Lọc Active State */}
                <div className="w-full sm:w-48 space-y-1 rounded-none">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
                    <select 
                        value={filterActive} 
                        onChange={(e) => setFilterActive(e.target.value)}
                        className="w-full border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold outline-none focus:bg-white rounded-none h-[37px] cursor-pointer appearance-none"
                    >
                        <option value="">— All —</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="blocked">Blocked</option>
                    </select>
                </div>

                {/* Nút bấm Kích hoạt Tìm kiếm vuông vức đặt ở cuối dòng */}
                <div className="flex items-end rounded-none">
                    <button 
                        type="submit" 
                        className="w-full sm:w-36 border border-black bg-black py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 rounded-none"
                    >
                        Search
                    </button>
                </div>
            </form>

            {message && <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 rounded-none">{message}</div>}

            {/* Khung 3: Table List Data */}
            <div className="border border-black bg-white overflow-hidden rounded-none">
                <div className="overflow-x-auto rounded-none">
                    <table className="min-w-full text-left text-xs border-collapse rounded-none">
                        <thead className="bg-slate-50 font-bold uppercase text-slate-500 tracking-wider border-b border-black text-[11px]">
                            <tr>
                                <th className="px-6 py-4 font-semibold border-r border-slate-100">Artist Profile</th>
                                <th className="px-6 py-4 font-semibold border-r border-slate-100">Linked Email</th>
                                <th className="px-6 py-4 font-semibold border-r border-slate-100">Tracks</th>
                                <th className="px-6 py-4 font-semibold border-r border-slate-100">Verification</th>
                                <th className="px-6 py-4 font-semibold border-r border-slate-100">Active State</th>
                                <th className="px-6 py-4 text-center font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 rounded-none">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-sm font-medium text-slate-400 uppercase tracking-wider">Loading master records ledger...</td>
                                </tr>
                            ) : artists.length > 0 ? (
                                artists.map((artist) => (
                                    <tr key={artist.id} className="hover:bg-slate-50/40 transition rounded-none">
                                        <td className="px-6 py-4 border-r border-slate-100 rounded-none">
                                            <div className="flex items-center gap-3">
                                                {artist.avatar ? (
                                                    <img src={artist.avatar} alt={artist.name} className="w-8 h-8 object-cover border border-slate-200 rounded-none" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-slate-100 border flex items-center justify-center text-[9px] text-slate-400 font-bold rounded-none">N/A</div>
                                                )}
                                                <span className="font-bold text-slate-900 text-sm tracking-tight">{artist.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-500 border-r border-slate-100 rounded-none">{artist.email}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 uppercase tracking-wide border-r border-slate-100 rounded-none">{artist.totalTracks} tracks</td>
                                        <td className="px-6 py-4 border-r border-slate-100 rounded-none">
                                            <span className={getStatusClasses(artist.verificationStatus)}>
                                                {artist.verificationStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 border-r border-slate-100 rounded-none">
                                            <span className={getStatusClasses(artist.activeStatus)}>
                                                {artist.activeStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center rounded-none">
                                            <Link
                                                to={routePaths.artistDetail ? routePaths.artistDetail(artist.id) : `/admin/artists/${artist.id}`}
                                                className="inline-block border border-black bg-black px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-zinc-800 transition rounded-none"
                                            >
                                                Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 italic">No artists record found matching current query.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Phân trang */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-end gap-2 text-[10px] font-bold">
                    <button 
                        disabled={query.page <= 1}
                        onClick={() => setQuery(prev => ({ ...prev, page: prev.page - 1 }))}
                        className="px-3 py-1.5 border border-black bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 uppercase"
                    >
                        PREV
                    </button>
                    <span className="px-3 py-1.5 border border-black bg-slate-100 flex items-center">
                        {query.page} / {pagination.totalPages}
                    </span>
                    <button 
                        disabled={query.page >= pagination.totalPages}
                        onClick={() => setQuery(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="px-3 py-1.5 border border-black bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 uppercase"
                    >
                        NEXT
                    </button>
                </div>
            )}
        </section>
    );
};

export default SystemArtistsListPage;