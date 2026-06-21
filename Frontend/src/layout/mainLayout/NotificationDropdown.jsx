import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    Music4,
    UserRound,
    CreditCard,
    Crown,
    Megaphone,
    MessageSquareText,
    Play,
    Trash2,
    X,
    Radio,
    ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { routePaths } from "../../routes/routePaths";
import {
    deleteNotificationService,
    getMyNotificationsService,
    markNotificationAsReadService,
} from "../../services/notificationService";

const tabs = [
    { key: "all", label: "All", types: [] },
    { key: "music", label: "Music", types: ["new_release"] },
    { key: "artists", label: "Artists", types: ["artist_update", "new_release", "follow"] },
    { key: "payment", label: "Payment", types: ["payment"] },
    { key: "subscription", label: "Gói cước", types: ["subscription"] },
    { key: "system", label: "System", types: ["system", "report"] },
];

const NOTIFICATIONS_PAGE_SIZE = 5;
const LOAD_MORE_DELAY_MS = 600;

const delay = (duration) =>
    new Promise((resolve) => {
        window.setTimeout(resolve, duration);
    });

const getNotificationId = (notification) => notification?._id || notification?.id;

const getTabByKey = (key) => tabs.find((tab) => tab.key === key) || tabs[0];

const getTargetId = (notification) => {
    const targetId = notification?.targetId;
    if (!targetId) return "";
    if (typeof targetId === "string") return targetId;
    if (targetId._id) return String(targetId._id);
    if (targetId.id) return String(targetId.id);
    return String(targetId);
};

const getRelativeTime = (value) => {
    if (!value) return "";

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return "";

    const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSeconds < 60) return "Vừa xong";

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return new Date(value).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const getTypeMeta = (type, targetType) => {
    if (type === "new_release" && targetType === "artist") {
        return {
            label: "Sắp phát hành",
            icon: UserRound,
            iconWrap: "bg-[#7c3aed]/15 text-[#a78bfa]",
        };
    }

    switch (type) {
        case "new_release":
            return {
                label: "Bài hát mới",
                icon: Music4,
                iconWrap: "bg-[#1db954]/15 text-[#1db954]",
            };
        case "artist_update":
            return {
                label: "Sắp phát hành",
                icon: UserRound,
                iconWrap: "bg-[#7c3aed]/15 text-[#a78bfa]",
            };
        case "follow":
            return {
                label: "Nghệ sĩ",
                icon: UserRound,
                iconWrap: "bg-[#7c3aed]/15 text-[#a78bfa]",
            };
        case "payment":
            return {
                label: "Thanh toán",
                icon: CreditCard,
                iconWrap: "bg-[#14b8a6]/15 text-[#2dd4bf]",
            };
        case "subscription":
            return {
                label: "Gói cước",
                icon: Crown,
                iconWrap: "bg-[#f59e0b]/15 text-[#fbbf24]",
            };
        case "report":
            return {
                label: "Báo cáo",
                icon: ShieldAlert,
                iconWrap: "bg-[#ef4444]/15 text-[#f87171]",
            };
        case "system":
            return {
                label: "Hệ thống",
                icon: Megaphone,
                iconWrap: "bg-[#3b82f6]/15 text-[#60a5fa]",
            };
        default:
            return {
                label: "Thông báo",
                icon: MessageSquareText,
                iconWrap: "bg-white/10 text-neutral-300",
            };
    }
};

const getSourceTypeLabel = (sourceType) => {
    switch (sourceType) {
        case "artist_auto":
            return "Nghệ sĩ phát hành tự động";
        case "system_auto":
            return "Hệ thống tự động";
        case "admin_manual":
            return "Admin gửi thủ công";
        default:
            return "Không rõ nguồn gửi";
    }
};

