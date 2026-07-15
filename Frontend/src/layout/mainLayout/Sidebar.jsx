import {
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import UserFavoriteLibraryItem from "../../components/userFavorite/UserFavoriteLibraryItem";
import CreatePlaylistButton from "../../components/userPlaylist/CreatePlaylistButton";
import CreatePlaylistModal from "../../components/userPlaylist/CreatePlaylistModal";
import DeletePlaylistConfirmModal from "../../components/userPlaylist/DeletePlaylistConfirmModal";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { routePaths } from "../../routes/routePaths";
import {
  getFollowedAlbums,
  getFollowedArtists,
} from "../../services/libaryService";
import { getFavoriteTracks } from "../../services/userFavoriteService";
import { getUserPlaylists } from "../../services/userPlaylistService";
import { hasPremiumAccess } from "../../utils/premiumAccess";
import GuestLibrarySidebar from "./GuestLibrarySidebar";

const FOLLOWED_ITEMS_LIMIT = 20;
const FREE_PLAYLIST_LIMIT = 5;
const SIDEBAR_PLAYLIST_LIMIT = 10;

const getArtistInitial = (name) => {
  if (typeof name !== "string") {
    return "?";
  }

  const normalizedName = name.trim();

  return normalizedName ? normalizedName.charAt(0).toUpperCase() : "?";
};

const getPlaylistTitle = (playlist) => {
  if (typeof playlist?.title === "string" && playlist.title.trim()) {
    return playlist.title.trim();
  }

  if (typeof playlist?.name === "string" && playlist.name.trim()) {
    return playlist.name.trim();
  }

  return "Playlist chưa đặt tên";
};

const getPlaylistCoverImage = (playlist) => {
  if (
    typeof playlist?.coverImage === "string" &&
    playlist.coverImage.trim()
  ) {
    return playlist.coverImage.trim();
  }

  return "";
};

const getPlaylistOwnerName = (playlist) => {
  if (typeof playlist?.userName === "string" && playlist.userName.trim()) {
    return playlist.userName.trim();
  }

  if (
    typeof playlist?.owner?.fullName === "string" &&
    playlist.owner.fullName.trim()
  ) {
    return playlist.owner.fullName.trim();
  }

  return "Người dùng không xác định";
};

const normalizePlaylists = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.playlists)) {
    return payload.playlists;
  }

  return [];
};

const getPlaylistTotalCount = (payload, fallbackCount) => {
  const total = Number(
    payload?.total ??
      payload?.pagination?.total ??
      payload?.pagination?.totalItems ??
      payload?.meta?.total ??
      payload?.meta?.totalItems
  );

  if (Number.isFinite(total) && total >= 0) {
    return total;
  }

  return fallbackCount;
};

const tabButtonClassName = (isActive) =>
  isActive
    ? "rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white"
    : "rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-[#f7f1ea]";

