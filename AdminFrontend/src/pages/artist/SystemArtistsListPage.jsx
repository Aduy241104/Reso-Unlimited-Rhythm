import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchAdminArtistsService } from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";

const getStatusClasses = (status) => {
    switch (status) {
        case "verified":
        case "active":
            return "bg-emerald-100/70 text-emerald-600 border border-emerald-200 rounded-full px-3 py-1 font-medium";
        case "pending":
            return "bg-yellow-100/70 text-yellow-700 border border-yellow-200 rounded-full px-3 py-1 font-medium";
        case "rejected":
        case "inactive":
            return "bg-rose-100/70 text-rose-600 border border-rose-200 rounded-full px-3 py-1 font-medium";
        case "blocked":
            return "bg-red-100 text-red-600 border border-red-200 rounded-full px-3 py-1 font-medium";
        default:
            return "bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-3 py-1 font-medium";
    }
};

const SystemArtistsListPage = () => {
    const [artists, setArtists] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [query, setQuery] = useState({ q: "", page: 1, limit: 20 });
    const [pagination, setPagination] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const loadArtists = async (params = query) => {
        setIsLoading(true);
        setMessage("");
        try {
            const result = await searchAdminArtistsService(params);
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
        setQuery((prev) => ({ ...prev, q: searchTerm.trim(), page: 1 }));
    };

    return (
        <section className="space-y-6 text-slate-800 antialiased max-w-[1400px] mx-auto p-4">
            {/* Khung 1: Header */}
            <div className="border border-black bg-white p-8 relative flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">System Artist Management</p>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Artist Moderation List</h1>
                </div>
            </div>

            {/* Khung 2: Search */}
            <form onSubmit={handleSearchSubmit} className="border border-black bg-white p-6">
                <p className="text-xs font-bold text-slate-500 mb-2">Search</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="flex-1 border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none focus:border-slate-400 transition" 
                        placeholder="Search by artist name or info..." 
                    />
                    <button type="submit" className="sm:w-36 border border-black bg-black py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition rounded-sm">
                        Search
                    </button>
                </div>
            </form>

            {message && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{message}</div>}

            {/* Khung 3: Table List Data */}
            <div className="border border-black bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 font-bold uppercase text-slate-500 tracking-wider border-b border-black text-[11px]">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Artist Profile</th>
                                <th className="px-6 py-4 font-semibold">Linked Email</th>
                                <th className="px-6 py-4 font-semibold">Tracks</th>
                                <th className="px-6 py-4 font-semibold">Verification</th>
                                <th className="px-6 py-4 font-semibold">Active State</th>
                                <th className="px-6 py-4 text-right pr-10 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-sm font-medium text-slate-400">Loading master records ledger...</td>
                                </tr>
                            ) : artists.length > 0 ? (
                                artists.map((artist) => (
                                    <tr key={artist.id} className="hover:bg-slate-50/40 transition">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                {artist.avatar ? (
                                                    <img src={artist.avatar} alt={artist.name} className="w-11 h-11 object-cover border border-slate-200" />
                                                ) : (
                                                    <div className="w-11 h-11 bg-slate-100 border flex items-center justify-center text-[10px] text-slate-400 font-bold">N/A</div>
                                                )}
                                                <span className="font-bold text-slate-900 text-sm tracking-tight">{artist.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-mono font-medium text-slate-500">{artist.email}</td>
                                        <td className="px-6 py-5 font-semibold text-slate-900 uppercase tracking-wide">{artist.totalTracks} tracks</td>
                                        <td className="px-6 py-5">
                                            <span className={getStatusClasses(artist.verificationStatus)}>
                                                {artist.verificationStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={getStatusClasses(artist.activeStatus)}>
                                                {artist.activeStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right pr-8">
                                            <Link
                                                to={routePaths.artistDetail ? routePaths.artistDetail(artist.id) : `/admin/artists/${artist.id}`}
                                                className="inline-block border border-black bg-black px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition rounded-sm shadow-none"
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
        </section>
    );
};

export default SystemArtistsListPage;