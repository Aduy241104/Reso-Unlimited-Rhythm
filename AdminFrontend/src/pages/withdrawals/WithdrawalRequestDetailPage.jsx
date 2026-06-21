import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Clock3,
  CreditCard,
  Loader2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { getWithdrawalRequestDetailService } from "../../services/adminWithdrawalService";
import { routePaths } from "../../routes/routePaths";

const statusConfig = {
  pending: {
    label: "Pending",
    className: "border-amber-100 bg-amber-50 text-amber-600",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    className: "border-blue-100 bg-blue-50 text-blue-600",
    dot: "bg-blue-500",
  },
  rejected: {
    label: "Rejected",
    className: "border-rose-100 bg-rose-50 text-rose-600",
    dot: "bg-rose-500",
  },
  paid: {
    label: "Paid",
    className: "border-emerald-100 bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-500",
  },
};

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getArtistUser = (withdrawal) => {
  const artist = withdrawal?.artistId && typeof withdrawal.artistId === "object"
    ? withdrawal.artistId
    : null;
  const user = artist?.userId && typeof artist.userId === "object"
    ? artist.userId
    : null;

  return { artist, user };
};

const getArtistName = (withdrawal) => {
  const { artist, user } = getArtistUser(withdrawal);

  return (
    artist?.name ||
    artist?.stageName ||
    artist?.artistName ||
    user?.profile?.fullName ||
    user?.email ||
    "Unknown artist"
  );
};

const getArtistEmail = (withdrawal) => {
  const { user } = getArtistUser(withdrawal);
  return user?.email || "—";
};

const getArtistAvatar = (withdrawal) => {
  const { artist, user } = getArtistUser(withdrawal);
  return artist?.avatar || user?.avatar || "";
};

const getStatusBadge = (status) => {
  const config = statusConfig[status] || {
    label: status || "Unknown",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${config.className}`}>
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

const DetailCard = ({ title, children }) => (
  <div className="rounded-2xl bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
      {title}
    </h2>
    <div className="mt-5">{children}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="border-b border-slate-100 py-3 last:border-b-0">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-medium text-slate-900">
      {value || "—"}
    </p>
  </div>
);

const WithdrawalRequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [withdrawal, setWithdrawal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDetail = async () => {
      if (!id) {
        setError("Thiếu mã yêu cầu rút tiền.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const result = await getWithdrawalRequestDetailService(id);
        setWithdrawal(result);
      } catch (err) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
          err?.message ||
          "Không thể tải chi tiết yêu cầu rút tiền."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadDetail();
  }, [id]);

  const accountInfo = withdrawal?.accountInfo || {};
  const method = withdrawal?.method || "—";
  const isMomo = method === "momo";
  const MethodIcon = isMomo ? WalletCards : CreditCard;
  const avatar = getArtistAvatar(withdrawal);

  return (
    <section className="mx-auto min-h-screen max-w-6xl space-y-6 bg-slate-50/50 p-6 text-slate-800 antialiased">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Withdrawal detail
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Withdrawal Request Detail
          </h1>
        </div>

        <Link
          to={routePaths.withdrawals}
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Back to list
        </Link>
      </div>

      {isLoading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm font-medium">Đang tải chi tiết...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-rose-600">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm leading-6">{error}</p>
        </div>
      ) : withdrawal ? (
        <>
          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={getArtistName(withdrawal)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound size={28} className="text-white/70" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-semibold">
                    {getArtistName(withdrawal)}
                  </p>
                  <p className="mt-1 truncate text-sm text-white/55">
                    {getArtistEmail(withdrawal)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {getStatusBadge(withdrawal.status)}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold uppercase text-white">
                  <MethodIcon size={14} />
                  {method}
                </span>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                  Amount
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold">
                  {formatCurrency(withdrawal.amount)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                  Request ID
                </p>
                <p className="mt-2 break-all font-mono text-sm font-semibold">
                  {withdrawal._id || withdrawal.id}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                  Created At
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {formatDateTime(withdrawal.createdAt || withdrawal.requestedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DetailCard title="Artist information">
              <InfoRow label="Artist name" value={getArtistName(withdrawal)} />
              <InfoRow label="Email" value={getArtistEmail(withdrawal)} />
              <InfoRow label="Artist ID" value={withdrawal.artistId?._id || withdrawal.artistId} />
              <InfoRow label="User ID" value={withdrawal.artistId?.userId?._id} />
            </DetailCard>

            <DetailCard title="Payment information">
              <InfoRow label="Payment method" value={method} />
              {isMomo ? (
                <>
                  <InfoRow
                    label="MoMo phone"
                    value={
                      accountInfo.momoPhone ||
                      accountInfo.walletPhone ||
                      accountInfo.phoneNumber ||
                      accountInfo.accountNumber
                    }
                  />
                  <InfoRow
                    label="Wallet name"
                    value={accountInfo.walletName || accountInfo.accountHolderName}
                  />
                </>
              ) : (
                <>
                  <InfoRow label="Bank name" value={accountInfo.bankName} />
                  <InfoRow label="Account number" value={accountInfo.accountNumber} />
                  <InfoRow label="Account holder" value={accountInfo.accountHolderName} />
                </>
              )}
            </DetailCard>

            <DetailCard title="Timeline">
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <Clock3 size={16} className="text-slate-400" />
                  <InfoRow label="Created At" value={formatDateTime(withdrawal.createdAt || withdrawal.requestedAt)} />
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <Clock3 size={16} className="text-slate-400" />
                  <InfoRow label="Approved At" value={formatDateTime(withdrawal.approvedAt)} />
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <Clock3 size={16} className="text-slate-400" />
                  <InfoRow label="Rejected At" value={formatDateTime(withdrawal.rejectedAt)} />
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <Clock3 size={16} className="text-slate-400" />
                  <InfoRow label="Paid At" value={formatDateTime(withdrawal.paidAt)} />
                </div>
              </div>
            </DetailCard>

            <DetailCard title="Admin notes">
              <InfoRow label="Reject reason" value={withdrawal.rejectReason} />
              <InfoRow label="Admin note" value={withdrawal.adminNote} />
              <InfoRow label="Processed At" value={formatDateTime(withdrawal.processedAt)} />
              <InfoRow
                label="Processed By"
                value={
                  withdrawal.processedBy?.profile?.fullName ||
                  withdrawal.processedBy?.email ||
                  "—"
                }
              />
            </DetailCard>
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <Banknote size={28} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-semibold text-slate-900">
            Không tìm thấy yêu cầu rút tiền.
          </p>
        </div>
      )}
    </section>
  );
};

export default WithdrawalRequestDetailPage;
