import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getUserService,
  getUserTransactionsService,
  updateUserService,
} from "../../services/userService";

const roles = ["guest", "user", "artist", "admin"];
const statuses = ["active", "inactive", "blocked"];

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

const UserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadUser = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const [userData, transactionData] = await Promise.all([
        getUserService(userId),
        getUserTransactionsService(userId),
      ]);

      setUser(userData);
      setTransactions(transactionData);
    } catch (error) {
      setMessage(
        error?.response?.data?.message || error?.message || "Unable to load user data."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    void loadUser();
  }, [userId]);

  const handleRoleChange = async (event) => {
    if (!user) return;
    setMessage("");

    try {
      const updated = await updateUserService(user._id, {
        role: event.target.value,
      });
      setUser(updated);
      toast.success("Role updated.");
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || "Unable to update role.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    setMessage("");

    try {
      const nextStatus = user.activeStatus === "blocked" ? "active" : "blocked";
      const updated = await updateUserService(user._id, {
        activeStatus: nextStatus,
      });
      setUser(updated);
      toast.success(
        nextStatus === "active"
          ? "Account unblocked."
          : "Account blocked."
      );
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || "Unable to update status.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-black bg-white p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">
            User Details
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-black">Account Information</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">
            View details, assign roles, and change block/unblock status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-3xl border border-black/10 bg-slate-50 px-5 py-3 text-sm font-semibold text-black transition hover:bg-slate-100"
          >
            Back to list
          </button>
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={!user}
            className={`rounded-3xl px-5 py-3 text-sm font-semibold text-white transition ${
              user?.activeStatus === "blocked"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            } ${!user ? "opacity-60" : ""}`}
          >
            {user?.activeStatus === "blocked" ? "Unblock" : "Block"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-3xl border border-black/10 bg-slate-50 px-5 py-4 text-sm text-black">
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-black bg-white p-6">
          <h2 className="text-xl font-semibold text-black">Basic Information</h2>
          <div className="mt-6 space-y-4 text-sm text-black/90">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">Email</p>
                <p className="mt-2 text-base text-black">{user?.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">Full Name</p>
                <p className="mt-2 text-base text-black">{user?.profile?.fullName || "-"}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">Role</p>
                <select
                  value={user?.role || "user"}
                  onChange={handleRoleChange}
                  disabled={!user}
                  className="mt-2 w-full rounded-3xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">Status</p>
                <p className="mt-2 inline-flex rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-black">
                  {user?.activeStatus || "-"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">Created At</p>
                <p className="mt-2 text-base text-black">{formatDate(user?.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">Last Updated</p>
                <p className="mt-2 text-base text-black">{formatDate(user?.updatedAt)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-black bg-white p-6">
          <h2 className="text-xl font-semibold text-black">Profile Information</h2>
          <div className="mt-6 space-y-4 text-sm text-black/90">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">Date of Birth</p>
              <p className="mt-2 text-base text-black">{user?.profile?.dateOfBirth ? formatDate(user.profile.dateOfBirth) : "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">Gender</p>
              <p className="mt-2 text-base text-black">{user?.profile?.gender || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">Country</p>
              <p className="mt-2 text-base text-black">{user?.profile?.country || "-"}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-black bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">Transaction History</p>
            <h2 className="mt-2 text-xl font-semibold text-black">{transactions?.length ?? 0} transactions</h2>
          </div>
          <Link
            to="/users"
            className="rounded-3xl border border-black/10 bg-slate-50 px-4 py-3 text-sm font-semibold text-black transition hover:bg-slate-100"
          >
            Back to list
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-black">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.16em] text-slate-700">
              <tr>
                <th className="border-b border-black/10 px-6 py-4">Order ID</th>
                <th className="border-b border-black/10 px-6 py-4">Amount</th>
                <th className="border-b border-black/10 px-6 py-4">Method</th>
                <th className="border-b border-black/10 px-6 py-4">Status</th>
                <th className="border-b border-black/10 px-6 py-4">Paid At</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-500">
                    Loading transaction history...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction._id} className="even:bg-slate-50">
                    <td className="border-b border-black/10 px-6 py-4">{transaction.gatewayTransactionId || transaction.invoiceNumber || transaction._id}</td>
                    <td className="border-b border-black/10 px-6 py-4">{transaction.totalAmount?.toLocaleString("en-US")} {transaction.currency}</td>
                    <td className="border-b border-black/10 px-6 py-4">{transaction.paymentMethod || transaction.paymentGateway}</td>
                    <td className="border-b border-black/10 px-6 py-4">{transaction.status}</td>
                    <td className="border-b border-black/10 px-6 py-4">{formatDate(transaction.paidAt || transaction.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};

export default UserDetailPage;
