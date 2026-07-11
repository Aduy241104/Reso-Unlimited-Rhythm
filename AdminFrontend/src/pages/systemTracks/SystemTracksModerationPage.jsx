import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowUpRight } from "lucide-react";
import { searchAdminTracksService } from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";

const formatDuration = (seconds) => {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const HeaderStat = ({ label, value }) => (
  <div className="rounded-xl bg-slate-100 px-4 py-3 min-w-[100px]">
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className="mt-1.5 text-lg font-semibold text-slate-900">{value}</p>
  </div>
);

const SystemTracksModerationPage = () => {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState({ q: "", approvalStatus: "pending", page: 1, limit: 10 });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadPendingTracks = async (params = query) => {
    setIsLoading(true);
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== ""));
      const result = await searchAdminTracksService(cleanParams);
      setTracks(result.tracks ?? []);
      setPagination(result.pagination ?? null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadPendingTracks(query); }, [query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => ({ ...prev, q: searchTerm.trim(), page: 1 }));
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({ ...prev, page: selected + 1 }));
  };

  // ĐÃ SỬA: Tính toán an toàn số trang hiển thị để tránh lỗi 1/0 khi trống lịch sơ
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 0;
  const currentPage = total === 0 ? 0 : (pagination?.page ?? 1);
  const pageLabel = `${currentPage}/${totalPages}`;

  return (
    <section className="space-y-8 max-w-[1400px] mx-auto p-6 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">
      
      {/* Khung 1: Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-500">Kiểm duyệt chất lượng</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Hàng chờ duyệt bài hát</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="grid gap-3 grid-cols-3">
            <HeaderStat label="Chờ xử lý" value={total} />
            <HeaderStat label="Hiển thị" value={tracks.length} />
            <HeaderStat label="Trang" value={pageLabel} />
          </div>
          <button 
            type="button" 
            onClick={() => navigate(routePaths.systemTracks || "/system-tracks")} 
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition whitespace-nowrap"
          >
            ← Danh mục kho nhạc
          </button>
        </div>
      </div>

      {/* Khung 2: Tìm kiếm */}
      <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:grid-cols-[1fr_132px]">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm tác phẩm hoặc nghệ sĩ chờ kiểm duyệt..." className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50" />
        </label>
        <button type="submit" className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Tìm kiếm</button>
      </form>

      {/* Khung 3: Danh sách hàng Spaced Rows */}
      {tracks.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-base font-semibold text-slate-900">Hàng đợi kiểm duyệt trống.</p>
          <p className="mt-1 text-sm text-slate-400">Hiện hành không ghi nhận hồ sơ tác phẩm nào chờ xử lý.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="grid min-w-[1020px] grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_100px_160px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            <span>Bài hát chờ duyệt</span>
            <span>Nghệ sĩ nộp</span>
            <span>Thời lượng</span>
            <span>Trạng thái</span>
            <span className="text-right pr-4">Hành động</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1020px] divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-12 text-center text-sm font-medium text-slate-400 uppercase tracking-wider">Đang tải danh sách hàng đợi...</div>
              ) : (
                tracks.map((track) => (
                  <article key={track.id} className="relative grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_100px_160px_120px] gap-4 px-6 py-4 transition hover:bg-slate-50/60 items-center">
                    <div className="absolute inset-y-2 left-0 w-1 rounded-r bg-amber-500" />

                    <div className="flex min-w-0 items-center gap-3 pl-2">
                      {track.avatar ? (
                        <img src={track.avatar} alt={track.title} className="h-10 w-10 rounded-xl object-cover border border-slate-100 shadow-sm" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black text-white uppercase">TRACK</div>
                      )}
                      <p className="truncate text-sm font-semibold text-slate-950">{track.title}</p>
                    </div>

                    <p className="truncate text-sm text-slate-600 font-medium">{track.artist?.name || "—"}</p>
                    <p className="text-sm font-mono font-medium text-slate-400">{formatDuration(track.duration)}</p>
                    
                    <div>
                      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Chờ duyệt
                      </span>
                    </div>

                    <div className="flex justify-end pr-2">
                      <Link to={routePaths.trackDetail(track.id)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 shadow-sm">
                        Thẩm định <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Khung 4: Footer điều khiển */}
      {pagination && (
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-sm text-slate-500 font-medium">
            Trang {currentPage} / {totalPages}
            <span className="mx-2 text-slate-300">|</span>
            Tổng cộng: {total} bản ghi
          </p>

          {/* Chỉ render các nút số trang của react-paginate khi thực sự có từ 2 trang trở lên */}
          {totalPages > 1 && (
            <ReactPaginate 
              breakLabel="..." 
              nextLabel=">" 
              previousLabel="<" 
              forcePage={Math.max(pagination.page - 1, 0)} 
              onPageChange={handlePageChange} 
              pageCount={totalPages} 
              containerClassName="flex flex-wrap items-center gap-2" 
              pageLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200" 
              previousLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200" 
              nextLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200" 
              activeLinkClassName="bg-blue-600 text-white hover:bg-blue-600" 
            />
          )}
        </div>
      )}
    </section>
  );
};

export default SystemTracksModerationPage;
