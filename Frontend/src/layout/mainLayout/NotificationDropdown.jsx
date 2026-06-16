import { useState, useEffect, useRef } from "react";
import { Bell, Settings, Circle, MessageSquare, Star, CreditCard, CheckCircle2, AlertTriangle } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { io } from "socket.io-client";
import { useAuth } from "../../hooks/useAuth"; 
import { getMyNotificationsService } from "../../services/notificationService";

const NotificationDropdown = () => {
    const { isDark } = useTheme();
    const { accessToken } = useAuth(); 
    const notiRef = useRef(null);

    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [notifications, setNotifications] = useState([]); 
    const [unreadCount, setUnreadCount] = useState(0);      

    useEffect(() => {
        if (!accessToken) return;

        console.log("🟢 [Socket] Phát hiện AccessToken hợp lệ, tiến hành thông mạch...");

        const socket = io("http://localhost:8080", {
            auth: { token: accessToken } 
        });

        socket.on("connect", () => {
            console.log("🟢 [Socket] KẾT NỐI THÀNH CÔNG! ID máy socket:", socket.id);
        });

        socket.on("connect_error", (err) => {
            console.error("🔴 [Socket] LỖI KẾT NỐI VÌ:", err.message);
        });

        socket.on("new_notification", (newNoti) => {
            console.log("🔥 [Socket] NHẬN ĐƯỢC TIN NHẮN REALTIME MỚI TINH:", newNoti);
            setNotifications((prev) => [
                { ...newNoti, isRead: false },
                ...prev
            ]);
            setUnreadCount((prev) => prev + 1);
        });

        return () => {
            socket.off("new_notification");
            socket.disconnect();
        };
    }, [accessToken]); 

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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notiRef.current && !notiRef.current.contains(event.target)) {
                setIsNotiOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 👇 HÀM XỬ LÝ ĐÓNG MỞ VÀ XÓA SỐ BADGE KHI XEM THÔNG BÁO
    const handleToggleDropdown = () => {
        setIsNotiOpen((prev) => {
            const nextState = !prev;
            
            // Khi người dùng bấm MỞ khay thông báo ra xem
            if (nextState) {
                setUnreadCount(0); // 1. Xóa ngay lập tức số lượng chấm đỏ trên nút chuông
                
                // 2. Tự động chuyển toàn bộ tin đang hiển thị thành "Đã đọc" trên giao diện cho đẹp
                setNotifications((oldNotis) => 
                    oldNotis.map((noti) => ({ ...noti, isRead: true }))
                );

                // 💡 GỢI Ý THÊM: Nếu sau này ông có viết API để update "Đã đọc" vào Database 
                // thì ông chèn gọi hàm Service ở đây luôn để khi F5 không bị hiện lại số:
                // try { await markAllAsReadService(); } catch(e) {}
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
            {/* NÚT BẤM CHUÔNG */}
            <button
                type="button"
                onClick={handleToggleDropdown} // 👇 Đổi từ set mở trực tiếp sang gọi hàm xử lý chung ở trên
                className={[
                    "relative flex h-9 w-9 items-center justify-center rounded-full border transition",
                    isDark
                        ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#f7f1ea] hover:bg-[#241f28]"
                        : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
                ].join(" ")}
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-sm animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* KHAY DROPDOWN THÔNG BÁO ĐỔ XUỐNG */}
            {isNotiOpen && (
                <div
                    className={[
                        "absolute right-0 top-full z-[100] mt-2 w-80 rounded-2xl border p-0 backdrop-blur-xl overflow-hidden shadow-xl",
                        isDark
                            ? "border-[#f5b66f]/10 bg-[#151218]/95 text-[#f7f1ea]"
                            : "border-[#e5e7eb] bg-white text-[#111111]",
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
                                <div
                                    key={item._id}
                                    className={`flex items-start gap-3 p-3.5 transition hover:bg-slate-50/5 relative ${!item.isRead ? "bg-blue-500/5" : ""}`}
                                >
                                    {!item.isRead && (
                                        <Circle size={5} fill="#2563eb" className="text-blue-600 absolute left-1.5 top-5 shrink-0" />
                                    )}

                                    <div className="mt-0.5 shrink-0">
                                        {getTypeIcon(item.type)}
                                    </div>

                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <p className={`text-xs tracking-tight line-clamp-1 ${!item.isRead ? "font-bold" : "font-medium"}`}>
                                            {item.title}
                                        </p>
                                        <p className={["text-[11px] leading-snug break-words line-clamp-2", isDark ? "text-neutral-400" : "text-slate-500"].join(" ")}>
                                            {item.content}
                                        </p>
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