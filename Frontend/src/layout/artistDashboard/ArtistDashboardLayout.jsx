import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, Menu, Search, X } from "lucide-react";
import { getMyArtistProfileService } from "../../services/artistService";
import {
  artistNavigation,
  artistProfile,
} from "./navigation";

const SIDEBAR_WIDTH = "264px";

const ArtistDashboardLayout = () => {
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
            ? "Nghệ sĩ đã xác minh"
            : `Trạng thái xác minh: ${profile.verificationStatus}`;
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

  const renderSidebar = () => (
    <div className="flex h-full flex-col bg-[#2f2747] text-white">
      {/* Header */ }
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-6 lg:justify-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[#d6b48c]">
            RESO MUSIC
          </p>
          <p className="mt-2 text-sm font-medium text-white/55">
            Trung tâm nghệ sĩ
          </p>
        </div>

        <button
          type="button"
          onClick={ () => setIsSidebarOpen(false) }
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */ }
      <nav className="flex-1 space-y-1 py-5 pl-3 pr-0">
        { artistNavigation.map((item) => (
          <NavLink
            key={ item.to }
            to={ item.to }
            end={ item.to === "/artist" }
            onClick={ () => setIsSidebarOpen(false) }
            className={ ({ isActive }) =>
              [
                "relative flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "mr-0 rounded-l-xl rounded-r-none bg-white text-[#5f4fe0]"
                  : "mr-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-white",
              ].join(" ")
            }
          >
            { ({ isActive }) => (
              <>
                { isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#d6b48c]" />
                ) }

                <item.icon
                  className={ [
                    "h-4 w-4 shrink-0 transition",
                    isActive ? "text-[#5f4fe0]" : "text-white/45",
                  ].join(" ") }
                />

                <span className="truncate">{ item.label }</span>
              </>
            ) }
          </NavLink>
        )) }
      </nav>

      {/* Artist profile */ }
      <div className="border-t border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-[#d6b48c] ring-1 ring-white/10">
            { (sidebarArtistName || artistProfile.name || "A")
              .charAt(0)
              .toUpperCase() }
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              { sidebarArtistName || artistProfile.name }
            </p>
            <p className="mt-1 truncate text-xs text-white/50">
              { sidebarArtistSubtitle || artistProfile.role }
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      data-artist-dashboard
      className="scheme-light h-screen overflow-hidden bg-white text-[#221a14] [color-scheme:light]"
    >
      <div className="flex h-full overflow-hidden">
        <aside
          className="fixed inset-y-0 left-0 z-30 hidden border-r border-[#ece8ff] lg:block"
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
            "fixed inset-y-0 left-0 z-50 w-[264px] max-w-[85vw] border-r border-[#ece8ff] transition-transform duration-200 lg:hidden",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          {renderSidebar()}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-[264px]">
          <header className="border-b border-[#ece8ff] bg-white">
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
              </div>

              <div className="flex items-center gap-3">
                <label className="relative hidden min-[480px]:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="search"
                    placeholder="Tìm bản phát hành hoặc bài hát"
                    className="h-10 w-60 rounded-sm border border-[#ece8ff] bg-white pl-9 pr-3 text-sm text-[#2f2747] outline-none transition placeholder:text-[#9a93b8] focus:border-[#7c6cf2]"
                  />
                </label>

                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[#ece8ff] text-[#5f4fe0] transition hover:bg-[#f8f6ff]"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-white">
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
