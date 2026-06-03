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
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
    isPublic
      ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
      : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${isPublic ? "bg-blue-500" : "bg-slate-300"}`} />
    {isPublic ? "Public" : "Private"}
  </span>
);

const HiddenStatusBadge = ({ hidden }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
    hidden
      ? "bg-amber-50 text-amber-600 ring-1 ring-amber-200"
      : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${hidden ? "bg-amber-400" : "bg-emerald-500"}`} />
    {hidden ? "Hidden" : "Visible"}
  </span>
);

const SystemPlaylistsListPage = () => {
  const [playlists, setPlaylists] = useState([]);
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
      } catch (error) {
        if (!isMounted) return;
        setPlaylists([]);
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
    if (sortField !== field) return <span className="ml-1 text-slate-300">↕</span>;
    return sortOrder === "asc"
      ? <ChevronUp className="ml-1 inline h-3.5 w-3.5 text-violet-500" />
      : <ChevronDown className="ml-1 inline h-3.5 w-3.5 text-violet-500" />;
  };

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
    <div className="min-h-screen bg-slate-50 p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <Disc className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400">Admin · Content</p>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Playlists</h1>
          </div>
          <span className="ml-1 rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500">
            {filteredPlaylists.length}
          </span>
        </div>
        <Link
          to={routePaths.systemPlaylistNew}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:bg-violet-700 hover:shadow-md hover:shadow-violet-200 hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          New Playlist
        </Link>
      </div>

      {/* ── Error ── */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>⚠</span> {errorMessage}
        </div>
      )}

      {/* ── Main card ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <p className="text-xs text-slate-400">
            {isLoading ? "Loading..." : `${filteredPlaylists.length} playlist${filteredPlaylists.length !== 1 ? "s" : ""}`}
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="w-12 py-3 pl-5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">#</th>
                <th className="w-16 py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Cover</th>
                <th
                  className="cursor-pointer py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-700 select-none transition-colors"
                  onClick={() => handleSort("title")}
                >
                  Title <SortIcon field="title" />
                </th>
                <th
                  className="w-24 cursor-pointer py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-700 select-none transition-colors"
                  onClick={() => handleSort("trackCount")}
                >
                  Tracks <SortIcon field="trackCount" />
                </th>
                <th className="w-28 py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Visibility</th>
                <th className="w-28 py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Status</th>
                <th
                  className="cursor-pointer py-3 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-700 select-none transition-colors"
                  onClick={() => handleSort("createdAt")}
                >
                  Created <SortIcon field="createdAt" />
                </th>
                <th className="w-32 py-3 pr-5 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Loading playlists...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPlaylists.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <Disc className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-500">No playlists found</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {searchQuery ? "Try a different search term" : "Create your first system playlist"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPlaylists.map((item, index) => {
                  const id = playlistRowId(item);
                  const isDeleting = deletingId === id;
                  return (
                    <tr
                      key={id || item.title}
                      className="group border-b border-slate-100 transition-colors duration-150 hover:bg-violet-50/40"
                    >
                      {/* # */}
                      <td className="py-4 pl-5 text-sm text-slate-400">{index + 1}</td>

                      {/* Cover */}
                      <td className="px-3 py-4">
                        <Link to={routePaths.systemPlaylistDetail(id)}>
                          {item.coverImage ? (
                            <img
                              src={item.coverImage}
                              alt=""
                              className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200 transition-shadow group-hover:ring-violet-200"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
                              <Disc className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                        </Link>
                      </td>

                      {/* Title */}
                      <td className="px-3 py-4">
                        <Link to={routePaths.systemPlaylistDetail(id)} className="block">
                          <span className="text-sm font-semibold text-slate-800 transition-colors group-hover:text-violet-700">
                            {item.title}
                          </span>
                          {item.description && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{item.description}</p>
                          )}
                        </Link>
                      </td>

                      {/* Tracks */}
                      <td className="px-3 py-4">
                        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-slate-100 px-2 text-xs font-bold text-slate-600">
                          {item.trackCount ?? 0}
                        </span>
                      </td>

                      {/* Visibility */}
                      <td className="px-3 py-4">
                        <VisibilityBadge isPublic={item.isPublic} />
                      </td>

                      {/* Status */}
                      <td className="px-3 py-4">
                        <HiddenStatusBadge hidden={item.isHidden} />
                      </td>

                      {/* Created */}
                      <td className="px-3 py-4 text-xs text-slate-400">{fmtDate(item.createdAt)}</td>

                      {/* Actions */}
                      <td className="py-4 pr-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={routePaths.systemPlaylistEdit(id)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(item, e)}
                            disabled={isDeleting}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          >
                            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
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
    </div>
  );
};

export default SystemPlaylistsListPage;
