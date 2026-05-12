import { useEffect, useState } from "react";
import {
  CirclePlus,
  Download,
  MoreHorizontal,
  Play,
  Shuffle,
} from "lucide-react";
import { useParams } from "react-router-dom";
import TrackCard from "../../components/TrackCard";
import { getAlbumDetailService } from "../../services/albumService";
import {
  createPlaceholderImage,
  formatAlbumDuration,
  formatReleaseYear,
  formatTrackDuration,
} from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";

const actionButtonClassName = `
  inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8
  bg-white/70 text-[#18181b] transition hover:scale-[1.03] hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]
`;

const AlbumDetailPage = () => {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  const handlePlayAlbum = () => {
    console.log("Play album:", album?.title);
  };

  const handlePlayTrack = (track) => {
    console.log("Play track:", track?.title);
  };

  const handleLikeTrack = (track) => {
    console.log("Toggle like track:", track?.title);
  };

  return (
    <section className="space-y-6">
      <div
        className="
          overflow-hidden rounded-[28px] border border-black/5 bg-white/80
          shadow-[0_24px_60px_rgba(15,23,42,0.08)]
          dark:border-white/10 dark:bg-[#121212] dark:shadow-[0_24px_60px_rgba(0,0,0,0.36)]
        "
      >
        <div
          className="
            relative bg-gradient-to-b from-[#d97706] via-[#7c3f00] to-transparent
            px-5 pb-6 pt-8 dark:from-[#f59e0b] dark:via-[#8f4b13] dark:to-[#121212]
            sm:px-8 sm:pb-8 sm:pt-10
          "
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%)]" />

          { isLoading ? (
            <div className="relative flex min-h-[20rem] items-end">
              <p className="text-sm text-white/82">Loading album detail...</p>
            </div>
          ) : errorMessage ? (
            <div className="relative flex min-h-[20rem] items-end">
              <p className="max-w-xl text-sm text-white/88">{ errorMessage }</p>
            </div>
          ) : (
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end">
              <img
                src={ albumCoverImage }
                alt={ album?.title || "Album cover" }
                className="
                  h-48 w-48 rounded-[18px] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.28)]
                  sm:h-56 sm:w-56
                "
              />

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">
                  Album
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  { album?.title || "Untitled album" }
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/88">
                  <span className="font-medium text-white">{ albumArtistName }</span>
                  <span className="text-white/55">|</span>
                  <span>{ releaseYear }</span>
                  <span className="text-white/55">|</span>
                  <span>{ totalTracks } tracks</span>
                  <span className="text-white/55">|</span>
                  <span>{ totalDuration }</span>
                </div>
              </div>
            </div>
          ) }
        </div>

        <div className="space-y-6 px-5 pb-6 pt-5 sm:px-8 sm:pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={ handlePlayAlbum }
              className="
                inline-flex h-14 items-center gap-2 rounded-full bg-[#1ed760] px-7 text-sm
                font-semibold text-black transition hover:scale-[1.02] hover:brightness-105
              "
            >
              <Play className="h-5 w-5 fill-current" />
              Play
            </button>

            <button type="button" className={ actionButtonClassName } aria-label="Shuffle album">
              <Shuffle className="h-5 w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Add album">
              <CirclePlus className="h-5 w-5" />
            </button>
            <button type="button" className={ actionButtonClassName } aria-label="Download album">
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
            <div
              className="
                rounded-[3px] p-3
                dark:border-white/10 sm:p-4
              "
            >
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
                        onPlay={ () => handlePlayTrack(track) }
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
