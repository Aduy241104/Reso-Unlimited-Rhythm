import { useEffect, useState } from "react";
import { searchAdminTracksService } from "../../services/trackService";

const formatDuration = (seconds) => {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getStatusClasses = (status) => {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "inactive":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const SystemTracksListPage = () => {
  const [tracks, setTracks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState({ q: "", page: 1, limit: 20 });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadTracks = async (params = query) => {
    setIsLoading(true);
    setMessage("");

    try {
      const result = await searchAdminTracksService(params);
      setTracks(result.tracks ?? []);
      setPagination(result.pagination ?? null);
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Could not load tracks for moderation."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTracks(query);
  }, [query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => ({ ...prev, q: searchTerm.trim(), page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (!pagination) return;
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setQuery((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-black bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">
          System Track Management
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-black">
          Track Moderation List
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">
          View and search all tracks awaiting moderation, review their approval and active statuses.
        </p>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-4 rounded-[2rem] border border-black bg-white p-6 md:grid-cols-[1.8fr_0.8fr]"
      >
        <div className="space-y-2">
          <label className="text-sm font-semibold text-black/70">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by track title or artist name"
            className="w-full rounded-3xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-3xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/90"
          >
            Search
          </button>
        </div>
      </form>

      {message && (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-[2rem] border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-black">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.16em] text-slate-700">
              <tr>
                <th className="border-b border-black/10 px-6 py-4">Title</th>
                <th className="border-b border-black/10 px-6 py-4">Artist</th>
                <th className="border-b border-black/10 px-6 py-4">Duration</th>
                <th className="border-b border-black/10 px-6 py-4">Approval</th>
                <th className="border-b border-black/10 px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-500">
                    Loading tracks...
                  </td>
                </tr>
              ) : tracks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-500">
                    No matching tracks found.
                  </td>
                </tr>
              ) : (
                tracks.map((track) => (
                  <tr key={track.id} className="even:bg-slate-50">
                    <td className="border-b border-black/10 px-6 py-4 font-medium text-black">
                      {track.title}
                    </td>
                    <td className="border-b border-black/10 px-6 py-4">
                      {track.artist?.name || "—"}
                    </td>
                    <td className="border-b border-black/10 px-6 py-4">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="border-b border-black/10 px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(track.approvalStatus)}`}>
                        {track.approvalStatus || "unknown"}
                      </span>
                    </td>
                    <td className="border-b border-black/10 px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(track.activeStatus)}`}>
                        {track.activeStatus || "unknown"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-black/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-black/70">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} tracks
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="rounded-3xl border border-black/10 bg-slate-50 px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-3xl border border-black/10 bg-slate-50 px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default SystemTracksListPage;
