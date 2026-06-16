import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AboutArtistSection from "../../components/artist/AboutArtistSection";
import ComingSoonCountdownOverlay from "../../components/artist/ComingSoonCountdownOverlay";
import ArtistHeroSection from "../../components/artist/ArtistHeroSection";
import DiscographySection from "../../components/artist/DiscographySection";
import PopularTracksSection from "../../components/artist/PopularTracksSection";
import { useAuth } from "../../hooks/useAuth";
import { routePaths } from "../../routes/routePaths";
import {
  followArtistService,
  getArtistExperienceService,
  getArtistFollowStatusService,
  unfollowArtistService,
} from "../../services/artistBrowseService";
import { getApiErrorMessage } from "../../utils/apiError";

const getScrollContainer = (element) => {
  if (!element || typeof window === "undefined") {
    return null;
  }

  let currentElement = element.parentElement;

  while (currentElement) {
    const { overflowY } = window.getComputedStyle(currentElement);

    if (overflowY === "auto" || overflowY === "scroll") {
      return currentElement;
    }

    currentElement = currentElement.parentElement;
  }

  return null;
};

const getOverlayBounds = (container) => {
  if (!container) {
    return null;
  }

  const { top, left, width, height } = container.getBoundingClientRect();

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
};

const FOLLOW_LOGIN_NOTICE = "Vui lòng đăng nhập để theo dõi nghệ sĩ này.";

