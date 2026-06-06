import { useEffect, useMemo, useState } from "react";
import { Disc3, Heart, Loader2, Music, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { getUserListfollowArtistsService } from "../../services/user.listfollowArtist.service";
import { getUserListfollowAlbumsService } from "../../services/user.listfollowAlbum.service";
import { unfollowArtistService } from "../../services/artistBrowseService";
import { unfollowAlbumService } from "../../services/user.listfollowAlbum.service";
import { getApiErrorMessage } from "../../utils/apiError";

const pageShellClassName =
  "min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,159,67,0.24),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,145,77,0.12),_transparent_22%),linear-gradient(135deg,_#050505_0%,_#0c0c0f_42%,_#111114_100%)] px-4 py-10 text-white sm:px-6 lg:px-8";

const formatFollowers = (value) => new Intl.NumberFormat("en-US").format(Number(value) || 0);
const formatDuration = (seconds) => {
  const total = Number(seconds) || 0;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
const formatReleaseYear = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "" : String(d.getFullYear());
};

const TABS = [
  { id: "artists", label: "Artists", icon: Heart },
  { id: "albums", label: "Albums", icon: Disc3 },
];

const LoadingState = ({ icon: Icon }) => (
  <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
    <div className="flex min-h-[120px] flex-col items-center justify-center text-center text-white/70">
      <Loader2 className="h-6 w-6 animate-spin text-[#ff9f43]" aria-hidden />
      <p className="mt-3 text-xs font-medium tracking-[0.18em] text-white/90">
        Loading...
      </p>
    </div>
  </section>
);

const ErrorState = ({ title, message }) => (
  <section className="rounded-2xl border border-red-400/20 bg-white/5 p-4 text-red-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
    <h2 className="text-sm font-semibold text-white">{title}</h2>
    <p className="mt-2 text-xs leading-5 text-red-100/85">{message}</p>
  </section>
);

const EmptyState = ({ type, icon: Icon }) => (
  <section className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#ff9f43]/25 bg-[#ff9f43]/10 text-[#ff9f43]">
      <Icon className="h-5 w-5" aria-hidden />
    </div>
    <h2 className="mt-4 text-lg font-semibold text-white">
      No followed {type} yet
    </h2>
    <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-white/70">
      {type === "artists"
        ? "Follow artists you love to see them collected here for quick access."
        : "Follow albums you love to see them collected here for quick access."}
    </p>
  </section>
);

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
              <span className="text-white/45">{artist.verificationStatus}</span>
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

const AlbumRow = ({ album, isUnfollowing = false, onUnfollow }) => {
  const coverImage = album?.coverImage || "https://placehold.co/240x240/111111/f5b66f?text=Album";
  const releaseYear = formatReleaseYear(album?.releaseDate);

  const handleUnfollowClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onUnfollow?.(album);
  };

  return (
    <article className="group relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-md transition hover:border-[#ff9f43]/30 hover:bg-white/[0.06]">
      <Link
        to={routePaths.albumDetail(album.id)}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        <img
          src={coverImage}
          alt={album.title}
          className="h-14 w-14 flex-shrink-0 rounded-xl border-2 border-white/10 object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
        />
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-white group-hover:text-[#ff9f43]">
              {album.title}
            </h2>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
              {album.artist ? (
                <Link
                  to={routePaths.artistBrowseProfile(album.artist.id)}
                  className="truncate hover:text-[#ff9f43]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {album.artist.name}
                </Link>
              ) : (
                <span className="text-white/30">Unknown artist</span>
              )}
              {releaseYear ? (
                <>
                  <span className="text-white/25">·</span>
                  <span className="text-white/45">{releaseYear}</span>
                </>
              ) : null}
            </div>
          </div>
          {album.trackCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Music className="h-3 w-3 text-[#ff9f43]" aria-hidden />
              <span>{album.trackCount} tracks</span>
            </div>
          )}
          {album.totalDuration > 0 && (
            <div className="hidden text-xs text-white/40 sm:block">
              {formatDuration(album.totalDuration)}
            </div>
          )}
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
          <Heart className="h-3.5 w-3.5 fill-current" aria-hidden />
        )}
      </button>
    </article>
  );
};

