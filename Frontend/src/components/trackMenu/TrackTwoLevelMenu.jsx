import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    CheckCircle2,
    ChevronRight,
    Heart,
    Loader2,
    MoreHorizontal,
    Plus,
    Search,
    X,
} from "lucide-react";
import DeletePlaylistConfirmModal from "../userPlaylist/DeletePlaylistConfirmModal";
import { usePlayer } from "../../hooks/usePlayer";
import {
    addTrackToFavorite,
    getTrackFavoriteStatus,
    removeTrackFromFavorite,
} from "../../services/userFavoriteService";
import {
    addTrackToUserPlaylist,
    getUserPlaylists,
} from "../../services/userPlaylistService";
import { routePaths } from "../../routes/routePaths";
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
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.playlists)) return payload.playlists;
    return [];
};

const getPlaylistTrackLimitModalMessage = () =>
    "Playlist này đã đạt giới hạn bài hát của gói miễn phí. Hãy đăng ký Premium để thêm nhiều bài hát hơn.";

const isPlaylistTrackLimitErrorMessage = (message) => {
    const normalizedMessage =
        typeof message === "string" ? message.trim().toLocaleLowerCase() : "";

    if (!normalizedMessage) {
        return false;
    }

    return (
        normalizedMessage.includes("free playlists can contain") ||
        normalizedMessage.includes("đạt giới hạn bài hát") ||
        normalizedMessage.includes("giới hạn bài hát") ||
        normalizedMessage.includes("playlist") &&
            (normalizedMessage.includes("track") || normalizedMessage.includes("bài hát")) &&
            (normalizedMessage.includes("premium") ||
                normalizedMessage.includes("limit") ||
                normalizedMessage.includes("giới hạn") ||
                normalizedMessage.includes("nâng cấp"))
    );
};

const resolveTrackIdentity = (candidate) =>
    candidate?.id || candidate?._id || candidate?.trackId || "";

const doesQueueTrackMatch = (queueTrack, trackId) => {
    if (!trackId) {
        return false;
    }

    const queueTrackId =
        queueTrack?.playbackTrackId ||
        resolveTrackIdentity(queueTrack) ||
        resolveTrackIdentity(queueTrack?.raw);

    return String(queueTrackId || "") === String(trackId);
};

