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

  const pageTitle = useMemo(() => {
    if (
      location.pathname.startsWith("/artist/music/") &&
      location.pathname.endsWith("/edit")
    ) {
      return artistPageTitles[routePaths.artistTrackEdit()] ?? "Chỉnh sửa bài hát";
    }

    if (location.pathname.startsWith("/artist/music/") && location.pathname !== routePaths.artistMusic) {
      return artistPageTitles[routePaths.artistTrackDetail()] ?? "Chi tiết bài hát";
    }

    if (location.pathname === routePaths.artistProfileEdit) {
      return artistPageTitles[routePaths.artistProfileEdit] ?? "Bảng điều khiển nghệ sĩ";
    }

    if (location.pathname === routePaths.artistProfile) {
      return artistPageTitles[routePaths.artistProfile] ?? "Bảng điều khiển nghệ sĩ";
    }

    if (location.pathname === routePaths.artistLyrics) {
      return artistPageTitles[routePaths.artistLyrics] ?? "Bảng điều khiển nghệ sĩ";
    }

    const activeItem = artistNavigation.find((item) => {
      if (item.to === "/artist") {
        return location.pathname === item.to;
      }

      return location.pathname.startsWith(item.to);
    });

    return artistPageTitles[activeItem?.to] ?? "Bảng điều khiển nghệ sĩ";
  }, [location.pathname]);

  const renderSidebar = () => (
    <div className="flex h-full flex-col bg-white text-[#2f2747]">
      <div className="flex items-center justify-between border-b border-[#ece8ff] px-6 py-6 lg:justify-start">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-[#b08b65]">
            RESO MUSIC
          </p>
          <p className="mt-2 text-sm text-[#7c7891]">Trung tâm nghệ sĩ</p>
        </div>

        <button
          type="button"
          onClick={ () => setIsSidebarOpen(false) }
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[#ece8ff] text-[#6b6682] transition hover:bg-[#f8f6ff] hover:text-[#2f2747] lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 py-6">
        { artistNavigation.map((item) => (
          <NavLink
            key={ item.to }
            to={ item.to }
            end={ item.to === "/artist" }
            onClick={ () => setIsSidebarOpen(false) }
            className={ ({ isActive }) =>
              [
                "mx-3 flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-[#f3f0ff] text-[#5f4fe0]"
                  : "text-[#6b6682] hover:bg-[#f8f6ff] hover:text-[#2f2747]",
              ].join(" ")
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{ item.label }</span>
          </NavLink>
        )) }
      </nav>

      <div className="border-t border-[#ece8ff] px-6 py-5">
        <p className="truncate text-sm font-medium text-[#2f2747]">
          { sidebarArtistName || artistProfile.name }
        </p>
        <p className="mt-1 truncate text-xs text-[#7c7891]">
          { sidebarArtistSubtitle || artistProfile.role }
        </p>
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

                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-[#2f2747]">
                    {pageTitle}
                  </h1>
                  <p className="mt-1 text-sm text-[#7c7891]">
                    Quản lý danh mục phát hành, khán giả và hiệu suất trong một không gian thống nhất.
                  </p>
                </div>
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
