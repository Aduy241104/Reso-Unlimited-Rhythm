import { useEffect, useMemo, useState } from "react";
import { CirclePlus, Download, MoreHorizontal, Shuffle } from "lucide-react";
import { useParams } from "react-router-dom";
import PlayButton from "../../components/common/PlayButton";
import TrackCard from "../../components/TrackCard";
import TrackListSection from "../../components/trackList/TrackListSection";
import { useAuth } from "../../hooks/useAuth";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { getDailyMixesService } from "../../services/recommendationService";
import { formatTrackDuration } from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  createRecommendationMixCollectionMeta,
  formatRecommendationDateTime,
  getRecommendationMixCoverImage,
  getRecommendationMixId,
  getRecommendationMixSubtitle,
  getRecommendationMixTasteTags,
  getRecommendationMixTrackCount,
  getRecommendationTrackImage,
  getRecommendationUserDisplayName,
} from "../../utils/recommendation";

const actionButtonClassName = `
  inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8
  bg-white/70 text-[#18181b] transition hover:scale-[1.03] hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] sm:h-11 sm:w-11
`;

const metaPillClassName = `
  inline-flex items-center rounded-full border border-white/14 bg-white/10
  px-3 py-1.5 text-xs text-white/88 backdrop-blur-sm sm:text-sm
`;

const RecommendationMixDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [mix, setMix] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const {
    currentTrack,
    isPlaying,
    playCollection,
    playTrack,
    togglePlayPause,
  } = usePlayer();

  const userDisplayName = getRecommendationUserDisplayName(user);

  useEffect(() => {
    let isMounted = true;

    const loadMixDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getDailyMixesService();
        const matchedMix = response.mixes.find(
          (item) => String(getRecommendationMixId(item)) === String(id)
        );

        if (!isMounted) {
          return;
        }

        if (!matchedMix) {
          setMix(null);
          setErrorMessage("Khong tim thay playlist goi y nay.");
          return;
        }

        setMix(matchedMix);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMix(null);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Khong the tai chi tiet playlist goi y tu backend luc nay."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setMix(null);
      setErrorMessage("Recommendation mix id is missing.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    void loadMixDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const trackItems = mix?.tracks ?? [];
  const mixCoverImage = getRecommendationMixCoverImage(mix);
  const generatedAt = formatRecommendationDateTime(mix?.generatedAt);
  const expiresAt = formatRecommendationDateTime(mix?.expiresAt);
  const tasteTags = getRecommendationMixTasteTags(mix);
  const totalTracks = getRecommendationMixTrackCount(mix);

  const collectionMeta = useMemo(
    () => createRecommendationMixCollectionMeta(mix, userDisplayName),
    [mix, userDisplayName]
  );

  const handlePlayMix = async () => {
    if (!mix || trackItems.length === 0) {
      return;
    }

    await playCollection(trackItems, {
      startIndex: 0,
      collection: collectionMeta,
    });
  };

  const handlePlayTrack = async (track, index) => {
    if (!track) {
      return;
    }

    const trackId = track?.id || track?._id || "";

    if (currentTrack?.id && currentTrack.id === trackId) {
      await togglePlayPause();
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
    `D\u00e0nh cho ${userDisplayName}`,
    generatedAt ? `Updated ${generatedAt}` : "",
    expiresAt ? `Refreshes ${expiresAt}` : "",
    totalTracks > 0 ? `${totalTracks} tracks` : "",
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
            bg-gradient-to-b from-[#b45309] via-[#92400e] to-transparent
            px-4 pb-5 pt-6 dark:from-[#f59e0b] dark:via-[#b45309] dark:to-[#121212]
            sm:px-8 sm:pb-8 sm:pt-10
          "
        >
          {isLoading ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="text-sm text-white/82">Loading recommendation detail...</p>
            </div>
          ) : errorMessage ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="max-w-xl text-sm text-white/88">{errorMessage}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-end md:text-left">
              {mixCoverImage ? (
                <img
                  src={mixCoverImage}
                  alt={mix?.title ?? "Recommendation cover"}
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
                  Daily Mix
                </div>
              )}

              <div className="min-w-0 max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">
                  D\u00e0nh cho {userDisplayName}
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-5xl lg:text-6xl">
                  {mix?.title ?? ""}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/88 sm:mt-4 sm:text-base">
                  {getRecommendationMixSubtitle(mix)}
                </p>
                {metaItems.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    {metaItems.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className={[
                          metaPillClassName,
                          index === 0 ? "font-medium text-white" : "",
                        ].join(" ")}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ) : null}
                {tasteTags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    {tasteTags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-black/18 px-3 py-1 text-xs font-medium text-white/88"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 px-0 pb-4 pt-4 sm:space-y-5 sm:px-8 sm:pb-8 sm:pt-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PlayButton onClick={handlePlayMix} size="compact" />

            <button type="button" className={actionButtonClassName} aria-label="Shuffle mix">
              <Shuffle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={actionButtonClassName} aria-label="Add mix">
              <CirclePlus className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={actionButtonClassName} aria-label="Download mix">
              <Download className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button type="button" className={actionButtonClassName} aria-label="More options">
              <MoreHorizontal className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
          </div>

          <TrackListSection
            isLoading={isLoading}
            errorMessage={errorMessage}
            loadingMessage="Loading tracks..."
            mobileLabel="Track list"
            emptyMessage="Playlist goi y nay chua co bai hat."
            hasItems={trackItems.length > 0}
          >
            {trackItems.map((track, index) => {
              const trackId = track?.id || track?._id || "";
              const trackImage = getRecommendationTrackImage(track, mixCoverImage);

              return (
                <TrackCard
                  key={trackId || `${track?.title}-${index}`}
                  index={index + 1}
                  track={track}
                  image={trackImage}
                  title={track?.title || ""}
                  artist={track?.artist?.name || ""}
                  artistId={track?.artist?._id || track?.artist?.id || ""}
                  duration={formatTrackDuration(track?.duration)}
                  explicit={false}
                  liked={false}
                  href={trackId ? routePaths.trackDetail(trackId) : undefined}
                  isPlaybackActive={currentTrack?.id === trackId}
                  isPlaying={isPlaying}
                  onPlaybackAction={() => handlePlayTrack(track, index)}
                  onLike={() => handleLikeTrack(track)}
                />
              );
            })}
          </TrackListSection>
        </div>
      </div>
    </section>
  );
};

export default RecommendationMixDetailPage;
