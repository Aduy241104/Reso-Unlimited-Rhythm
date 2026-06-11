import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getUserService,
  updateUserService,
} from "../../services/userService";

const roles = ["user", "admin"];

const BLOCK_REASON_OPTIONS = [
  { value: "community_violation", label: "Community Violation (Vi phạm tiêu chuẩn cộng đồng)" },
  { value: "spam_abuse", label: "Spam & Abuse (Cố tình spam hoặc lạm dụng hệ thống)" },
  { value: "payment_fraud", label: "Payment Fraud (Gian lận thanh toán/Premium)" },
  { value: "other", label: "Other Violations (Các hành vi vi phạm quy chuẩn khác)" },
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
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState("");
  const [artistWarningModalOpen, setArtistWarningModalOpen] = useState(false);

  const loadUser = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const userData = await getUserService(userId);
      setUser(userData);
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || "Unable to load user data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    void loadUser();
  }, [userId]);

  const handleRoleSelectChange = (event) => {
    if (!user) return;
    const targetRole = event.target.value;

    if (user.role === "artist") {
      setArtistWarningModalOpen(true);
      return;
    }
    if (targetRole === user.role) return;

    setPendingRole(targetRole);
    setRoleModalOpen(true);
  };

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
            <img src={user.avatar} alt="Avatar" className="h-16 w-16 rounded-full border-2 border-slate-100 object-cover shadow-inner" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 font-bold text-white text-xl shadow-md">
              {user?.profile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hệ thống quản trị thành viên</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 flex items-center gap-2">
              {user?.profile?.fullName || "Chưa cập nhật tên"}
              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md tracking-wider uppercase border ${
                user?.role === "artist" ? "bg-blue-50 text-blue-600 border-blue-200" :
                user?.role === "admin" ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-slate-50 text-slate-500 border-slate-200"
              }`}>
                {user?.role || "USER"}
              </span>
            </h1>
          </div>
        </div>

        {/* THAO TÁC QUẢN TRỊ ĐƯỢC ĐƯA LÊN HEADER ĐỂ TỐI ƯU KHÔNG GIAN */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Danh sách
          </button>
          <button
            type="button"
            disabled={isProcessing || !user}
            onClick={handleToggleBlockAction}
            className={`flex items-center gap-1 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition ${
              user?.activeStatus === "blocked" 
                ? "bg-emerald-600 hover:bg-emerald-700" 
                : "bg-rose-600 hover:bg-rose-700"
            } disabled:opacity-50`}
          >
            {user?.activeStatus === "blocked" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
          </button>
        </div>
      </div>

      {/* BANNER HIỂN THỊ LÝ DO KHÓA TÀI KHOẢN */}
      {user?.activeStatus === "blocked" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-3 shadow-sm animate-fade-in">
          <span className="text-lg">⚠️</span>
          <div>
            <h3 className="font-bold text-sm">Tài khoản này hiện đang bị đình chỉ hoạt động</h3>
            <p className="mt-1 text-xs text-rose-700/90 leading-relaxed font-semibold">
              <span className="underline">Lý do:</span> {user?.blockReason || "Không có giải trình cụ thể."}
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{message}</div>
      )}

      {/* KPI METRICS GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng thời gian nghe</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{formatDuration(user?.stats?.totalListeningTime)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Số bài hát đã phát</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{(user?.stats?.totalTracksPlayed || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Xác thực tài khoản</p>
          <div className="mt-2 flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-900 capitalize">
              {user?.authProvider === "google" ? "Google SSO" : "Mật khẩu hệ thống"}
            </span>
            <span className={`w-fit text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${user?.emailVerified ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {user?.emailVerified ? "Đã verify" : "Chưa verify"}
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Trạng thái hoạt động</p>
          <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            user?.activeStatus === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}>
            <span className={`h-2 w-2 rounded-full ${user?.activeStatus === "active" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
            {user?.activeStatus === "active" ? "Đang hoạt động" : "Bị đình chỉ"}
          </span>
        </div>
      </div>

      {/* BỐ CỤC CHÍNH: 3 CỘT ĐỀU NHAU (3-COLUMN DASHBOARD) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* CỘT 1: THÔNG TIN CHI TIẾT HỒ SƠ */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Thông tin hồ sơ</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Địa chỉ Email</label>
                <p className="mt-0.5 text-sm font-semibold text-slate-900 break-all">{user?.email || "-"}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Họ và tên</label>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{user?.profile?.fullName || "-"}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quốc gia / Giới tính</label>
                <p className="mt-0.5 text-sm font-medium text-slate-900 capitalize">
                  {user?.profile?.country || "-"} / {user?.profile?.gender?.replace(/_/g, " ") || "-"}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngày sinh</label>
                <p className="mt-0.5 text-sm font-medium text-slate-900">
                  {user?.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toLocaleDateString("vi-VN") : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT 2: PHÂN QUYỀN & THỜI GIAN HỆ THỐNG */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Hệ thống & Quyền</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phân quyền tài khoản</label>
                <select
                  value={user?.role || "user"}
                  onChange={handleRoleSelectChange}
                  disabled={!user || isProcessing}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 transition cursor-pointer font-bold shadow-sm"
                >
                  {user?.role === "artist" && <option value="artist">Artist (Nghệ sĩ)</option>}
                  <option value="user">User (Thành viên)</option>
                  <option value="admin">Admin (Quản trị viên)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngày tạo tài khoản</label>
                <p className="mt-0.5 text-sm font-semibold text-slate-600">{formatDate(user?.createdAt)}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cập nhật hồ sơ cuối</label>
                <p className="mt-0.5 text-sm font-semibold text-slate-600">{formatDate(user?.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT 3: GÓI HỘI VIÊN & CONFIG CÀI ĐẶT APP */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Gói dịch vụ & Cài đặt</h2>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hạng mục hội viên</p>
                <p className="mt-0.5 text-sm font-black text-slate-950">
                  {user?.subscription?.isPremium ? "🎯 Premium Active ★" : "🛡️ Free Tier Account"}
                </p>
                {user?.subscription?.isPremium && (
                  <p className="text-[11px] font-medium text-slate-500 mt-1">
                    Hết hạn: {new Date(user.subscription.premiumEndDate).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold pt-1">
                <span className="text-slate-500">Ngôn ngữ ứng dụng:</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700">{user?.settings?.language || "vi"}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Thông báo đẩy:</span>
                <span className={`text-[10px] font-bold uppercase ${user?.settings?.notificationsEnabled ? "text-emerald-600" : "text-slate-400"}`}>
                  {user?.settings?.notificationsEnabled ? "Đang bật" : "Tắt"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Phát ngẫu nhiên mặc định:</span>
                <span className={`text-[10px] font-bold uppercase ${user?.settings?.shufflePlayDefault ? "text-blue-600" : "text-slate-400"}`}>
                  {user?.settings?.shufflePlayDefault ? "Đang bật" : "Tắt"}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ================= MODAL 1: CẢNH BÁO NẾU ĐÃ LÀ ARTIST ================= */}
      {artistWarningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <span className="text-xl">⚠️</span>
              <h2 className="text-base font-bold uppercase tracking-wide">Hồ sơ Nghệ sĩ chuyên biệt</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Tài khoản này đã được thiết lập quyền hạn là <span className="font-bold text-slate-900">Artist (Nghệ sĩ)</span> và có luồng quản lý dữ liệu tác phẩm, tác giả riêng. Bạn không thể hạ quyền trực tiếp tại đây. Vui lòng thực hiện hạ quyền hoặc cấu hình lại tại phân mục <span className="font-bold text-indigo-600 underline">Artist hệ thống</span>.
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
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
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
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
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
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Violation Reason Flags (Chọn lý do hệ thống)</label>
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
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Detailed Explanation (Giải trình chi tiết bắt buộc)</label>
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