import { useState, useEffect, useRef } from "react";
import { Bell, Settings, Circle, MessageSquare, Star, CreditCard, CheckCircle2, AlertTriangle } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { getMyNotificationsService } from "../../services/notificationService";
// 👇 1. Import cái Hook Socket ông vừa tạo
import { useSocket } from "../../hooks/useSocket"; 

const NotificationDropdown = () => {
    const { isDark } = useTheme();
    const { accessToken } = useAuth();
    const notiRef = useRef(null);

    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // 👇 2. Khởi tạo Socket qua 1 dòng code duy nhất
    const socket = useSocket(accessToken);

    const fetchInitialData = async () => {
        try {
            const data = await getMyNotificationsService({ page: 1, limit: 5 });
            setNotifications(data.notifications);
            setUnreadCount(data.meta?.unreadCount || 0);
        } catch (error) {
            console.error("Không thể tải thông báo cũ:", error);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    // 👇 3. Khối useEffect này giờ chỉ làm đúng nhiệm vụ Lắng nghe (Listen events)
    useEffect(() => {
        // Đợi đến khi hook useSocket khởi tạo xong instance thì mới lắng nghe
        if (!socket) return; 

        // -- HỨNG LÚC TẠO MỚI --
        socket.on("new_notification", (newNoti) => {
            setNotifications((prev) => [{ ...newNoti, isRead: false }, ...prev]);
            setUnreadCount((prev) => prev + 1);
        });

        // -- HỨNG LÚC CHỈNH SỬA --
        socket.on("update_notification", (updatedNoti) => {
            setNotifications((prev) =>
                prev.map((noti) => {
                    const isMatch = String(noti._id || noti.id) === String(updatedNoti._id || updatedNoti.id);
                    return isMatch ? { ...noti, ...updatedNoti } : noti;
                })
            );
        });

        // -- HỨNG LÚC ADMIN GỠ --
        socket.on("delete_notification", (deletedNoti) => {
            setNotifications((prev) =>
                prev.filter((noti) =>
                    String(noti._id || noti.id) !== String(deletedNoti._id || deletedNoti.id)
                )
            );
        });

        // Tắt bộ lắng nghe khi unmount để không bị lặp sự kiện (Duplicate listener)
        return () => {
            socket.off("new_notification");
            socket.off("update_notification");
            socket.off("delete_notification");
        };
    }, [socket]); // Chạy lại khi biến socket từ Hook trả ra thay đổi

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notiRef.current && !notiRef.current.contains(event.target)) {
                setIsNotiOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggleDropdown = () => {
        setIsNotiOpen((prev) => {
            const nextState = !prev;
            if (nextState) {
                setUnreadCount(0); 
                setNotifications((oldNotis) => oldNotis.map((noti) => ({ ...noti, isRead: true })));
            }
            return nextState;
        });
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case "new_release": return <Star size={14} className="text-amber-500" />;
            case "payment": return <CreditCard size={14} className="text-emerald-500" />;
            case "subscription": return <CheckCircle2 size={14} className="text-indigo-500" />;
            case "report": return <AlertTriangle size={14} className="text-rose-500" />;
            default: return <MessageSquare size={14} className="text-slate-400" />;
        }
    };

    return (
        <div className="relative shrink-0" ref={notiRef}>
            <button
                type="button"
                onClick={handleToggleDropdown}
                className={[
                    "relative flex h-9 w-9 items-center justify-center rounded-full border transition",
                    isDark ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#f7f1ea] hover:bg-[#241f28]" : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
                ].join(" ")}
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-sm animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isNotiOpen && (
                <div
                    className={[
                        "absolute right-0 top-full z-[100] mt-2 w-80 rounded-2xl border p-0 backdrop-blur-xl overflow-hidden shadow-xl",
                        isDark ? "border-[#f5b66f]/10 bg-[#151218]/95 text-[#f7f1ea]" : "border-[#e5e7eb] bg-white text-[#111111]",
                    ].join(" ")}
                >
                    <div className={["flex items-center justify-between px-4 py-3 border-b font-medium text-xs sm:text-sm", isDark ? "border-[#f5b66f]/10" : "border-[#f3f4f6]"].join(" ")}>
                        <span>Thông báo mới nhận</span>
                        <button type="button" className="text-slate-400 hover:text-slate-600 transition">
                            <Settings className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100/10">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-5 text-center space-y-4">
                                <div className={["flex h-12 w-12 items-center justify-center rounded-full", isDark ? "bg-[#1c1820] text-neutral-600" : "bg-slate-50 text-slate-300"].join(" ")}>
                                    <Bell className="h-6 w-6 stroke-[1.2]" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold tracking-tight">Thông báo của bạn hiển thị ở đây</p>
                                    <p className={["text-[10px] max-w-[200px] mx-auto", isDark ? "text-neutral-500" : "text-slate-400"].join(" ")}>
                                        Theo dõi hệ thống để nhận cập nhật mới.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            notifications.map((item) => (
                                <div key={item._id || item.id} className={`flex items-start gap-3 p-3.5 transition hover:bg-slate-50/5 relative ${!item.isRead ? "bg-blue-500/5" : ""}`}>
                                    {!item.isRead && <Circle size={5} fill="#2563eb" className="text-blue-600 absolute left-1.5 top-5 shrink-0" />}
                                    <div className="mt-0.5 shrink-0">{getTypeIcon(item.type)}</div>
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <p className={`text-xs tracking-tight line-clamp-1 ${!item.isRead ? "font-bold" : "font-medium"}`}>{item.title}</p>
                                        <p className={["text-[11px] leading-snug break-words line-clamp-2", isDark ? "text-neutral-400" : "text-slate-500"].join(" ")}>{item.content}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;