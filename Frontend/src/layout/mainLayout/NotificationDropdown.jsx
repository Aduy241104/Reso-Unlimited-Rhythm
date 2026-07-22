import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { routePaths } from "../../routes/routePaths";
import { getMyNotificationsService } from "../../services/notificationService";

const NotificationDropdown = () => {
    const { accessToken } = useAuth();
    const socket = useSocket(accessToken);
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);
    const isNotificationsPage = location.pathname === routePaths.notifications;

    const fetchUnreadCount = useCallback(async () => {
        try {
            const data = await getMyNotificationsService({ page: 1, limit: 1 });
            setUnreadCount(data.meta?.unreadCount || 0);
        } catch (error) {
            console.error("Không thể tải số thông báo chưa đọc:", error);
        }
    }, []);

    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    useEffect(() => {
        if (!socket) return undefined;

        const handleNewNotification = () => {
            setUnreadCount((prev) => prev + 1);
        };

        const handleUpdateNotification = () => {
            fetchUnreadCount();
        };

        const handleDeleteNotification = () => {
            fetchUnreadCount();
        };

        socket.on("new_notification", handleNewNotification);
        socket.on("update_notification", handleUpdateNotification);
        socket.on("delete_notification", handleDeleteNotification);

        return () => {
            socket.off("new_notification", handleNewNotification);
            socket.off("update_notification", handleUpdateNotification);
            socket.off("delete_notification", handleDeleteNotification);
        };
    }, [fetchUnreadCount, socket]);

    useEffect(() => {
        const handleUnreadDelta = (event) => {
            const delta = Number(event.detail?.delta || 0);
            if (!delta) return;
            setUnreadCount((prev) => Math.max(0, prev + delta));
        };

        window.addEventListener("notifications:unread-delta", handleUnreadDelta);

        return () => {
            window.removeEventListener("notifications:unread-delta", handleUnreadDelta);
        };
    }, []);

    const handleBellClick = () => {
        if (isNotificationsPage) {
            if (window.history.length > 1) {
                navigate(-1);
                return;
            }

            navigate(routePaths.home, { replace: true });
            return;
        }

        navigate(routePaths.notifications);
    };

    return (
        <button
            type="button"
            onClick={handleBellClick}
            className={[
                "relative z-[60] inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10 sm:h-10 sm:w-10",
                isNotificationsPage ? "bg-white/10 text-white" : "text-neutral-200",
            ].join(" ")}
            aria-label="Thông báo"
            aria-current={isNotificationsPage ? "page" : undefined}
        >
            <Bell className="h-5 w-5" />

            {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1db954] px-1 text-[11px] font-black leading-none text-black shadow-lg shadow-[#1db954]/30">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </button>
    );
};

export default NotificationDropdown;
