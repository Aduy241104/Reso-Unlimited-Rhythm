import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AboutArtistSection from "../../components/artist/AboutArtistSection";
import ArtistHeroSection from "../../components/artist/ArtistHeroSection";
import DiscographySection from "../../components/artist/DiscographySection";
import PopularTracksSection from "../../components/artist/PopularTracksSection";
import { getArtistExperienceService } from "../../services/artistService";
import { getApiErrorMessage } from "../../utils/apiError";

const ArtistProfileView = () => {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState("popular");
  const [isFollowing, setIsFollowing] = useState(false);
  const [artistData, setArtistData] = useState({
    profile: null,
    popularTracks: [],
    discography: [],
  });

  useEffect(() => {
    let isMounted = true;

    const loadArtistExperience = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await getArtistExperienceService({ artistId: id });

        if (!isMounted) {
          return;
        }

        setArtistData(payload);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load the artist profile from the backend right now."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadArtistExperience();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const profile = artistData.profile;

  if (!profile && !isLoading && !errorMessage) {
    return null;
  }

  return (
    <section className="space-y-8 pb-10 text-white lg:space-y-12">
      { errorMessage ? (
        <div className="mx-auto max-w-6xl border border-amber-400/14 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          { errorMessage }
        </div>
      ) : null }

      { profile ? (
        <>
          <div className="-mx-6">
            <ArtistHeroSection
              profile={ profile }
              isFollowing={ isFollowing }
              onToggleFollow={ () => setIsFollowing((currentValue) => !currentValue) }
            />
          </div>

          <div className="mx-auto max-w-6xl space-y-8 px-1 lg:space-y-10">
            <PopularTracksSection
              tracks={ artistData.popularTracks }
              isLoading={ isLoading }
            />

            <AboutArtistSection profile={ profile } isLoading={ isLoading } />

            <DiscographySection
              items={ artistData.discography }
              activeFilter={ activeFilter }
              onFilterChange={ setActiveFilter }
              isLoading={ isLoading }
            />
          </div>
        </>
      ) : (
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-[30rem] animate-pulse bg-white/[0.04]" />
          <div className="grid gap-4 sm:grid-cols-2">
            { Array.from({ length: 2 }).map((_, index) => (
              <div key={ index } className="h-40 animate-pulse bg-white/[0.04]" />
            )) }
          </div>
          <div className="h-[18rem] animate-pulse bg-white/[0.04]" />
        </div>
      ) }
    </section>
  );
};

const ArtistProfilePage = () => {
  return (
    <div className="-mx-6 -my-6 min-h-full bg-[linear-gradient(180deg,#121212_0%,#121212_18%,#181818_45%,#121212_100%)] px-6 py-0">
      <ArtistProfileView />
    </div>
  );
};

export default ArtistProfilePage;
