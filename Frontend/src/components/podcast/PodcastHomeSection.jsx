import { useEffect, useState } from "react";
import ContentCardSection from "../content/ContentCardSection";
import podcastService from "../../services/podcastService";
import { usePlayer } from "../../hooks/usePlayer";
import { mapPodcastsToContentCards } from "../../utils/podcastContent";

const PodcastHomeSection = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playPodcast } = usePlayer();

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    podcastService
      .listPublic({ page: 1, limit: 5 })
      .then((result) => {
        if (mounted) {
          setPodcasts(result.podcasts || []);
        }
      })
      .catch(() => {
        if (mounted) {
          setPodcasts([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ContentCardSection
      label="Podcast"
      title="Podcast nổi bật"
      items={mapPodcastsToContentCards(podcasts, { includeListenCount: false })}
      isLoading={loading}
      emptyMessage="Chưa có Podcast nổi bật."
      onPlay={(item) => playPodcast(item.raw)}
    />
  );
};

export default PodcastHomeSection;