const getReceiverTypeLabel = (receiverType) => {
    switch (receiverType) {
        case "all":
            return "Tất cả người dùng";
        case "group":
            return "Nhóm người dùng";
        case "single":
            return "Một người dùng";
        case "followers":
            return "Follower của nghệ sĩ";
        default:
            return "Không rõ người nhận";
    }
};

const getTargetTypeLabel = (targetType) => {
    switch (targetType) {
        case "track":
            return "Bài hát";
        case "artist":
            return "Nghệ sĩ";
        case "playlist":
            return "Playlist";
        case "album":
            return "Album";
        default:
            return targetType || "";
    }
};

const mergeNotifications = (notificationGroups = []) => {
    const map = new Map();

    notificationGroups.flat().forEach((notification) => {
        const id = getNotificationId(notification);
        if (id) map.set(String(id), notification);
    });

    return Array.from(map.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
    });
};

const filterNotificationByTab = (notification, tabKey) => {
    if (tabKey === "all") return true;

    if (tabKey === "music") {
        return notification.type === "new_release" && notification.targetType !== "artist";
    }

    if (tabKey === "artists") {
        return (
            notification.type === "artist_update" ||
            notification.type === "follow" ||
            notification.targetType === "artist" ||
            (notification.type === "new_release" && notification.receiverType === "followers")
        );
    }

    if (tabKey === "payment") return notification.type === "payment";
    if (tabKey === "subscription") return notification.type === "subscription";
    if (tabKey === "system") return ["system", "report"].includes(notification.type);

    return true;
};

const formatNotificationDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const formatDetailValue = (value) => {
    if (!value) return "";
    if (typeof value !== "object") return String(value);
    if (value.name) return String(value.name);
    if (value.title) return String(value.title);
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    return JSON.stringify(value);
};

const getArtistDisplayName = (notification) =>
    notification?.artistName ||
    notification?.artist?.name ||
    notification?.artistId?.name ||
    "";

const NotificationIcon = ({ notification, size = "md" }) => {
    const typeMeta = getTypeMeta(notification?.type, notification?.targetType);
    const Icon = typeMeta.icon;

    const boxSize = size === "lg" ? "h-16 w-16" : "h-14 w-14";
    const iconSize = size === "lg" ? "h-7 w-7" : "h-5 w-5";

    if (notification?.thumbnail) {
        return (
            <img
                src={notification.thumbnail}
                alt=""
                className={`${boxSize} shrink-0 rounded-lg object-cover shadow-lg shadow-black/30`}
            />
        );
    }

    return (
        <div
            className={[
                "flex shrink-0 items-center justify-center rounded-lg shadow-lg shadow-black/20",
                boxSize,
                typeMeta.iconWrap,
            ].join(" ")}
        >
            <Icon className={iconSize} strokeWidth={2.1} />
        </div>
    );
};

