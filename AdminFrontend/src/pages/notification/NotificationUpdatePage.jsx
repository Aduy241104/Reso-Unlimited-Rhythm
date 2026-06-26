import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ArrowLeft, Save, Loader2, Info, Settings, ShieldCheck,
    Search, X, Music, Disc, User2, AlertCircle
} from "lucide-react";
import { getAdminNotificationDetailService, updateAdminNotificationService } from "../../services/notificationService";
import { searchAdminArtistsService } from "../../services/artistService";
import { searchAdminTracksService } from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";

const NotificationUpdatePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // States dữ liệu Form
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [type, setType] = useState("system");
    const [receiverInfo, setReceiverInfo] = useState("");

    // States điều hướng thực thể (Deep Linking) giống Create
    const [targetType, setTargetType] = useState("");
    const [targetId, setTargetId] = useState("");
    const [selectedEntity, setSelectedEntity] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // States trạng thái quy trình
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState("");
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 1. Trích xuất dữ liệu gốc và hiển thị thực thể đã chọn nếu có
    useEffect(() => {
        const fetchOriginalNotification = async () => {
            try {
                const response = await getAdminNotificationDetailService(id);
                const noti = response?.notification || response;

                if (noti) {
                    setTitle(noti.title || "");
                    setContent(noti.content || "");
                    setType(noti.type || "system");
                    setTargetType(noti.targetType || "");
                    setTargetId(noti.targetId || "");

                    // Hiển thị text đối tượng nhận (Read-only vì bản ghi cũ bất biến đối tượng)
                    const receiverStr = noti.receiverType === "all" ? "📢 Tất cả người dùng" :
                        noti.receiverType === "group" ? `👥 Nhóm người dùng: ${noti.targetRoles?.join(", ")}` :
                            `🎯 Gửi đích danh một tài khoản: ${noti.userId?.email || "User"}`;
                    setReceiverInfo(receiverStr);

                    // Khởi tạo thực thể hiển thị ban đầu nếu có liên kết điều hướng
                    if (noti.targetType && noti.targetId) {
                        setSelectedEntity({
                            id: noti.targetId,
                            name: noti.targetType === "track" ? "Bài hát liên kết gốc" : "Nghệ sĩ liên kết gốc",
                            avatar: ""
                        });
                    }
                }
            } catch (error) {
                toast.error("Không thể trích xuất dữ liệu gốc của thông báo.");
                navigate(routePaths.notifications);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) void fetchOriginalNotification();
    }, [id, navigate]);

    // 2. ⚡ DEBOUNCE EFFECT: Truy vấn thực thể điều hướng y hệt trang Create
    useEffect(() => {
        if (!searchQuery.trim() || !targetType) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                let results = [];
                const searchParams = { q: searchQuery, limit: 5 };

                switch (targetType) {
                    case "artist":
                        const resArtist = await searchAdminArtistsService(searchParams);
                        results = (resArtist?.artists || []).map(a => ({
                            id: a.id,
                            name: a.name,
                            avatar: a.avatar || "",
                        }));
                        break;
                    case "track":
                        const resTrack = await searchAdminTracksService(searchParams);
                        results = (resTrack?.tracks || resTrack?.data || []).map(t => ({
                            id: t.id || t._id,
                            name: t.title || t.name,
                            avatar: t.cover || t.avatar || "",
                        }));
                        break;
                    default:
                        break;
                }

                setSearchResults(results);
                setShowDropdown(true);
            } catch (err) {
                console.error("Lỗi khi fetch thực thể liên kết thông báo:", err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, targetType]);

    const handleTargetTypeChange = (e) => {
        setTargetType(e.target.value);
        setTargetId("");
        setSelectedEntity(null);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleSelectEntity = (entity) => {
        setTargetId(entity.id);
        setSelectedEntity(entity);
        setShowDropdown(false);
        setSearchQuery("");
    };

    const handleClearSelectedEntity = () => {
        setTargetId("");
        setSelectedEntity(null);
    };

    const handleSubmitValidation = (e) => {
        e.preventDefault();
        setMessage("");
        setIsConfirmModalOpen(true);
    };

    // 🛠️ ĐÃ FIX SẠCH LỖI SYNTAX Ở ĐÂY
    const handleExecuteUpdate = async () => {
        setIsUpdating(true);
        const payload = {
            title: title.trim(),
            content: content.trim(),
            type,
            targetType: targetType || "",
            targetId: targetId || ""
        };

        try {
            await updateAdminNotificationService(id, payload);
            toast.success("Cập nhật dữ liệu thông báo thành công!");
            setIsConfirmModalOpen(false);
            navigate(`${routePaths.notifications}/${id}`, { replace: true });
        } catch (error) {
            setMessage(error?.response?.data?.message || error?.message || "Không thể cập nhật cấu hình.");
            setIsConfirmModalOpen(false);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-3 bg-[#f8fafc]">
                <Loader2 className="h-8 w-8 text-slate-900 animate-spin stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải cấu hình gốc thông báo...</p>
            </div>
        );
    }

    return (
        <section className="mx-auto max-w-5xl space-y-6 p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-800 antialiased">

            {/* HEADER BAR */}
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between border border-slate-100">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Quản lý thông báo</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Cập nhật thông báo</h1>
                    <p className="mt-1 text-xs text-slate-400">Chỉnh sửa nội dung thông điệp phát hành và cấu hình định tuyến hệ thống.</p>
                </div>
                <Link
                    to={routePaths.notifications || "#"}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 self-start md:self-center"
                >
                    <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Quay lại danh sách
                </Link>
            </div>

            {/* FORM CARD */}
            <form onSubmit={handleSubmitValidation} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-5">

                {message && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 shadow-sm animate-fade-in">
                        <span>{message}</span>
                    </div>
                )}

                {/* Ô Select phân loại & đối tượng nhận hàng ngang */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phân loại thông báo</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            disabled={isUpdating}
                            className="w-full h-[42px] rounded-xl bg-slate-50/50 border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 outline-none cursor-pointer focus:border-slate-400 focus:bg-white transition"
                        >
                            <option value="system">⚙️ Hệ thống</option>
                            <option value="new_release">🎵 Phát hành mới</option>
                            <option value="payment">💳 Thanh toán</option>
                            <option value="subscription">⭐ Gói cước</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đối tượng đích nhận tin (Cố định)</label>
                        <div className="w-full h-[42px] flex items-center rounded-xl bg-slate-100 border border-slate-200 px-4 text-xs font-bold text-slate-500 select-none">
                            {receiverInfo}
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiêu đề thông báo</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Nhập tiêu đề thông báo chỉnh sửa..."
                        required
                        disabled={isUpdating}
                        className="w-full h-[42px] rounded-xl bg-slate-50/50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition font-medium"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nội dung chi tiết</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={4}
                        placeholder="Nhập chuỗi văn bản thông báo chỉnh sửa..."
                        required
                        disabled={isUpdating}
                        className="w-full rounded-xl bg-slate-50/50 border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition resize-none font-medium"
                    />
                </div>

                {/* TARGET LINK ENTITY BOX */}
                <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3.5" ref={dropdownRef}>
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <AlertCircle size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Hành vi điều hướng khi nhấn vào thông báo (Tùy chọn)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Điều hướng đến:</label>
                            <select
                                value={targetType}
                                onChange={handleTargetTypeChange}
                                disabled={isUpdating}
                                className="w-full h-[38px] rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-slate-400 transition"
                            >
                                <option value="">Không liên kết (Chỉ đọc)</option>
                                <option value="track">🎵 Bài hát</option>
                                <option value="artist">👨‍🎤 Hồ sơ Nghệ sĩ</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2 space-y-1.5 relative">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Tìm kiếm dữ liệu hệ thống:</label>

                            {!selectedEntity ? (
                                <div className="relative">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        disabled={!targetType || isUpdating}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => targetType && searchQuery && setShowDropdown(true)}
                                        placeholder={targetType ? `Nhập tên để truy vấn dữ liệu ${targetType}...` : "Chọn mục điều hướng trước để mở khóa tìm kiếm..."}
                                        className="w-full h-[38px] rounded-xl bg-white border border-slate-200 pl-9 pr-8 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 transition disabled:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                                    />
                                    {isSearching && (
                                        <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-900 animate-spin" />
                                    )}
                                </div>
                            ) : (
                                <div className="flex h-[38px] items-center justify-between gap-3 border border-slate-200 bg-white rounded-xl px-3 shadow-sm animate-fade-in">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {selectedEntity.avatar ? (
                                            <img src={selectedEntity.avatar} alt="" className="h-5 w-5 rounded-md object-cover border border-slate-100" />
                                        ) : (
                                            <div className="h-5 w-5 rounded-md bg-slate-900 flex items-center justify-center text-white">
                                                {targetType === "track" ? <Music size={10} /> : <User2 size={10} />}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex items-baseline gap-1.5">
                                            <p className="text-xs font-bold text-slate-900 truncate">{selectedEntity.name}</p>
                                            <p className="text-[9px] font-mono text-slate-400 truncate">(ID: {selectedEntity.id})</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleClearSelectedEntity} disabled={isUpdating} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-600 transition">
                                        <X size={12} />
                                    </button>
                                </div>
                            )}

                            {showDropdown && searchResults.length > 0 && (
                                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100 overflow-hidden">
                                    {searchResults.map((entity) => (
                                        <button
                                            key={entity.id}
                                            type="button"
                                            onClick={() => handleSelectEntity(entity)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50/80 transition cursor-pointer"
                                        >
                                            {entity.avatar ? (
                                                <img src={entity.avatar} alt="" className="h-6 w-6 rounded-md object-cover" />
                                            ) : (
                                                <div className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                                                    {targetType === "track" ? <Music size={12} /> : <User2 size={12} />}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-900 truncate">{entity.name}</p>
                                                <p className="text-[9px] text-slate-400 font-mono truncate">{entity.id}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showDropdown && searchResults.length === 0 && searchQuery && !isSearching && (
                                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl p-3.5 text-center text-xs font-medium text-slate-400 shadow-xl">
                                    Không tìm thấy dữ liệu phù hợp trong hệ thống.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ACTIONS FOOTER */}
                <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-50">
                    <button
                        type="submit"
                        disabled={isUpdating || !title.trim() || !content.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isUpdating ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang cập nhật...</>
                        ) : (
                            <><Save className="h-3.5 w-3.5" /> Lưu cấu hình</>
                        )}
                    </button>
                    <Link
                        to={`${routePaths.notifications}/${id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        Hủy bỏ
                    </Link>
                </div>
            </form>

            {/* ================= MODAL XÁC NHẬN CẬP NHẬT REALTIME SYSTEM ================= */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-2 text-blue-600">
                            <ShieldCheck size={20} />
                            <h2 className="text-base font-bold">Xác nhận sửa dữ liệu</h2>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Mọi thay đổi về nội dung sẽ lập tức đồng bộ thời gian thực qua Socket đến các thiết bị đang lưu giữ thông báo này.
                        </p>
                        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={isUpdating}
                                onClick={handleExecuteUpdate}
                                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                            >
                                {isUpdating ? "Đang lưu..." : "Xác nhận cập nhật"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default NotificationUpdatePage;
