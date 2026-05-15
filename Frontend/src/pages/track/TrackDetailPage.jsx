import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import TrackDetailActions from "../../components/trackDetail/TrackDetailActions";
import TrackDetailArtistCard from "../../components/trackDetail/TrackDetailArtistCard";
import TrackDetailHero from "../../components/trackDetail/TrackDetailHero";
import TrackDetailLikeSection from "../../components/trackDetail/TrackDetailLikeSection";
import TrackDetailLyrics from "../../components/trackDetail/TrackDetailLyrics";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { getTrackDetailService } from "../../services/trackService";
import {
  createPlaceholderImage,
  formatReleaseYear,
  formatTrackDuration,
} from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";

const formatListenCount = (value) => {
  const listenCount = Number(value);

  if (!Number.isFinite(listenCount) || listenCount <= 0) {
    return "Ch\u01b0a c\u00f3 l\u01b0\u1ee3t nghe";
  }

  if (listenCount >= 1000000) {
    return `${(listenCount / 1000000).toFixed(listenCount >= 10000000 ? 0 : 1)}M l\u01b0\u1ee3t nghe`;
  }

  if (listenCount >= 1000) {
    return `${(listenCount / 1000).toFixed(listenCount >= 100000 ? 0 : 1)}K l\u01b0\u1ee3t nghe`;
  }

  return `${new Intl.NumberFormat("vi-VN").format(listenCount)} l\u01b0\u1ee3t nghe`;
};

const TrackDetailPage = () => {
  const { id } = useParams();
  const [track, setTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const { playTrack } = usePlayer();

  useEffect(() => {
    let isMounted = true;

    const loadTrackDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const trackDetail = await getTrackDetailService(id);

        if (!isMounted) {
          return;
        }

        setTrack(trackDetail);
        setIsLiked(false);
        setLikeCount(Number(trackDetail?.stats?.totalLike) || 0);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTrack(null);
        setIsLiked(false);
        setLikeCount(0);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load track detail from the backend right now."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setTrack(null);
      setErrorMessage("Track id is missing.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    loadTrackDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const trackImage = useMemo(
    () =>
      track?.coverImage ||
      track?.avatar ||
      track?.album?.coverImage ||
      track?.artist?.coverImage ||
      track?.artist?.avatar ||
      createPlaceholderImage(track?.title || "Track", "#1db954", "#07170c"),
    [track]
  );
  const artistAvatar = useMemo(
    () =>
      track?.artist?.avatar ||
      createPlaceholderImage(track?.artist?.name || "Artist", "#334155", "#0f172a"),
    [track]
  );
  const artistName = track?.artist?.name || "Unknown artist";
  const albumTitle = track?.album?.title || "Unknown album";
  const releaseYear = formatReleaseYear(track?.releaseDate);
  const duration = formatTrackDuration(track?.duration);
  const listensLabel = formatListenCount(track?.stats?.playCount);
  const lyrics = track?.lyrics?.static?.trim?.() || "";
  const artistRole = track?.artist?.role || "Ngh\u1ec7 s\u0129";
  const albumHref = track?.album?.id ? routePaths.albumDetail(track.album.id) : undefined;

  const playbackQueue = useMemo(() => {
    if (Array.isArray(track?.album?.tracks) && track.album.tracks.length > 0) {
      return track.album.tracks;
    }

    return track ? [track] : [];
  }, [track]);

  const startIndex = useMemo(() => {
    if (!track?.id || !Array.isArray(playbackQueue) || playbackQueue.length === 0) {
      return 0;
    }

    const matchedIndex = playbackQueue.findIndex((item) => {
      const candidate = item?.track ?? item;
      return candidate?.id === track.id;
    });

    return matchedIndex >= 0 ? matchedIndex : 0;
  }, [playbackQueue, track]);

  const handlePlay = async () => {
    if (!track) {
      return;
    }

    await playTrack(track, {
      queue: playbackQueue,
      startIndex,
      collection: {
        id: track?.album?.id || track?.id,
        type: track?.album?.id ? "album" : "track",
        title: track?.album?.title || track?.title || "Track",
        image: trackImage,
        artistName,
      },
    });
  };

  const handleAddToLibrary = () => {
    console.log("Add track to library:", track?.title);
  };

  const handleDownload = () => {
    console.log("Download track:", track?.title);
  };

  const handleMore = () => {
    console.log("Open more actions for track:", track?.title);
  };

  const handleToggleLike = () => {
    setIsLiked((currentValue) => {
      const nextValue = !currentValue;

      setLikeCount((currentCount) =>
        nextValue ? currentCount + 1 : Math.max(currentCount - 1, 0)
      );

      return nextValue;
    });
  };

  if (isLoading) {
    return (
      <section className="rounded-[10px] sm:p-6">
        <div className="rounded-[24px] bg-[#121212] px-6 py-20 text-sm text-white/82">
          Loading track detail...
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-[10px] sm:p-6">
        <div className="rounded-[24px] bg-[#121212] px-6 py-20 text-sm text-white/88">
          { errorMessage }
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[10px] sm:p-1">
      <div className="space-y-6">
        <TrackDetailHero
          image={ trackImage }
          title={ track?.title || "Untitled track" }
          artistName={ artistName }
          artistAvatar={ artistAvatar }
          albumTitle={ albumTitle }
          albumHref={ albumHref }
          releaseYear={ releaseYear }
          duration={ duration }
          listensLabel={ listensLabel }
        />

        <TrackDetailActions
          onPlay={ handlePlay }
          onAddToLibrary={ handleAddToLibrary }
          onDownload={ handleDownload }
          onMore={ handleMore }
        />

        <TrackDetailLyrics lyrics={ lyrics } />

        <TrackDetailLikeSection
          title={ track?.title || "Untitled track" }
          artistName={ artistName }
          image={ trackImage }
          isLiked={ isLiked }
          likeCount={ likeCount }
          onToggleLike={ handleToggleLike }
        />
        
        <TrackDetailArtistCard
          avatar={ artistAvatar }
          name={ artistName }
          role={ artistRole }
        />

      </div>
    </section>
  );
};

export default TrackDetailPage;
