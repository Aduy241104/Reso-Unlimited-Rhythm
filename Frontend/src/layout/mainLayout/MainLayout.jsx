import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import Header from "./Header";
import Player from "./Player";
import Sidebar from "./Sidebar";

const SIDEBAR_EXPANDED_WIDTH = "285px";
const SIDEBAR_COLLAPSED_WIDTH = "84px";

const MainLayout = () => {
  const location = useLocation();
  const { isDark } = useTheme();
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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

  return (
    <div className={[
      "h-screen overflow-hidden text-[#f7f1ea]",
      isDark ? "bg-black" : "bg-white",
    ].join(" ")}>
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 lg:block",
        ].join(" ")}
        style={{ width: desktopSidebarWidth }}
      >
        <Sidebar
          isCollapsed={ !isDesktopSidebarVisible }
          onToggleDesktop={ handleSidebarToggle }
        />
      </aside>

      <div
        className={[
          "fixed inset-0 z-40 bg-black/55 transition duration-200 lg:hidden",
          isMobileSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={ () => setIsMobileSidebarOpen(false) }
        aria-hidden="true"
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-[285px] max-w-[85vw] transition-transform duration-200 lg:hidden",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar
          showCloseButton
          onClose={ () => setIsMobileSidebarOpen(false) }
          onNavigate={ () => setIsMobileSidebarOpen(false) }
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
          onToggleSidebar={ handleSidebarToggle }
        />

        <main
          className={[
            "relative z-0 min-h-0 overflow-y-auto px-3 py-4 pb-28 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#f5b66f]/30 [&::-webkit-scrollbar]:w-2 sm:px-4 sm:py-5 sm:pb-24 lg:px-6",
            isDark
              ? "bg-black text-[#f7f1ea] [scrollbar-color:rgba(245,182,111,0.3)_#0f0f14] [&::-webkit-scrollbar-track]:bg-[#0f0f14]"
              : "bg-white text-[#111111] [scrollbar-color:rgba(209,213,219,0.9)_#ffffff] [&::-webkit-scrollbar-track]:bg-[#ffffff]",
          ].join(" ")}
        >
          <Outlet />
        </main>
      </div>

      <Player isDesktopSidebarVisible={ isDesktopSidebarVisible } />
    </div>
  );
};

export default MainLayout;