const FollowingPage = () => {
  const [activeTab, setActiveTab] = useState("artists");

  const [artistState, setArtistState] = useState({ artists: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 }, isLoading: true, errorMessage: "" });
  const [albumState, setAlbumState] = useState({ albums: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 }, isLoading: true, errorMessage: "" });

  const [actionError, setActionError] = useState("");
  const [unfollowingIds, setUnfollowingIds] = useState({});

  useEffect(() => {
    let isMounted = true;

    const loadArtists = async () => {
      setArtistState((prev) => ({ ...prev, isLoading: true, errorMessage: "" }));
      try {
        const response = await getUserListfollowArtistsService({ page: 1, limit: 12 });
        if (!isMounted) return;
        setArtistState((prev) => ({
          ...prev,
          artists: Array.isArray(response?.artists) ? response.artists : [],
          pagination: response?.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 },
          isLoading: false,
        }));
      } catch (error) {
        if (!isMounted) return;
        setArtistState((prev) => ({
          ...prev,
          artists: [],
          isLoading: false,
          errorMessage: getApiErrorMessage(error, "Unable to load followed artists."),
        }));
      }
    };

    const loadAlbums = async () => {
      setAlbumState((prev) => ({ ...prev, isLoading: true, errorMessage: "" }));
      try {
        const response = await getUserListfollowAlbumsService({ page: 1, limit: 12 });
        if (!isMounted) return;
        setAlbumState((prev) => ({
          ...prev,
          albums: Array.isArray(response?.albums) ? response.albums : [],
          pagination: response?.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 },
          isLoading: false,
        }));
      } catch (error) {
        if (!isMounted) return;
        setAlbumState((prev) => ({
          ...prev,
          albums: [],
          isLoading: false,
          errorMessage: getApiErrorMessage(error, "Unable to load followed albums."),
        }));
      }
    };

    loadArtists();
    loadAlbums();

    return () => { isMounted = false; };
  }, []);

  const handleUnfollow = async (type, item) => {
    const id = item.id;
    if (!id || unfollowingIds[id]) return;

    setActionError("");
    setUnfollowingIds((prev) => ({ ...prev, [id]: true }));

    try {
      if (type === "artists") {
        await unfollowArtistService({ artistId: id });
        setArtistState((prev) => ({
          ...prev,
          artists: prev.artists.filter((a) => a.id !== id),
          pagination: {
            ...prev.pagination,
            total: Math.max(prev.pagination.total - 1, 0),
            totalPages: prev.pagination.total <= 1 ? 0 : prev.pagination.totalPages,
          },
        }));
      } else {
        await unfollowAlbumService({ albumId: id });
        setAlbumState((prev) => ({
          ...prev,
          albums: prev.albums.filter((a) => a.id !== id),
          pagination: {
            ...prev.pagination,
            total: Math.max(prev.pagination.total - 1, 0),
            totalPages: prev.pagination.total <= 1 ? 0 : prev.pagination.totalPages,
          },
        }));
      }
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Unable to update follow state."));
    } finally {
      setUnfollowingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const isLoading = activeTab === "artists" ? artistState.isLoading : albumState.isLoading;
  const errorMessage = activeTab === "artists" ? artistState.errorMessage : albumState.errorMessage;
  const items = activeTab === "artists" ? artistState.artists : albumState.albums;
  const pagination = activeTab === "artists" ? artistState.pagination : albumState.pagination;

  const totalCount = artistState.pagination.total + albumState.pagination.total;
  const summaryText = useMemo(() => {
    if (totalCount === 0) return "Your following list is currently empty.";
    return `You are following ${formatFollowers(totalCount)} item${totalCount > 1 ? "s" : ""} in total.`;
  }, [totalCount]);

  return (
    <main className={pageShellClassName}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(255,159,67,0.18),_transparent_60%)]" />

      <section className="relative mx-auto w-full max-w-4xl space-y-6">
        <div className="space-y-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ff9f43]">
            Account &gt; Following
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Following
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-5 text-white/70">
                {summaryText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tab.id === "artists" ? artistState.pagination.total : albumState.pagination.total;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#ff9f43] text-[#050505] shadow-[0_4px_20px_rgba(255,159,67,0.3)]"
                      : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <tab.icon className="h-4 w-4" aria-hidden />
                  {tab.label}
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                      isActive ? "bg-[#050505]/20 text-[#050505]" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {actionError ? (
          <ErrorState title="Could not update follow state" message={actionError} />
        ) : null}

        {isLoading ? (
          <LoadingState icon={activeTab === "artists" ? Heart : Disc3} />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} />
        ) : items.length === 0 ? (
          <EmptyState type={activeTab} icon={activeTab === "artists" ? Heart : Disc3} />
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              activeTab === "artists" ? (
                <ArtistRow
                  key={item.id}
                  artist={item}
                  isUnfollowing={Boolean(unfollowingIds[item.id])}
                  onUnfollow={(artist) => handleUnfollow("artists", artist)}
                />
              ) : (
                <AlbumRow
                  key={item.id}
                  album={item}
                  isUnfollowing={Boolean(unfollowingIds[item.id])}
                  onUnfollow={(album) => handleUnfollow("albums", album)}
                />
              )
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default FollowingPage;
