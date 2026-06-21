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
        <div ref={ menuRef } className="relative flex items-center justify-end">
            <button
                type="button"
                onClick={ handleToggleMenu }
                className="
            inline-flex h-8 w-8 items-center justify-center
            rounded-md
            text-[#8a8a8a]
            transition-colors
            hover:bg-[#2d2d2d]
            hover:text-white
        "
            >
                <MoreHorizontal className="h-4 w-4" />
            </button>

            { isOpen && (
                <div
                    className="
                absolute bottom-full right-0 z-[9999] mb-1.5
                w-56 overflow-visible rounded-md
                border border-[#3d3c3c]
                bg-[#202020]
                p-1 text-[12px]
                shadow-[0_10px_30px_rgba(0,0,0,0.35)]
            "
                    onClick={ (e) => e.stopPropagation() }
                >
                    <div className="relative">
                        <button
                            type="button"
                            onClick={ (e) => {
                                e.stopPropagation();
                                setIsPlaylistSubmenuOpen((v) => !v);
                            } }
                            className="
                        flex w-full items-center justify-between
                        rounded-[6px]
                        px-3 py-2
                        text-left text-[12px] font-normal
                        text-[#f3f4f6]
                        transition-all duration-150
                        hover:bg-[#313131]
                    "
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <Plus className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                                <span className="truncate">Thêm vào playlist</span>
                            </span>

                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                        </button>

                        { isPlaylistSubmenuOpen && (
                            <div
                                className="
                            absolute bottom-0 right-full z-[10000] mr-1.5
                            w-72 overflow-hidden rounded-md
                            border border-[#525252]
                            bg-[#202020]
                            p-1
                            shadow-[0_10px_30px_rgba(0,0,0,0.35)]
                        "
                            >
                                <label
                                    className="
                                mb-1 flex items-center gap-2
                                rounded-[6px]
                                border border-[#4a4a4a]
                                bg-[#2a2a2a]
                                px-2.5 py-2
                                text-[#9ca3af]
                            "
                                >
                                    <Search className="h-3.5 w-3.5 shrink-0" />

                                    <input
                                        type="text"
                                        value={ searchValue }
                                        onChange={ (e) => setSearchValue(e.target.value) }
                                        placeholder="Tìm playlist..."
                                        className="
                                    w-full bg-transparent
                                    text-[12px] text-[#f3f4f6]
                                    placeholder:text-[#8a8a8a]
                                    outline-none
                                "
                                    />
                                </label>

                                <div className="max-h-60 space-y-0.5 overflow-y-auto pr-0.5">
                                    { filteredPlaylists.length > 0 ? (
                                        filteredPlaylists.map((playlist) => {
                                            const playlistId = getPlaylistId(playlist);
                                            const isSubmitting =
                                                submittingPlaylistId === playlistId;

                                            return (
                                                <button
                                                    key={ playlistId }
                                                    type="button"
                                                    onClick={ () =>
                                                        handleAddTrackToPlaylist(playlist)
                                                    }
                                                    disabled={ Boolean(submittingPlaylistId) }
                                                    className="
                                                flex w-full items-center justify-between
                                                rounded-[6px]
                                                px-3 py-2
                                                text-left text-[12px] font-normal
                                                text-[#f3f4f6]
                                                transition-all duration-150
                                                hover:bg-[#525252]
                                                disabled:pointer-events-none
                                                disabled:opacity-50
                                            "
                                                >
                                                    <span className="truncate">
                                                        { getPlaylistTitle(playlist) }
                                                    </span>

                                                    { isSubmitting ? (
                                                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#9ca3af]" />
                                                    ) : (
                                                        <Plus className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                                                    ) }
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="px-3 py-2 text-[12px] text-[#9ca3af]">
                                            Không có playlist phù hợp.
                                        </div>
                                    ) }
                                </div>
                            </div>
                        ) }
                    </div>

                    { errorMessage && (
                        <div
                            className="
                        mt-1 rounded-[6px]
                        border border-red-500/20
                        bg-red-500/10
                        px-3 py-2
                        text-[11px] leading-4
                        text-red-300
                    "
                        >
                            { errorMessage }
                        </div>
                    ) }
                </div>
            ) }
        </div>
    );
};

export default TrackTwoLevelMenu;