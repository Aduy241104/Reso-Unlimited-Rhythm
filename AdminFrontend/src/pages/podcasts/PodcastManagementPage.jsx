import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import podcastService from "../../services/podcastService";
import { routePaths } from "../../routes/routePaths";
import PodcastArtwork from "../../components/podcast/PodcastArtwork";

const labels = { draft: "Bản nháp", pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Bị từ chối", blocked: "Đã khóa", all: "Tất cả" };
const badge = { draft: "bg-slate-100 text-slate-700", pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800", rejected: "bg-rose-100 text-rose-800", blocked: "bg-red-100 text-red-800" };
const duration = (seconds = 0) => `${Math.floor(Number(seconds) / 60)}:${String(Math.floor(Number(seconds) % 60)).padStart(2, "0")}`;

const PodcastManagementPage = () => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    podcastService.list({ status, q, page, limit: 20 })
      .then((result) => { setItems(result.podcasts); setPagination(result.pagination); })
      .catch((reason) => setError(reason?.message || "Không thể tải danh sách Podcast."))
      .finally(() => setLoading(false));
  }, [status, q, page]);

  // This effect synchronizes the remote queue with the selected filters.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const changeStatus = (value) => { setStatus(value); setPage(1); };

  return (
    <section className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-600">Moderation workspace</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Quản lý Podcast</h1>
        <p className="mt-2 text-sm text-slate-500">Xem hồ sơ, nghe thử và thực hiện moderation Podcast.</p>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row">
        <div className="flex flex-wrap gap-2">
          {["pending", "all", "draft", "approved", "rejected", "blocked"].map((item) => (
            <button key={item} type="button" onClick={() => changeStatus(item)} className={`rounded-xl px-3 py-2 text-xs font-bold ${status === item ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>
              {labels[item]}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(event) => setQ(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (setPage(1), load())} placeholder="Tìm tiêu đề hoặc Artist" className="w-56 text-sm outline-none" />
        </label>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-slate-500">Đang tải...</p> : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-[64px,1fr,160px,140px] gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 md:grid">
              <span /><span>Podcast / Artist</span><span>Thời lượng</span><span>Trạng thái</span>
            </div>
            {items.length === 0 ? <div className="p-14 text-center text-sm text-slate-500">Không có Podcast trong bộ lọc này.</div> : items.map((podcast) => (
              <Link key={podcast.id} to={routePaths.podcastDetail(podcast.id)} className="grid gap-3 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[64px,1fr,160px,140px] md:items-center md:gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100"><PodcastArtwork podcast={podcast} className="h-full w-full object-cover" /></div>
                <div><p className="font-bold text-slate-900">{podcast.title || "Chưa đặt tiêu đề"}</p><p className="mt-1 text-xs text-slate-500">{podcast.creator?.name || "Artist không xác định"}</p></div>
                <p className="text-sm text-slate-600">{duration(podcast.duration)}</p>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${podcast.isBlocked ? badge.blocked : badge[podcast.approvalStatus]}`}>{podcast.isBlocked ? labels.blocked : labels[podcast.approvalStatus]}</span>
              </Link>
            ))}
          </div>
          {pagination?.totalPages > 1 && <div className="flex items-center justify-center gap-3 py-4"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40">Trước</button><span className="text-sm text-slate-500">Trang {page} / {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40">Sau</button></div>}
        </>
      )}
    </section>
  );
};

export default PodcastManagementPage;
