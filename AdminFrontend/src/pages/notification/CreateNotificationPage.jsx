import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Send, Search, X, Music, Disc, User2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { createAdminNotificationService } from "../../services/notificationService";
import { searchAdminArtistsService } from "../../services/artistService";
import { searchAdminTracksService } from "../../services/trackService"; 
// import { searchAdminPlaylistsService } from "../../services/playlistService";
// Đổi lại path route tương ứng của bạn nếu có thiết lập sẵn hệ thống routePaths 👇
import { routePaths } from "../../routes/routePaths"; 

const CreateNotificationPage = () => {
    // State quản lý Form chính
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [type, setType] = useState("system");
    const [receiverType, setReceiverType] = useState("all");
    const [specificUserId, setSpecificUserId] = useState("");
    const [groupRole, setGroupRole] = useState("user");
    
    // State quản lý Liên kết thực thể (Target Entity)
    const [targetType, setTargetType] = useState("");
    const [targetId, setTargetId] = useState("");
    const [selectedEntity, setSelectedEntity] = useState(null);

    // State phục vụ Autocomplete Tìm kiếm từ xa
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", status: "" });

    // Xử lý đóng dropdown khi click chuột ra ngoài vùng tìm kiếm
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Thực thi tìm kiếm Real-time gọi thẳng vào API hệ thống (Debounce 400ms)
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
                        if (typeof searchAdminArtistsService === "function") {
                            const res = await searchAdminArtistsService(searchParams);
                            results = (res?.artists || []).map(a => ({
                                id: a.id,
                                name: a.name,
                                avatar: a.avatar || "",
                            }));
                        }
                        break;
                        
                    case "track":
                        if (typeof searchAdminTracksService === "function") {
                            const res = await searchAdminTracksService(searchParams);
                            results = (res?.tracks || res?.data || []).map(t => ({
                                id: t.id || t._id,
                                name: t.title || t.name,
                                avatar: t.cover || t.avatar || "",
                            }));
                        }
                        break;

                    case "playlist":
                        if (typeof searchAdminPlaylistsService === "function") {
                            const res = await searchAdminPlaylistsService(searchParams);
                            results = (res?.playlists || res?.data || []).map(p => ({
                                id: p.id || p._id,
                                name: p.title || p.name,
                                avatar: p.coverImage || p.thumbnail || "",
                            }));
                        }
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

    // Reset sạch dữ liệu cũ khi Admin đổi loại liên kết điều hướng
    const handleTargetTypeChange = (e) => {
        setTargetType(e.target.value);
        setTargetId("");
        setSelectedEntity(null);
        setSearchQuery("");
        setSearchResults([]);
    };

    // Khi chọn thành công thực thể trong dropdown gợi ý
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ text: "", status: "" });

        const payload = {
            title: title.trim(),
            content: content.trim(),
            type,
            receiverType,
            ...(receiverType === "single" && { specificUserId }),
            ...(receiverType === "group" && { groupRole }),
            ...(targetId && { targetId, targetType })
        };

        try {
            await createAdminNotificationService(payload);
            setMessage({ text: "Tạo và phát hành thông báo thành công!", status: "success" });
            
            // Dọn dẹp form sau khi gửi thành công
            setTitle("");
            setContent("");
            setSpecificUserId("");
            setTargetId("");
            setTargetType("");
            setSelectedEntity(null);
        } catch (error) {
            setMessage({ 
                text: error?.response?.data?.message || error?.message || "Không thể phát hành thông báo này.", 
                status: "error" 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="mx-auto max-w-5xl space-y-6 p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-800 antialiased">
            
            {/* HEADER BAR */}
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between border border-slate-100">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notification Operations</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Push Notifications</h1>
                    <p className="mt-1 text-xs text-slate-400">Khởi tạo và phát hành thông tin thông báo, điều hướng thời gian thực đến người dùng.</p>
                </div>
                <Link
                    to={routePaths.notifications || "#"}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 self-start md:self-center"
                >
                    <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Quay lại danh sách
                </Link>
            </div>

            {/* FORM CARD */}
            <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-5">
                
                {/* Alert thông báo kết quả */}
                {message.text && (
                    <div className={`rounded-xl border px-4 py-3 text-xs font-bold shadow-sm transition-all ${
                        message.status === "success" 
                            ? "border-emerald-100 bg-emerald-50/60 text-emerald-700" 
                            : "border-rose-100 bg-rose-50 text-rose-600"
                    }`}>
                        <span>{message.text}</span>
                    </div>
                )}

                {/* Phân loại & Đối tượng nhận */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phân loại thông báo</label>
                        <select 
                            value={type} 
                            onChange={(e) => setType(e.target.value)} 
                            disabled={isLoading}
                            className="w-full h-[42px] rounded-xl bg-slate-50/50 border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 outline-none cursor-pointer focus:border-slate-400 focus:bg-white transition"
                        >
                            <option value="system">⚙️ Hệ thống (System)</option>
                            <option value="new_release">🎵 Phát hành mới (New Release)</option>
                            <option value="payment">💳 Thanh toán (Payment)</option>
                            <option value="subscription">⭐ Gói cước (Subscription)</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đối tượng đích nhận tin</label>
                        <select 
                            value={receiverType} 
                            onChange={(e) => setReceiverType(e.target.value)} 
                            disabled={isLoading}
                            className="w-full h-[42px] rounded-xl bg-slate-50/50 border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 outline-none cursor-pointer focus:border-slate-400 focus:bg-white transition"
                        >
                            <option value="all">📢 Tất cả mọi người (Broadcast)</option>
                            <option value="group">👥 Gửi theo nhóm phân quyền (Group)</option>
                            <option value="single">🎯 Gửi đích danh một tài khoản (Single)</option>
                        </select>
                    </div>
                </div>

                {/* Xử lý hiển thị trường tùy biến theo receiverType */}
                {receiverType === "single" && (
                    <div className="p-4 bg-slate-50/40 border border-slate-100 rounded-xl space-y-1.5 animate-fadeIn">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mã tài khoản người nhận (User ID)</label>
                        <input 
                            type="text" 
                            value={specificUserId} 
                            onChange={(e) => setSpecificUserId(e.target.value)} 
                            placeholder="Nhập chuỗi User ID nhận thông báo..." 
                            required 
                            disabled={isLoading}
                            className="w-full h-[42px] rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-slate-400 transition" 
                        />
                    </div>
                )}

                {receiverType === "group" && (
                    <div className="p-4 bg-slate-50/40 border border-slate-100 rounded-xl space-y-2 animate-fadeIn">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chọn nhóm tài khoản nhận thông báo</label>
                        <div className="flex gap-4">
                            {["user", "artist"].map((role) => (
                                <label key={role} className={`flex-1 flex items-center justify-center gap-2 border rounded-xl h-[42px] px-4 text-xs font-bold capitalize cursor-pointer transition select-none ${
                                    groupRole === role 
                                        ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}>
                                    <input type="radio" name="groupRole" value={role} checked={groupRole === role} onChange={() => setGroupRole(role)} disabled={isLoading} className="hidden" />
                                    {role === "user" ? <User2 size={14} /> : <Music size={14} />}
                                    Thành viên {role}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tiêu đề & Nội dung */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiêu đề thông báo</label>
                    <input 
                        type="text" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        placeholder="Nhập tiêu đề thông báo chính thức..." 
                        required 
                        disabled={isLoading}
                        className="w-full h-[42px] rounded-xl bg-slate-50/50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition font-medium" 
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nội dung chi tiết</label>
                    <textarea 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                        rows={4} 
                        placeholder="Nhập nội dung thông tin truyền tải chi tiết đến người dùng..." 
                        required 
                        disabled={isLoading}
                        className="w-full rounded-xl bg-slate-50/50 border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition resize-none font-medium" 
                    />
                </div>

                {/* KHU VỰC LIÊN KẾT THỰC THỂ THỰC TẾ (TARGET LINK) */}
                <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3.5">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <AlertCircle size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Hành vi điều hướng khi nhấn vào thông báo (Tùy chọn)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Lựa chọn loại thực thể */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Điều hướng đến:</label>
                            <select 
                                value={targetType} 
                                onChange={handleTargetTypeChange} 
                                disabled={isLoading}
                                className="w-full h-[38px] rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-slate-400 transition"
                            >
                                <option value="">Không liên kết (Chỉ đọc)</option>
                                <option value="track">🎵 Bài hát (Track)</option>
                                <option value="playlist">💿 Playlist hệ thống</option>
                                <option value="artist">👨‍🎤 Hồ sơ Nghệ sĩ</option>
                            </select>
                        </div>

                        {/* Ô tìm kiếm thông minh từ xa */}
                        <div className="sm:col-span-2 space-y-1.5 relative" ref={dropdownRef}>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Tìm kiếm dữ liệu hệ thống:</label>
                            
                            {!selectedEntity ? (
                                <div className="relative">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        disabled={!targetType || isLoading}
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
                                /* Thẻ hiển thị thực thể đã chọn */
                                <div className="flex h-[38px] items-center justify-between gap-3 border border-slate-200 bg-white rounded-xl px-3 shadow-sm animate-fade-in">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {selectedEntity.avatar ? (
                                            <img src={selectedEntity.avatar} alt="" className="h-5 w-5 rounded-md object-cover border border-slate-100" />
                                        ) : (
                                            <div className="h-5 w-5 rounded-md bg-slate-900 flex items-center justify-center text-white">
                                                {targetType === "track" ? <Music size={10} /> : targetType === "playlist" ? <Disc size={10} /> : <User2 size={10} />}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex items-baseline gap-1.5">
                                            <p className="text-xs font-bold text-slate-900 truncate">{selectedEntity.name}</p>
                                            <p className="text-[9px] font-mono text-slate-400 truncate">(ID: {selectedEntity.id})</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleClearSelectedEntity} disabled={isLoading} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-600 transition">
                                        <X size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Dropdown gợi ý kết quả truy xuất */}
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
                                                    {targetType === "track" ? <Music size={12} /> : targetType === "playlist" ? <Disc size={12} /> : <User2 size={12} />}
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

                            {/* Trạng thái không tìm thấy thực thể */}
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
                        disabled={isLoading || !title.trim() || !content.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isLoading ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang phát hành...</>
                        ) : (
                            <><Send className="h-3.5 w-3.5" /> Phát thông báo</>
                        )}
                    </button>
                    <Link
                        to={routePaths.notifications || "#"}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        Hủy bỏ
                    </Link>
                </div>
            </form>
        </section>
    );
};

export default CreateNotificationPage;