import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Disc, Loader2, Plus, Search, ChevronUp, ChevronDown, X } from "lucide-react";
import {
  deleteAdminSystemPlaylistService,
  getAdminSystemPlaylistsService,
} from "../../services/playlistService";
import { routePaths } from "../../routes/routePaths";

const playlistRowId = (item) => item?._id ?? item?.id ?? "";

const fmtDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const VisibilityBadge = ({ isPublic }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border ${
    isPublic 
      ? "border-black/20 text-black/70" 
      : "border-black/10 text-black/40"
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isPublic ? "bg-black" : "bg-black/30"}`} />
    {isPublic ? "Public" : "Private"}
  </span>
);

const HiddenStatusBadge = ({ hidden }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border ${
    hidden 
      ? "border-amber-300 text-amber-700" 
      : "border-black/10 text-black/30"
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${hidden ? "bg-amber-500" : "bg-black/20"}`} />
    {hidden ? "Hidden" : "Visible"}
  </span>
);

const SystemPlaylistsListPage = () => {
  const [playlists, setPlaylists] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const result = await getAdminSystemPlaylistsService({ page: 1, limit: 100 });
        if (!isMounted) return;
        setPlaylists(result.playlists ?? []);
        setPagination(result.pagination ?? null);
      } catch (error) {
        if (!isMounted) return;
        setPlaylists([]);
        setPagination(null);
        setErrorMessage(error?.response?.data?.message || error?.message || "Could not load playlists.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const handleDelete = async (playlist, event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = playlistRowId(playlist);
    if (!id) return;
    if (!window.confirm(`Delete "${playlist.title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteAdminSystemPlaylistService(id);
      setPlaylists((prev) => prev.filter((p) => playlistRowId(p) !== id));
      toast.success("Playlist deleted.");
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Could not delete.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <span className="text-black/20 ml-1 text-xs">↕</span>;
    }
    return sortOrder === "asc" 
      ? <ChevronUp className="w-3.5 h-3.5 ml-1 inline" />
      : <ChevronDown className="w-3.5 h-3.5 ml-1 inline" />;
  };

  // Filter and sort playlists
  const filteredPlaylists = playlists
    .filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "title") {
        aVal = (aVal || "").toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-black/10 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center border border-black/10">
              <Disc className="w-5 h-5 text-black/50" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-black tracking-tight">System Playlists</h1>
              <p className="text-xs text-black/40 mt-0.5">Manage your playlists</p>
            </div>
            <span className="ml-3 px-2.5 py-1 text-xs font-medium bg-black/5 text-black/40 border border-black/10">
              {filteredPlaylists.length}
            </span>
          </div>
          <Link 
            to={routePaths.systemPlaylistNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium hover:bg-black/80"
          >
            <Plus className="w-4 h-4" />
            New Playlist
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-black/10 flex items-center justify-end gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 py-2 w-72 text-sm border border-black/10 bg-white focus:outline-none focus:border-black/30 placeholder:text-black/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/50"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="mx-6 mt-4 px-5 py-4 text-sm text-red-600 border border-red-200 bg-red-50">
          {errorMessage}
        </div>
      )}

      {/* Table */}
      <div className="px-6 py-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/10">
              <th className="text-left py-3 px-4 text-xs font-semibold text-black/40 uppercase tracking-wider w-16">#</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-black/40 uppercase tracking-wider w-20">Cover</th>
              <th 
                className="text-left py-3 px-4 text-xs font-semibold text-black/40 uppercase tracking-wider cursor-pointer hover:text-black"
                onClick={() => handleSort("title")}
              >
                Title <SortIcon field="title" />
              </th>
              <th 
                className="text-left py-3 px-4 text-xs font-semibold text-black/40 uppercase tracking-wider cursor-pointer hover:text-black w-24"
                onClick={() => handleSort("trackCount")}
              >
                Tracks <SortIcon field="trackCount" />
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-black/40 uppercase tracking-wider w-28">Visibility</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-black/40 uppercase tracking-wider w-28">Status</th>
              <th 
                className="text-left py-3 px-4 text-xs font-semibold text-black/40 uppercase tracking-wider cursor-pointer hover:text-black"
                onClick={() => handleSort("createdAt")}
              >
                Created <SortIcon field="createdAt" />
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-black/40 uppercase tracking-wider w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-black/40">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : filteredPlaylists.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-black/40">
                    <Disc className="w-8 h-8" />
                    <span className="text-sm">No playlists found</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPlaylists.map((item, index) => {
                const id = playlistRowId(item);
                const isDeleting = deletingId === id;
                return (
                  <tr key={id || item.title} className="border-b border-black/5 hover:bg-black/[0.02] group">
                    <td className="py-4 px-4 text-sm text-black/30">{index + 1}</td>
                    <td className="py-4 px-4">
                      <Link to={routePaths.systemPlaylistDetail(id)}>
                        {item.coverImage ? (
                          <img src={item.coverImage} alt="" className="w-12 h-12 object-cover border border-black/10" />
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center border border-black/10 bg-black/[0.02]">
                            <Disc className="w-5 h-5 text-black/20" />
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="py-4 px-4">
                      <Link to={routePaths.systemPlaylistDetail(id)} className="block">
                        <span className="text-sm font-medium text-black group-hover:underline">{item.title}</span>
                        {item.description && (
                          <p className="text-xs text-black/40 mt-0.5 truncate max-w-xs">{item.description}</p>
                        )}
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-sm text-black/50">{item.trackCount ?? 0}</td>
                    <td className="py-4 px-4">
                      <VisibilityBadge isPublic={item.isPublic} />
                    </td>
                    <td className="py-4 px-4">
                      <HiddenStatusBadge hidden={item.isHidden} />
                    </td>
                    <td className="py-4 px-4 text-sm text-black/40">{fmtDate(item.createdAt)}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={routePaths.systemPlaylistEdit(id)}
                          className="px-3 py-1.5 text-xs font-medium text-black/60 hover:text-black border border-black/10 hover:border-black/20 hover:bg-black/[0.02]"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(item, e)}
                          disabled={isDeleting}
                          className="px-3 py-1.5 text-xs font-medium text-black/30 hover:text-red-600 border border-black/10 hover:border-red-200 hover:bg-red-50 disabled:opacity-30"
                        >
                          {isDeleting ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemPlaylistsListPage;
