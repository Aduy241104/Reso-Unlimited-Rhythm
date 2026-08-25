import { useCallback, useEffect, useRef, useState } from "react";
import ReactPaginate from "react-paginate";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowUpRight } from "lucide-react";
import { searchAdminTracksService } from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";

const formatDuration = (seconds) => {
  const totalSeconds = Math.floor(Number(seconds));
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const HeaderStat = ({ label, value }) => (
  <div className="rounded-xl bg-slate-100 px-4 py-3 min-w-[100px]">
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className="mt-1.5 text-lg font-semibold text-slate-900">{value}</p>
  </div>
);

const MODERATION_COPY = {
  track_release: {
    eyebrow: "Kiểm duyệt phát hành",
    title: "Hàng chờ duyệt bài hát mới",
    searchPlaceholder: "Tìm bài hát mới hoặc nghệ sĩ đang chờ duyệt...",
    emptyTitle: "Không có bài hát mới đang chờ duyệt.",
    emptyDescription: "Các bản chỉnh sửa được quản lý trong danh sách duyệt riêng.",
    columnTitle: "Bài hát mới chờ duyệt",
    itemLabel: "Bài hát mới",
    actionLabel: "Thẩm định",
  },
  pending_update: {
    eyebrow: "Kiểm duyệt chỉnh sửa",
    title: "Hàng chờ duyệt bản chỉnh sửa",
    searchPlaceholder: "Tìm bản chỉnh sửa hoặc nghệ sĩ đang chờ duyệt...",
    emptyTitle: "Không có bản chỉnh sửa đang chờ duyệt.",
    emptyDescription: "Các yêu cầu phát hành bài hát mới nằm trong danh sách duyệt riêng.",
    columnTitle: "Bản chỉnh sửa chờ duyệt",
    itemLabel: "Bản chỉnh sửa",
    actionLabel: "Xem thay đổi",
  },
};

const AUTOMATIC_DECISION_BADGES = {
  auto_clear: { label: "Hồ sơ sạch", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  manual_review: { label: "Cần kiểm tra", className: "border-amber-200 bg-amber-50 text-amber-700" },
  manual_review_high: { label: "Rủi ro cao", className: "border-rose-200 bg-rose-50 text-rose-700" },
  auto_reject: { label: "Đã tự động trả về", className: "border-slate-200 bg-slate-100 text-slate-700" },
  enforcement_block: { label: "Enforcement block", className: "border-red-300 bg-red-100 text-red-800" },
};

const getAutomaticDecisionBadge = (track) => {
  const decision = track?.moderationAutomatic?.decision || track?.moderation?.automatic?.decision;
  return AUTOMATIC_DECISION_BADGES[decision] || {
    label: "Chờ sàng lọc",
    className: "border-slate-200 bg-slate-50 text-slate-500",
  };
};

const SystemTracksModerationPage = () => {
  const navigate = useNavigate();
  const requestIdRef = useRef(0);
  const [activeQueue, setActiveQueue] = useState("track_release");
  const pageCopy = MODERATION_COPY[activeQueue] || MODERATION_COPY.track_release;
  const [tracks, setTracks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState({
    q: "",
    scope: "moderation",
    approvalStatus: "pending",
    reviewSource: "track_release",
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadPendingTracks = useCallback(async (params) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setLoadError("");
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== ""));
      const result = await searchAdminTracksService(cleanParams);

      if (requestId !== requestIdRef.current) return;

      setTracks(result.tracks ?? []);
      setPagination(result.pagination ?? null);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setTracks([]);
      setPagination(null);
      setLoadError(error?.response?.data?.message || error?.message || "Không thể tải hàng đợi kiểm duyệt.");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => { void loadPendingTracks(query); }, [loadPendingTracks, query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => ({ ...prev, q: searchTerm.trim(), page: 1 }));
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({ ...prev, page: selected + 1 }));
  };

  const handleQueueChange = (nextQueue) => {
    if (nextQueue === activeQueue) return;

    requestIdRef.current += 1;
    setActiveQueue(nextQueue);
    setSearchTerm("");
    setTracks([]);
    setPagination(null);
    setLoadError("");
    setQuery({
      q: "",
      scope: "moderation",
      approvalStatus: "pending",
      reviewSource: nextQueue,
      page: 1,
      limit: 10,
    });
  };

  // ĐÃ SỬA: Tính toán an toàn số trang hiển thị để tránh lỗi 1/0 khi trống lịch sơ
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 0;
  const currentPage = total === 0 ? 0 : (pagination?.page ?? 1);
  const pageLabel = `${currentPage}/${totalPages}`;
  const visibleItemCount = tracks.length;

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
            <HeaderStat label="Hiển thị" value={visibleItemCount} />
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

      <div
        role="tablist"
        aria-label={pageCopy.title}
        className="inline-flex w-full items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-auto"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeQueue === "track_release"}
          onClick={() => handleQueueChange("track_release")}
          className={[
            "inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-5 text-sm font-semibold transition-colors sm:min-w-[180px]",
            activeQueue === "track_release"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          ].join(" ")}
        >
          Bài hát mới
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeQueue === "pending_update"}
          onClick={() => handleQueueChange("pending_update")}
          className={[
            "inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-5 text-sm font-semibold transition-colors sm:min-w-[180px]",
            activeQueue === "pending_update"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          ].join(" ")}
        >
          Bản chỉnh sửa
        </button>
      </div>

      {/* Khung 2: Tìm kiếm */}
      <form onSubmit={handleSearchSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:grid-cols-[1fr_132px]">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={pageCopy.searchPlaceholder} className="w-full rounded-lg bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:bg-sky-50" />
        </label>
        <button type="submit" className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Tìm kiếm</button>
      </form>

      {/* Khung 3: Danh sách hàng Spaced Rows */}
      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-16 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-base font-semibold text-rose-900">Không thể tải hàng đợi kiểm duyệt</p>
          <p className="mt-2 text-sm text-rose-700">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadPendingTracks(query)}
            className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
          >
            Thử lại
          </button>
        </div>
      ) : isLoading && tracks.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center text-sm font-semibold text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          Đang tải danh sách {pageCopy.itemLabel.toLowerCase()}...
        </div>
      ) : tracks.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-base font-semibold text-slate-900">{pageCopy.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-400">{pageCopy.emptyDescription}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="grid min-w-[1060px] grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_100px_160px_160px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            <span>{pageCopy.columnTitle}</span>
            <span>Nghệ sĩ nộp</span>
            <span>Thời lượng</span>
            <span>Trạng thái</span>
            <span className="text-center">Hành động</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1060px] divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-12 text-center text-sm font-medium text-slate-400 uppercase tracking-wider">Đang tải danh sách hàng đợi...</div>
              ) : (
                tracks.map((track) => (
                  <article key={track.id} className="relative grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_100px_160px_160px] gap-4 px-6 py-4 transition hover:bg-slate-50/60 items-center">
                    <div className="absolute inset-y-2 left-0 w-1 rounded-r bg-amber-500" />
                    {(() => {
                      const automaticBadge = getAutomaticDecisionBadge(track);
                      return (
                        <>

                    <div className="flex min-w-0 items-center gap-3 pl-2">
                      {track.avatar ? (
                        <img src={track.avatar} alt={track.title} className="h-10 w-10 rounded-xl object-cover border border-slate-100 shadow-sm" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black text-white uppercase">TRACK</div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{track.title}</p>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <span
                            className={[
                              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              track.reviewSource === "pending_update"
                                ? "border-sky-200 bg-sky-50 text-sky-700"
                                : "border-violet-200 bg-violet-50 text-violet-700",
                            ].join(" ")}
                          >
                            {pageCopy.itemLabel}
                          </span>
                          {track.reviewSource === "pending_update" ? (
                            <span className="truncate text-[10px] text-slate-500">
                              {track.changedFields?.length || 0} trường thay đổi
                              {track.liveTitle && track.liveTitle !== track.title
                                ? ` • Tên đang phát hành: ${track.liveTitle}`
                                : ""}
                            </span>
                          ) : null}
                          <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${automaticBadge.className}`}>
                            {automaticBadge.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="truncate text-sm text-slate-600 font-medium">{track.artist?.name || "—"}</p>
                    <p className="text-sm font-mono font-medium text-slate-400">{formatDuration(track.duration)}</p>
                    
                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${automaticBadge.className}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {automaticBadge.label}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <Link to={routePaths.trackDetail(track.id)} className="inline-flex h-9 w-[140px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
                        {pageCopy.actionLabel} <ArrowUpRight size={14} />
                      </Link>
                    </div>
                        </>
                      );
                    })()}
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
