import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, Menu, Search, X } from "lucide-react";
import { getMyArtistProfileService } from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";
import {
  artistNavigation,
  artistPageTitles,
  artistProfile,
} from "./navigation";

const SIDEBAR_WIDTH = "264px";

const ArtistDashboardLayout = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarArtistName, setSidebarArtistName] = useState("");
  const [sidebarArtistSubtitle, setSidebarArtistSubtitle] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadSidebarArtist = async () => {
      try {
        const profile = await getMyArtistProfileService();
        if (!isMounted || !profile) {
          return;
        }

        setSidebarArtistName(profile.name || artistProfile.name);
        const statusLabel =
          profile.verificationStatus === "verified"
            ? "Verified artist"
            : `Verification: ${profile.verificationStatus}`;
        setSidebarArtistSubtitle(statusLabel);
      } catch {
        if (isMounted) {
          setSidebarArtistName(artistProfile.name);
          setSidebarArtistSubtitle(artistProfile.role);
        }
      }
    };

    loadSidebarArtist();

    return () => {
      isMounted = false;
    };
  }, []);

  const pageTitle = useMemo(() => {
    if (location.pathname === routePaths.artistProfileEdit) {
      return artistPageTitles[routePaths.artistProfileEdit] ?? "Artist Dashboard";
    }

    if (location.pathname === routePaths.artistProfile) {
      return artistPageTitles[routePaths.artistProfile] ?? "Artist Dashboard";
    }

    const activeItem = artistNavigation.find((item) => {
      if (item.to === "/artist") {
        return location.pathname === item.to;
      }

      return location.pathname.startsWith(item.to);
    });

    return artistPageTitles[activeItem?.to] ?? "Artist Dashboard";
  }, [location.pathname]);

  const ProfileIcon = artistProfile.icon;

  const renderSidebar = () => (
    <div className="flex h-full flex-col bg-[#171210] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-6 lg:justify-start">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-[#b08b65]">
            RESO MUSIC
          </p>
          <p className="mt-2 text-sm text-white/50">Artist Console</p>
        </div>

        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 text-white/70 transition hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 py-6">
        {artistNavigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/artist"}
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              [
                "mx-3 flex items-center gap-3 px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "rounded-r-md bg-[#f5efe7] text-[#2a2019]"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              ].join(" ")
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-5">
        <div className="rounded-md border border-white/10 bg-[#201915] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#8b5e3c] text-white">
              <ProfileIcon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {sidebarArtistName || artistProfile.name}
              </p>
              <p className="truncate text-xs text-white/55">
                {sidebarArtistSubtitle || artistProfile.role}
              </p>
            </div>
          </div>

          <Link
            to={routePaths.artistProfile}
            onClick={() => setIsSidebarOpen(false)}
            className="mt-4 block w-full rounded-sm border border-[#8b5e3c]/45 px-3 py-2 text-center text-sm font-medium text-[#d0b290] transition hover:bg-[#8b5e3c] hover:text-white"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div
      data-artist-dashboard
      className="scheme-light h-screen overflow-hidden bg-[#f6f0e8] text-[#221a14] [color-scheme:light]"
    >
      <div className="flex h-full overflow-hidden">
        <aside
          className="fixed inset-y-0 left-0 z-30 hidden border-r border-[#2f2721] lg:block"
          style={{ width: SIDEBAR_WIDTH }}
        >
          {renderSidebar()}
        </aside>

        <div
          className={[
            "fixed inset-0 z-40 bg-black/50 transition lg:hidden",
            isSidebarOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          ].join(" ")}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 w-[264px] max-w-[85vw] border-r border-[#2f2721] transition-transform duration-200 lg:hidden",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          {renderSidebar()}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-[264px]">
          <header className="border-b border-neutral-200 bg-white">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-neutral-200 text-[#3a2d23] transition hover:bg-neutral-50 lg:hidden"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-[#241b15]">
                    {pageTitle}
                  </h1>
                  <p className="mt-1 text-sm text-neutral-500">
                    Manage your catalog, audience, and performance in one place.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative hidden min-[480px]:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="search"
                    placeholder="Search releases or tracks"
                    className="h-10 w-60 rounded-sm border border-neutral-200 bg-[#fffdf9] pl-9 pr-3 text-sm text-[#2a2019] outline-none transition placeholder:text-neutral-400 focus:border-[#8b5e3c]"
                  />
                </label>

                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-neutral-200 text-[#3a2d23] transition hover:bg-neutral-50"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-[#f8f4ef]">
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ArtistDashboardLayout;
