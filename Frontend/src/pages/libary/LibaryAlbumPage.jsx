import { useEffect, useState } from "react";
import CenteredLoadingState from "../../components/common/LoadingState";
import AlbumCard from "../../components/libary/AlbumCard";
import { getFollowedAlbums } from "../../services/libaryService";
import { getApiErrorMessage } from "../../utils/apiError";
import { FOLLOWED_ALBUMS_CHANGED_EVENT } from "../../utils/followedLibraryEvents";
import {
  DEFAULT_FOLLOWED_ALBUMS_PARAMS,
  LIBARY_ALBUM_TEXT,
} from "../../utils/libaryDetail";

const normalizeAlbumItem = (album) => {
  if (!album) {
    return null;
  }

  const albumId = album?.albumId || album?.id || "";
  const title = typeof album?.title === "string" ? album.title.trim() : "";
  const artistName =
    typeof album?.artistName === "string" ? album.artistName.trim() : "";

  if (!albumId && !title) {
    return null;
  }

  return {
    ...album,
    albumId,
    title,
    coverImage: typeof album?.coverImage === "string" ? album.coverImage.trim() : "",
    artistName,
  };
};

const getAlbumIdentity = (album) => {
  const normalizedAlbum = normalizeAlbumItem(album);

  if (!normalizedAlbum) {
    return "";
  }

  if (normalizedAlbum.albumId) {
    return `album:${String(normalizedAlbum.albumId).trim().toLowerCase()}`;
  }

  return `album-title:${normalizedAlbum.title.toLowerCase()}:${normalizedAlbum.artistName.toLowerCase()}`;
};

const dedupeAlbums = (albums = []) => {
  const seenAlbumIdentities = new Set();

  return albums.filter((album) => {
    const albumIdentity = getAlbumIdentity(album);

    if (!albumIdentity || seenAlbumIdentities.has(albumIdentity)) {
      return false;
    }

    seenAlbumIdentities.add(albumIdentity);
    return true;
  });
};

const LoadingState = () => {
  return (
    <section className="rounded-[24px] bg-[#181818] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <CenteredLoadingState
        message={LIBARY_ALBUM_TEXT.loadingTitle || "Loading..."}
        spinnerClassName="h-7 w-7"
      />
    </section>
  );
};

const EmptyState = () => {
  return (
    <section className="rounded-[24px] bg-[#181818] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,#282828_0%,#3e3e3e_100%)] text-3xl font-semibold text-white">
        A
      </div>
      <h3 className="mt-6 text-2xl font-bold text-white">{LIBARY_ALBUM_TEXT.emptyTitle}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/60">
        {LIBARY_ALBUM_TEXT.emptyDescription}
      </p>
    </section>
  );
};

const ErrorState = ({ message, onRetry }) => {
  return (
    <section className="rounded-[24px] border border-red-400/10 bg-red-400/[0.05] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <h3 className="text-2xl font-bold text-white">{LIBARY_ALBUM_TEXT.errorTitle}</h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-100/80">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
      >
        {LIBARY_ALBUM_TEXT.retryLabel}
      </button>
    </section>
  );
};

const requestFollowedAlbums = async () => {
  const payload = await getFollowedAlbums(DEFAULT_FOLLOWED_ALBUMS_PARAMS);

  return Array.isArray(payload?.albums) ? payload.albums : [];
};

const LibaryAlbumPage = () => {
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadFollowedAlbums = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextAlbums = await requestFollowedAlbums();
      setAlbums(dedupeAlbums(nextAlbums.map(normalizeAlbumItem).filter(Boolean)));
    } catch (error) {
      setAlbums([]);
      setErrorMessage(
        getApiErrorMessage(error, LIBARY_ALBUM_TEXT.errorTitle)
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFollowedAlbums();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleAlbumsChanged = (event) => {
      if (event?.detail?.type === "removed") {
        const removedAlbumIdentity = getAlbumIdentity(
          event.detail.album || { albumId: event.detail.albumId }
        );

        if (!removedAlbumIdentity) {
          return;
        }

        setAlbums((currentAlbums) =>
          currentAlbums.filter(
            (album) => getAlbumIdentity(album) !== removedAlbumIdentity
          )
        );
        setIsLoading(false);
        return;
      }

      if (event?.detail?.type === "added") {
        const nextAlbum = normalizeAlbumItem(event.detail.album);

        if (!nextAlbum) {
          return;
        }

        setAlbums((currentAlbums) =>
          dedupeAlbums([
            nextAlbum,
            ...currentAlbums.filter(
              (album) => getAlbumIdentity(album) !== getAlbumIdentity(nextAlbum)
            ),
          ])
        );
        setIsLoading(false);
      }
    };

    window.addEventListener(FOLLOWED_ALBUMS_CHANGED_EVENT, handleAlbumsChanged);

    return () => {
      window.removeEventListener(
        FOLLOWED_ALBUMS_CHANGED_EVENT,
        handleAlbumsChanged
      );
    };
  }, []);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Album đang theo dõi
      </h2>

      {isLoading ? (
        <LoadingState />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={loadFollowedAlbums} />
      ) : albums.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="flex flex-col gap-3">
          {albums.map((album, index) => (
            <AlbumCard
              key={album?.albumId || `${album?.title || "album"}-${index}`}
              album={album}
            />
          ))}
        </section>
      )}
    </section>
  );
};

export default LibaryAlbumPage;