const TrackTwoLevelMenu = ({
    trackId,
    track = null,
    onTrackAdded,
    isFavorite,
    onFavoriteChanged,
}) => {
    const menuRef = useRef(null);
    const navigate = useNavigate();
    const submenuAnchorRef = useRef(null);
    const hasFavoriteProp = typeof isFavorite === "boolean";
    const {
        queue,
        currentIndex,
        addTrackToQueue,
        removeTrackFromQueue,
    } = usePlayer();

    const [isOpen, setIsOpen] = useState(false);
    const [isPlaylistSubmenuOpen, setIsPlaylistSubmenuOpen] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [searchValue, setSearchValue] = useState("");
    const [submittingPlaylistId, setSubmittingPlaylistId] = useState("");
    const [isSubmittingFavorite, setIsSubmittingFavorite] = useState(false);
    const [isSubmittingQueue, setIsSubmittingQueue] = useState(false);
    const [favoriteState, setFavoriteState] = useState(false);
    const [isFavoriteStatusLoading, setIsFavoriteStatusLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [submenuPlacement, setSubmenuPlacement] = useState("right");
    const [isPlaylistTrackLimitModalOpen, setIsPlaylistTrackLimitModalOpen] = useState(false);

    const resolvedIsFavorite = hasFavoriteProp ? isFavorite : favoriteState;
    const resolvedTrackId = trackId || resolveTrackIdentity(track);

    useEffect(() => {
        if (!isOpen) return undefined;

        const closeMenu = () => {
            setIsOpen(false);
            setIsPlaylistSubmenuOpen(false);
            setSearchValue("");
        };

        const handlePointerDown = (event) => {
            if (!menuRef.current?.contains(event.target)) {
                closeMenu();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                closeMenu();
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
        if (!isOpen) return undefined;

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

    useEffect(() => {
        if (!isOpen || !isPlaylistSubmenuOpen) return undefined;

        const updateSubmenuPlacement = () => {
            const anchorBounds = submenuAnchorRef.current?.getBoundingClientRect();

            if (!anchorBounds) return;

            const submenuWidth = 352;
            const gap = 8;
            const viewportWidth = window.innerWidth;
            const spaceOnRight = viewportWidth - anchorBounds.right;
            const spaceOnLeft = anchorBounds.left;

            if (spaceOnRight >= submenuWidth + gap) {
                setSubmenuPlacement("right");
                return;
            }

            if (spaceOnLeft >= submenuWidth + gap) {
                setSubmenuPlacement("left");
                return;
            }

            setSubmenuPlacement("stacked");
        };

        updateSubmenuPlacement();
        window.addEventListener("resize", updateSubmenuPlacement);

        return () => {
            window.removeEventListener("resize", updateSubmenuPlacement);
        };
    }, [isOpen, isPlaylistSubmenuOpen]);

    useEffect(() => {
        if (!isOpen || hasFavoriteProp || !trackId) return undefined;

        let isMounted = true;

        const loadFavoriteStatus = async () => {
            setIsFavoriteStatusLoading(true);

            try {
                const result = await getTrackFavoriteStatus(trackId);

                if (isMounted) {
                    setFavoriteState(Boolean(result?.isFavorite));
                }
            } catch {
                if (isMounted) {
                    setFavoriteState(false);
                }
            } finally {
                if (isMounted) {
                    setIsFavoriteStatusLoading(false);
                }
            }
        };

        void loadFavoriteStatus();

        return () => {
            isMounted = false;
        };
    }, [hasFavoriteProp, isOpen, trackId]);

    const submenuClassName = `
        absolute z-[10000] w-[min(15rem,calc(100vw-2rem))]
        rounded-md border border-[#3d3c3c] bg-[#202020] p-1
        shadow-[0_10px_30px_rgba(0,0,0,0.35)]
        ${submenuPlacement === "left" ? "bottom-0 right-full mr-1.5" : ""}
        ${submenuPlacement === "right" ? "bottom-0 left-full ml-1.5" : ""}
        ${submenuPlacement === "stacked" ? "right-0 top-full mt-2 " : ""}
    `;

    const filteredPlaylists = useMemo(() => {
        const keyword = searchValue.trim().toLowerCase();

        if (!keyword) return playlists;

        return playlists.filter((playlist) =>
            getPlaylistTitle(playlist).toLowerCase().includes(keyword)
        );
    }, [playlists, searchValue]);

    const queuedTrackIndex = useMemo(() => {
        if (!resolvedTrackId) {
            return -1;
        }

        return queue.findIndex(
            (queueTrack, index) =>
                index > currentIndex && doesQueueTrackMatch(queueTrack, resolvedTrackId)
        );
    }, [currentIndex, queue, resolvedTrackId]);

    const handleToggleMenu = (event) => {
        event.stopPropagation();

        setIsOpen((current) => !current);
        setIsPlaylistSubmenuOpen(false);
        setSearchValue("");
        setErrorMessage("");
    };

    const handleAddTrackToPlaylist = async (playlist) => {
        const playlistId = getPlaylistId(playlist);

        if (!trackId || !playlistId || submittingPlaylistId) return;

        setSubmittingPlaylistId(playlistId);
        setErrorMessage("");

        try {
            const updatedPlaylist = await addTrackToUserPlaylist(playlistId, trackId);

            onTrackAdded?.(updatedPlaylist, playlist);

            setIsOpen(false);
            setIsPlaylistSubmenuOpen(false);
            setSearchValue("");
        } catch (error) {
            const nextErrorMessage = getApiErrorMessage(
                error,
                "Không thể thêm bài hát vào playlist."
            );

            if (isPlaylistTrackLimitErrorMessage(nextErrorMessage)) {
                setIsOpen(false);
                setIsPlaylistSubmenuOpen(false);
                setSearchValue("");
                setIsPlaylistTrackLimitModalOpen(true);
            } else {
                setErrorMessage(nextErrorMessage);
            }
        } finally {
            setSubmittingPlaylistId("");
        }
    };

    const handleToggleFavorite = async () => {
        if (!trackId || isSubmittingFavorite || isFavoriteStatusLoading) return;

        const nextIsFavorite = !resolvedIsFavorite;

        setIsSubmittingFavorite(true);
        setErrorMessage("");

        try {
            const payload = nextIsFavorite
                ? await addTrackToFavorite(trackId)
                : await removeTrackFromFavorite(trackId);

            if (!hasFavoriteProp) {
                setFavoriteState(nextIsFavorite);
            }

            onFavoriteChanged?.(nextIsFavorite, payload);

            setIsOpen(false);
            setIsPlaylistSubmenuOpen(false);
            setSearchValue("");
        } catch (error) {
            setErrorMessage(
                getApiErrorMessage(
                    error,
                    nextIsFavorite
                        ? "Không thể thích bài hát lúc này."
                        : "Không thể xóa bài hát khỏi yêu thích lúc này."
                )
            );
        } finally {
            setIsSubmittingFavorite(false);
        }
    };

    const handleToggleQueue = async () => {
        if ((!track && !resolvedTrackId) || isSubmittingQueue) return;

        setIsSubmittingQueue(true);
        setErrorMessage("");

        try {
            if (queuedTrackIndex >= 0) {
                await removeTrackFromQueue(queuedTrackIndex);
            } else {
                await addTrackToQueue(
                    track || {
                        id: resolvedTrackId,
                    }
                );
            }

            setIsOpen(false);
            setIsPlaylistSubmenuOpen(false);
            setSearchValue("");
        } catch (error) {
            setErrorMessage(
                getApiErrorMessage(error, "Không thể cập nhật danh sách chờ.")
            );
        } finally {
            setIsSubmittingQueue(false);
        }
    };

    const favoriteLabel = resolvedIsFavorite
        ? "Xóa khỏi Bài hát đã thích"
        : "Thích bài hát";
    const queueActionLabel =
        queuedTrackIndex >= 0
            ? "Xóa khỏi danh sách chờ"
            : "Thêm vào danh sách chờ";

    return (
        <div ref={ menuRef } className="relative flex items-center justify-end">
            <button
                type="button"
                onClick={ handleToggleMenu }
                className="
                    inline-flex h-8 w-8 items-center justify-center
                    rounded-md text-[#8a8a8a]
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
                    onClick={ (event) => event.stopPropagation() }
                >
                    <button
                        type="button"
                        onClick={ handleToggleFavorite }
                        disabled={
                            isSubmittingFavorite ||
                            isFavoriteStatusLoading ||
                            !trackId
                        }
                        className="
                            flex w-full items-center gap-2
                            rounded-[6px] px-3 py-2
                            text-left text-[12px] font-normal
                            text-[#f3f4f6]
                            transition-all duration-150
                            hover:bg-[#313131]
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    >
                        { isSubmittingFavorite || isFavoriteStatusLoading ? (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#9ca3af]" />
                        ) : resolvedIsFavorite ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#22c55e]" />
                        ) : (
                            <Heart className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                        ) }

                        <span className="truncate">{ favoriteLabel }</span>
                    </button>

                    <button
                        type="button"
                        onClick={ handleToggleQueue }
                        disabled={ isSubmittingQueue || (!track && !resolvedTrackId) }
                        className="
                            flex w-full items-center gap-2
                            rounded-[6px] px-3 py-2
                            text-left text-[12px] font-normal
                            text-[#f3f4f6]
                            transition-all duration-150
                            hover:bg-[#313131]
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    >
                        { isSubmittingQueue ? (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#9ca3af]" />
                        ) : queuedTrackIndex >= 0 ? (
                            <X className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                        ) : (
                            <Plus className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                        ) }

                        <span className="truncate">{ queueActionLabel }</span>
                    </button>

                    <div ref={ submenuAnchorRef } className="relative">
                        <button
                            type="button"
                            onClick={ (event) => {
                                event.stopPropagation();
                                setIsPlaylistSubmenuOpen((current) => !current);
                                setErrorMessage("");
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
                            <div className={ submenuClassName }>
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
                                        onChange={ (event) =>
                                            setSearchValue(event.target.value)
                                        }
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
                                                        handleAddTrackToPlaylist(
                                                            playlist
                                                        )
                                                    }
                                                    disabled={ Boolean(
                                                        submittingPlaylistId
                                                    ) }
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
            <DeletePlaylistConfirmModal
                isOpen={ isPlaylistTrackLimitModalOpen }
                playlistTitle=""
                title="Đã đạt giới hạn bài hát trong playlist"
                message={ getPlaylistTrackLimitModalMessage() }
                confirmLabel="Xác nhận"
                cancelLabel="Hủy"
                confirmTone="neutral"
                extraActionLabel="Đăng ký Premium"
                extraActionTone="primary"
                onExtraAction={ () => {
                    setIsPlaylistTrackLimitModalOpen(false);
                    navigate(routePaths.premium);
                } }
                onClose={ () => setIsPlaylistTrackLimitModalOpen(false) }
                onConfirm={ () => setIsPlaylistTrackLimitModalOpen(false) }
                variant="dark"
                size="sm"
            />
        </div>
    );
};

export default TrackTwoLevelMenu;



