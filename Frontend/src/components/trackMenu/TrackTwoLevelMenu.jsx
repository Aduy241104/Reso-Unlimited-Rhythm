import { useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronRight,
    Loader2,
    MoreHorizontal,
    Plus,
    Search,
} from "lucide-react";
import {
    addTrackToUserPlaylist,
    getUserPlaylists,
} from "../../services/userPlaylistService";
import { getApiErrorMessage } from "../../utils/apiError";

const getPlaylistId = (playlist) => playlist?.playlistId || playlist?.id || "";

const getPlaylistTitle = (playlist) => {
    if (typeof playlist?.title === "string" && playlist.title.trim()) {
        return playlist.title.trim();
    }

    if (typeof playlist?.name === "string" && playlist.name.trim()) {
        return playlist.name.trim();
    }

    return "Untitled playlist";
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

const TrackTwoLevelMenu = ({ trackId, onTrackAdded }) => {
    const menuRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [isPlaylistSubmenuOpen, setIsPlaylistSubmenuOpen] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [searchValue, setSearchValue] = useState("");
    const [submittingPlaylistId, setSubmittingPlaylistId] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            if (!menuRef.current?.contains(event.target)) {
                setIsOpen(false);
                setIsPlaylistSubmenuOpen(false);
                setSearchValue("");
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsOpen(false);
                setIsPlaylistSubmenuOpen(false);
                setSearchValue("");
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        let isMounted = true;

        const loadPlaylists = async () => {
            try {
                const result = await getUserPlaylists();

                if (isMounted) {
                    setPlaylists(normalizePlaylists(result));
                }
            } catch {
                if (isMounted) {
                    setPlaylists([]);
                }
            }
        };

        void loadPlaylists();

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    const filteredPlaylists = useMemo(() => {
        const keyword = searchValue.trim().toLowerCase();

        if (!keyword) {
            return playlists;
        }

        return playlists.filter((playlist) =>
            getPlaylistTitle(playlist).toLowerCase().includes(keyword)
        );
    }, [playlists, searchValue]);

    const handleToggleMenu = (event) => {
        event.stopPropagation();

        setIsOpen((current) => !current);
        setIsPlaylistSubmenuOpen(false);
        setSearchValue("");
        setErrorMessage("");
    };

    const handleAddTrackToPlaylist = async (playlist) => {
        const playlistId = getPlaylistId(playlist);

        if (!trackId || !playlistId || submittingPlaylistId) {
            return;
        }

        setSubmittingPlaylistId(playlistId);
        setErrorMessage("");

        try {
            const updatedPlaylist = await addTrackToUserPlaylist(playlistId, trackId);

            onTrackAdded?.(updatedPlaylist, playlist);

            setIsOpen(false);
            setIsPlaylistSubmenuOpen(false);
            setSearchValue("");
        } catch (error) {
            setErrorMessage(
                getApiErrorMessage(error, "Không thể thêm bài hát vào playlist.")
            );
        } finally {
            setSubmittingPlaylistId("");
        }
    };

    return (
        <div ref={menuRef} className="relative flex items-center justify-end">
            <button
                type="button"
                onClick={handleToggleMenu}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#71717a] transition hover:bg-black/[0.06] hover:text-[#111111] dark:text-[#a1a1aa] dark:hover:bg-white/[0.08] dark:hover:text-white"
                aria-label="Track options"
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                <MoreHorizontal className="h-4.5 w-4.5" />
            </button>

            {isOpen ? (
                <div
                    className="
            absolute bottom-full right-0 z-30 mb-2 w-[18rem]
            overflow-visible rounded-[12px]
            border border-white/10 bg-[#282828] py-1 text-left
            shadow-[0_24px_60px_rgba(0,0,0,0.45)]
          "
                    role="menu"
                    aria-label="Track actions"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setIsPlaylistSubmenuOpen((current) => !current);
                            }}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-[#3e3e3e]"
                            role="menuitem"
                        >
                            <span className="flex items-center gap-3">
                                <Plus className="h-4.5 w-4.5 shrink-0 text-white/72" />
                                Thêm vào playlist
                            </span>

                            <ChevronRight className="h-4 w-4 shrink-0 text-white/72" />
                        </button>

                        {isPlaylistSubmenuOpen ? (
                            <div
                                className="
                  absolute bottom-0 right-full z-40 mr-1 w-[22rem]
                  rounded-[12px] border border-white/10 bg-[#282828] p-2
                  shadow-[0_24px_60px_rgba(0,0,0,0.45)]
                "
                            >
                                <label className="mb-2 flex items-center gap-3 rounded-md bg-[#3a3a3a] px-3 py-2 text-white/72">
                                    <Search className="h-4 w-4 shrink-0" />

                                    <input
                                        type="text"
                                        value={searchValue}
                                        onChange={(event) => setSearchValue(event.target.value)}
                                        placeholder="Tìm playlist"
                                        className="w-full bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
                                    />
                                </label>

                                <div className="max-h-64 overflow-y-auto">
                                    {filteredPlaylists.length > 0 ? (
                                        filteredPlaylists.map((playlist) => {
                                            const playlistId = getPlaylistId(playlist);
                                            const isSubmitting = submittingPlaylistId === playlistId;

                                            return (
                                                <button
                                                    key={playlistId}
                                                    type="button"
                                                    onClick={() => handleAddTrackToPlaylist(playlist)}
                                                    disabled={Boolean(submittingPlaylistId)}
                                                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold text-white transition hover:bg-[#3e3e3e] disabled:cursor-not-allowed disabled:opacity-60"
                                                    role="menuitem"
                                                >
                                                    <span className="truncate">
                                                        {getPlaylistTitle(playlist)}
                                                    </span>

                                                    {isSubmitting ? (
                                                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/72" />
                                                    ) : (
                                                        <Plus className="h-4 w-4 shrink-0 text-white/72" />
                                                    )}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="px-3 py-3 text-sm text-white/55">
                                            Không có playlist phù hợp.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {errorMessage ? (
                        <div className="mx-2 my-2 rounded-md border border-[#ef4444]/20 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fecaca]">
                            {errorMessage}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

export default TrackTwoLevelMenu;