const Sidebar = ({
  isCollapsed = false,
  onToggleDesktop,
  showCloseButton = false,
  onClose,
  onNavigate,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isDark } = useTheme();
  const DesktopToggleIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;
  const isPremiumUser = hasPremiumAccess(user);

  const [followedArtists, setFollowedArtists] = useState([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);
  const [activeTab, setActiveTab] = useState("playlist");
  const [followedAlbums, setFollowedAlbums] = useState([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);
  const [playlists, setPlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
  const [favoriteTracksTotalItems, setFavoriteTracksTotalItems] = useState(0);
  const [isLoadingFavoriteTracks, setIsLoadingFavoriteTracks] = useState(true);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] =
    useState(false);
  const [playlistTotalCount, setPlaylistTotalCount] = useState(0);
  const [isPlaylistLimitModalOpen, setIsPlaylistLimitModalOpen] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    if (isLoading) {
      return () => {
        isMounted = false;
      };
    }

    if (!isAuthenticated) {
      setFollowedArtists([]);
      setFollowedAlbums([]);
      setPlaylists([]);
      setFavoriteTracksTotalItems(0);
      setIsLoadingArtists(false);
      setIsLoadingAlbums(false);
      setIsLoadingPlaylists(false);
      setIsLoadingFavoriteTracks(false);
      setIsCreatePlaylistModalOpen(false);
      setIsPlaylistLimitModalOpen(false);
      setPlaylistTotalCount(0);

      return () => {
        isMounted = false;
      };
    }

    const loadFollowedArtists = async () => {
      setIsLoadingArtists(true);

      try {
        const response = await getFollowedArtists({
          page: 1,
          limit: FOLLOWED_ITEMS_LIMIT,
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
          limit: FOLLOWED_ITEMS_LIMIT,
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
        const nextPlaylists = normalizePlaylists(response);

        if (isMounted) {
          setPlaylists(nextPlaylists);
          setPlaylistTotalCount(
            getPlaylistTotalCount(response, nextPlaylists.length)
          );
        }
      } catch {
        if (isMounted) {
          setPlaylists([]);
          setPlaylistTotalCount(0);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlaylists(false);
        }
      }
    };

    const loadFavoriteTracksSummary = async () => {
      setIsLoadingFavoriteTracks(true);

      try {
        const response = await getFavoriteTracks({
          page: 1,
          limit: 1,
        });
        const totalItems = Number(
          response?.pagination?.totalItems ??
            response?.pagination?.total ??
            response?.items?.length ??
            0
        );

        if (isMounted) {
          setFavoriteTracksTotalItems(totalItems > 0 ? totalItems : 0);
        }
      } catch {
        if (isMounted) {
          setFavoriteTracksTotalItems(0);
        }
      } finally {
        if (isMounted) {
          setIsLoadingFavoriteTracks(false);
        }
      }
    };

    void loadPlaylists();
    void loadFollowedArtists();
    void loadFollowedAlbums();
    void loadFavoriteTracksSummary();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isLoading]);

  const handleGuestAction = (path) => {
    onNavigate?.();
    navigate(path);
  };

  const handleNavigateToFavoriteTracks = () => {
    onNavigate?.();
    navigate(routePaths.userFavoriteTracks);
  };

  const handleNavigateToPlaylistLibrary = () => {
    onNavigate?.();
    navigate(routePaths.userPlaylist);
  };

  const refreshPlaylists = async () => {
    setIsLoadingPlaylists(true);

    try {
      const response = await getUserPlaylists();
      const nextPlaylists = normalizePlaylists(response);

      setPlaylists(nextPlaylists);
      setPlaylistTotalCount(getPlaylistTotalCount(response, nextPlaylists.length));
    } catch {
      setPlaylists([]);
      setPlaylistTotalCount(0);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const isFavoriteTracksActive =
    location.pathname === routePaths.userFavoriteTracks;
  const shouldShowFavoriteTracksItem = favoriteTracksTotalItems > 0;
  const isLoadingPlaylistLibrary =
    isLoadingPlaylists || isLoadingFavoriteTracks;
  const sidebarPlaylists = playlists.slice(0, SIDEBAR_PLAYLIST_LIMIT);
  const shouldShowMorePlaylistsButton =
    playlistTotalCount > sidebarPlaylists.length ||
    playlists.length > sidebarPlaylists.length;

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
        <CreatePlaylistButton
          onClick={() => {
            if (!isAuthenticated) {
              handleGuestAction(routePaths.login);
              return;
            }

            if (!isPremiumUser && playlistTotalCount >= FREE_PLAYLIST_LIMIT) {
              setIsPlaylistLimitModalOpen(true);
              return;
            }

            setIsCreatePlaylistModalOpen(true);
          }}
          isCompact={isCollapsed}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleDesktop}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5 hover:text-white lg:inline-flex"
            aria-label={isCollapsed ? "Mở thanh bên" : "Thu gọn thanh bên"}
            title={isCollapsed ? "Mở thanh bên" : "Thu gọn thanh bên"}
          >
            <DesktopToggleIcon className="h-5 w-5" />
          </button>

          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5 hover:text-white lg:hidden"
              aria-label="Đóng thanh bên"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
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
          !isAuthenticated && !isLoading ? (
            <GuestLibrarySidebar onAction={handleGuestAction} />
          ) : (
            <>
              <div className="mb-4 px-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("playlist")}
                    className={tabButtonClassName(activeTab === "playlist")}
                  >
                    Playlist
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("artist")}
                    className={tabButtonClassName(activeTab === "artist")}
                  >
                    Nghệ sĩ
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("album")}
                    className={tabButtonClassName(activeTab === "album")}
                  >
                    Album
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {activeTab === "playlist" ? (
                  isLoadingPlaylistLibrary ? (
                    <div className="flex items-center gap-3 px-3 py-3 text-sm text-[#b8b0aa]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#f5b66f]" />
                      <span>Dang tai playlist...</span>
                    </div>
                  ) : sidebarPlaylists.length === 0 && !shouldShowFavoriteTracksItem ? (
                    <div className="px-3 py-3 text-sm text-[#b8b0aa]">
                      Chưa có playlist nào
                    </div>
                  ) : (
                    <>
                      {shouldShowFavoriteTracksItem ? (
                        <UserFavoriteLibraryItem
                          totalItems={favoriteTracksTotalItems}
                          isActive={isFavoriteTracksActive}
                          onClick={handleNavigateToFavoriteTracks}
                        />
                      ) : null}

                      {sidebarPlaylists.map((playlist, index) => {
                        const title = getPlaylistTitle(playlist);
                        const coverImage = getPlaylistCoverImage(playlist);
                        const userName = getPlaylistOwnerName(playlist);

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
                      })}

                      {shouldShowMorePlaylistsButton ? (
                        <button
                          type="button"
                          onClick={handleNavigateToPlaylistLibrary}
                          className="mt-2 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
                        >
                          Xem thêm
                        </button>
                      ) : null}
                    </>
                  )
                ) : null}

                {activeTab === "artist" ? (
                  isLoadingArtists ? (
                    <div className="flex items-center gap-3 px-3 py-3 text-sm text-[#b8b0aa]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#f5b66f]" />
                      <span>Dang tai nghe si...</span>
                    </div>
                  ) : followedArtists.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-[#b8b0aa]">
                      Chua theo doi nghe si nao
                    </div>
                  ) : (
                    followedArtists.map((artist, index) => {
                      const artistName =
                        typeof artist?.name === "string" && artist.name.trim()
                          ? artist.name.trim()
                          : "Nghệ sĩ không xác định";

                      const avatar =
                        typeof artist?.avatar === "string" && artist.avatar.trim()
                          ? artist.avatar.trim()
                          : "";

                      const artistPath = routePaths.artistBrowseProfile(
                        artist?.artistId
                      );
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
                      <span>Dang tai album...</span>
                    </div>
                  ) : followedAlbums.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-[#b8b0aa]">
                      Chua theo doi album nao
                    </div>
                  ) : (
                    followedAlbums.map((album, index) => {
                      const title =
                        typeof album?.title === "string" && album.title.trim()
                          ? album.title.trim()
                          : "Album chưa đặt tên";

                      const coverImage =
                        typeof album?.coverImage === "string" &&
                        album.coverImage.trim()
                          ? album.coverImage.trim()
                          : "";

                      const artistName =
                        typeof album?.artistName === "string" &&
                        album.artistName.trim()
                          ? album.artistName.trim()
                          : "Nghệ sĩ không xác định";

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
          )
        ) : null}
      </nav>

      {isAuthenticated ? (
        <>
          <CreatePlaylistModal
            isOpen={isCreatePlaylistModalOpen}
            onClose={() => setIsCreatePlaylistModalOpen(false)}
            existingPlaylists={playlists}
            onCreated={async () => {
              setActiveTab("playlist");
              await refreshPlaylists();
            }}
          />

          <DeletePlaylistConfirmModal
            isOpen={isPlaylistLimitModalOpen}
            playlistTitle=""
            title="Đã đạt giới hạn playlist"
            message="Tài khoản miễn phí chỉ có thể tạo tối đa 5 playlist. Hãy đăng ký Premium để tạo thêm playlist."
            confirmLabel="Xác nhận"
            cancelLabel="Hủy"
            confirmTone="neutral"
            extraActionLabel="Đăng ký Premium"
            extraActionTone="primary"
            onExtraAction={() => {
              setIsPlaylistLimitModalOpen(false);
              onNavigate?.();
              navigate(routePaths.premium);
            }}
            onClose={() => setIsPlaylistLimitModalOpen(false)}
            onConfirm={() => setIsPlaylistLimitModalOpen(false)}
            variant="dark"
            size="sm"
          />
        </>
      ) : null}
    </aside>
  );
};

export default Sidebar;
