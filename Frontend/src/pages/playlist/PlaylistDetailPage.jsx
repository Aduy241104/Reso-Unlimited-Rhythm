import { useEffect, useMemo, useState } from "react";
import {
  CirclePlus,
  Download,
  MoreHorizontal,
  Shuffle,
} from "lucide-react";
import PlayButton from "../../components/common/PlayButton";
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
  inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8
  bg-white/70 text-[#18181b] transition hover:scale-[1.03] hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] sm:h-11 sm:w-11
`;

const metaPillClassName = `
  inline-flex items-center rounded-full border border-white/14 bg-white/10
  px-3 py-1.5 text-xs text-white/88 backdrop-blur-sm sm:text-sm
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
    <section className="space-y-4 sm:space-y-6">
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
            px-4 pb-5 pt-6 dark:from-[#14b8a6] dark:via-[#115e59] dark:to-[#121212]
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
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-end md:text-left">
              { playlistCoverImage ? (
                <img
                  src={ playlistCoverImage }
                  alt={ playlist?.title ?? "Playlist cover" }
                  className="
                    h-32 w-32 rounded-[16px] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.28)]
                    min-[420px]:h-36 min-[420px]:w-36
                    sm:h-56 sm:w-56
                  "
                />
              ) : (
                <div
                  className="
                    flex h-32 w-32 items-center justify-center rounded-[16px] bg-white/12
                    text-sm font-medium text-white/72 shadow-[0_24px_60px_rgba(0,0,0,0.18)]
                    backdrop-blur min-[420px]:h-36 min-[420px]:w-36 sm:h-56 sm:w-56
                  "
                >
                  No cover image
                </div>
              ) }

              <div className="min-w-0 max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">
                  System playlist
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-5xl lg:text-6xl">
                  { playlist?.title ?? "" }
                </h1>
                { playlist?.description ? (
                  <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-6 text-white/88 sm:mt-4 sm:line-clamp-none sm:text-base">
                    { playlist.description }
                  </p>
                ) : null }
                { metaItems.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    { metaItems.map((item, index) => (
                      <div
                        key={ `${item}-${index}` }
                        className={ [
                          metaPillClassName,
                          index === 0 ? "font-medium text-white" : "",
                        ].join(" ") }
                      >
                          { item }
                      </div>
                    )) }
                  </div>
                ) : null }
              </div>
            </div>
          ) }
        </div>

        <div className="space-y-4 px-0 pb-4 pt-4 sm:space-y-5 sm:px-8 sm:pb-8 sm:pt-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PlayButton onClick={ handlePlayPlaylist } size="compact" />

            <button type="button" className={ actionButtonClassName } aria-label="Shuffle playlist">
              <Shuffle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Add playlist">
              <CirclePlus className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Download playlist">
              <Download className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="More options">
              <MoreHorizontal className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
          </div>

          { isLoading ? (
            <div className="rounded-[20px] border border-black/5 bg-black/[0.02] px-4 py-6 text-sm text-[#52525b] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#a1a1aa]">
              Loading tracks...
            </div>
          ) : errorMessage ? null : (
            <div className="rounded-[18px] border border-black/5 bg-black/[0.02] p-0 dark:border-white/10 dark:bg-white/[0.02] sm:rounded-[3px] sm:border-0 sm:bg-transparent sm:p-4">
              <div className="mb-3 px-0 sm:hidden">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#71717a] dark:text-[#a1a1aa]">
                  Track list
                </p>
              </div>

              <div
                className="
                  mb-2 hidden grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_3.25rem] items-center gap-3
                  border-b border-black/6 px-3 pb-3 text-xs font-medium uppercase tracking-[0.24em]
                  text-[#71717a] dark:border-white/10 dark:text-[#a1a1aa] md:grid
                "
              >
                <span>#</span>
                <span>Title</span>
                <span className="text-center">Saved</span>
                <span className="text-right">Time</span>
              </div>

              <div className="space-y-0">
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
