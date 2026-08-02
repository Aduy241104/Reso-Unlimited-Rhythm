import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CenteredLoadingState from "../../components/common/LoadingState";
import ArtistCard from "../../components/libary/ArtistCard";
import { routePaths } from "../../routes/routePaths";
import { getFollowedArtists } from "../../services/libaryService";
import { getApiErrorMessage } from "../../utils/apiError";
import { FOLLOWED_ARTISTS_CHANGED_EVENT } from "../../utils/followedLibraryEvents";
import {
  DEFAULT_FOLLOWED_ARTISTS_PARAMS,
  LIBARY_TEXT,
} from "../../utils/libaryDetail";
import LibaryAlbumPage from "./LibaryAlbumPage";

const normalizeArtistItem = (artist) => {
  if (!artist) {
    return null;
  }

  const artistId = artist?.artistId || artist?.id || artist?._id || "";
  const artistName =
    typeof artist?.name === "string" ? artist.name.trim() : "";

  if (!artistId && !artistName) {
    return null;
  }

  return {
    ...artist,
    artistId,
    name: artistName,
    avatar: typeof artist?.avatar === "string" ? artist.avatar.trim() : "",
  };
};

const getArtistIdentity = (artist) => {
  const normalizedArtist = normalizeArtistItem(artist);

  if (!normalizedArtist) {
    return "";
  }

  if (normalizedArtist.artistId) {
    return `artist:${String(normalizedArtist.artistId).trim().toLowerCase()}`;
  }

  return `artist-name:${normalizedArtist.name.toLowerCase()}`;
};

const INITIAL_VISIBLE_ARTISTS_COUNT = 14;

const dedupeArtists = (artists = []) => {
  const seenArtistIdentities = new Set();

  return artists.filter((artist) => {
    const artistIdentity = getArtistIdentity(artist);

    if (!artistIdentity || seenArtistIdentities.has(artistIdentity)) {
      return false;
    }

    seenArtistIdentities.add(artistIdentity);
    return true;
  });
};

const LoadingState = () => {
  return (
    <section className="rounded-[24px] bg-[#181818] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <CenteredLoadingState
        message={LIBARY_TEXT.loadingTitle || "Loading..."}
        spinnerClassName="h-7 w-7"
      />
    </section>
  );
};

const EmptyState = () => {
  return (
    <section className="rounded-[24px] bg-[#181818] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mx-auto h-24 w-24 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(30,215,96,0.36),rgba(30,215,96,0.06))]" />
      <h3 className="mt-6 text-2xl font-bold text-white">{LIBARY_TEXT.emptyTitle}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/60">
        {LIBARY_TEXT.emptyDescription}
      </p>
    </section>
  );
};

const ErrorState = ({ message, onRetry }) => {
  return (
    <section className="rounded-[24px] border border-red-400/10 bg-red-400/[0.05] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <h3 className="text-2xl font-bold text-white">{LIBARY_TEXT.errorTitle}</h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-100/80">
        {message || LIBARY_TEXT.errorDescription}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
      >
        {LIBARY_TEXT.retryLabel}
      </button>
    </section>
  );
};

const LibaryPage = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isShowingAllArtists, setIsShowingAllArtists] = useState(false);

  const loadFollowedArtists = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getFollowedArtists(DEFAULT_FOLLOWED_ARTISTS_PARAMS);
      const nextArtists = Array.isArray(response?.artists) ? response.artists : [];

      setArtists(dedupeArtists(nextArtists.map(normalizeArtistItem).filter(Boolean)));
    } catch (error) {
      setArtists([]);
      setErrorMessage(
        getApiErrorMessage(error, LIBARY_TEXT.errorDescription)
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFollowedArtists();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleArtistsChanged = (event) => {
      if (event?.detail?.type === "removed") {
        const removedArtistIdentity = getArtistIdentity(
          event.detail.artist || { artistId: event.detail.artistId }
        );

        if (!removedArtistIdentity) {
          return;
        }

        setArtists((currentArtists) =>
          currentArtists.filter(
            (artist) => getArtistIdentity(artist) !== removedArtistIdentity
          )
        );
        setIsLoading(false);
        return;
      }

      if (event?.detail?.type === "added") {
        const nextArtist = normalizeArtistItem(event.detail.artist);

        if (!nextArtist) {
          return;
        }

        setArtists((currentArtists) =>
          dedupeArtists([
            nextArtist,
            ...currentArtists.filter(
              (artist) =>
                getArtistIdentity(artist) !== getArtistIdentity(nextArtist)
            ),
          ])
        );
        setIsLoading(false);
      }
    };

    window.addEventListener(FOLLOWED_ARTISTS_CHANGED_EVENT, handleArtistsChanged);

    return () => {
      window.removeEventListener(
        FOLLOWED_ARTISTS_CHANGED_EVENT,
        handleArtistsChanged
      );
    };
  }, []);

  const displayedArtists = isShowingAllArtists
    ? artists
    : artists.slice(0, INITIAL_VISIBLE_ARTISTS_COUNT);

  const shouldShowToggleArtistsButton =
    artists.length > INITIAL_VISIBLE_ARTISTS_COUNT;

  const handleArtistClick = (artistId) => {
    if (!artistId) {
      return;
    }

    navigate(routePaths.artistBrowseProfile(artistId));
  };

  return (
    <section className="space-y-8 sm:space-y-10">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Thư viện của bạn
        </h1>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Nghệ sĩ đang theo dõi
          </h2>

          {shouldShowToggleArtistsButton ? (
            <button
              type="button"
              onClick={() => setIsShowingAllArtists((currentValue) => !currentValue)}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              {isShowingAllArtists ? "Thu gọn" : "Xem thêm"}
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={loadFollowedArtists} />
        ) : artists.length === 0 ? (
          <EmptyState />
        ) : (
          <section
            className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
            aria-label={LIBARY_TEXT.title}
          >
            {displayedArtists.map((artist, index) => (
              <ArtistCard
                key={artist?.artistId || `${artist?.name || "artist"}-${index}`}
                artist={artist}
                subtitle={LIBARY_TEXT.subtitle}
                onClick={() => handleArtistClick(artist?.artistId)}
              />
            ))}
          </section>
        )}
      </section>

      <LibaryAlbumPage />
    </section>
  );
};

export default LibaryPage;



