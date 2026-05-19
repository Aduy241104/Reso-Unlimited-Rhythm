import { useEffect, useMemo, useState } from "react";
import {
  CirclePlus,
  Download,
  MoreHorizontal,
  Play,
  Shuffle,
} from "lucide-react";
import { useParams } from "react-router-dom";
import TrackCard from "../../components/TrackCard";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { getPlaylistDetailService } from "../../services/playlistService";
import { formatTrackDuration } from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  formatPlaylistDate,
  formatPlaylistDuration,
  getPlaylistOwnerLabel,
} from "../../utils/playlistDetail";

const actionButtonClassName = `
  inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8
  bg-white/70 text-[#18181b] transition hover:scale-[1.03] hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]
`;

const PlaylistDetailPage = () => {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { playPlaylist, playTrack } = usePlayer();

  useEffect(() => {
    let isMounted = true;

    const loadPlaylistDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const playlistDetail = await getPlaylistDetailService(id);

        if (!isMounted) {
          return;
        }

        setPlaylist(playlistDetail);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPlaylist(null);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load playlist detail from the backend right now."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setPlaylist(null);
      setErrorMessage("Playlist id is missing.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    loadPlaylistDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const trackItems = playlist?.tracks ?? [];
  const playlistOwnerLabel = getPlaylistOwnerLabel(playlist);
  const totalTracks = playlist?.trackCount ?? trackItems.length;
  const totalDuration = formatPlaylistDuration(playlist?.totalDuration);
  const createdDate = formatPlaylistDate(playlist?.createdAt);
  const playlistCoverImage = playlist?.coverImage ?? "";

  const collectionMeta = useMemo(
    () => ({
      id: playlist?.id,
      type: "playlist",
      title: playlist?.title ?? "",
      image: playlistCoverImage,
      artistName: playlistOwnerLabel,
    }),
    [playlist?.id, playlist?.title, playlistCoverImage, playlistOwnerLabel]
  );

  const handlePlayPlaylist = async () => {
    if (!playlist) {
      return;
    }

    await playPlaylist(playlist, trackItems);
  };

  const handlePlayTrack = async (track, index) => {
    if (!track) {
      return;
    }

    await playTrack(track, {
      queue: trackItems,
      startIndex: index,
      collection: collectionMeta,
    });
  };

  const handleLikeTrack = (track) => {
    console.log("Toggle like track:", track?.title);
  };

  const metaItems = [
    playlistOwnerLabel,
    createdDate,
    totalTracks > 0 ? `${totalTracks} tracks` : "",
    totalDuration,
  ].filter(Boolean);

  return (
    <section className="space-y-6">
      <div
        className="
          overflow-hidden rounded-[14px] border border-black/5 bg-white/80
          shadow-[0_24px_60px_rgba(15,23,42,0.08)]
          dark:border-white/10 dark:bg-[#121212] dark:shadow-[0_24px_60px_rgba(0,0,0,0.36)]
        "
      >
        <div
          className="
            bg-gradient-to-b from-[#0f766e] via-[#134e4a] to-transparent
            px-6 pb-6 pt-8 dark:from-[#14b8a6] dark:via-[#115e59] dark:to-[#121212]
            sm:px-8 sm:pb-8 sm:pt-10
          "
        >
          { isLoading ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="text-sm text-white/82">Loading playlist detail...</p>
            </div>
          ) : errorMessage ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="max-w-xl text-sm text-white/88">{ errorMessage }</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 md:flex-row md:items-end">
              { playlistCoverImage ? (
                <img
                  src={ playlistCoverImage }
                  alt={ playlist?.title ?? "Playlist cover" }
                  className="
                    h-48 w-48 rounded-[18px] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.28)]
                    sm:h-56 sm:w-56
                  "
                />
              ) : (
                <div
                  className="
                    flex h-48 w-48 items-center justify-center rounded-[18px] bg-white/12
                    text-sm font-medium text-white/72 shadow-[0_24px_60px_rgba(0,0,0,0.18)]
                    backdrop-blur sm:h-56 sm:w-56
                  "
                >
                  No cover image
                </div>
              ) }

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">
                  System playlist
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  { playlist?.title ?? "" }
                </h1>
                { playlist?.description ? (
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-white/88 sm:text-base">
                    { playlist.description }
                  </p>
                ) : null }
                { metaItems.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/88">
                    { metaItems.map((item, index) => (
                      <div key={ `${item}-${index}` } className="flex items-center gap-2">
                        { index > 0 ? <span className="text-white/55">|</span> : null }
                        <span className={ index === 0 ? "font-medium text-white" : "" }>
                          { item }
                        </span>
                      </div>
                    )) }
                  </div>
                ) : null }
              </div>
            </div>
          ) }
        </div>

        <div className="space-y-6 px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={ handlePlayPlaylist }
              className="
                inline-flex h-14 items-center gap-2 rounded-full bg-[#1ed760] px-7 text-sm
                font-semibold text-black transition hover:scale-[1.02] hover:brightness-105
              "
            >
              <Play className="h-5 w-5 fill-current" />
              Play
            </button>

            <button type="button" className={ actionButtonClassName } aria-label="Shuffle playlist">
              <Shuffle className="h-5 w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Add playlist">
              <CirclePlus className="h-5 w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Download playlist">
              <Download className="h-5 w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="More options">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          { isLoading ? (
            <div className="rounded-[20px] border border-black/5 bg-black/[0.02] px-4 py-6 text-sm text-[#52525b] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#a1a1aa]">
              Loading tracks...
            </div>
          ) : errorMessage ? null : (
            <div className="rounded-[3px] p-3 dark:border-white/10 sm:p-4">
              <div
                className="
                  mb-2 hidden grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_3.25rem] items-center gap-3
                  border-b border-black/6 px-3 pb-3 text-xs font-medium uppercase tracking-[0.24em]
                  text-[#71717a] dark:border-white/10 dark:text-[#a1a1aa] sm:grid
                "
              >
                <span>#</span>
                <span>Title</span>
                <span className="text-center">Saved</span>
                <span className="text-right">Time</span>
              </div>

              <div className="space-y-1">
                { trackItems.length > 0 ? (
                  trackItems.map((trackItem, index) => {
                    const track = trackItem?.track;
                    const trackImage =
                      track?.coverImage ||
                      track?.album?.coverImage ||
                      track?.artist?.avatar ||
                      playlistCoverImage ||
                      "";

                    return (
                      <TrackCard
                        key={ track?.id || `${trackItem?.trackId}-${index}` }
                        index={ trackItem?.order || index + 1 }
                        image={ trackImage }
                        title={ track?.title || "" }
                        artist={ track?.artist?.name || playlistOwnerLabel || "" }
                        artistId={ track?.artist?.id || "" }
                        duration={ formatTrackDuration(track?.duration) }
                        explicit={ false }
                        liked={ false }
                        href={ track?.id ? routePaths.trackDetail(track.id) : undefined }
                        onPlay={ () => handlePlayTrack(track, index) }
                        onLike={ () => handleLikeTrack(track) }
                      />
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-sm text-[#52525b] dark:text-[#a1a1aa]">
                    No tracks available for this playlist yet.
                  </div>
                ) }
              </div>
            </div>
          ) }
        </div>
      </div>
    </section>
  );
};

export default PlaylistDetailPage;
