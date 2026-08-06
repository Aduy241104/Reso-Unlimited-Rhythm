import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AboutArtistSection from "../../components/artist/AboutArtistSection";
import ComingSoonCountdownOverlay from "../../components/artist/ComingSoonCountdownOverlay";
import ArtistHeroSection from "../../components/artist/ArtistHeroSection";
import ArtistInformationModal from "../../components/artist/ArtistInformationModal";
import DiscographySection from "../../components/artist/DiscographySection";
import PopularTracksSection from "../../components/artist/PopularTracksSection";
import CreateReportModal from "../../components/report/CreateReportModal";
import LoadingState from "../../components/common/LoadingState";
import NotFoundPage from "../error/NotFoundPage";
import { useAuth } from "../../hooks/useAuth";
import { routePaths } from "../../routes/routePaths";
import {
  followArtistService,
  getArtistExperienceService,
  getArtistFollowStatusService,
  unfollowArtistService,
} from "../../services/artistBrowseService";
import { getApiErrorMessage } from "../../utils/apiError";
import { isResourceNotFoundError } from "../../utils/resourceError";
import { emitFollowedArtistChangedEvent } from "../../utils/followedLibraryEvents";

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

const FOLLOW_LOGIN_NOTICE = "Vui lĂ²ng Ä‘Äƒng nháº­p Ä‘á»ƒ theo dĂµi nghá»‡ sÄ© nĂ y.";

const hasResolvedFollowState = (value) => typeof value === "boolean";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const buildSidebarArtistItem = (profile, fallbackArtistId) => {
  const artistId =
    profile?.id || profile?.artistId || profile?._id || fallbackArtistId || "";

  if (!artistId) {
    return null;
  }

  return {
    artistId,
    name: normalizeText(profile?.name) || "Nghệ sĩ không xác định",
    avatar: normalizeText(profile?.avatar),
  };
};

const ArtistProfileView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState("popular");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [, setIsFollowStatusLoading] = useState(false);
  const [followErrorMessage, setFollowErrorMessage] = useState("");
  const [isCountdownMounted, setIsCountdownMounted] = useState(false);
  const [isCountdownVisible, setIsCountdownVisible] = useState(false);
  const pageRootRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const savedScrollPositionRef = useRef(0);
  const savedOverflowRef = useRef("");
  const [overlayBounds, setOverlayBounds] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInformationModalOpen, setIsInformationModalOpen] = useState(false);
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
            isFollowing: Boolean(followState.isFollowing),
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
      setIsNotFound(false);
      setErrorMessage("");

      try {
        const payload = await getArtistExperienceService({ artistId: id });

        if (!isMounted) {
          return;
        }

        if (!payload?.profile) {
          setIsNotFound(true);
          return;
        }

        setArtistData(payload);

        if (hasResolvedFollowState(payload?.profile?.isFollowing)) {
          setIsFollowing(payload.profile.isFollowing);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isResourceNotFoundError(error)) {
          setIsNotFound(true);
          return;
        }

        setErrorMessage(
          getApiErrorMessage(
            error,
            "KhĂ´ng thá»ƒ táº£i há»“ sÆ¡ nghá»‡ sÄ© lĂºc nĂ y."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setIsNotFound(true);
      setErrorMessage("");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    loadArtistExperience();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    setFollowErrorMessage("");
    setIsInformationModalOpen(false);
    setIsReportModalOpen(false);
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
          getApiErrorMessage(error, "KhĂ´ng thá»ƒ táº£i tráº¡ng thĂ¡i theo dĂµi lĂºc nĂ y.")
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

    if (!artistId || isFollowLoading) {
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
      const nextFollowState = followState || fallbackFollowState;

      applyFollowState(nextFollowState);

      if (isFollowing) {
        emitFollowedArtistChangedEvent({
          type: "removed",
          artistId: nextFollowState.artistId || artistId,
        });
      } else {
        const sidebarArtist = buildSidebarArtistItem(
          artistData.profile,
          nextFollowState.artistId || artistId
        );

        if (sidebarArtist) {
          emitFollowedArtistChangedEvent({
            type: "added",
            artist: sidebarArtist,
          });
        }
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        redirectToLogin();
        return;
      }

      setFollowErrorMessage(
        getApiErrorMessage(
          error,
          isFollowing
            ? "KhĂ´ng thá»ƒ bá» theo dĂµi nghá»‡ sÄ© lĂºc nĂ y."
            : "KhĂ´ng thá»ƒ theo dĂµi nghá»‡ sÄ© lĂºc nĂ y."
        )
      );
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleReportArtist = () => {
    const artistId = artistData.profile?.id || id;

    if (!artistId) {
      return;
    }

    setIsReportModalOpen(true);
  };

  const profile = artistData.profile;
  const nextComingRelease = artistData.comingReleases[0] || null;

  if (isLoading) {
    return (
      <LoadingState
        message="Đang tải hồ sơ nghệ sĩ..."
        className="min-h-[60vh]"
        spinnerClassName="h-8 w-8"
      />
    );
  }

  if (isNotFound) {
    return (
      <NotFoundPage
        title="Không tìm thấy nghệ sĩ"
      />
    );
  }

  return (
    <section
      ref={ pageRootRef }
      className={ `
        overflow-x-hidden text-white
        ${isCountdownMounted ? "space-y-0 pb-0 lg:space-y-0" : "space-y-8 pb-10 lg:space-y-12"}
      ` }
    >
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
                isFollowLoading={ isFollowLoading }
                followErrorMessage={ followErrorMessage }
                onToggleFollow={ handleToggleFollow }
                onReport={ handleReportArtist }
                onShowInformation={ () => setIsInformationModalOpen(true) }
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
          <LoadingState message="Đang tải hồ sơ nghệ sĩ..." className="min-h-[60vh]" />
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
          trackId={ nextComingRelease?.trackId }
          albumId={ nextComingRelease?.albumId }
          onBack={ closeComingSoonExperience }
        />
      ) : null }

      <CreateReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetId={artistData.profile?.id || id}
        targetType="artist"
      />
      <ArtistInformationModal
        isOpen={isInformationModalOpen}
        onClose={() => setIsInformationModalOpen(false)}
        profile={profile}
      />
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



