import { useEffect, useState } from "react";
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
import { getAlbumDetailService } from "../../services/albumService";
import {
  createPlaceholderImage,
  formatAlbumDuration,
  formatReleaseYear,
  formatTrackDuration,
} from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";

const actionButtonClassName = `
  inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8
  bg-white/70 text-[#18181b] transition hover:scale-[1.03] hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] sm:h-11 sm:w-11
`;

const metaPillClassName = `
  inline-flex items-center rounded-full border border-white/14 bg-white/10
  px-3 py-1.5 text-xs text-white/88 backdrop-blur-sm sm:text-sm
`;

const AlbumDetailPage = () => {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { playAlbum, playTrack } = usePlayer();

  useEffect(() => {
    let isMounted = true;

    const loadAlbumDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const albumDetail = await getAlbumDetailService(id);

        if (!isMounted) {
          return;
        }

        setAlbum(albumDetail);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAlbum(null);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load album detail from the backend right now."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setAlbum(null);
      setErrorMessage("Album id is missing.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    loadAlbumDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const albumCoverImage =
    album?.coverImage || createPlaceholderImage(album?.title);

  const trackItems = album?.tracks ?? [];
  const albumArtistName = album?.artist?.name || "Unknown artist";
  const releaseYear = formatReleaseYear(album?.releaseDate);
  const totalTracks = album?.trackCount ?? trackItems.length;
  const totalDuration = formatAlbumDuration(trackItems);

  const collectionMeta = {
    id: album?.id,
    type: "album",
    title: album?.title || "Album",
    image: albumCoverImage,
    artistName: albumArtistName,
  };

  const handlePlayAlbum = async () => {
    await playAlbum(album, trackItems);
  };

  const handlePlayTrack = async (track, index) => {
    await playTrack(track, {
      queue: trackItems,
      startIndex: index,
      collection: collectionMeta,
    });
  };

  const handleLikeTrack = (track) => {
    console.log("Toggle like track:", track?.title);
  };

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
            bg-gradient-to-b from-[#d97706] via-[#7c3f00] to-transparent
            px-4 pb-5 pt-6 dark:from-[#f59e0b] dark:via-[#8f4b13] dark:to-[#121212]
            sm:px-8 sm:pb-8 sm:pt-10
          "
        >
          
          { isLoading ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="text-sm text-white/82">Loading album detail...</p>
            </div>
          ) : errorMessage ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="max-w-xl text-sm text-white/88">{ errorMessage }</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-end md:text-left">
              <img
                src={ albumCoverImage }
                alt={ album?.title || "Album cover" }
                className="
                  h-32 w-32 rounded-[16px] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.28)]
                  min-[420px]:h-36 min-[420px]:w-36
                  sm:h-56 sm:w-56
                "
              />

              <div className="min-w-0 max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">
                  Album
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-5xl lg:text-6xl">
                  { album?.title || "Untitled album" }
                </h1>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <span className={ `${metaPillClassName} font-medium text-white` }>
                    { albumArtistName }
                  </span>
                  <span className={ metaPillClassName }>{ releaseYear }</span>
                  <span className={ metaPillClassName }>{ totalTracks } tracks</span>
                  <span className={ metaPillClassName }>{ totalDuration }</span>
                </div>
              </div>
            </div>
          ) }
        </div>

        <div className="space-y-4 px-0 pb-4 pt-4 sm:space-y-5 sm:px-8 sm:pb-8 sm:pt-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PlayButton onClick={ handlePlayAlbum } size="compact" />

            <button type="button" className={ actionButtonClassName } aria-label="Shuffle album">
              <Shuffle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Add album">
              <CirclePlus className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Download album">
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

                    return (
                      <TrackCard
                        key={ track?.id || `${trackItem?.order}-${index}` }
                        index={ trackItem?.order || index + 1 }
                        image={
                          track?.coverImage ||
                          track?.artist?.avatar ||
                          albumCoverImage
                        }
                        title={ track?.title || "Untitled track" }
                        artist={ track?.artist?.name || albumArtistName }
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
                    No tracks available for this album yet.
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

export default AlbumDetailPage;
