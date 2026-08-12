import { LoaderCircle, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LoadingState from "../../components/common/LoadingState";
import TrackDetailArtistCard from "../../components/trackDetail/TrackDetailArtistCard";
import TrackDetailHero from "../../components/trackDetail/TrackDetailHero";
import { usePlayer } from "../../hooks/usePlayer";
import podcastService from "../../services/podcastService";
import { routePaths } from "../../routes/routePaths";
import { createPlaceholderImage, formatTrackDuration } from "../../utils/albumDetail";

const playButtonClassName = `
  inline-flex h-14 w-14 items-center justify-center self-start rounded-full
  bg-gradient-to-br from-[#ff8a3d] via-[#ff4fd8] to-[#7b61ff]
  text-black shadow-[0_18px_38px_rgba(30,215,96,0.28)] transition
  hover:scale-[1.03] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50
`;

const formatListenCount = (value) => {
  const listenCount = Number(value);

  if (!Number.isFinite(listenCount) || listenCount <= 0) {
    return "Chưa có lượt nghe";
  }

  if (listenCount >= 1000000) {
    return `${(listenCount / 1000000).toFixed(listenCount >= 10000000 ? 0 : 1)}M lượt nghe`;
  }

  if (listenCount >= 1000) {
    return `${(listenCount / 1000).toFixed(listenCount >= 100000 ? 0 : 1)}K lượt nghe`;
  }

  return `${new Intl.NumberFormat("vi-VN").format(listenCount)} lượt nghe`;
};

const getPodcastCreatorId = (podcast) => {
  const creatorId =
    podcast?.creator?.id ||
    podcast?.creator?._id ||
    podcast?.creator?.artistId ||
    podcast?.creatorId;

  return typeof creatorId === "string" || typeof creatorId === "number"
    ? String(creatorId).trim()
    : "";
};

const PodcastDetailPage = () => {
  const { id } = useParams();
  const [podcast, setPodcast] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const {
    currentMedia,
    isBuffering,
    isPlaying,
    playPodcast,
    togglePlayPause,
  } = usePlayer();

  useEffect(() => {
    let isMounted = true;

    const loadPodcast = async () => {
      setLoading(true);

      try {
        const nextPodcast = await podcastService.getPublic(id);

        if (isMounted) {
          setPodcast(nextPodcast);
          setError("");
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

  if (loading) {
    return <LoadingState message="Đang tải Podcast..." className="min-h-[60vh]" />;
  }

  if (error || !podcast) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5 text-center text-sm text-[#a1a1aa]">
        {error || "Không tìm thấy Podcast."}
      </div>
    );
  }

  const podcastId = String(podcast.id || podcast._id || id);
  const isPodcastMedia =
    currentMedia?.mediaType === "podcast" || currentMedia?.type === "podcast";
  const isActive = isPodcastMedia && String(currentMedia?.id || "") === podcastId;
  const isCurrentlyPlaying = isActive && isPlaying;
  const podcastImage =
    podcast.coverImageUrl?.trim() ||
    createPlaceholderImage(podcast.title || "Podcast", "#404040", "#121212");
  const duration = formatTrackDuration(podcast.duration);
  const listenCount = Number(podcast.stats?.totalListen || 0);
  const listensLabel = formatListenCount(listenCount);
  const creatorName = podcast.creator?.name || "Nghệ sĩ không xác định";
  const creatorAvatar =
    podcast.creator?.avatar ||
    createPlaceholderImage(creatorName, "#334155", "#0f172a");
  const creatorId = getPodcastCreatorId(podcast);
  const creatorHref = creatorId
    ? routePaths.artistBrowseProfile(creatorId)
    : undefined;

  const handlePlayPodcast = async () => {
    if (isActive) {
      await togglePlayPause();
      return;
    }

    await playPodcast(podcast);
  };

  return (
    <section className="rounded-[10px] text-[#f7f1ea]">
      <div className="space-y-5 sm:space-y-6">
        <TrackDetailHero
          image={podcastImage}
          coverImage={podcastImage}
          title={podcast.title || "Podcast chưa có tên"}
          artistName={creatorName}
          artistAvatar={creatorAvatar}
          artistHref={creatorHref}
          albumTitle="Podcast"
          releaseYear=""
          duration={duration}
          listensLabel={listensLabel}
          eyebrow="Podcast"
        />

        <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
          <button
            type="button"
            onClick={handlePlayPodcast}
            disabled={!podcast.audioUrl || isBuffering}
            aria-label={isCurrentlyPlaying ? "Tạm dừng Podcast" : "Phát Podcast"}
            className={playButtonClassName}
          >
            {isBuffering ? (
              <LoaderCircle className="h-6 w-6 animate-spin" />
            ) : isCurrentlyPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current" />
            )}
          </button>
        </section>

        {!podcast.audioUrl ? (
          <p className="text-sm text-amber-200">Podcast chưa có tệp âm thanh để phát.</p>
        ) : null}

        <section className="sm:p-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[#111111] dark:text-white">
            Giới thiệu Podcast
          </h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#52525b] dark:text-[#a1a1aa] sm:text-base sm:leading-8">
            {podcast.description || "Podcast này chưa có phần giới thiệu."}
          </p>
        </section>

        <section className="sm:p-2">
          <div className="w-full rounded-[18px] border border-black/6 bg-black/[0.03] px-4 py-3 dark:border-white/10 dark:bg-white/[0.04] sm:w-auto sm:min-w-[11rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#71717a] dark:text-[#a1a1aa]">
              Lượt nghe
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#111111] dark:text-white">
              {new Intl.NumberFormat("vi-VN").format(listenCount)}
            </p>
            <p className="mt-1 text-sm text-[#52525b] dark:text-[#a1a1aa]">
              {listensLabel}
            </p>
          </div>
        </section>

        <TrackDetailArtistCard
          avatar={creatorAvatar}
          name={creatorName}
          role="Nghệ sĩ Podcast"
          artistHref={creatorHref}
        />
      </div>
    </section>
  );
};

export default PodcastDetailPage;
