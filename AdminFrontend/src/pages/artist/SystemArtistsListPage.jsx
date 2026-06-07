import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchAdminArtistsService } from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";

const getStatusClasses = (status) => {
    switch (status) {
        case "verified":
        case "active":
            return "bg-emerald-100 text-emerald-700 border-emerald-200";
        case "pending":
            return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "rejected":
        case "inactive":
            return "bg-rose-100 text-rose-700 border-rose-200";
        case "blocked":
            return "bg-red-100 text-red-700 border-red-200";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
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
        <section className="space-y-6">
            {/* Khung 1: Header */}
            <div className="rounded-[2rem] border border-black bg-white p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">System Artist Management</p>
                <h1 className="mt-3 text-4xl font-semibold text-black">Artist Moderation List</h1>
            </div>

            {/* Khung 2: Search */}
            <form onSubmit={handleSearchSubmit} className="grid gap-4 rounded-[2rem] border border-black bg-white p-6 md:grid-cols-[1.8fr_0.8fr]">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-black/70">Search Artist</label>
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black" 
                        placeholder="Search by artist name or info..." 
                    />
                </div>
                <div className="flex items-end">
                    <button type="submit" className="w-full rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition active:scale-95">
                        Search
                    </button>
                </div>
            </form>

            {message && <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{message}</div>}

            {/* Khung 3: Table List Data */}
            <div className="overflow-hidden rounded-[2rem] border border-black bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-black">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-black/10">
                            <tr>
                                <th className="px-6 py-4">Artist Profile</th>
                                <th className="px-6 py-4">Linked Email</th>
                                <th className="px-6 py-4">Tracks</th>
                                <th className="px-6 py-4">Verification</th>
                                <th className="px-6 py-4">Active State</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-sm font-semibold text-slate-500">Fetching verified system accounts context...</td>
                                </tr>
                            ) : artists.length > 0 ? (
                                artists.map((artist) => (
                                    <tr key={artist.id} className="hover:bg-slate-50/50 transition">
                                        {/* Profile Avatar + Name */}
                                        <td className="border-b border-black/10 px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {artist.avatar ? (
                                                    <img src={artist.avatar} alt={artist.name} className="w-10 h-10 rounded-xl object-cover border border-black/20" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-black/5 flex items-center justify-center text-[10px] text-black/40 font-bold">N/A</div>
                                                )}
                                                <div>
                                                    <span className="font-semibold text-black text-base block">{artist.name}</span>
                                                    <span className="text-[10px] text-black/40 font-mono block">{artist.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Email */}
                                        <td className="border-b border-black/10 px-6 py-4 text-black/70 font-mono text-xs">{artist.email}</td>
                                        {/* Count tracks aggregated */}
                                        <td className="border-b border-black/10 px-6 py-4 text-black/80 font-semibold">{artist.totalTracks} tracks</td>
                                        {/* Verification Status */}
                                        <td className="border-b border-black/10 px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusClasses(artist.verificationStatus)}`}>
                                                {artist.verificationStatus}
                                            </span>
                                        </td>
                                        {/* Active Status */}
                                        <td className="border-b border-black/10 px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusClasses(artist.activeStatus)}`}>
                                                {artist.activeStatus}
                                            </span>
                                        </td>
                                        {/* Action */}
                                        <td className="border-b border-black/10 px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link
                                                    to={routePaths.artistDetail ? routePaths.artistDetail(artist.id) : `/admin/artists/${artist.id}`}
                                                    className="inline-flex rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-sm hover:bg-slate-50 transition"
                                                >
                                                    Details
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 italic">No artists found on database matching current query.</td>
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