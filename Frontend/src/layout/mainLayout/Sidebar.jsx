import {
  Disc3,
  Heart,
  House,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { routePaths } from "../../routes/routePaths";

const navItems = [
  {
    icon: House,
    label: "Home",
    to: routePaths.home,
    matches: (pathname) => pathname === routePaths.home,
  },
  {
    icon: Heart,
    label: "Following",
    to: routePaths.userFollowing,
    matches: (pathname) => pathname === routePaths.userFollowing,
  },
  {
    icon: Disc3,
    label: "Followed Albums",
    to: routePaths.userListfollowAlbum,
    matches: (pathname) => pathname === routePaths.userListfollowAlbum,
  },
  {
    icon: UserRound,
    label: "Artist Profile",
    to: routePaths.artistBrowseProfile("featured"),
    matches: (pathname) => pathname.startsWith("/artists/"),
  },
  {
    icon: Trophy,
    label: "Daily Top",
    to: routePaths.dailyTopTracks,
    matches: (pathname) => pathname === routePaths.dailyTopTracks,
  },
  {
    icon: LayoutDashboard,
    label: "Artist",
    to: routePaths.artistRoot,
    matches: (pathname) =>
      pathname === routePaths.artistRoot || pathname.startsWith(`${routePaths.artistRoot}/`),
  },
];

const Sidebar = ({
  isCollapsed = false,
  onToggleDesktop,
  showCloseButton = false,
  onClose,
  onNavigate,
}) => {
  const location = useLocation();
  const { isDark } = useTheme();
  const DesktopToggleIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={[
        "flex h-full flex-col overflow-hidden border-r text-[#f7f1ea]",
        isDark
          ? "border-[#f5b66f]/10 bg-[#151218]"
          : "border-[#e5e7eb] bg-[#111111]",
      ].join(" ")}
    >
      <div
        className={[
          "flex border-b",
          isCollapsed
            ? "flex-col items-center gap-4 px-3 py-5"
            : "items-start justify-between px-5 py-5",
          isDark ? "border-[#f5b66f]/10" : "border-white/10",
        ].join(" ")}
      >
        { isCollapsed ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#f5b66f]">
            <Disc3 className="h-5 w-5" />
          </div>
        ) : (
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#f5b66f]/80">
              RESO MUSIC
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[#f7f1ea]">
              Library
            </h1>
            <p className="mt-2 text-sm text-[#b8b0aa]">
              Browse music, playlists, and artist pages.
            </p>
          </div>
        ) }

        <button
          type="button"
          onClick={ onToggleDesktop }
          className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5 hover:text-white lg:inline-flex"
          aria-label={ isCollapsed ? "Open sidebar" : "Collapse sidebar" }
          title={ isCollapsed ? "Open sidebar" : "Collapse sidebar" }
        >
          <DesktopToggleIcon className="h-5 w-5" />
        </button>

        { showCloseButton ? (
          <button
            type="button"
            onClick={ onClose }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null }
      </div>

      <nav
        className={[
          `
          flex-1 overflow-y-auto py-4
          [scrollbar-color:rgba(245,182,111,0.3)_#0f0f14]
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-[#f5b66f]/30
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar]:w-2
        `,
          isCollapsed ? "space-y-3 px-2" : "space-y-2 px-3",
        ].join(" ")}
      >
        { navItems.map((item) => {
          const isActive = item.matches(location.pathname);
          const ItemIcon = item.icon;

          return (
            <Link
              key={ item.to }
              to={ item.to }
              onClick={ onNavigate }
              aria-label={ item.label }
              title={ item.label }
              className={[
                "flex rounded-2xl text-sm transition",
                isCollapsed
                  ? "justify-center px-0 py-3"
                  : "items-center gap-3 px-4 py-3",
                isActive
                  ? "bg-gradient-to-r from-[#f5b66f]/20 to-transparent text-[#f5b66f]"
                  : "text-[#b8b0aa] hover:bg-[#241f28] hover:text-[#f7f1ea]",
              ].join(" ")}
            >
              <ItemIcon className="h-5 w-5 shrink-0" />
              { !isCollapsed ? <span className="truncate">{ item.label }</span> : null }
            </Link>
          );
        }) }
      </nav>
    </aside>
  );
};

export default Sidebar;
