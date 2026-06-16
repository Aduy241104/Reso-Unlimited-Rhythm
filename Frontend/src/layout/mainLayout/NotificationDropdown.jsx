import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Bell, Settings, Circle, MessageSquare, Star, CreditCard, 
    CheckCircle2, AlertTriangle, Loader2, X, Calendar, Eye,
    Music, User, ListMusic, Sparkles, ArrowRight, ShieldCheck, HelpCircle, Layers
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { routePaths } from "../../routes/routePaths";
import { getMyNotificationsService, markNotificationAsReadService } from "../../services/notificationService";

const NotificationDropdown = () => {
    const { isDark } = useTheme();
    const { accessToken } = useAuth();
    const navigate = useNavigate();

    const socket = useSocket(accessToken);
    const notiRef = useRef(null);
    const scrollRef = useRef(null);

    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedDetailNoti, setSelectedDetailNoti] = useState(null);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const fetchNotifications = useCallback(async (currentPage, isLoadMore = false) => {
        try {
            if (isLoadMore) setIsLoadingMore(true);
            const data = await getMyNotificationsService({ page: currentPage, limit: 10 });

            setNotifications(prev =>
                isLoadMore ? [...prev, ...data.notifications] : data.notifications
            );

            setPage(currentPage);
            setHasMore(currentPage < (data.meta?.totalPages || 1));
            if (!isLoadMore) setUnreadCount(data.meta?.unreadCount || 0);
        } catch (error) {
            console.error("Không thể tải thông báo:", error);
        } finally {
            if (isLoadMore) setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications(1);
    }, [fetchNotifications]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop <= clientHeight + 50 && !isLoadingMore && hasMore) {
            fetchNotifications(page + 1, true);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notiRef.current && !notiRef.current.contains(event.target)) {
                setIsNotiOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on("new_notification", (newNoti) => {
            setNotifications((prev) => [{ ...newNoti, isRead: false }, ...prev]);
            setUnreadCount((prev) => prev + 1);
        });

        socket.on("update_notification", (updatedNoti) => {
            setNotifications((prev) =>
                prev.map((noti) => {
                    const isMatch = String(noti._id || noti.id) === String(updatedNoti._id || updatedNoti.id);
                    return isMatch ? { ...noti, ...updatedNoti } : noti;
                })
            );
        });

        socket.on("delete_notification", (deletedNoti) => {
            setNotifications((prev) =>
                prev.filter((noti) =>
                    String(noti._id || noti.id) !== String(deletedNoti._id || deletedNoti.id)
                )
            );
        });

        return () => {
            socket.off("new_notification");
            socket.off("update_notification");
            socket.off("delete_notification");
        };
    }, [socket]);

    const handleToggleDropdown = () => {
        setIsNotiOpen((prev) => !prev);
    };

    const handleNotificationClick = async (noti) => {
    const notiId = noti._id || noti.id;

    if (!noti.isRead) {
        setNotifications(prev =>
            prev.map(item => {
                const itemId = item._id || item.id;
                return String(itemId) === String(notiId) ? { ...item, isRead: true } : item;
            })
        );
        
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await markNotificationAsReadService(notiId);
        } catch (error) {
            console.error("Lỗi khi cập nhật trạng thái đã đọc:", error);
        }
    }

    setIsNotiOpen(false);
    setSelectedDetailNoti(noti);
};

    const handleExecuteDeepLink = () => {
        if (!selectedDetailNoti) return;
        const { targetType, targetId } = selectedDetailNoti;

        setSelectedDetailNoti(null);

        if (targetType && targetId) {
            switch (targetType) {
                case "track": navigate(`/track/${targetId}`); break;
                case "artist": navigate(`/artist/${targetId}`); break;
                case "playlist": navigate(`/playlist/${targetId}`); break;
                case "premium": navigate(routePaths.premium || "/premium"); break;
                default: break;
            }
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case "system": return <ShieldCheck size={16} className="text-blue-500" />;
            case "new_release": return <Star size={16} className="text-amber-500" fill="currentColor" />;
            case "payment": return <CreditCard size={16} className="text-emerald-500" />;
            case "subscription": return <CheckCircle2 size={16} className="text-indigo-500" />;
            case "report": return <AlertTriangle size={16} className="text-rose-500" />;
            default: return <MessageSquare size={16} className="text-slate-400" />;
        }
    };

    const getTypeName = (type) => {
        switch (type) {
            case "system": return { label: "Hệ thống", style: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
            case "new_release": return { label: "Phát hành mới", style: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
            case "payment": return { label: "Thanh toán", style: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
            case "subscription": return { label: "Gói dịch vụ", style: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" };
            case "report": return { label: "Báo cáo vụ việc", style: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
            default: return { label: "Thông báo", style: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
        }
    };

    const getTargetDetails = (type) => {
        switch (type) {
            case "track": return { label: "Bài hát đính kèm", btnText: "Nghe nhạc ngay", icon: <Music size={15} /> };
            case "artist": return { label: "Hồ sơ nghệ sĩ", btnText: "Xem nghệ sĩ", icon: <User size={15} /> };
            case "playlist": return { label: "Danh sách phát", btnText: "Khám phá Playlist", icon: <ListMusic size={15} /> };
            case "premium": return { label: "Ưu đãi Premium", btnText: "Nâng cấp ngay", icon: <Sparkles size={15} /> };
            default: return { label: "Liên kết đính kèm", btnText: "Xem chi tiết", icon: <ArrowRight size={15} /> };
        }
    };

    const getReceiverTypeLabel = (receiverType) => {
        switch(receiverType) {
            case "all": return { label: "Toàn sàn", style: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
            case "group": return { label: "Nhóm đối tượng", style: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" };
            case "single": return { label: "Cá nhân", style: "bg-pink-500/10 text-pink-500 border-pink-500/20" };
            default: return null;
        }
    };

    return (
        <>
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

                        <div
                            className="max-h-64 overflow-y-auto divide-y divide-slate-100/10 custom-scrollbar"
                            onScroll={handleScroll}
                            ref={scrollRef}
                        >
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
                                <>
                                    {notifications.map((item) => (
                                        <div
                                            key={item._id || item.id}
                                            onClick={() => handleNotificationClick(item)}
                                            className={`flex items-start gap-3 p-3.5 transition hover:bg-slate-500/10 relative cursor-pointer ${!item.isRead ? "bg-blue-500/5" : ""}`}
                                        >
                                            {!item.isRead && <Circle size={5} fill="#2563eb" className="text-blue-600 absolute left-1.5 top-5 shrink-0" />}
                                            <div className="mt-0.5 shrink-0">{getTypeIcon(item.type)}</div>
                                            <div className="space-y-0.5 min-w-0 flex-1">
                                                <p className={`text-xs tracking-tight line-clamp-1 ${!item.isRead ? "font-bold" : "font-medium"}`}>{item.title || item.message || "Không có tiêu đề"}</p>
                                                <p className={["text-[11px] leading-snug break-words line-clamp-2", isDark ? "text-neutral-400" : "text-slate-500"].join(" ")}>{item.content || "Bấm để xem chi tiết thông báo."}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {isLoadingMore && (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                        </div>
                                    )}
                                    {!hasMore && notifications.length > 0 && (
                                        <div className="text-center py-3 text-[10px] text-slate-400 font-medium">
                                            Đã tải hết thông báo
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* FIXED PREMIUM CENTERED DETAIL MODAL */}
            {/* ======================================================== */}
            {selectedDetailNoti && (() => {
                const typeMeta = getTypeName(selectedDetailNoti.type);
                const targetMeta = selectedDetailNoti.targetType ? getTargetDetails(selectedDetailNoti.targetType) : null;
                const receiverMeta = getReceiverTypeLabel(selectedDetailNoti.receiverType || selectedDetailNoti.mechanism);

                return (
                    <div className="fixed !inset-0 !left-0 !top-0 !w-screen !h-screen z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                        <div 
                            className={[
                                "w-full max-w-lg rounded-[32px] p-6 md:p-8 shadow-2xl border transform transition-all duration-300 ease-out animate-in zoom-in-95 text-left relative",
                                isDark ? "bg-[#1c1820] text-[#f7f1ea] border-[#f5b66f]/10 shadow-black/80" : "bg-white text-[#111111] border-slate-100 shadow-slate-300/50"
                            ].join(" ")}
                        >
                            {/* Nút tắt Modal góc phải trên cao */}
                            <button 
                                onClick={() => setSelectedDetailNoti(null)} 
                                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-rose-500 bg-slate-500/5 hover:bg-rose-500/10 rounded-full transition-all"
                            >
                                <X size={18} />
                            </button>

                            {/* Khối Badges phân loại chiến dịch */}
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                <span className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full border flex items-center gap-1.5 ${typeMeta.style}`}>
                                    {getTypeIcon(selectedDetailNoti.type)}
                                    {typeMeta.label}
                                </span>
                                {receiverMeta && (
                                    <span className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full border flex items-center gap-1 ${receiverMeta.style}`}>
                                        <Layers size={10} />
                                        {receiverMeta.label}
                                    </span>
                                )}
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                                    <Eye size={11} /> Hệ thống đã ghi nhận đọc
                                </span>
                            </div>

                            {/* Tiêu đề chính lớn */}
                            <div className="border-b pb-4 border-slate-500/10">
                                <h3 className="text-lg md:text-xl font-black leading-snug tracking-tight pr-8">
                                    {selectedDetailNoti.title || selectedDetailNoti.message || "Chi tiết thông báo"}
                                </h3>
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                    <Calendar size={13} className="opacity-70" />
                                    <span>Thời gian phát hành:</span>
                                    <span className={isDark ? "text-slate-200" : "text-slate-700"}>
                                        {new Date(selectedDetailNoti.createdAt || Date.now()).toLocaleString("vi-VN", {
                                            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>

                            {/* Nội dung chi tiết văn bản */}
                            <div className="mt-5 space-y-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Chuỗi nội dung chi tiết (Message string)</label>
                                <div 
                                    className={[
                                        "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar font-medium border",
                                        isDark ? "bg-[#151218]/60 text-slate-300 border-white/5" : "bg-slate-50 text-slate-600 border-slate-100"
                                    ].join(" ")}
                                >
                                    {selectedDetailNoti.content || "Không có dữ liệu văn bản chi tiết kèm theo cho bản ghi này."}
                                </div>
                            </div>

                            {/* Card đính kèm Deeplink chuyên nghiệp */}
                            {targetMeta && (
                                <div 
                                    className={[
                                        "mt-5 p-4 rounded-2xl border flex items-center justify-between transition-all",
                                        isDark ? "bg-[#241f28]/50 border-[#f5b66f]/5" : "bg-blue-50/30 border-blue-100/50"
                                    ].join(" ")}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                                            {targetMeta.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Nội dung đính kèm</p>
                                            <p className="text-xs font-bold truncate mt-0.5 opacity-90">ID: {selectedDetailNoti.targetName}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-lg shrink-0">
                                        {targetMeta.label}
                                    </span>
                                </div>
                            )}


                            {/* Khối nút hành động */}
                            <div className="mt-6 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setSelectedDetailNoti(null)}
                                    className={[
                                        "px-5 py-2.5 text-xs font-bold rounded-xl transition-all border",
                                        isDark 
                                            ? "border-neutral-700 text-neutral-400 hover:bg-white/5 hover:text-[#f7f1ea]" 
                                            : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                    ].join(" ")}
                                >
                                    Đóng cửa sổ
                                </button>

                                {targetMeta && (
                                    <button
                                        onClick={handleExecuteDeepLink}
                                        className="px-5 py-2.5 text-xs font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/10 hover:shadow-lg transition-all flex items-center gap-1.5 group"
                                    >
                                        <span>{targetMeta.btnText}</span>
                                        <div className="transform group-hover:translate-x-0.5 transition-transform">
                                            {targetMeta.icon}
                                        </div>
                                    </button>
                                )}
                            </div>

                        </div>
                    </div>
                );
            })()}
        </>
    );
};

export default NotificationDropdown;