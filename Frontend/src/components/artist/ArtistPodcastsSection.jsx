import { useEffect, useState } from "react";
import ContentCardSection from "../content/ContentCardSection";
import { usePlayer } from "../../hooks/usePlayer";
import podcastService from "../../services/podcastService";
import { mapPodcastsToContentCards } from "../../utils/podcastContent";

const getPodcastCreatorId = (podcast) =>
  podcast?.creator?.id ||
  podcast?.creator?._id ||
  podcast?.creator?.artistId ||
  podcast?.creatorId ||
  "";

const isPodcastFromArtist = (podcast, artistId) => {
  if (!artistId) {
    return false;
  }

  return String(getPodcastCreatorId(podcast)).trim() === String(artistId).trim();
};

const ArtistPodcastsSection = ({ artistId, artistName }) => {
  const [podcasts, setPodcasts] = useState([]);
  const { playPodcast } = usePlayer();

  useEffect(() => {
    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPodcasts([]);

    const loadArtistPodcasts = async () => {
      try {
        const result = await podcastService.listPublic({
          q: artistName || undefined,
          page: 1,
          limit: 50,
        });

        if (isMounted) {
          setPodcasts(
            (result.podcasts || []).filter((podcast) =>
              isPodcastFromArtist(podcast, artistId)
            )
          );
        }
      } catch {
        if (isMounted) {
          setPodcasts([]);
        }
      }
    };

    if (!artistId) {
      setPodcasts([]);
      return () => {
        isMounted = false;
      };
    }

    void loadArtistPodcasts();

    return () => {
      isMounted = false;
    };
  }, [artistId, artistName]);

  if (podcasts.length === 0) {
    return null;
  }

  return (
    <ContentCardSection
      title="Podcast"
      items={mapPodcastsToContentCards(podcasts, { includeListenCount: false })}
      onPlay={(item) => playPodcast(item.raw)}
    />
  );
};

export default ArtistPodcastsSection;
