import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    Calendar,
    Bell,
    Mail,
    Tag,
    Link2,
    Trash2,
    Loader2,
    User,
    Layers,
    Edit2,
    Eye,
    X
} from "lucide-react";
import {
    getAdminNotificationDetailService,
    deleteAdminNotificationService
} from "../../services/notificationService";
import { routePaths } from "../../routes/routePaths";

// Hàm helper định dạng thời gian phát hành nội bộ
const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Hàm helper lấy nhãn phân loại thông báo
const getTypeLabel = (type) => {
    switch (type) {
        case "system": return "⚙️ Hệ thống";
        case "new_release": return "🎵 Phát hành mới";
        case "payment": return "💳 Thanh toán";
        case "subscription": return "⭐ Gói cước";
        default: return "📩 Thông báo chung";
    }
};

const NotificationDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [noti, setNoti] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    // Quản lý trạng thái đóng/mở Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReadersModalOpen, setIsReadersModalOpen] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const data = await getAdminNotificationDetailService(id);
                setNoti(data?.notification || data);
            } catch (error) {
                toast.error("Không tìm thấy thông tin thông báo này.");
                navigate(routePaths.notifications);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) void fetchDetail();
    }, [id, navigate]);

    // Xử lý chặn scroll bọc nền khi modal đang mở (Tăng trải nghiệm UX)
    useEffect(() => {
        if (isDeleteModalOpen || isReadersModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isDeleteModalOpen, isReadersModalOpen]);

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteAdminNotificationService(id);
            toast.success("Xóa thông báo thành công!");
            setIsDeleteModalOpen(false);
            navigate(routePaths.notifications);
        } catch (error) {
            toast.error("Xóa thông báo thất bại, vui lòng thử lại.");
            setIsDeleteModalOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-3 bg-[#f8fafc]">
                <Loader2 className="h-8 w-8 text-slate-900 animate-spin stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải chi tiết dữ liệu...</p>
            </div>
        );
    }

    return (
        <section className="mx-auto max-w-7xl space-y-6 p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-800 antialiased">
            
            {/* ACTION BAR: Thanh điều hướng & Thao tác nhanh */}
            <div className="flex items-center justify-between">
                <Link
                    to={routePaths.notifications}
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-100"
                >
                    <ArrowLeft size={14} /> Quay lại danh sách
                </Link>

                <div className="flex items-center gap-2">
                    <Link
                        to={routePaths.notificationEdit?.(id) || `/notifications/edit/${id}`}
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200"
                    >
                        <Edit2 size={14} /> Chỉnh sửa
                    </Link>

                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        className="inline-flex items-center gap-1 border border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-50 px-4 py-2.5 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                        title="Xóa thông báo hệ thống"
                    >
                        <Trash2 size={14} /> Xóa
                    </button>
                </div>
            </div>

            {/* HEADER BAR: Khối thông tin định danh tổng quan */}
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-inner">
                        <Bell size={24} className="stroke-[1.8]" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Hệ thống quản trị thông báo</p>
                        <h1 className="mt-1 text-xl font-bold text-slate-900 flex flex-wrap items-center gap-2 leading-tight">
                            {noti?.title || "Bản ghi thông báo"}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                    <div className="rounded-xl bg-slate-50 px-4 py-2 border border-slate-100 min-w-[120px] text-center">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Phân loại tin</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-900">
                            {getTypeLabel(noti?.type)}
                        </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-4 py-2 border border-slate-100 min-w-[120px] text-center">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Cơ chế đích</p>
                        <p className="mt-0.5 text-xs font-bold text-indigo-600 uppercase tracking-wide">
                            {noti?.receiverType === "all" ? "📢 Toàn sàn" : noti?.receiverType === "group" ? "👥 Theo nhóm" : "🎯 Đích danh"}
                        </p>
                    </div>
                </div>
            </div>

            {/* BỐ CỤC LƯỚI CHÍNH (GRID 2:1) */}
            <div className="grid gap-6 lg:grid-cols-3 items-start">
                
                {/* CỘT TRÁI: Nội dung chi tiết & Deep Linking */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 border-l-[4px] border-l-slate-900 space-y-4">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3 flex items-center gap-2">
                            <Layers size={16} className="text-slate-400" /> Bản dịch nội dung phát hành
                        </h2>

                        <div className="space-y-4 pt-1">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiêu đề gốc hiển thị trên thiết bị</label>
                                <p className="mt-1 text-sm font-bold text-slate-950 bg-slate-50/50 px-4 py-3 rounded-xl border border-slate-100/80">{noti?.title || "-"}</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chuỗi nội dung chi tiết (Message string)</label>
                                <div className="bg-slate-50/80 rounded-xl p-4 text-sm text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap border border-slate-100">
                                    {noti?.content || "Không có nội dung văn bản đi kèm."}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deep Linking Target Routing */}
                    {noti?.targetType && (
                        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
                            <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3 flex items-center gap-2">
                                <Link2 size={16} className="text-slate-400" /> Hành vi điều hướng ứng dụng (Deep Linking)
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 pt-1">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Loại điều hướng</label>
                                    <p className="mt-1 text-sm font-mono font-bold text-indigo-600 bg-indigo-50/40 px-3 py-2 rounded-xl border border-indigo-100/50 uppercase tracking-wide">
                                        {noti?.targetType}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tên Thực thể liên kết (Target Name)</label>
                                    <p className="mt-1 text-sm font-mono font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 truncate" title={noti?.targetId}>
                                        {noti?.targetName || "— (Trống)"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* CỘT PHẢI: Logistics, Audits & Thông tin đối tượng nhận */}
                <div className="space-y-6">
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3">Logistics & Audits</h2>
                        
                        <div className="space-y-4">
                            {/* Trạng thái xem/đọc tin */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trạng thái đọc tin</p>
                                {noti?.receiverType === "single" ? (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold mt-1 ${
                                        noti?.isRead 
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                            : "bg-amber-50 text-amber-700 border border-amber-100"
                                    }`}>
                                        <Eye size={12} /> {noti?.isRead ? "Người dùng đã xem" : "Chưa xem"}
                                    </span>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={() => noti?.readBy?.length > 0 && setIsReadersModalOpen(true)}
                                        className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-100 bg-indigo-50 text-indigo-700 select-none ${
                                            noti?.readBy?.length > 0 
                                                ? "hover:bg-indigo-100/80 transition cursor-pointer" 
                                                : "opacity-75 cursor-not-allowed"
                                        }`}
                                        title={noti?.readBy?.length > 0 ? "Bấm để xem danh sách chi tiết" : "Chưa có ai xem"}
                                    >
                                        <Eye size={12} /> Đã xem: <span className="font-extrabold text-sm">{noti?.readBy?.length || 0}</span> người dùng
                                    </button>
                                )}
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phân loại nhãn định danh</p>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 mt-1 capitalize">
                                    <Tag size={12} /> {noti?.type || "Thông báo chung"}
                                </span>
                            </div>
                            
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thời gian tạo bản ghi</p>
                                <p className="text-xs font-mono font-semibold text-slate-600 mt-1 flex items-center gap-1.5">
                                    <Calendar size={13} className="text-slate-400" /> {formatDate(noti?.createdAt)}
                                </p>
                            </div>
                            
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mã định danh hệ thống (ID)</p>
                                <p className="text-[11px] font-mono font-medium text-slate-400 mt-1 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    {noti?._id}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Khối hiển thị đối tượng nhận đích danh (Single target user) */}
                    {noti?.receiverType === "single" && noti?.userId && (
                        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
                            <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3 flex items-center gap-2">
                                <User size={16} className="text-slate-400" /> Đối tượng đích danh
                            </h2>
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white uppercase shadow-sm">
                                        {noti?.userId?.profile?.fullName?.charAt(0) || noti?.userId?.email?.charAt(0) || "U"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-900 truncate">
                                            {noti?.userId?.profile?.fullName || "Chưa cập nhật tên"}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono capitalize mt-0.5 tracking-tight">
                                            Vai trò: <span className="font-bold text-slate-600">{noti?.userId?.role || "User"}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-1 pl-1">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tài khoản Email</p>
                                    <p className="text-xs font-semibold text-slate-700 break-all flex items-center gap-1.5">
                                        <Mail size={12} className="text-slate-400 shrink-0" /> {noti?.userId?.email || "-"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= MODAL XÓA THÔNG BÁO ================= */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white p-6 shadow-xl rounded-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Xóa thông báo hệ thống?</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Hành động này không thể hoàn tác. Người dùng sẽ không thể nhìn thấy thông báo này nữa.</p>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Xác nhận gỡ bỏ hoàn toàn bản ghi thông báo: <span className="font-bold text-slate-950">"{noti?.title}"</span>?
                        </p>
                        <div className="flex gap-2 justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                            >
                                {isDeleting ? "Đang gỡ..." : "Xác nhận gỡ bỏ"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL DANH SÁCH NGƯỜI XEM ================= */}
            {isReadersModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white p-6 shadow-xl rounded-2xl border border-slate-100 flex flex-col max-h-[75vh] space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        
                        {/* Header Modal */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Người dùng đã xem</h2>
                                <p className="text-[11px] text-slate-400 mt-0.5">Danh sách tài khoản hệ thống đã đọc thông báo này</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsReadersModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Thân Modal danh sách người xem */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-3 divide-y divide-slate-50 max-h-[45vh]">
                            {noti?.readBy?.map((user, index) => (
                                <div key={user?._id || index} className="flex items-center gap-3 pt-3 first:pt-0">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-black text-white uppercase shadow-sm">
                                        {user?.profile?.fullName?.charAt(0) || user?.email?.charAt(0) || "U"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-900 truncate">
                                            {user?.profile?.fullName || "Chưa cập nhật tên"}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5 flex items-center gap-1">
                                            <Mail size={10} /> {user?.email || "-"}
                                        </p>
                                    </div>
                                    {user?.role && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                                            {user?.role}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer Modal */}
                        <div className="border-t border-slate-100 pt-3 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsReadersModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                            >
                                Đóng lại
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default NotificationDetailPage;
