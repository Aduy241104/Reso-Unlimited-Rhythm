import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ArtistCard from "../../components/libary/ArtistCard";
import { routePaths } from "../../routes/routePaths";
import { getFollowedArtists } from "../../services/libaryService";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  DEFAULT_FOLLOWED_ARTISTS_PARAMS,
  LIBARY_TEXT,
} from "../../utils/libaryDetail";

const LoadingState = () => {
  return (
    <section className="rounded-[24px] bg-[#181818] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1ed760]/10 text-[#1ed760]">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-white">{LIBARY_TEXT.loadingTitle}</h2>
      <p className="mt-2 text-sm text-white/60">{LIBARY_TEXT.loadingDescription}</p>
    </section>
  );
};

const EmptyState = () => {
  return (
    <section className="rounded-[24px] bg-[#181818] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mx-auto h-24 w-24 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(30,215,96,0.36),rgba(30,215,96,0.06))]" />
      <h2 className="mt-6 text-2xl font-bold text-white">{LIBARY_TEXT.emptyTitle}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/60">
        {LIBARY_TEXT.emptyDescription}
      </p>
    </section>
  );
};

const ErrorState = ({ message, onRetry }) => {
  return (
    <section className="rounded-[24px] border border-red-400/10 bg-red-400/[0.05] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <h2 className="text-2xl font-bold text-white">{LIBARY_TEXT.errorTitle}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-100/80">
        {message || LIBARY_TEXT.errorDescription}
      </p>
      <button
        type="button"
        onClick={ onRetry }
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

  const loadFollowedArtists = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getFollowedArtists(DEFAULT_FOLLOWED_ARTISTS_PARAMS);
      setArtists(Array.isArray(response?.artists) ? response.artists : []);
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
    loadFollowedArtists();
  }, []);

  const handleArtistClick = (artistId) => {
    if (!artistId) {
      return;
    }

    navigate(routePaths.artistBrowseProfile(artistId));
  };

  return (
    <section className="space-y-8 sm:space-y-10">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#1ed760]">
          Your Library
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {LIBARY_TEXT.title}
        </h1>
      </div>

      { isLoading ? (
        <LoadingState />
      ) : errorMessage ? (
        <ErrorState message={ errorMessage } onRetry={ loadFollowedArtists } />
      ) : artists.length === 0 ? (
        <EmptyState />
      ) : (
        <section
          className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
          aria-label={ LIBARY_TEXT.title }
        >
          { artists.map((artist, index) => (
            <ArtistCard
              key={ artist?.artistId || `${artist?.name || "artist"}-${index}` }
              artist={ artist }
              subtitle={ LIBARY_TEXT.subtitle }
              onClick={ () => handleArtistClick(artist?.artistId) }
            />
          )) }
        </section>
      ) }
    </section>
  );
};

export default LibaryPage;
