import { useEffect, useState } from "react";
import ContentCardSection from "../../components/content/ContentCardSection";
import DemoContentSection from "../../components/content/DemoContentSection";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import {
  getAlbumDetailService,
  getAlbumsService,
} from "../../services/albumService";
import { getApiErrorMessage } from "../../utils/apiError";

const createPlaceholderImage = (label, startColor, endColor) => {
  const safeLabel = label || "Music";
  const firstLetter = safeLabel.charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#bg)" />
      <circle cx="500" cy="120" r="120" fill="rgba(255,255,255,0.08)" />
      <circle cx="120" cy="520" r="170" fill="rgba(255,255,255,0.08)" />
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="220" font-family="Arial, sans-serif" font-weight="700">${firstLetter}</text>
      <text x="50%" y="82%" text-anchor="middle" fill="rgba(255,255,255,0.78)" font-size="42" font-family="Arial, sans-serif" letter-spacing="8">${safeLabel.toUpperCase()}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const HomePage = () => {
  const [albums, setAlbums] = useState([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);
  const [albumsError, setAlbumsError] = useState("");
  const [playbackError, setPlaybackError] = useState("");
  const { playAlbum } = usePlayer();

  useEffect(() => {
    let isMounted = true;

    const loadAlbums = async () => {
      setIsLoadingAlbums(true);
      setAlbumsError("");

      try {
        const response = await getAlbumsService({ limit: 10 });

        if (!isMounted) {
          return;
        }

        setAlbums(response.albums);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAlbums([]);
        setAlbumsError(
          getApiErrorMessage(
            error,
            "Unable to load albums from the backend right now."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoadingAlbums(false);
        }
      }
    };

    loadAlbums();

    return () => {
      isMounted = false;
    };
  }, []);


  const handleGetAlbum = () => {
    if (albums.length === 0) {
      return [];
    }

    const albumData = albums.map((album) => ({
      id: album.id,
      type: "album",
      image:
        album.coverImage ||
        createPlaceholderImage(album.title || "Album", "#f59e0b", "#111827"),
      title: album.title || "Untitled album",
      subtitle: album.artist?.name || "Unknown artist",
      href: album.id ? routePaths.albumDetail(album.id) : undefined,
      raw: album,
    }));
    return albumData;
  };

  const handlePlay = async (item) => {
    const albumSummary = item?.raw ?? item;

    if (!albumSummary?.id) {
      return;
    }

    try {
      setPlaybackError("");
      const albumDetail = await getAlbumDetailService(albumSummary.id);
      await playAlbum(albumDetail, albumDetail?.tracks ?? []);
    } catch (error) {
      setPlaybackError(
        getApiErrorMessage(
          error,
          "Unable to load the album tracks for playback right now."
        )
      );
    }
  };

  return (
    <section className="space-y-8 sm:space-y-10">
      { albumsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { albumsError }
        </div>
      ) : null }

      { playbackError ? (
        <div
          className="
            rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm
            text-rose-700 dark:text-rose-300
          "
        >
          { playbackError }
        </div>
      ) : null }

      <ContentCardSection
        label="Backend albums"
        title="Latest album data"
        description="Album cards are loaded from the existing backend API through a dedicated service layer."
        items={ handleGetAlbum() }
        isLoading={ isLoadingAlbums }
        emptyMessage="The album endpoint returned no data yet."
        onPlay={ (item) => handlePlay(item.raw ?? item) }
      />

      <DemoContentSection onPlay={ handlePlay } />
    </section>
  );
};

export default HomePage;
