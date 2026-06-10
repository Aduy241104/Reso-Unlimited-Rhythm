import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PlaylistCard from "../../components/userPlaylist/PlaylistCard";
import { getUserPlaylists } from "../../services/userPlaylistService";
import { getApiErrorMessage } from "../../utils/apiError";

const normalizePlaylists = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.playlists)) {
    return payload.playlists;
  }

  return [];
};

const LoadingState = () => {
  return (
    <section className="flex min-h-[280px] items-center justify-center rounded-3xl bg-black">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
      </div>
    </section>
  );
};

const ErrorState = ({ message }) => {
  return (
    <section className="flex min-h-[280px] items-center justify-center rounded-3xl bg-[#121212] px-6 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Không thể thêm playlist</h2>
        { message ? (
          <p className="text-sm text-white/60">{ message }</p>
        ) : null }
      </div>
    </section>
  );
};

const EmptyState = () => {
  return (
    <section className="flex min-h-[280px] items-center justify-center rounded-3xl bg-[#121212] px-6 text-center">
      <h2 className="text-2xl font-bold text-white">Chưa có playlist nào</h2>
    </section>
  );
};

const UserPlaylistPage = () => {
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPlaylists = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await getUserPlaylists();
        const nextPlaylists = normalizePlaylists(payload);

        if (!isMounted) {
          return;
        }

        setPlaylists(nextPlaylists);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPlaylists([]);
        setErrorMessage(getApiErrorMessage(error, "Kh\u00f4ng th\u1ec3 t\u1ea3i playlist"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPlaylists();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="space-y-8 bg-black px-1 py-2 sm:space-y-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Playlist Công Khai
        </h1>
      </div>

      { isLoading ? (
        <LoadingState />
      ) : errorMessage ? (
        <ErrorState message={ errorMessage } />
      ) : playlists.length === 0 ? (
        <EmptyState />
      ) : (
        <section
          className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
          aria-label="Playlist C\u00f4ng khai"
        >
          { playlists.map((playlist, index) => (
            <PlaylistCard
              key={ playlist?.playlistId || `${playlist?.name || "playlist"}-${index}` }
              playlist={ playlist }
            />
          )) }
        </section>
      ) }
    </section>
  );
};

export default UserPlaylistPage;
