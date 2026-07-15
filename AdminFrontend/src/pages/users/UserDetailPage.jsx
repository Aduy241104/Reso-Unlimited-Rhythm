import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getUserService,
  updateUserService,
} from "../../services/userService";
import { getTransactionsByUserIdService } from "../../services/transactionsService";

// Chỉ cho phép điều hướng giữa user và admin trực tiếp tại đây
const roles = ["user", "admin"];

// Danh sách tùy chọn lý do khóa tài khoản Thành viên/Người dùng đồng bộ hệ thống SaaS
const BLOCK_REASON_OPTIONS = [
  { value: "community_violation", label: "Vi phạm tiêu chuẩn cộng đồng" },
  { value: "spam_abuse", label: "Spam hoặc lạm dụng hệ thống" },
  { value: "payment_fraud", label: "Gian lận thanh toán/Premium" },
  { value: "other", label: "Vi phạm khác" },
];

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (minutes) => {
  if (!minutes) return "0m";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const UserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // 1. States cho Modal Block tài khoản với lý do chi tiết
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 2. States cho Modal Xác nhận đổi quyền thông thường (User <-> Admin)
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState("");

  // 3. State cho Modal Cảnh báo nếu tài khoản đích thực đang là Artist
  const [artistWarningModalOpen, setArtistWarningModalOpen] = useState(false);

  const loadUser = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const [userData, transactionData] = await Promise.all([
        getUserService(userId),
        getTransactionsByUserIdService(userId),
      ]);
      setUser(userData);
      setTransactions(transactionData);
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || "Không thể tải dữ liệu người dùng.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    void loadUser();
  }, [userId]);

  // Bộ chặn sự kiện thay đổi Dropdown phân quyền
  const handleRoleSelectChange = (event) => {
    if (!user) return;
    const targetRole = event.target.value;

    // Nếu tài khoản hiện tại đang là Artist -> Chặn đứng hành vi và mở Modal cảnh báo chỉnh sửa bên hệ thống Artist
    if (user.role === "artist") {
      setArtistWarningModalOpen(true);
      return;
    }

    if (targetRole === user.role) return;

    // Gán role tạm thời chờ duyệt và mở Modal xác nhận
    setPendingRole(targetRole);
    setRoleModalOpen(true);
  };

  // Xác nhận cập nhật quyền lên server từ Modal
  const handleConfirmRoleChange = async () => {
    setIsProcessing(true);
    setMessage("");
    try {
      const updated = await updateUserService(user._id, { role: pendingRole });
      setUser(updated);
      setRoleModalOpen(false);
      toast.success(`Thay đổi vai trò thành ${pendingRole.toUpperCase()} thành công.`);
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể cập nhật vai trò.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Xử lý nút kích hoạt trạng thái hoạt động / Mở khóa
  const handleToggleBlockAction = async () => {
    if (!user) return;
    if (user.activeStatus !== "blocked") {
      setAdminNote("");
      setSelectedReasons([]);
      setModalOpen(true);
      return;
    }

    setIsProcessing(true);
    setMessage("");
    try {
      const updated = await updateUserService(user._id, { activeStatus: "active", blockReason: "" });
      setUser(updated);
      toast.success("Tài khoản đã được kích hoạt lại.");
    } catch (error) {
      const errorMessage = error?.message || "Không thể thực hiện mở khóa tài khoản.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Thực thi lệnh khóa tài khoản diện rộng
  const handleConfirmBlockEnforcement = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const selectedLabels = selectedReasons.map(
        (r) => BLOCK_REASON_OPTIONS.find((o) => o.value === r)?.label || r
      );
      const combinedReason = selectedLabels.length > 0
        ? `[${selectedLabels.join(", ")}] ${adminNote}`.trim()
        : adminNote.trim();

      const updated = await updateUserService(user._id, {
        activeStatus: "blocked",
        blockReason: combinedReason,
      });
      setUser(updated);
      setModalOpen(false);
      toast.success("Tài khoản đã bị khóa.");
    } catch (error) {
      toast.error(error?.message || "Không thể thực thi lệnh khóa tài khoản.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReasonCheckboxToggle = (reasonValue) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonValue) ? prev.filter((r) => r !== reasonValue) : [...prev, reasonValue]
    );
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-800">
      
      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between border border-slate-100">
        <div className="flex items-center gap-4">
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="h-14 w-14 rounded-full border border-slate-100 object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 font-bold text-white text-lg">
              {user?.profile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Hệ thống quản trị thành viên</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 flex items-center gap-2">
              {user?.profile?.fullName || "Chưa cập nhật tên"}
              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full tracking-wider uppercase ${
                user?.role === "artist" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                user?.role === "admin" ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-slate-100 text-slate-500"
              }`}>
                {user?.role || "USER"}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-slate-50 px-4 py-2 border border-slate-100 min-w-[100px] text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Trạng thái</p>
            <p className={`mt-0.5 text-xs font-bold ${user?.activeStatus === "active" ? "text-emerald-600" : "text-rose-600"}`}>
              ● {user?.activeStatus === "active" ? "Hoạt Động" : "Bị Khóa"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-2 border border-slate-100 min-w-[100px] text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Hội viên</p>
            <p className="mt-0.5 text-xs font-bold text-slate-900">
              {user?.subscription?.isPremium ? "Premium ★" : "Free Tier"}
            </p>
          </div>
        </div>
      </div>

      {/* BANNER HIỂN THỊ LÝ DO KHÓA TÀI KHOẢN */}
      {user?.activeStatus === "blocked" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-3 shadow-sm animate-fade-in">
          <span className="text-lg">⚠️</span>
          <div>
            <h3 className="font-bold text-sm">Tài khoản này hiện đang bị đình chỉ hoạt động</h3>
            <p className="mt-1 text-xs text-rose-700/90 leading-relaxed font-semibold">
              <span className="underline">Lý do hệ thống trích xuất:</span> {user?.blockReason || "Không có giải trình cụ thể được lưu trữ."}
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{message}</div>
      )}

      {/* KPI METRICS (STATS GỐC) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng thời gian nghe</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatDuration(user?.stats?.totalListeningTime)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Số bài hát đã phát</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{(user?.stats?.totalTracksPlayed || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phương thức xác thực</p>
          <p className="mt-2 text-lg font-bold text-slate-900 capitalize flex items-center gap-2">
            {user?.authProvider === "google" ? "Google SSO" : "Mật khẩu"}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${user?.emailVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {user?.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
            </span>
          </p>
        </div>
      </div>

      {/* BỐ CỤC CHÍNH ĐẦY ĐỦ PHÂN CHIA GRID 2:1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* CỘT TRÁI: THÔNG TIN CHI TIẾT TÀI KHOẢN & LỊCH SỬ HÓA ĐƠN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Thông tin chi tiết tài khoản */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3">Thông tin chi tiết hồ sơ</h2>
            <div className="mt-4 grid gap-y-4 gap-x-6 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Địa chỉ Email</label>
                <p className="mt-1 text-sm font-semibold text-slate-900">{user?.email || "-"}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Họ và tên</label>
                <p className="mt-1 text-sm font-semibold text-slate-900">{user?.profile?.fullName || "-"}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phân quyền hệ thống</label>
                <select
                  value={user?.role || "user"}
                  onChange={handleRoleSelectChange}
                  disabled={!user || isProcessing}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 transition cursor-pointer font-semibold"
                >
                  {user?.role === "artist" && <option value="artist">Nghệ sĩ</option>}
                  <option value="user">Người dùng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quốc gia</label>
                <p className="mt-1 text-sm font-medium text-slate-900">{user?.profile?.country || "-"}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Giới tính</label>
                <p className="mt-1 text-sm font-medium text-slate-900 capitalize">{user?.profile?.gender?.replace(/_/g, " ") || "-"}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngày sinh</label>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {user?.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toLocaleDateString("vi-VN") : "-"}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngày tạo tài khoản</label>
                <p className="mt-1 text-sm text-slate-500">{formatDate(user?.createdAt)}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cập nhật hồ sơ cuối</label>
                <p className="mt-1 text-sm text-slate-500">{formatDate(user?.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Lịch sử hóa đơn giao dịch */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h2 className="text-base font-bold text-slate-900">Lịch sử giao dịch</h2>
              <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 border border-slate-100">
                {transactions?.length ?? 0} Bản ghi
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Mã đơn hàng</th>
                    <th className="px-4 py-3">Số tiền</th>
                    <th className="px-4 py-3">Cổng giao dịch</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                  ) : transactions.length === 0 ? (
                    <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-400">Không tìm thấy dữ liệu giao dịch.</td></tr>
                  ) : (
                    transactions.map((transaction) => (
                      <tr key={transaction._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-900">{transaction.gatewayTransactionId || transaction.invoiceNumber || transaction._id}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">+{transaction.totalAmount?.toLocaleString("en-US")} {transaction.currency}</td>
                        <td className="px-4 py-3 text-xs capitalize">{transaction.paymentMethod || transaction.paymentGateway || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                            transaction.status === "completed" || transaction.status === "success" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700"
                          }`}>{transaction.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{formatDate(transaction.paidAt || transaction.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: THAO TÁC QUẢN TRỊ + SUBSCRIPTION DETAILS CARD + APP PREFERENCES CARD */}
        <div className="space-y-6">
          
          {/* Card 1: Thao tác quản trị nhanh */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
            <h2 className="text-base font-bold text-slate-900">Thao tác quản trị</h2>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleToggleBlockAction}
              className={`w-full flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-sm transition ${
                user?.activeStatus === "blocked" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800"
              } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {user?.activeStatus === "blocked" ? "Kích hoạt tài khoản ↗" : "Khóa tài khoản hệ thống ↗"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Quay lại danh sách
            </button>
          </div>

          {/* KHÔI PHỤC Card 2: Thông tin chi tiết gói hội viên Premium */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-3">Chi tiết Gói hội viên</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hạng mục Premium</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {user?.subscription?.isPremium ? "Đang dùng Premium" : "Tài khoản miễn phí"}
                </p>
              </div>
              {user?.subscription?.isPremium && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngày hết hạn Premium</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {user?.subscription?.premiumEndDate ? new Date(user.subscription.premiumEndDate).toLocaleDateString("vi-VN") : "-"}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mã liên kết Plan ID</p>
                <p className="mt-1 font-mono text-xs text-slate-400 break-all">{user?.subscription?.currentPlanId || "Trống (Không định dạng)"}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ================= MODAL 1: CẢNH BÁO NẾU ĐÃ LÀ ARTIST ================= */}
      {artistWarningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5 text-amber-600">
              <span className="text-xl">⚠️</span>
              <h2 className="text-base font-bold uppercase tracking-wide">Hồ sơ Nghệ sĩ chuyên biệt</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Tài khoản này đang có vai trò <span className="font-bold text-slate-900">Nghệ sĩ</span> và có luồng quản lý dữ liệu riêng. Bạn không thể đổi vai trò trực tiếp tại đây. Vui lòng thực hiện tại mục <span className="font-bold text-indigo-600 underline">Nghệ sĩ hệ thống</span>.
            </p>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setArtistWarningModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: XÁC NHẬN ĐỔI QUYỀN THÔNG THƯỜNG (USER <-> ADMIN) ================= */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4 animate-scale-up">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phân quyền hệ thống</p>
              <h2 className="mt-0.5 text-base font-bold text-slate-900 uppercase">Xác nhận đổi vai trò</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn thay đổi phân quyền của thành viên này từ{" "}
              <span className="font-extrabold text-slate-900 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{user?.role}</span> thành{" "}
              <span className="font-extrabold text-indigo-600 uppercase bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">{pendingRole}</span> không?
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRoleModalOpen(false);
                  setPendingRole("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={isProcessing}
                className="rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40"
              >
                {isProcessing ? "Đang xử lý..." : "Xác nhận đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: KHÓA TÀI KHOẢN REASON OPTIONS ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5 animate-scale-up">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">An toàn hệ thống</p>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900 uppercase">Khóa tài khoản thành viên</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold transition">✕</button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold">
              <p className="text-slate-900 uppercase">{user?.profile?.fullName || "Chưa cập nhật tên"}</p>
              <p className="mt-1 text-[10px] text-slate-400 uppercase font-mono">Mã ID: {user?._id}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lý do khóa</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BLOCK_REASON_OPTIONS.map((reason) => {
                    const isChecked = selectedReasons.includes(reason.value);
                    return (
                      <button
                        key={reason.value}
                        type="button"
                        onClick={() => handleReasonCheckboxToggle(reason.value)}
                        className={`flex items-center text-left gap-3 p-3 border text-xs font-bold transition rounded-xl ${
                          isChecked ? "bg-rose-50 border-rose-300 text-rose-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 flex items-center justify-center border text-[9px] rounded-md ${
                          isChecked ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-300"
                        }`}>{isChecked && "✓"}</div>
                        {reason.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Giải trình chi tiết</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 rounded-xl resize-none transition"
                  placeholder="Điền giải trình cụ thể hoặc đính kèm trích lục bằng chứng vi phạm của thành viên..."
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Hủy bỏ</button>
              <button
                type="button"
                onClick={handleConfirmBlockEnforcement}
                disabled={isProcessing || !adminNote.trim() || selectedReasons.length === 0}
                className="rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Đang xử lý..." : "Xác nhận khóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default UserDetailPage;
