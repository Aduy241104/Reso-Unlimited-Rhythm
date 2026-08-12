import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import podcastService from "../../services/podcastService";
import { routePaths } from "../../routes/routePaths";
import { createPlaceholderImage } from "../../utils/albumDetail";

const formatDuration = (seconds = 0) => `${Math.floor(Number(seconds) / 60)}:${String(Math.floor(Number(seconds) % 60)).padStart(2, "0")}`;

const PodcastArtwork = ({ podcast }) => {
  const fallback = createPlaceholderImage(podcast?.title || "Podcast", "#806ee4", "#241b45");

  return (
    <img
      src={podcast?.coverImageUrl?.trim() || fallback}
      alt={podcast?.title || "Podcast"}
      className="h-full w-full object-cover transition group-hover:scale-105"
      onError={(event) => {
        if (event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
};

const PodcastListPage = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    podcastService.listPublic({ q: query, page, limit: 24 })
      .then((result) => { if (mounted) { setPodcasts(result.podcasts); setPagination(result.pagination); } })
      .catch(() => { if (mounted) setPodcasts([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [query, page]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 text-[#241b45] sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">Reso Podcasts</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Nghe những câu chuyện đáng nhớ</h1><p className="mt-3 max-w-2xl text-sm text-slate-500">Khám phá các Podcast đã được kiểm duyệt và phát hành công khai trên Reso.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm theo tiêu đề" className="w-56 bg-transparent text-sm outline-none" /></label>
        </div>
      </div>
      {loading ? <p className="py-16 text-center text-sm text-slate-500">Đang tải Podcast...</p> : podcasts.length === 0 ? <div className="mt-10 rounded-3xl border border-dashed border-slate-300 p-16 text-center text-slate-500">Chưa có Podcast phù hợp.</div> : <><div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{podcasts.map((podcast) => <Link key={podcast.id} to={routePaths.podcastDetail(podcast.id)} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="aspect-[1.25] bg-slate-100"><PodcastArtwork podcast={podcast} /></div><div className="p-5"><h2 className="truncate text-lg font-semibold">{podcast.title}</h2><p className="mt-1 text-sm text-slate-500">{podcast.creator?.name || "Nghệ sĩ"}</p><div className="mt-4 flex items-center justify-between text-xs text-slate-400"><span>Podcast · {formatDuration(podcast.duration)}</span><span>{Number(podcast.stats?.totalListen || 0).toLocaleString("vi-VN")} lượt nghe</span></div></div></Link>)}</div>{pagination?.totalPages > 1 && <div className="mt-8 flex items-center justify-center gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40">Trước</button><span className="text-sm text-slate-500">Trang {page} / {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40">Sau</button></div>}</>}
    </section>
  );
};

export default PodcastListPage;
