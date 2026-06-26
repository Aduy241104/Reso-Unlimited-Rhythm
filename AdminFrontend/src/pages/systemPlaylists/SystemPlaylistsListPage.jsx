import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Disc,
  Loader2,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Eye,
  EyeOff,
  Globe,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import {
  deleteAdminSystemPlaylistService,
  getAdminSystemPlaylistsService,
} from "../../services/playlistService";
import { routePaths } from "../../routes/routePaths";

const playlistRowId = (item) => item?._id ?? item?.id ?? "";

const fmtDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const VisibilityBadge = ({ isPublic }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
      isPublic
        ? "bg-emerald-50 border-emerald-100 text-emerald-600"
        : "bg-slate-50 border-slate-200 text-slate-500"
    }`}
  >
    {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
    {isPublic ? "Công khai" : "Riêng tư"}
  </span>
);

const HiddenStatusBadge = ({ hidden }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
      hidden
        ? "bg-amber-50 border-amber-100 text-amber-600"
        : "bg-emerald-50 border-emerald-100 text-emerald-600"
    }`}
  >
    {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
    {hidden ? "Ẩn" : "Hiển thị"}
  </span>
);

const getAccentClasses = (item) => {
  if (item.isHidden) return "bg-amber-500";
  if (item.isPublic) return "bg-emerald-500";
  return "bg-slate-300";
};

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
        const result = await getAdminSystemPlaylistsService({
          page: 1,
          limit: 100,
        });
        if (!isMounted) return;
        setPlaylists(result.playlists ?? []);
        setPagination(result.pagination ?? null);
      } catch (error) {
        if (!isMounted) return;
        setPlaylists([]);
        setPagination(null);
        setErrorMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải danh sách playlist."
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (playlist, event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = playlistRowId(playlist);
    if (!id) return;
    if (
      !window.confirm(
        `Xóa "${playlist.title}"? Hành động này không thể hoàn tác.`
      )
    )
      return;
    setDeletingId(id);
    try {
      await deleteAdminSystemPlaylistService(id);
      setPlaylists((prev) => prev.filter((p) => playlistRowId(p) !== id));
      toast.success("Đã xóa playlist.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể xóa playlist."
      );
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
      return <span className="ml-1 text-xs text-slate-300">↕</span>;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 inline h-3.5 w-3.5 text-blue-600" />
    ) : (
      <ChevronDown className="ml-1 inline h-3.5 w-3.5 text-blue-600" />
    );
  };

  const filteredPlaylists = playlists
    .filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
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
    <section className="space-y-5 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Quản lý nội dung
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Playlist hệ thống
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Quản lý các playlist tuyển chọn cho nền tảng
          </p>
        </div>

        <div className="flex items-center gap-4 self-start lg:self-auto">
          <div className="rounded-xl bg-slate-100 px-4 py-2.5 min-w-[100px] text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Tổng số</p>
            <p className="mt-0.5 text-base font-bold text-slate-900">{filteredPlaylists.length}</p>
          </div>

          <Link
            to={routePaths.systemPlaylistNew}
            className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-5 py-3 text-sm font-semibold rounded-xl shadow-sm transition whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Tạo playlist
          </Link>
        </div>
      </div>

      {/* Search Toolbar */}
      <form className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] grid-cols-1 sm:grid-cols-[1fr_200px]">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề hoặc mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition py-3 px-4"
          >
            Xóa lọc
          </button>
        )}
      </form>

      {/* Error */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="grid min-w-[900px] grid-cols-[40px_80px_minmax(0,1.5fr)_100px_140px_140px_140px_120px] gap-4 border-b border-slate-200 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          <span>#</span>
          <span>Ảnh bìa</span>
          <span>Tiêu đề</span>
          <span>Bài hát</span>
          <span>Quyền riêng tư</span>
          <span>Trạng thái</span>
          <span>Ngày tạo</span>
          <span className="text-right">Thao tác</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px] divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                Đang tải...
              </div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Disc className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Không tìm thấy playlist</p>
                {searchQuery && (
                  <p className="mt-1 text-xs text-slate-400">Hãy thử từ khóa khác</p>
                )}
              </div>
            ) : (
              filteredPlaylists.map((item, index) => {
                const id = playlistRowId(item);
                const isDeleting = deletingId === id;
                return (
                  <article
                    key={id || item.title}
                    className="relative grid grid-cols-[40px_80px_minmax(0,1.5fr)_100px_140px_140px_140px_120px] gap-4 px-5 py-4 transition hover:bg-slate-50/60 items-center"
                  >
                    {/* Accent bar */}
                    <div className={`absolute inset-y-2 left-0 w-1 rounded-r ${getAccentClasses(item)}`} />

                    <span className="text-sm text-slate-400 font-medium pl-2">{index + 1}</span>

                    <div className="pl-2">
                      <Link to={routePaths.systemPlaylistDetail(id)}>
                        {item.coverImage ? (
                          <img
                            src={item.coverImage}
                            alt=""
                            className="h-12 w-12 rounded-xl object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                            <Disc className="h-5 w-5 text-slate-300" />
                          </div>
                        )}
                      </Link>
                    </div>

                    <div className="pl-2">
                      <Link
                        to={routePaths.systemPlaylistDetail(id)}
                        className="block"
                      >
                        <span className="text-sm font-semibold text-slate-950 hover:underline">
                          {item.title}
                        </span>
                        {item.description && (
                          <p className="mt-0.5 truncate max-w-xs text-xs text-slate-400">
                            {item.description}
                          </p>
                        )}
                      </Link>
                    </div>

                    <span className="text-sm text-slate-500 font-medium pl-2">
                      {item.trackCount ?? 0}
                    </span>

                    <div className="pl-2">
                      <VisibilityBadge isPublic={item.isPublic} />
                    </div>

                    <div className="pl-2">
                      <HiddenStatusBadge hidden={item.isHidden} />
                    </div>

                    <span className="text-xs font-medium text-slate-400 pl-2">
                      {fmtDate(item.createdAt)}
                    </span>

                    <div className="flex justify-end gap-2 pr-2">
                      <Link
                        to={routePaths.systemPlaylistEdit(id)}
                        className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                      >
                        Sửa
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item, e)}
                        disabled={isDeleting}
                        className="rounded-xl px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition border border-red-100 disabled:opacity-30"
                      >
                        {isDeleting ? "..." : "Xóa"}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SystemPlaylistsListPage;