const ArtistProfileView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState("popular");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isFollowStatusLoading, setIsFollowStatusLoading] = useState(false);
  const [followErrorMessage, setFollowErrorMessage] = useState("");
  const [isCountdownMounted, setIsCountdownMounted] = useState(false);
  const [isCountdownVisible, setIsCountdownVisible] = useState(false);
  const pageRootRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const savedScrollPositionRef = useRef(0);
  const savedOverflowRef = useRef("");
  const [overlayBounds, setOverlayBounds] = useState(null);
  const [artistData, setArtistData] = useState({
    profile: null,
    popularTracks: [],
    discography: [],
    comingReleases: [],
  });

  const applyFollowState = useCallback((followState) => {
    if (!followState) {
      return;
    }

    setIsFollowing(Boolean(followState.isFollowing));
    setArtistData((currentData) => ({
      ...currentData,
      profile: currentData.profile
        ? {
            ...currentData.profile,
            followers:
              typeof followState.followers === "number"
                ? followState.followers
                : currentData.profile.followers,
          }
        : currentData.profile,
    }));
  }, []);

  const redirectToLogin = useCallback(() => {
    navigate(routePaths.login, {
      replace: false,
      state: {
        from: location,
        authNotice: FOLLOW_LOGIN_NOTICE,
      },
    });
  }, [location, navigate]);

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
        setIsFollowing(Boolean(payload?.profile?.isFollowing));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          getApiErrorMessage(
            error,
            "Không thể tải hồ sơ nghệ sĩ lúc này."
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

  useEffect(() => {
    setFollowErrorMessage("");
  }, [id]);

  useEffect(() => {
    if (isAuthLoading) {
      return undefined;
    }

    if (!isAuthenticated) {
      setIsFollowing(false);
      setIsFollowStatusLoading(false);
      setFollowErrorMessage("");
      return undefined;
    }

    let isMounted = true;

    const loadFollowStatus = async () => {
      setIsFollowStatusLoading(true);
      setFollowErrorMessage("");

      try {
        const followState = await getArtistFollowStatusService({ artistId: id });

        if (!isMounted || !followState) {
          return;
        }

        applyFollowState(followState);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error?.response?.status === 401) {
          setIsFollowing(false);
          return;
        }

        setFollowErrorMessage(
          getApiErrorMessage(error, "Không thể tải trạng thái theo dõi lúc này.")
        );
      } finally {
        if (isMounted) {
          setIsFollowStatusLoading(false);
        }
      }
    };

    loadFollowStatus();

    return () => {
      isMounted = false;
    };
  }, [applyFollowState, id, isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (!isCountdownMounted) {
      return undefined;
    }

    const scrollContainer =
      scrollContainerRef.current || getScrollContainer(pageRootRef.current);
    const scrollTarget = scrollContainer || document.body;

    savedOverflowRef.current = scrollTarget.style.overflow;
    scrollTarget.style.overflow = "hidden";

    return () => {
      scrollTarget.style.overflow = savedOverflowRef.current;
    };
  }, [isCountdownMounted]);

  useEffect(() => {
    if (!isCountdownMounted || isCountdownVisible) {
      return undefined;
    }

    const closeTimeout = window.setTimeout(() => {
      setIsCountdownMounted(false);
      setOverlayBounds(null);

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: savedScrollPositionRef.current,
          behavior: "auto",
        });
        return;
      }

      window.scrollTo(0, savedScrollPositionRef.current);
    }, 700);

    return () => {
      window.clearTimeout(closeTimeout);
    };
  }, [isCountdownMounted, isCountdownVisible]);

  useEffect(() => {
    setIsCountdownMounted(false);
    setIsCountdownVisible(false);
  }, [id]);

  useEffect(() => {
    if (!isCountdownMounted) {
      return undefined;
    }

    const updateOverlayBounds = () => {
      const scrollContainer =
        scrollContainerRef.current || getScrollContainer(pageRootRef.current);
      setOverlayBounds(getOverlayBounds(scrollContainer));
    };

    updateOverlayBounds();
    window.addEventListener("resize", updateOverlayBounds);

    return () => {
      window.removeEventListener("resize", updateOverlayBounds);
    };
  }, [isCountdownMounted]);

  const openComingSoonExperience = () => {
    const scrollContainer = getScrollContainer(pageRootRef.current);
    scrollContainerRef.current = scrollContainer;
    savedScrollPositionRef.current = scrollContainer
      ? scrollContainer.scrollTop
      : window.scrollY || window.pageYOffset || 0;
    setOverlayBounds(getOverlayBounds(scrollContainer));
    setIsCountdownMounted(true);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsCountdownVisible(true);
      });
    });
  };

  const closeComingSoonExperience = () => {
    setIsCountdownVisible(false);
  };

  const handleToggleFollow = async () => {
    const artistId = artistData.profile?.id || id;

    if (!artistId || isFollowLoading || isFollowStatusLoading) {
      return;
    }

    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    const currentFollowers = artistData.profile?.followers || 0;
    const fallbackFollowState = {
      artistId,
      isFollowing: !isFollowing,
      followers: Math.max(currentFollowers + (isFollowing ? -1 : 1), 0),
    };

    setIsFollowLoading(true);
    setFollowErrorMessage("");

    try {
      const followState = isFollowing
        ? await unfollowArtistService({ artistId })
        : await followArtistService({ artistId });

      applyFollowState(followState || fallbackFollowState);
    } catch (error) {
      if (error?.response?.status === 401) {
        redirectToLogin();
        return;
      }

      setFollowErrorMessage(
        getApiErrorMessage(
          error,
          isFollowing
            ? "Không thể bỏ theo dõi nghệ sĩ lúc này."
            : "Không thể theo dõi nghệ sĩ lúc này."
        )
      );
    } finally {
      setIsFollowLoading(false);
    }
  };

  const profile = artistData.profile;
  const nextComingRelease = artistData.comingReleases[0] || null;

  return (
    <section ref={ pageRootRef } className="space-y-8 overflow-x-hidden pb-10 text-white lg:space-y-12">
      <div
        aria-hidden={ isCountdownMounted }
        className={ `
          transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isCountdownMounted ? "pointer-events-none scale-[0.985] blur-md opacity-0" : "scale-100 blur-0 opacity-100"}
        ` }
      >
        { errorMessage ? (
          <div className="mx-auto max-w-6xl border border-amber-400/14 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            { errorMessage }
          </div>
        ) : null }

        { profile ? (
          <>
            <div className="-mx-3 sm:-mx-4 lg:-mx-6">
              <ArtistHeroSection
                profile={ profile }
                isFollowing={ isFollowing }
                isFollowLoading={ isFollowLoading || isFollowStatusLoading }
                followErrorMessage={ followErrorMessage }
                onToggleFollow={ handleToggleFollow }
              />
            </div>

            <div className="mx-auto max-w-6xl space-y-8 px-1 lg:space-y-10">
              <PopularTracksSection
                tracks={ artistData.popularTracks }
                isLoading={ isLoading }
                onComingSoonClick={ openComingSoonExperience }
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
        ) : isLoading ? (
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="h-[30rem] animate-pulse bg-white/[0.04]" />
            <div className="grid gap-4 sm:grid-cols-2">
              { Array.from({ length: 2 }).map((_, index) => (
                <div key={ index } className="h-40 animate-pulse bg-white/[0.04]" />
              )) }
            </div>
            <div className="h-[18rem] animate-pulse bg-white/[0.04]" />
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-8 px-1 lg:space-y-10">
            <PopularTracksSection
              tracks={ artistData.popularTracks }
              isLoading={ false }
              onComingSoonClick={ openComingSoonExperience }
            />

            <DiscographySection
              items={ artistData.discography }
              activeFilter={ activeFilter }
              onFilterChange={ setActiveFilter }
              isLoading={ false }
            />
          </div>
        ) }
      </div>

      { isCountdownMounted ? (
        <ComingSoonCountdownOverlay
          isVisible={ isCountdownVisible }
          comingRelease={ nextComingRelease }
          artistName={ profile?.name }
          overlayBounds={ overlayBounds }
          onBack={ closeComingSoonExperience }
        />
      ) : null }
    </section>
  );
};

const ArtistProfilePage = () => {
  return (
    <div className="-mx-3 -my-4 min-h-full overflow-x-hidden bg-[linear-gradient(180deg,#121212_0%,#121212_18%,#181818_45%,#121212_100%)] px-3 py-0 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
      <ArtistProfileView />
    </div>
  );
};

export default ArtistProfilePage;