const NotificationDropdown = ({ isDesktopSidebarVisible = true }) => {
    const { accessToken } = useAuth();
    const socket = useSocket(accessToken);
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [detailTarget, setDetailTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchNotifications = useCallback(
        async (currentPage, isLoadMore = false) => {
            try {
                if (isLoadMore) {
                    setIsLoadingMore(true);
                    await delay(LOAD_MORE_DELAY_MS);
                }

                const activeTabConfig = getTabByKey(activeTab);
                const activeTypes = activeTabConfig.types || [];

                let notificationsData = [];
                let nextHasMore = false;
                let nextUnreadCount = unreadCount;

                if (activeTypes.length === 0) {
                    const data = await getMyNotificationsService({
                        page: currentPage,
                        limit: NOTIFICATIONS_PAGE_SIZE,
                    });

                    notificationsData = data.notifications || [];
                    nextHasMore = currentPage < (data.meta?.totalPages || 1);
                    nextUnreadCount = data.meta?.unreadCount || 0;
                } else {
                    const responses = await Promise.all(
                        activeTypes.map((type) =>
                            getMyNotificationsService({
                                page: currentPage,
                                limit: NOTIFICATIONS_PAGE_SIZE,
                                type,
                            }).catch((error) => {
                                const status = error?.response?.status;
                                if (status !== 400) {
                                    console.error(`Không thể tải thông báo type=${type}:`, error);
                                }
                                return { notifications: [], meta: { totalPages: 1 } };
                            })
                        )
                    );

                    notificationsData = mergeNotifications(
                        responses.map((res) => res.notifications || [])
                    ).filter((notification) => filterNotificationByTab(notification, activeTab));

                    nextHasMore = responses.some(
                        (res) => currentPage < (res.meta?.totalPages || 1)
                    );
                }

                setNotifications((prev) =>
                    isLoadMore
                        ? mergeNotifications([prev, notificationsData]).filter((notification) =>
                            filterNotificationByTab(notification, activeTab)
                        )
                        : notificationsData
                );

                setPage(currentPage);
                setHasMore(nextHasMore);

                if (!isLoadMore && activeTab === "all") {
                    setUnreadCount(nextUnreadCount);
                }
            } catch (error) {
                console.error("Không thể tải thông báo:", error);
            } finally {
                if (isLoadMore) setIsLoadingMore(false);
            }
        },
        [activeTab, unreadCount]
    );

    const loadMoreNotifications = useCallback(() => {
        if (isLoadingMore || !hasMore) return;
        fetchNotifications(page + 1, true);
    }, [fetchNotifications, hasMore, isLoadingMore, page]);

    useEffect(() => {
        fetchNotifications(1);
    }, [fetchNotifications]);

    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (newNotification) => {
            const shouldShowInCurrentTab = filterNotificationByTab(newNotification, activeTab);

            if (shouldShowInCurrentTab) {
                setNotifications((prev) =>
                    mergeNotifications([[{ ...newNotification, isRead: false }], prev])
                );
            }

            setUnreadCount((prev) => prev + 1);
        };

        const handleUpdateNotification = (updatedNotification) => {
            setNotifications((prev) =>
                prev.map((notification) => {
                    const isMatch =
                        String(getNotificationId(notification)) ===
                        String(getNotificationId(updatedNotification));

                    if (isMatch && !notification.isRead && updatedNotification.isRead) {
                        setUnreadCount((count) => Math.max(0, count - 1));
                    }

                    return isMatch ? { ...notification, ...updatedNotification } : notification;
                })
            );
        };

        const handleDeleteNotification = (deletedNotification) => {
            setNotifications((prev) => {
                const target = prev.find(
                    (notification) =>
                        String(getNotificationId(notification)) ===
                        String(getNotificationId(deletedNotification))
                );

                if (target && !target.isRead) {
                    setUnreadCount((count) => Math.max(0, count - 1));
                }

                return prev.filter(
                    (notification) =>
                        String(getNotificationId(notification)) !==
                        String(getNotificationId(deletedNotification))
                );
            });
        };

        socket.on("new_notification", handleNewNotification);
        socket.on("update_notification", handleUpdateNotification);
        socket.on("delete_notification", handleDeleteNotification);

        return () => {
            socket.off("new_notification", handleNewNotification);
            socket.off("update_notification", handleUpdateNotification);
            socket.off("delete_notification", handleDeleteNotification);
        };
    }, [socket, activeTab]);

    const markAsRead = async (notification) => {
        const notificationId = getNotificationId(notification);
        if (!notificationId || notification.isRead) return;

        setNotifications((prev) =>
            prev.map((item) =>
                String(getNotificationId(item)) === String(notificationId)
                    ? { ...item, isRead: true }
                    : item
            )
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            await markNotificationAsReadService(notificationId);
        } catch (error) {
            console.error("Lỗi khi đánh dấu đã đọc:", error);
            fetchNotifications(1);
        }
    };

    const closePanel = () => {
        setIsOpen(false);
        setDetailTarget(null);
    };

    const navigateToTarget = (notification) => {
        const targetId = getTargetId(notification);

        if (
            notification.type === "artist_update" ||
            (notification.type === "new_release" && notification.targetType === "artist")
        ) {
            const artistId =
                notification.artistId?._id ||
                notification.artistId?.id ||
                notification.artistId ||
                targetId;

            if (artistId) {
                navigate(routePaths.artistBrowseProfile(String(artistId)));
                return true;
            }
        }

        if (!notification.targetType || !targetId) return false;

        switch (notification.targetType) {
            case "track":
                navigate(routePaths.trackDetail(targetId));
                return true;
            case "artist":
                navigate(routePaths.artistBrowseProfile(targetId));
                return true;
            case "playlist":
                navigate(routePaths.playlistDetail(targetId));
                return true;
            default:
                return false;
        }
    };

    const handleNotificationClick = async (notification) => {
        await markAsRead(notification);

        if (navigateToTarget(notification)) {
            closePanel();
            return;
        }

        setDetailTarget({ ...notification, isRead: true });
    };

    const handleOpenTarget = async (event, notification) => {
        event?.stopPropagation?.();
        await markAsRead(notification);

        if (navigateToTarget(notification)) {
            closePanel();
        }
    };

    const handleScroll = (event) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

        if (scrollHeight - scrollTop <= clientHeight + 80 && !isLoadingMore && hasMore) {
            loadMoreNotifications();
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        const notificationId = getNotificationId(deleteTarget);
        const wasUnread = !deleteTarget.isRead;

        setNotifications((prev) =>
            prev.filter((item) => String(getNotificationId(item)) !== String(notificationId))
        );

        if (wasUnread) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        setDeleteTarget(null);

        try {
            await deleteNotificationService(notificationId);
        } catch (error) {
            console.error("Lỗi khi xóa thông báo:", error);
            fetchNotifications(1);
        }
    };

    const renderNotificationItem = (notification) => {
        const typeMeta = getTypeMeta(notification.type, notification.targetType);
        const targetId = getTargetId(notification);
        const subtitle = notification.targetName || notification.content || "Chi tiết thông báo";
        const isTrack = notification.targetType === "track" && targetId;

        return (
            <div
                key={getNotificationId(notification)}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(notification)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") handleNotificationClick(notification);
                }}
                className={[
                    "group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition",
                    notification.isRead ? "hover:bg-[#282828]" : "bg-[#1db954]/[0.06] hover:bg-[#282828]",
                ].join(" ")}
            >
                <NotificationIcon notification={notification} />

                <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-extrabold leading-5 text-white">
                        {notification.title || "Thông báo"}
                    </p>

                    <p className="mt-0.5 truncate text-sm font-medium leading-5 text-neutral-300">
                        {subtitle}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-neutral-500">
                        <span>{typeMeta.label}</span>
                        <span>•</span>
                        <span>{getRelativeTime(notification.createdAt)}</span>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {!notification.isRead && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#1db954] shadow-[0_0_10px_rgba(29,185,84,0.7)]" />
                    )}

                    {isTrack && (
                        <button
                            type="button"
                            onClick={(event) => handleOpenTarget(event, notification)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black opacity-100 shadow-lg shadow-black/30 transition hover:scale-105 md:opacity-0 md:group-hover:opacity-100"
                            aria-label="Phát bài hát"
                        >
                            <Play className="ml-0.5 h-4 w-4 fill-current" />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(notification);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 opacity-100 transition hover:bg-white/10 hover:text-white md:opacity-0 md:group-hover:opacity-100"
                        aria-label="Xóa thông báo"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-200 transition hover:bg-white/10"
                aria-label="Thông báo"
            >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1db954] px-1 text-[11px] font-black leading-none text-black shadow-lg shadow-[#1db954]/30">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen &&
                createPortal(
                    <div
                        className={[
                            "fixed bottom-[80px] left-0 right-0 top-[58px] z-40 overflow-hidden bg-black/70 backdrop-blur-sm transition-[left] duration-300 lg:top-[62px]",
                            isDesktopSidebarVisible ? "lg:left-[285px]" : "lg:left-[84px]",
                        ].join(" ")}
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) closePanel();
                        }}
                    >
                        <style>
                            {`
                                .spotify-notification-scroll::-webkit-scrollbar { width: 10px; }
                                .spotify-notification-scroll::-webkit-scrollbar-track { background: transparent; }
                                .spotify-notification-scroll::-webkit-scrollbar-thumb { background: #5a5a5a; border-radius: 999px; border: 3px solid #121212; }
                                .spotify-notification-scroll::-webkit-scrollbar-thumb:hover { background: #777; }
                            `}
                        </style>

                        <section
                            className="spotify-notification-scroll h-full overflow-y-auto overflow-x-hidden bg-[#121212] text-white"
                            onScroll={handleScroll}
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col px-5 pb-12 pt-8 max-sm:px-4">
                                <header className="shrink-0 bg-[#121212] pb-6">
                                    <div className="flex items-start justify-between gap-5">
                                        <div className="min-w-0">
                                            <h2 className="text-[34px] font-black leading-10 tracking-tight text-white max-sm:text-2xl">
                                                Có gì mới
                                            </h2>

                                            <p className="mt-2 text-[15px] font-medium leading-5 text-[#b3b3b3]">
                                                Nội dung phát hành mới nhất từ nghệ sĩ, podcast và chương trình bạn theo dõi.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={closePanel}
                                            className="-mr-2 -mt-1 rounded-full p-2 text-neutral-300 transition hover:bg-[#282828] hover:text-white"
                                            aria-label="Đóng thông báo"
                                        >
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {tabs.map((tab) => (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => setActiveTab(tab.key)}
                                                className={[
                                                    "rounded-full px-4 py-2 text-sm font-bold leading-none transition",
                                                    activeTab === tab.key
                                                        ? "bg-white text-black"
                                                        : "bg-[#2a2a2a] text-white hover:bg-[#333333]",
                                                ].join(" ")}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </header>

                                <div className="min-h-0 flex-1 bg-[#121212]">
                                    {notifications.length === 0 ? (
                                        <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#242424] text-neutral-500">
                                                <Radio className="h-7 w-7" />
                                            </div>

                                            <p className="mt-5 text-base font-bold text-white">
                                                Chưa có thông báo mới
                                            </p>

                                            <p className="mt-1 max-w-sm text-sm text-neutral-500">
                                                Khi nghệ sĩ bạn theo dõi phát hành nội dung mới, thông báo sẽ xuất hiện ở đây.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="w-full space-y-1">
                                            {notifications.map(renderNotificationItem)}
                                        </div>
                                    )}

                                    {isLoadingMore && (
                                        <div className="flex justify-center py-5">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
                                        </div>
                                    )}

                                    {hasMore && notifications.length > 0 && !isLoadingMore && (
                                        <div className="flex justify-center py-6">
                                            <button
                                                type="button"
                                                onClick={loadMoreNotifications}
                                                className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:scale-[1.03] hover:bg-neutral-200"
                                            >
                                                Tải thêm thông báo
                                            </button>
                                        </div>
                                    )}

                                    {!hasMore && notifications.length > 0 && (
                                        <div className="py-5 text-center text-xs font-medium text-neutral-600">
                                            Đã tải hết thông báo
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>,
                    document.body
                )}

            {detailTarget &&
                createPortal(
                    (() => {
                        const typeMeta = getTypeMeta(detailTarget.type, detailTarget.targetType);
                        const Icon = typeMeta.icon;
                        const targetId = getTargetId(detailTarget);
                        const content = detailTarget.content || "Không có nội dung chi tiết.";
                        const artistName = getArtistDisplayName(detailTarget);

                        const detailRows = [
                            { label: "Loại thông báo", value: typeMeta.label },
                            { label: "Nguồn gửi", value: getSourceTypeLabel(detailTarget.sourceType) },
                            { label: "Người nhận", value: getReceiverTypeLabel(detailTarget.receiverType) },
                            { label: "Đối tượng", value: getTargetTypeLabel(detailTarget.targetType) },
                            { label: "Tên nội dung", value: detailTarget.targetName },
                            { label: "Nghệ sĩ", value: artistName },
                            { label: "Thời gian tạo", value: formatNotificationDate(detailTarget.createdAt) },
                        ]
                            .map((row) => ({ ...row, value: formatDetailValue(row.value) }))
                            .filter((row) => row.value);

                        return (
                            <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                                <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#181818] text-white shadow-2xl shadow-black/80">
                                    <div className="relative flex h-40 items-center justify-center bg-[#202020]">
                                        {detailTarget.thumbnail ? (
                                            <img
                                                src={detailTarget.thumbnail}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className={[
                                                    "flex h-20 w-20 items-center justify-center rounded-2xl",
                                                    typeMeta.iconWrap,
                                                ].join(" ")}
                                            >
                                                <Icon className="h-9 w-9" />
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setDetailTarget(null)}
                                            className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-neutral-200 transition hover:bg-black hover:text-white"
                                            aria-label="Đóng chi tiết thông báo"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="spotify-notification-scroll max-h-[calc(90vh-160px)] overflow-y-auto p-6">
                                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                                            <span>{typeMeta.label}</span>
                                            <span>•</span>
                                            <span>{getRelativeTime(detailTarget.createdAt)}</span>
                                        </div>

                                        <h3 className="mt-3 text-2xl font-black leading-8 text-white">
                                            {detailTarget.title || "Thông báo"}
                                        </h3>

                                        {detailTarget.targetName && (
                                            <p className="mt-2 text-base font-semibold text-neutral-200">
                                                {detailTarget.targetName}
                                            </p>
                                        )}

                                        <div className="mt-5 rounded-2xl bg-[#242424] p-4">
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                                                Nội dung
                                            </p>

                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-200">
                                                {content}
                                            </p>
                                        </div>

                                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                            {detailRows.map((row) => (
                                                <div
                                                    key={row.label}
                                                    className="rounded-2xl bg-white/[0.04] px-4 py-3"
                                                >
                                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                                                        {row.label}
                                                    </p>

                                                    <p className="mt-1 break-words text-sm font-semibold text-neutral-200">
                                                        {row.value}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-7 flex flex-wrap justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setDetailTarget(null)}
                                                className="rounded-full px-5 py-2 text-sm font-bold text-neutral-300 transition hover:bg-white/10 hover:text-white"
                                            >
                                                Đóng
                                            </button>

                                            {targetId && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => handleOpenTarget(event, detailTarget)}
                                                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:scale-[1.03] hover:bg-neutral-200"
                                                >
                                                    {detailTarget.targetType === "track" && (
                                                        <Play className="h-4 w-4 fill-current" />
                                                    )}
                                                    {detailTarget.targetType === "track"
                                                        ? "Phát bài hát"
                                                        : "Mở nội dung"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })(),
                    document.body
                )}

            {deleteTarget &&
                createPortal(
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 p-4">
                        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#181818] p-6 text-white shadow-2xl">
                            <h3 className="text-lg font-bold">Xóa thông báo?</h3>

                            <p className="mt-2 text-sm leading-5 text-neutral-400">
                                Thông báo này sẽ được ẩn khỏi danh sách của bạn.
                            </p>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(null)}
                                    className="rounded-full px-4 py-2 text-sm font-bold text-neutral-300 transition hover:bg-white/10 hover:text-white"
                                >
                                    Hủy
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:scale-[1.03] hover:bg-neutral-200"
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};

export default NotificationDropdown;
