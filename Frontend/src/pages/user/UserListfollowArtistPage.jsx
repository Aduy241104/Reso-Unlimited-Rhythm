import { useEffect, useMemo, useState } from "react";
import { Heart, Loader2, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import {
  getUserListfollowArtistsService,
} from "../../services/user.listfollowArtist.service";
import { unfollowArtistService } from "../../services/artistBrowseService";
import { getApiErrorMessage } from "../../utils/apiError";

const pageShellClassName =
  "min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,159,67,0.24),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,145,77,0.12),_transparent_22%),linear-gradient(135deg,_#050505_0%,_#0c0c0f_42%,_#111114_100%)] px-4 py-10 text-white sm:px-6 lg:px-8";

const formatFollowers = (value) => new Intl.NumberFormat("en-US").format(Number(value) || 0);

const LoadingState = () => {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="flex min-h-[120px] flex-col items-center justify-center text-center text-white/70">
        <Loader2 className="h-6 w-6 animate-spin text-[#ff9f43]" aria-hidden />
        <p className="mt-3 text-xs font-medium tracking-[0.18em] text-white/90">
          Loading followed artists...
        </p>
      </div>
    </section>
  );
};

const ErrorState = ({ title = "Could not load followed artists", message }) => {
  return (
    <section className="rounded-2xl border border-red-400/20 bg-white/5 p-4 text-red-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-2 text-xs leading-5 text-red-100/85">{message}</p>
    </section>
  );
};

const EmptyState = () => {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#ff9f43]/25 bg-[#ff9f43]/10 text-[#ff9f43]">
        <Heart className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">No followed artists yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-white/70">
        Follow artists you love to see them collected here for quick access.
      </p>
    </section>
  );
};

const ArtistRow = ({ artist, isUnfollowing = false, onUnfollow }) => {
  const avatarImage = artist?.avatar || artist?.coverImage || "https://placehold.co/120x120/111111/f5b66f?text=Artist";

  const handleUnfollowClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onUnfollow?.(artist);
  };

  return (
    <article className="group relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-md transition hover:border-[#ff9f43]/30 hover:bg-white/[0.06]">
      <Link
        to={routePaths.artistBrowseProfile(artist.id)}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        <img
          src={avatarImage}
          alt={artist.name}
          className="h-14 w-14 flex-shrink-0 rounded-xl border-2 border-white/10 object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
        />

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-white group-hover:text-[#ff9f43]">
              {artist.name}
            </h2>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
              <span className="inline-flex items-center gap-1 uppercase tracking-wide">
                <Users className="h-3 w-3 text-[#ff9f43]" aria-hidden />
                {formatFollowers(artist.followers)} followers
              </span>
              <span className="text-white/25">·</span>
              <span className="text-white/45">
                {artist.verificationStatus}
              </span>
            </div>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={handleUnfollowClick}
        disabled={isUnfollowing}
        aria-label={isUnfollowing ? "Unfollowing..." : "Unfollow"}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-white/50 transition-all duration-200 hover:h-9 hover:w-9 hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isUnfollowing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <X className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
    </article>
  );
};

const UserListfollowArtistPage = () => {
  const [artists, setArtists] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [unfollowingArtistIds, setUnfollowingArtistIds] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadArtists = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getUserListfollowArtistsService({ page: 1, limit: 12 });

        if (!isMounted) {
          return;
        }

        setArtists(Array.isArray(response?.artists) ? response.artists : []);
        setPagination(response?.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setArtists([]);
        setPagination({ page: 1, limit: 12, total: 0, totalPages: 0 });
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load your followed artists from the backend right now."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadArtists();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUnfollowArtist = async (artist) => {
    const artistId = artist?.id;

    if (!artistId || unfollowingArtistIds.includes(artistId)) {
      return;
    }

    setActionErrorMessage("");
    setUnfollowingArtistIds((currentIds) => [...currentIds, artistId]);

    try {
      await unfollowArtistService({ artistId });

      setArtists((currentArtists) => currentArtists.filter((currentArtist) => currentArtist.id !== artistId));
      setPagination((currentPagination) => {
        const nextTotal = Math.max((Number(currentPagination?.total) || 0) - 1, 0);

        return {
          ...currentPagination,
          total: nextTotal,
          totalPages:
            nextTotal === 0
              ? 0
              : Math.ceil(nextTotal / (Number(currentPagination?.limit) || 12)),
        };
      });
    } catch (error) {
      setActionErrorMessage(
        getApiErrorMessage(error, "Unable to unfollow this artist right now.")
      );
    } finally {
      setUnfollowingArtistIds((currentIds) =>
        currentIds.filter((currentArtistId) => currentArtistId !== artistId)
      );
    }
  };

  const summaryText = useMemo(() => {
    const total = Number(pagination?.total) || artists.length;

    if (total === 0) {
      return "Your followed artist list is currently empty.";
    }

    return `You are following ${formatFollowers(total)} artist${total > 1 ? "s" : ""}.`;
  }, [artists.length, pagination?.total]);

  return (
    <main className={pageShellClassName}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(255,159,67,0.18),_transparent_60%)]" />

      <section className="relative mx-auto w-full max-w-4xl space-y-6">
        <div className="space-y-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ff9f43]">
            Account &gt; Followed Artists
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Followed Artists
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-5 text-white/70">
                {summaryText}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 backdrop-blur-sm">
              <Heart className="h-3.5 w-3.5 text-[#ff9f43]" aria-hidden />
              {formatFollowers(pagination?.total || artists.length)} saved follows
            </div>
          </div>
        </div>

        {actionErrorMessage ? (
          <ErrorState
            title="Could not update follow state"
            message={actionErrorMessage}
          />
        ) : null}

        {isLoading ? <LoadingState /> : null}
        {!isLoading && errorMessage ? <ErrorState message={errorMessage} /> : null}
        {!isLoading && !errorMessage && artists.length === 0 ? <EmptyState /> : null}

        {!isLoading && !errorMessage && artists.length > 0 ? (
          <div className="space-y-2">
            {artists.map((artist) => (
              <ArtistRow
                key={artist.id}
                artist={artist}
                isUnfollowing={unfollowingArtistIds.includes(artist.id)}
                onUnfollow={handleUnfollowArtist}
              />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default UserListfollowArtistPage;
