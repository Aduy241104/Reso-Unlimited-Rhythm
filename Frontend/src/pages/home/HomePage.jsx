import { useEffect, useState } from "react";
import ContentCardSection from "../../components/content/ContentCardSection";
import { useContentPlayback } from "../../hooks/useContentPlayback";
import { getAlbumsService } from "../../services/albumService";
import { getSystemPlaylistsService } from "../../services/playlistService";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  mapAlbumsToContentCards,
  mapSystemPlaylistsToContentCards,
} from "../../utils/homeContent";

const HomePage = () => {
  const [albums, setAlbums] = useState([]);
  const [systemPlaylists, setSystemPlaylists] = useState([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);
  const [isLoadingSystemPlaylists, setIsLoadingSystemPlaylists] = useState(true);
  const [albumsError, setAlbumsError] = useState("");
  const [systemPlaylistsError, setSystemPlaylistsError] = useState("");
  const { playbackError, playAlbumItem, playPlaylistItem } = useContentPlayback();

  useEffect(() => {
    let isMounted = true;

    const loadHomeContent = async () => {
      setIsLoadingAlbums(true);
      setIsLoadingSystemPlaylists(true);
      setAlbumsError("");
      setSystemPlaylistsError("");

      const [albumsResult, systemPlaylistsResult] = await Promise.allSettled([
        getAlbumsService({ limit: 10 }),
        getSystemPlaylistsService({ limit: 10 }),
      ]);

      if (!isMounted) {
        return;
      }

      if (albumsResult.status === "fulfilled") {
        setAlbums(albumsResult.value.albums);
      } else {
        setAlbums([]);
        setAlbumsError(
          getApiErrorMessage(
            albumsResult.reason,
            "Unable to load albums from the backend right now."
          )
        );
      }

      if (systemPlaylistsResult.status === "fulfilled") {
        setSystemPlaylists(systemPlaylistsResult.value.playlists);
      } else {
        setSystemPlaylists([]);
        setSystemPlaylistsError(
          getApiErrorMessage(
            systemPlaylistsResult.reason,
            "Unable to load system playlists from the backend right now."
          )
        );
      }

      setIsLoadingAlbums(false);
      setIsLoadingSystemPlaylists(false);
    };

    loadHomeContent();

    return () => {
      isMounted = false;
    };
  }, []);

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

      { systemPlaylistsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { systemPlaylistsError }
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
        title="System Playlist"
        description="Discover playlists curated to help you enjoy the right music at the right moment."
        items={ mapSystemPlaylistsToContentCards(systemPlaylists) }
        isLoading={ isLoadingSystemPlaylists }
        emptyMessage="The system playlist endpoint returned no data yet."
        onPlay={ playPlaylistItem }
      />

      <ContentCardSection
        label="Albums"
        title="Latest album data"
        description="Browse featured albums and discover music collections tailored for every mood."
        items={ mapAlbumsToContentCards(albums) }
        isLoading={ isLoadingAlbums }
        emptyMessage="The album endpoint returned no data yet."
        onPlay={ playAlbumItem }
      />
    </section>
  );
};

export default HomePage;
