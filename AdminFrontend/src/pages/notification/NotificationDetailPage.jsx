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
    Layers 
} from "lucide-react";
// 🛠️ ĐÃ FIX: Import đầy đủ cả service lấy chi tiết và service xóa thông báo
import { 
    getAdminNotificationDetailService
} from "../../services/notificationService";
import { routePaths } from "../../routes/routePaths";

// 🛠️ ĐÃ FIX: Định nghĩa hàm formatDate ngay trong file để sửa lỗi triệt để
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

    const handleDelete = async () => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn thông báo này không? Người dùng sẽ không thể xem lại được nữa.")) return;
        
        setIsDeleting(true);
        try {
            await deleteAdminNotificationService(id);
            toast.success("Xóa thông báo thành công!");
            navigate(routePaths.notifications);
        } catch (error) {
            toast.error("Xóa thất bại, vui lòng kiểm tra lại quyền hạn.");
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
            
            {/* ACTION BAR: Điều hướng trên cùng */}
            <div className="flex items-center justify-between">
                <Link
                    to={routePaths.notifications}
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-100"
                >
                    <ArrowLeft size={14} /> Quay lại danh sách
                </Link>

                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition bg-white px-4 py-2.5 rounded-xl shadow-sm border border-rose-100 cursor-pointer disabled:opacity-50"
                >
                    <Trash2 size={14} /> {isDeleting ? "Đang xử lý..." : "Gỡ bỏ thông báo vĩnh viễn"}
                </button>
            </div>

            {/* HEADER BAR: Đồng bộ chuẩn cấu trúc thông tin UserDetail */}
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

            {/* BỐ CỤC LƯỚI CHÍNH CHUẨN GRID 2:1 */}
            <div className="grid gap-6 lg:grid-cols-3">
                
                {/* CỘT TRÁI (HIỂN THỊ NỘI DUNG VÀ DEEP LINKING) - CHIẾM 2 PHẦN */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Card Nút thắt: Chi tiết nội dung */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 border-l-[4px] border-l-slate-900 space-y-4">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3 flex items-center gap-2">
                            <Layers size={16} className="text-slate-400" /> Bản dịch nội dung phát hành
                        </h2>
                        
                        <div className="space-y-4 pt-1">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiêu đề gốc hiển thị trên thiết bị</label>
                                <p className="mt-1 text-base font-bold text-slate-950 bg-slate-50/50 px-4 py-3 rounded-xl border border-slate-100/80">{noti?.title || "-"}</p>
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chuỗi nội dung chi tiết (Message string)</label>
                                <div className="bg-slate-50/80 rounded-xl p-4 text-sm text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap border border-slate-100">
                                    {noti?.content || "Không có nội dung văn bản đi kèm."}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card Định tuyến: Target Routing (Chỉ hiện nếu có cấu hình định hướng) */}
                    {noti?.targetType && (
                        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
                            <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3 flex items-center gap-2">
                                <Link2 size={16} className="text-slate-400" /> Hành vi điều hướng ứng dụng (Deep Linking)
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 pt-1">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mô-đun Đích đến (Target Type)</label>
                                    <p className="mt-1 text-sm font-mono font-bold text-indigo-600 bg-indigo-50/40 px-3 py-2 rounded-xl border border-indigo-100/50 uppercase tracking-wide">
                                        {noti?.targetType}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ID Thực thể liên kết (Target ID)</label>
                                    <p className="mt-1 text-sm font-mono font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 truncate" title={noti?.targetId}>
                                        {noti?.targetId || "— (Trống)"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* CỘT PHẢI (AUDITS VÀ THÔNG TIN ĐỐI TƯỢNG NHẬN TIN) - CHIẾM 1 PHẦN */}
                <div className="space-y-6">
                    
                    {/* Card Logistics & Audits */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3">Logistics & Audits</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phân loại nhãn định danh</p>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 mt-1 capitalize">
                                    <Tag size={12} /> {noti?.type || "General"}
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

                    {/* DYNAMIC CARD: Hồ sơ người nhận đích danh (Chỉ hiển thị khi receiverType là single) */}
                    {noti?.receiverType === "single" && noti?.userId && (
                        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
                            <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3 flex items-center gap-2">
                                <User size={16} className="text-slate-400" /> Đối tượng đích danh
                            </h2>
                            
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white uppercase shadow-sm">
                                        {noti.userId.profile?.fullName?.charAt(0) || noti.userId.email?.charAt(0) || "U"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-900 truncate">
                                            {noti.userId.profile?.fullName || "Chưa cập nhật tên"}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono capitalize mt-0.5 tracking-tight">
                                            Vai trò: <span className="font-bold text-slate-600">{noti.userId.role || "User"}</span>
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="space-y-1 pl-1">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tài khoản Email</p>
                                    <p className="text-xs font-semibold text-slate-700 break-all flex items-center gap-1.5">
                                        <Mail size={12} className="text-slate-400 shrink-0" /> {noti.userId.email}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </section>
    );
};

export default NotificationDetailPage;