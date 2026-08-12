import { createPodcastPlaceholder, getPodcastArtwork } from "../../utils/podcastArtwork";

const PodcastArtwork = ({ podcast, className = "", alt = "" }) => {
  const fallback = createPodcastPlaceholder(podcast?.title);

  return (
    <img
      src={getPodcastArtwork(podcast)}
      alt={alt || podcast?.title || "Podcast"}
      className={className}
      onError={(event) => {
        if (event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
};

export default PodcastArtwork;
