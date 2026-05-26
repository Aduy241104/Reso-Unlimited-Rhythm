import { useEffect, useState } from "react";
import adminGenreService from "../../services/adminGenreService";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const GenresListPage = () => {
  const [genres, setGenres] = useState([]);
  const [filters, setFilters] = useState({ search: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadGenres = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const { genres: list } = await adminGenreService.getAdminGenresService(filters);
      setGenres(Array.isArray(list) ? list : []);
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || "Không thể tải danh sách thể loại.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGenres();
  }, [filters]);

  const handleChange = (field) => (e) => {
    setFilters((p) => ({ ...p, [field]: e.target.value }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadGenres();
  };

  return (
    <section className="space-y-6">
      <div className="rounded border border-black bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">Genre Management</p>
        <h1 className="mt-3 text-4xl font-semibold text-black">Genre List</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">Browse and manage music genres.</p>
      </div>

      <form onSubmit={handleSearch} className="grid gap-4 rounded border border-black bg-white p-6 md:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-black/70">Search</label>
          <input value={filters.search} onChange={handleChange("search")} placeholder="Name or description" className="w-full rounded border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black" />
        </div>

        <div className="flex items-end">
          <button type="submit" className="w-full rounded bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/90">Search</button>
        </div>
      </form>

      {message && <div className="rounded border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{message}</div>}

      <div className="overflow-hidden rounded border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-black">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.16em] text-slate-700">
              <tr>
                <th className="border-b border-black/10 px-6 py-4">Name</th>
                <th className="border-b border-black/10 px-6 py-4">Description</th>
                <th className="border-b border-black/10 px-6 py-4">Active</th>
                <th className="border-b border-black/10 px-6 py-4">Created At</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-sm text-slate-500">Loading genres...</td>
                </tr>
              ) : genres.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-sm text-slate-500">No genres found.</td>
                </tr>
              ) : (
                genres.map((g) => (
                  <tr key={g._id} className="even:bg-slate-50">
                    <td className="border-b border-black/10 px-6 py-4">{g.name}</td>
                    <td className="border-b border-black/10 px-6 py-4">{g.description || "-"}</td>
                    <td className="border-b border-black/10 px-6 py-4">{g.isActive ? "Yes" : "No"}</td>
                    <td className="border-b border-black/10 px-6 py-4">{formatDate(g.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default GenresListPage;
