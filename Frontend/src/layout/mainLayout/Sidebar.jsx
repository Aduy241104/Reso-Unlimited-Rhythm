import {
  Disc3,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { routePaths } from "../../routes/routePaths";
import { getFollowedAlbums, getFollowedArtists } from "../../services/libaryService";
import { getUserPlaylists } from "../../services/userPlaylistService";

const FOLLOWED_ARTISTS_LIMIT = 20;

const getArtistInitial = (name) => {
  if (typeof name !== "string") {
    return "?";
  }

  const normalizedName = name.trim();

  return normalizedName ? normalizedName.charAt(0).toUpperCase() : "?";
};

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

  const [followedArtists, setFollowedArtists] = useState([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);
  const [activeTab, setActiveTab] = useState("artist");
  const [followedAlbums, setFollowedAlbums] = useState([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);
  const [playlists, setPlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadFollowedArtists = async () => {
      setIsLoadingArtists(true);

      try {
        const response = await getFollowedArtists({
          page: 1,
          limit: FOLLOWED_ARTISTS_LIMIT,
        });

        if (isMounted) {
          setFollowedArtists(
            Array.isArray(response?.artists) ? response.artists : []
          );
        }
      } catch {
        if (isMounted) {
          setFollowedArtists([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingArtists(false);
        }
      }
    };

    const loadFollowedAlbums = async () => {
      setIsLoadingAlbums(true);

      try {
        const response = await getFollowedAlbums({
          page: 1,
          limit: FOLLOWED_ARTISTS_LIMIT,
        });

        if (isMounted) {
          setFollowedAlbums(
            Array.isArray(response?.albums) ? response.albums : []
          );
        }
      } catch {
        if (isMounted) {
          setFollowedAlbums([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAlbums(false);
        }
      }
    };
    const loadPlaylists = async () => {
      setIsLoadingPlaylists(true);

      try {
        const response = await getUserPlaylists();

        if (isMounted) {
          setPlaylists(Array.isArray(response?.playlists) ? response.playlists : []);
        }
      } catch {
        if (isMounted) {
          setPlaylists([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlaylists(false);
        }
      }
    };

    loadPlaylists();
    loadFollowedArtists();
    loadFollowedAlbums();

    return () => {
      isMounted = false;
    };
  }, []);

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
        {isCollapsed ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#f5b66f]">
            <Disc3 className="h-5 w-5" />
          </div>
        ) : (
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#f5b66f]/80">
              RESO MUSIC
            </p>
            <p className="mt-2 text-sm text-[#b8b0aa]">
              Browse music, playlists, and artist pages.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleDesktop}
          className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5 hover:text-white lg:inline-flex"
          aria-label={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
        >
          <DesktopToggleIcon className="h-5 w-5" />
        </button>

        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
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
          isCollapsed ? "px-2" : "px-3",
        ].join(" ")}
      >
        {!isCollapsed ? (
          <>
            <div className="mb-4 flex flex-nowrap gap-2 px-3">
              <button
                type="button"
                onClick={() => setActiveTab("playlist")}
                className={activeTab === "playlist"
                  ? "rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-[#f7f1ea]"
                }
              >
                Playlist
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("artist")}
                className={activeTab === "artist"
                  ? "rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-[#f7f1ea]"
                }
              >
                Nghệ sĩ
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("album")}
                className={activeTab === "album"
                  ? "rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-[#f7f1ea]"
                }
              >
                Album
              </button>
            </div>

            <div className="space-y-1">
              {activeTab === "playlist" ? (
                isLoadingPlaylists ? (
                  <div className="flex items-center gap-3 px-3 py-3 text-sm text-[#b8b0aa]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#f5b66f]" />
                    <span>Đang tải playlist...</span>
                  </div>
                ) : playlists.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-[#b8b0aa]">
                    Chưa có playlist nào
                  </div>
                ) : (
                  playlists.map((playlist, index) => {
                    const title =
                      typeof playlist?.title === "string" && playlist.title.trim()
                        ? playlist.title.trim()
                        : "Untitled Playlist";

                    const coverImage =
                      typeof playlist?.coverImage === "string" && playlist.coverImage.trim()
                        ? playlist.coverImage.trim()
                        : "";

                    const userName =
                      typeof playlist?.userName === "string" && playlist.userName.trim()
                        ? playlist.userName.trim()
                        : "Unknown User";

                    return (
                      <Link
                        key={playlist?.playlistId || `${title}-${index}`}
                        to={routePaths.userPlaylistDetail(playlist?.playlistId)}
                        onClick={onNavigate}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[#b8b0aa] transition hover:bg-[#241f28] hover:text-[#f7f1ea]"
                      >
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={title}
                            className="h-12 w-12 shrink-0 rounded-md object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/10 text-sm font-semibold text-[#f7f1ea]">
                            {title.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-inherit">
                            {title}
                          </p>
                          <p className="truncate text-xs text-[#b8b0aa]">
                            Playlist • {userName}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )
              ) : null}
              
              {activeTab === "artist" ? (
                isLoadingArtists ? (
                  <div className="flex items-center gap-3 px-3 py-3 text-sm text-[#b8b0aa]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#f5b66f]" />
                    <span>Đang tải nghệ sĩ...</span>
                  </div>
                ) : followedArtists.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-[#b8b0aa]">
                    Chưa theo dõi nghệ sĩ nào
                  </div>
                ) : (
                  followedArtists.map((artist, index) => {
                    const artistName =
                      typeof artist?.name === "string" && artist.name.trim()
                        ? artist.name.trim()
                        : "Unknown Artist";

                    const avatar =
                      typeof artist?.avatar === "string" && artist.avatar.trim()
                        ? artist.avatar.trim()
                        : "";

                    const artistPath = routePaths.artistBrowseProfile(artist?.artistId);
                    const isArtistActive = location.pathname === artistPath;

                    return (
                      <Link
                        key={artist?.artistId || `${artistName}-${index}`}
                        to={artistPath}
                        onClick={onNavigate}
                        className={[
                          "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                          isArtistActive
                            ? "bg-gradient-to-r from-[#f5b66f]/20 to-transparent text-[#f7f1ea]"
                            : "text-[#b8b0aa] hover:bg-[#241f28] hover:text-[#f7f1ea]",
                        ].join(" ")}
                      >
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={artistName}
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-[#f7f1ea]">
                            {getArtistInitial(artistName)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-inherit">
                            {artistName}
                          </p>
                          <p className="truncate text-xs text-[#b8b0aa]">
                            Nghệ sĩ
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )
              ) : null}

              {activeTab === "album" ? (
                isLoadingAlbums ? (
                  <div className="flex items-center gap-3 px-3 py-3 text-sm text-[#b8b0aa]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#f5b66f]" />
                    <span>Đang tải album...</span>
                  </div>
                ) : followedAlbums.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-[#b8b0aa]">
                    Chưa theo dõi album nào
                  </div>
                ) : (
                  followedAlbums.map((album, index) => {
                    const title =
                      typeof album?.title === "string" && album.title.trim()
                        ? album.title.trim()
                        : "Untitled Album";

                    const coverImage =
                      typeof album?.coverImage === "string" && album.coverImage.trim()
                        ? album.coverImage.trim()
                        : "";

                    const artistName =
                      typeof album?.artistName === "string" && album.artistName.trim()
                        ? album.artistName.trim()
                        : "Unknown Artist";

                    return (
                      <Link
                        key={album?.albumId || `${title}-${index}`}
                        to={routePaths.albumDetail(album?.albumId)}
                        onClick={onNavigate}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[#b8b0aa] transition hover:bg-[#241f28] hover:text-[#f7f1ea]"
                      >
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={title}
                            className="h-12 w-12 shrink-0 rounded-md object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/10 text-sm font-semibold text-[#f7f1ea]">
                            {title.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-inherit">
                            {title}
                          </p>
                          <p className="truncate text-xs text-[#b8b0aa]">
                            Album • {artistName}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )
              ) : null}
            </div>
          </>
        ) : null}
      </nav>
    </aside>
  );
};

export default Sidebar;