import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getUsersService,
  updateUserService,
} from "../../services/userService";

const roles = ["", "guest", "user", "artist", "admin"];
const statuses = ["", "active", "inactive", "blocked"];

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

const UserListPage = () => {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const result = await getUsersService(filters);
      setUsers(result ?? []);
    } catch (error) {
      setMessage(
        error?.response?.data?.message || error?.message || "Không thể tải danh sách người dùng."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleChange = (field) => (event) => {
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    await loadUsers();
  };

  const handleToggleBlock = async (user) => {
    const nextStatus = user.activeStatus === "blocked" ? "active" : "blocked";

    try {
      await updateUserService(user._id, { activeStatus: nextStatus });
      await loadUsers();
    } catch (error) {
      setMessage(
        error?.response?.data?.message || error?.message || "Không thể cập nhật trạng thái người dùng."
      );
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserService(userId, { role: newRole });
      setUsers((prev) =>
        prev.map((item) =>
          item._id === userId ? { ...item, role: newRole } : item
        )
      );
      setMessage("Cập nhật vai trò thành công.");
    } catch (error) {
      setMessage(
        error?.response?.data?.message || error?.message || "Không thể cập nhật vai trò người dùng."
      );
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-black bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">
          Quản lý người dùng
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-black">
          Danh sách người dùng
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">
          Xem danh sách, tìm kiếm, lọc và chặn/mở khóa tài khoản người dùng.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="grid gap-4 rounded-[2rem] border border-black bg-white p-6 md:grid-cols-[1.5fr_1fr_1fr_0.8fr]"
      >
        <div className="space-y-2">
          <label className="text-sm font-semibold text-black/70">Tìm kiếm</label>
          <input
            value={filters.search}
            onChange={handleChange("search")}
            placeholder="Email hoặc họ tên"
            className="w-full rounded-3xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-black/70">Vai trò</label>
          <select
            value={filters.role}
            onChange={handleChange("role")}
            className="w-full rounded-3xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black"
          >
            <option value="">Tất cả vai trò</option>
            {roles.slice(1).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-black/70">Trạng thái</label>
          <select
            value={filters.status}
            onChange={handleChange("status")}
            className="w-full rounded-3xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black"
          >
            <option value="">Tất cả trạng thái</option>
            {statuses.slice(1).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-3xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/90"
          >
            Tìm kiếm
          </button>
        </div>
      </form>

      {message && (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-[2rem] border border-black bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-black">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.16em] text-slate-700">
              <tr>
                <th className="border-b border-black/10 px-6 py-4">Email</th>
                <th className="border-b border-black/10 px-6 py-4">Họ tên</th>
                <th className="border-b border-black/10 px-6 py-4">Vai trò</th>
                <th className="border-b border-black/10 px-6 py-4">Trạng thái</th>
                <th className="border-b border-black/10 px-6 py-4">Ngày tạo</th>
                <th className="border-b border-black/10 px-6 py-4">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm text-slate-500">
                    Không có người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="even:bg-slate-50">
                    <td className="border-b border-black/10 px-6 py-4">{user.email}</td>
                    <td className="border-b border-black/10 px-6 py-4">
                      {user.profile?.fullName || "-"}
                    </td>
                    <td className="border-b border-black/10 px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(event) => handleRoleChange(user._id, event.target.value)}
                        className="w-full rounded-3xl border border-black/10 bg-slate-50 px-3 py-2 text-sm text-black outline-none focus:border-black"
                      >
                        {roles.slice(1).map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border-b border-black/10 px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        user.activeStatus === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : user.activeStatus === "inactive"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-rose-100 text-rose-700"
                      }`}>
                        {user.activeStatus}
                      </span>
                    </td>
                    <td className="border-b border-black/10 px-6 py-4">{formatDate(user.createdAt)}</td>
                    <td className="border-b border-black/10 px-6 py-4 space-x-2">
                      <Link
                        to={`/users/${user._id}`}
                        className="inline-flex rounded-2xl border border-black/10 bg-slate-100 px-3 py-2 text-xs font-semibold text-black transition hover:bg-slate-200"
                      >
                        Chi tiết
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggleBlock(user)}
                        className={`inline-flex rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                          user.activeStatus === "blocked"
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-rose-600 text-white hover:bg-rose-700"
                        }`}
                      >
                        {user.activeStatus === "blocked" ? "Mở khóa" : "Chặn"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default UserListPage;
