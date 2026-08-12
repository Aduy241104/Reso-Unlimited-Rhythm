import { useEffect, useId, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import podcastService from "../../services/podcastService";
import { routePaths } from "../../routes/routePaths";
import { createPlaceholderImage } from "../../utils/albumDetail";

const PodcastDetailPage = () => {
  const { id } = useParams();
  const [podcast, setPodcast] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const counted = useRef(false);
  const sessionId = useId();
  const artworkFallback = createPlaceholderImage(podcast?.title || "Podcast", "#806ee4", "#241b45");

  useEffect(() => {
    let isMounted = true;

    const loadPodcast = async () => {
      try {
        const nextPodcast = await podcastService.getPublic(id);

        if (isMounted) {
          setError("");
          setPodcast(nextPodcast);
        }
      } catch {
        if (isMounted) {
          setPodcast(null);
          setError("Podcast không tồn tại hoặc chưa được phát hành.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadPodcast();

    return () => {
      isMounted = false;
    };
  }, [id]);
  const threshold = podcast ? Math.min(30, Number(podcast.duration || 0) * 0.25) : 0;
  const handleTimeUpdate = (event) => {
    const current = event.currentTarget.currentTime;
    if (!counted.current && threshold > 0 && current >= threshold) {
      counted.current = true;
      podcastService.listen(id, current, sessionId).catch(() => { counted.current = false; });
    }
  };

  if (loading) return <p className="py-20 text-center text-sm text-slate-500">Đang tải Podcast...</p>;
  if (error || !podcast) return <section className="mx-auto max-w-3xl px-4 py-20 text-center"><p className="text-slate-500">{error || "Podcast không tồn tại hoặc chưa được phát hành."}</p><Link to={routePaths.podcasts} className="mt-5 inline-block text-sm font-semibold text-violet-600">Quay lại Podcast</Link></section>;
  return <section className="mx-auto max-w-5xl px-4 py-10 text-[#241b45] sm:px-6 lg:px-8"><Link to={routePaths.podcasts} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600"><ArrowLeft className="h-4 w-4" />Tất cả Podcast</Link><div className="mt-8 grid gap-10 md:grid-cols-[320px,1fr] md:items-start"><div className="overflow-hidden rounded-3xl bg-slate-100 shadow-lg"><img src={podcast.coverImageUrl?.trim() || artworkFallback} alt={podcast.title} className="aspect-square w-full object-cover" onError={(event) => { if (event.currentTarget.src !== artworkFallback) event.currentTarget.src = artworkFallback; }} /></div><article><p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">Podcast</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">{podcast.title}</h1><p className="mt-3 text-sm font-medium text-slate-500">{podcast.creator?.name || "Nghệ sĩ"} · Podcast</p><p className="mt-6 whitespace-pre-line text-base leading-8 text-slate-600">{podcast.description}</p><div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><audio controls preload="metadata" src={podcast.audioUrl} onTimeUpdate={handleTimeUpdate} className="w-full" /><div className="mt-4 flex justify-end text-xs text-slate-400"><span>{Number(podcast.stats?.totalListen || 0).toLocaleString("vi-VN")} lượt nghe</span></div></div></article></div></section>;
};

export default PodcastDetailPage;
