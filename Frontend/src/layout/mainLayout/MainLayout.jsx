import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PlayerQueueMenu from "../../components/player/PlayerQueueMenu";
import { usePlayer } from "../../hooks/usePlayer";
import { useTheme } from "../../hooks/useTheme";
import Header from "./Header";
import Player from "./Player";
import Sidebar from "./Sidebar";

const SIDEBAR_EXPANDED_WIDTH = "285px";
const SIDEBAR_COLLAPSED_WIDTH = "84px";

const MainLayout = () => {
  const location = useLocation();
  const { isDark } = useTheme();
  const [isDesktopQueueOpen, setIsDesktopQueueOpen] = useState(false);
  const [removingQueueTrackIndex, setRemovingQueueTrackIndex] = useState(-1);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const {
    queue,
    currentIndex,
    isPlaying,
    activeCollection,
    playFromQueueIndex,
    togglePlayPause,
    removeTrackFromQueue,
  } = usePlayer();
  const desktopSidebarWidth = isDesktopSidebarVisible
    ? SIDEBAR_EXPANDED_WIDTH
    : SIDEBAR_COLLAPSED_WIDTH;

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateViewportState = (event) => {
      setIsDesktopViewport(event.matches);
    };
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateViewportState);

      return () => {
        mediaQuery.removeEventListener("change", updateViewportState);
      };
    }

    mediaQuery.addListener(updateViewportState);

    return () => {
      mediaQuery.removeListener(updateViewportState);
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsMobileSidebarOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!isDesktopViewport) {
      setIsDesktopQueueOpen(false);
    }
  }, [isDesktopViewport]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    if (!isDesktopViewport && isMobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isDesktopViewport, isMobileSidebarOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
        setIsDesktopQueueOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSidebarToggle = () => {
    if (isDesktopViewport) {
      setIsDesktopSidebarVisible((currentValue) => !currentValue);
      return;
    }

    setIsMobileSidebarOpen((currentValue) => !currentValue);
  };

  const handleToggleDesktopQueue = () => {
    if (!isDesktopViewport) {
      return;
    }

    setIsDesktopQueueOpen((currentValue) => !currentValue);
  };

  const handleCloseDesktopQueue = () => {
    setIsDesktopQueueOpen(false);
  };

  const handleRemoveTrackFromQueue = async (targetIndex) => {
    if (removingQueueTrackIndex >= 0) {
      return;
    }

    setRemovingQueueTrackIndex(targetIndex);

    try {
      await removeTrackFromQueue(targetIndex);
    } finally {
      setRemovingQueueTrackIndex(-1);
    }
  };

  const handlePlayQueueTrack = async (targetIndex) => {
    if (targetIndex === currentIndex) {
      await togglePlayPause();
      return;
    }

    await playFromQueueIndex(targetIndex);
  };

  return (
    <div className={[
      "h-screen min-h-0 w-full overflow-hidden text-[#f7f1ea]",
      isDark ? "bg-black" : "bg-white",
    ].join(" ")}>
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 lg:block",
        ].join(" ")}
        style={{ width: desktopSidebarWidth }}
      >
        <Sidebar
          isCollapsed={!isDesktopSidebarVisible}
          onToggleDesktop={handleSidebarToggle}
        />
      </aside>

      <div
        className={[
          "fixed inset-0 z-40 bg-black/55 transition duration-200 lg:hidden",
          isMobileSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={() => setIsMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 h-[100dvh] w-[285px] max-w-[85vw] transition-transform duration-200 lg:hidden",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar
          showCloseButton
          onClose={() => setIsMobileSidebarOpen(false)}
          onNavigate={() => setIsMobileSidebarOpen(false)}
        />
      </aside>

      <div
        className={[
          "grid h-full min-w-0 grid-rows-[58px_minmax(0,1fr)] overflow-hidden transition-[padding] duration-300 lg:grid-rows-[62px_minmax(0,1fr)]",
          isDesktopSidebarVisible ? "lg:pl-[285px]" : "lg:pl-[84px]",
          isDark ? "bg-black" : "bg-white",
        ].join(" ")}
      >
        <Header
          onToggleSidebar={handleSidebarToggle}
          isDesktopSidebarVisible={isDesktopSidebarVisible}
        />

        <main
          className={[
            "relative z-0 min-h-0 overflow-hidden",
            isDark ? "bg-black text-[#f7f1ea]" : "bg-white text-[#111111]",
          ].join(" ")}
        >
          <div className="flex h-full min-w-0 pb-[calc(82px+env(safe-area-inset-bottom))] sm:pb-[81px]">
            <div className="min-w-0 flex-1 p-1 sm:p-1 lg:p-1">
              <div
                className="
                          h-full overflow-x-hidden overflow-y-auto overscroll-contain
                          rounded-lg sm:rounded-xl
                          bg-[#121212]
                          [-ms-overflow-style:none]
                          [scrollbar-width:none]
                          [&::-webkit-scrollbar]:hidden 
                        "
              >
                <Outlet />
              </div>
            </div>

            { isDesktopQueueOpen ? (
              <aside
                className={ [
                  "hidden h-full w-[240px] shrink-0 lg:flex",
                  "pt-1 pb-1",
                ].join(" ") }
              >
                <section
                  className={ [
                    "flex h-full w-full flex-col overflow-hidden rounded-xl bg-[#121212]"
                  ].join(" ") }
                >
                  <div className="min-h-0 flex-1">
                    <PlayerQueueMenu
                      queue={ queue }
                      currentIndex={ currentIndex }
                      isPlaying={ isPlaying }
                      activeCollection={ activeCollection }
                      onPlayTrack={ handlePlayQueueTrack }
                      onRemoveTrack={ handleRemoveTrackFromQueue }
                      removingTrackIndex={ removingQueueTrackIndex }
                      onClose={ handleCloseDesktopQueue }
                      variant="sidebar"
                      className="h-full"
                    />
                  </div>
                </section>
              </aside>
            ) : null }
          </div>
        </main>
      </div>

      <Player
        isDesktopSidebarVisible={ isDesktopSidebarVisible }
        isDesktopViewport={ isDesktopViewport }
        isDesktopQueueOpen={ isDesktopQueueOpen }
        onToggleDesktopQueue={ handleToggleDesktopQueue }
        onCloseDesktopQueue={ handleCloseDesktopQueue }
      />
    </div>
  );
};

export default MainLayout;
