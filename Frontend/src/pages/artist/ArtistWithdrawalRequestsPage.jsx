import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Landmark,
  Loader2,
  ReceiptText,
  Wallet,
} from "lucide-react";
import {
  createMyArtistPayoutAccountService,
  createMyArtistWithdrawalRequestService,
  getMyArtistRevenueSummaryService,
  getMyArtistWithdrawalRequestsService,
} from "../../services/artistService";
import { getApiErrorMessage } from "../../utils/apiError";

const WITHDRAWAL_REQUEST_PAGE_SIZE = 10;
const BANK_OPTIONS = [
  "Vietcombank",
  "BIDV",
  "VietinBank",
  "Agribank",
  "Techcombank",
  "MB Bank",
  "ACB",
  "VPBank",
  "Sacombank",
  "TPBank",
  "SHB",
  "HDBank",
  "OCB",
  "SeABank",
  "VIB",
];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);
const formatNumber = (value) => numberFormatter.format(Number(value) || 0);
const formatWithdrawalAmountInput = (value) => {
  const digitsOnlyValue = String(value || "").replace(/\D/g, "");

  if (!digitsOnlyValue) {
    return "";
  }

  return numberFormatter.format(Number(digitsOnlyValue));
};

const formatDateTime = (value) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const maskAccountNumber = (value) => {
  const rawValue = String(value || "").trim();

  if (rawValue.length <= 4) {
    return rawValue || "--";
  }

  return `${"*".repeat(Math.max(0, rawValue.length - 4))}${rawValue.slice(-4)}`;
};

const withdrawalStatusMeta = {
  pending: {
    label: "Chờ xử lý",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Đã duyệt",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  rejected: {
    label: "Từ chối",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  paid: {
    label: "Đã chi trả",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

const initialPayoutAccountForm = {
  bankName: BANK_OPTIONS[0],
  accountNumber: "",
  accountHolderName: "",
  withdrawalPassword: "",
  confirmWithdrawalPassword: "",
};

const initialWithdrawalForm = {
  payoutAccountId: "",
  amount: "",
  withdrawalPassword: "",
};

const ArtistWithdrawalRequestsPage = () => {
  const [revenue, setRevenue] = useState(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [withdrawalMeta, setWithdrawalMeta] = useState({
    page: 1,
    limit: WITHDRAWAL_REQUEST_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [payoutAccountErrorMessage, setPayoutAccountErrorMessage] = useState("");
  const [withdrawalErrorMessage, setWithdrawalErrorMessage] = useState("");
  const [withdrawalAmountFieldError, setWithdrawalAmountFieldError] = useState("");
  const [withdrawalPasswordFieldError, setWithdrawalPasswordFieldError] = useState("");
  const [isSavingPayoutAccount, setIsSavingPayoutAccount] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [payoutAccountForm, setPayoutAccountForm] = useState(initialPayoutAccountForm);
  const [withdrawalForm, setWithdrawalForm] = useState(initialWithdrawalForm);

  const loadRevenue = useCallback(async () => {
    const payload = await getMyArtistRevenueSummaryService();
    setRevenue(payload);

    return payload;
  }, []);

  const loadWithdrawalRequests = useCallback(async (page = 1, showPageLoader = true) => {
    if (showPageLoader) {
      setIsHistoryLoading(true);
    }

    try {
      const result = await getMyArtistWithdrawalRequestsService({
        page,
        limit: WITHDRAWAL_REQUEST_PAGE_SIZE,
      });

      setWithdrawalRequests(result.items || []);
      setWithdrawalMeta(
        result.meta || {
          page: 1,
          limit: WITHDRAWAL_REQUEST_PAGE_SIZE,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      );
    } finally {
      if (showPageLoader) {
        setIsHistoryLoading(false);
      }
    }
  }, []);

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      await Promise.all([loadRevenue(), loadWithdrawalRequests(1, false)]);
    } catch (error) {
      setRevenue(null);
      setWithdrawalRequests([]);
      setErrorMessage(
        getApiErrorMessage(error, "Không thể tải dữ liệu rút tiền lúc này.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadRevenue, loadWithdrawalRequests]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const payoutAccounts = revenue?.payoutAccounts || [];
  const hasWithdrawalPassword = Boolean(revenue?.hasWithdrawalPassword);
  const balance = revenue?.balance || null;
  const withdrawalSummary = revenue?.withdrawalSummary || {};

  useEffect(() => {
    if (payoutAccounts.length === 0) {
      setWithdrawalForm((currentForm) => ({
        ...currentForm,
        payoutAccountId: "",
      }));
      return;
    }

    const hasSelectedAccount = payoutAccounts.some(
      (account) => account.id === withdrawalForm.payoutAccountId
    );

    if (hasSelectedAccount) {
      return;
    }

    const defaultAccount =
      payoutAccounts.find((account) => account.isDefault) || payoutAccounts[0];

    setWithdrawalForm((currentForm) => ({
      ...currentForm,
      payoutAccountId: defaultAccount?.id || "",
    }));
  }, [payoutAccounts, withdrawalForm.payoutAccountId]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Số dư khả dụng",
        value: formatCurrency(balance?.availableAmount),
        helper: "Số tiền hiện có thể gửi yêu cầu rút ngay.",
        icon: Wallet,
      },
      {
        label: "Đang chờ xử lý",
        value: formatCurrency(withdrawalSummary?.pendingAmount),
        helper: "Tổng giá trị các yêu cầu rút tiền chưa hoàn tất.",
        icon: Landmark,
      },
      {
        label: "Tài khoản đã lưu",
        value: formatNumber(payoutAccounts.length),
        helper: "Chọn một tài khoản đã lưu khi tạo yêu cầu rút tiền.",
        icon: ReceiptText,
      },
    ],
    [balance, payoutAccounts.length, withdrawalSummary]
  );

  const handlePayoutAccountFormChange = (field, value) => {
    setPayoutAccountForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleWithdrawalFormChange = (field, value) => {
    if (field === "amount") {
      setWithdrawalAmountFieldError("");
    }

    if (field === "withdrawalPassword") {
      setWithdrawalPasswordFieldError("");
    }

    setWithdrawalForm((currentForm) => ({
      ...currentForm,
      [field]: field === "amount" ? String(value || "").replace(/\D/g, "") : value,
    }));
  };

  const handleCreatePayoutAccount = async (event) => {
    event.preventDefault();

    setPayoutAccountErrorMessage("");
    setWithdrawalErrorMessage("");
    setActionMessage("");

    if (
      !hasWithdrawalPassword &&
      payoutAccountForm.withdrawalPassword !== payoutAccountForm.confirmWithdrawalPassword
    ) {
      setPayoutAccountErrorMessage("Mật khẩu rút tiền xác nhận không khớp.");
      return;
    }

    setIsSavingPayoutAccount(true);

    try {
      const result = await createMyArtistPayoutAccountService({
        bankName: payoutAccountForm.bankName,
        accountNumber: payoutAccountForm.accountNumber.trim(),
        accountHolderName: payoutAccountForm.accountHolderName.trim(),
        withdrawalPassword: hasWithdrawalPassword
          ? ""
          : payoutAccountForm.withdrawalPassword,
      });

      await loadRevenue();
      setPayoutAccountForm(initialPayoutAccountForm);
      setActionMessage("Đã lưu tài khoản nhận tiền thành công.");

      if (result?.payoutAccount?.id) {
        setWithdrawalForm((currentForm) => ({
          ...currentForm,
          payoutAccountId: result.payoutAccount.id,
        }));
      }
    } catch (error) {
      setPayoutAccountErrorMessage(
        getApiErrorMessage(error, "Không thể lưu tài khoản nhận tiền lúc này.")
      );
    } finally {
      setIsSavingPayoutAccount(false);
    }
  };

  const handleSubmitWithdrawal = async (event) => {
    event.preventDefault();

    setWithdrawalErrorMessage("");
    setWithdrawalAmountFieldError("");
    setWithdrawalPasswordFieldError("");
    setPayoutAccountErrorMessage("");
    setActionMessage("");
    setIsSubmittingWithdrawal(true);

    try {
      const normalizedAmount = Math.round(Number(withdrawalForm.amount || 0));

      if (!Number.isFinite(normalizedAmount) || normalizedAmount < 200000) {
        setWithdrawalAmountFieldError("Số tiền rút tối thiểu là 200.000đ.");
        setIsSubmittingWithdrawal(false);
        return;
      }

      await createMyArtistWithdrawalRequestService({
        payoutAccountId: withdrawalForm.payoutAccountId,
        withdrawalPassword: withdrawalForm.withdrawalPassword,
        amount: normalizedAmount,
      });

      await Promise.all([loadRevenue(), loadWithdrawalRequests(1)]);
      setWithdrawalForm((currentForm) => ({
        ...currentForm,
        amount: "",
        withdrawalPassword: "",
      }));
      setActionMessage(
        "Yêu cầu rút tiền đã được tạo thành công. Bạn có thể theo dõi trạng thái ở danh sách bên dưới."
      );
    } catch (error) {
      const fieldName = error?.response?.data?.errors?.field || "";
      const apiMessage = getApiErrorMessage(
        error,
        "Không thể tạo yêu cầu rút tiền lúc này."
      );

      if (fieldName === "amount") {
        setWithdrawalAmountFieldError(apiMessage);
      } else if (fieldName === "withdrawalPassword") {
        setWithdrawalPasswordFieldError(apiMessage);
      } else {
        setWithdrawalErrorMessage(apiMessage);
      }
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-[#ebe6ff] bg-white p-10 text-[#6b6682] shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-[#6f5cf1]" aria-hidden />
        <p className="mt-4 text-sm">Đang tải dữ liệu yêu cầu rút tiền...</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#7c6cf2]">
            Thanh toán cho nghệ sĩ
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#241b15]">
            Yêu cầu rút tiền
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6a647d]">
            Lưu sẵn tài khoản nhận tiền trước, sau đó chỉ cần chọn tài khoản đã lưu, nhập mật khẩu rút tiền và số tiền muốn rút.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-[22px] border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          {actionMessage}
        </div>
      ) : null}

      {payoutAccountErrorMessage ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {payoutAccountErrorMessage}
        </div>
      ) : null}

      {withdrawalErrorMessage ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {withdrawalErrorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {summaryCards.map(({ label, value, helper, icon: Icon }) => (
          <article
            key={label}
            className="rounded-[24px] border border-[#ebe6ff] bg-white p-5 shadow-sm"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5f1ff] text-[#6f5cf1]">
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7c7891]">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#241b15]">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#6a647d]">{helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1.15fr]">
        <section className="rounded-[28px] border border-[#ebe6ff] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7c6cf2]">
              Tài khoản nhận tiền
            </p>
            <h3 className="text-2xl font-semibold tracking-tight text-[#241b15]">
              Lưu tài khoản ngân hàng
            </h3>
            <p className="max-w-2xl text-sm leading-6 text-[#6a647d]">
              Tài khoản đã lưu sẽ xuất hiện ở form rút tiền để bạn chọn lại nhanh hơn.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {payoutAccounts.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-neutral-200 px-4 py-5 text-sm text-[#6a647d]">
                Chưa có tài khoản nhận tiền nào được lưu.
              </div>
            ) : (
              payoutAccounts.map((account) => (
                <article
                  key={account.id}
                  className="rounded-[22px] border border-[#efeaff] bg-[#fcfbff] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#241b15]">
                        {account.bankName}
                      </p>
                      <p className="mt-1 text-sm text-[#6a647d]">
                        {maskAccountNumber(account.accountNumber)}
                      </p>
                      <p className="mt-1 text-xs text-[#8b84a6]">
                        {account.accountHolderName}
                      </p>
                    </div>

                    {account.isDefault ? (
                      <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                        Mặc định
                      </span>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>

          <form onSubmit={handleCreatePayoutAccount} className="mt-6 grid gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#2f2747]">Ngân hàng</label>
              <select
                value={payoutAccountForm.bankName}
                onChange={(event) =>
                  handlePayoutAccountFormChange("bankName", event.target.value)
                }
                className="h-12 w-full rounded-2xl border border-[#e7e1ff] bg-white px-4 text-sm text-[#241b15] outline-none transition focus:border-[#7c6cf2]"
              >
                {BANK_OPTIONS.map((bankName) => (
                  <option key={bankName} value={bankName}>
                    {bankName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#2f2747]">Số tài khoản</label>
              <input
                type="text"
                value={payoutAccountForm.accountNumber}
                onChange={(event) =>
                  handlePayoutAccountFormChange("accountNumber", event.target.value)
                }
                className="h-12 w-full rounded-2xl border border-[#e7e1ff] bg-white px-4 text-sm text-[#241b15] outline-none transition focus:border-[#7c6cf2]"
                placeholder="Ví dụ: 123456789"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#2f2747]">Tên chủ tài khoản</label>
              <input
                type="text"
                value={payoutAccountForm.accountHolderName}
                onChange={(event) =>
                  handlePayoutAccountFormChange("accountHolderName", event.target.value)
                }
                className="h-12 w-full rounded-2xl border border-[#e7e1ff] bg-white px-4 text-sm text-[#241b15] outline-none transition focus:border-[#7c6cf2]"
                placeholder="Nhập đúng tên người nhận tiền"
                required
              />
            </div>

            {!hasWithdrawalPassword ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#2f2747]">Tạo mật khẩu rút tiền</label>
                  <input
                    type="password"
                    value={payoutAccountForm.withdrawalPassword}
                    onChange={(event) =>
                      handlePayoutAccountFormChange(
                        "withdrawalPassword",
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-[#e7e1ff] bg-white px-4 text-sm text-[#241b15] outline-none transition focus:border-[#7c6cf2]"
                    placeholder="Ít nhất 6 ký tự"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#2f2747]">Xác nhận mật khẩu rút tiền</label>
                  <input
                    type="password"
                    value={payoutAccountForm.confirmWithdrawalPassword}
                    onChange={(event) =>
                      handlePayoutAccountFormChange(
                        "confirmWithdrawalPassword",
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-[#e7e1ff] bg-white px-4 text-sm text-[#241b15] outline-none transition focus:border-[#7c6cf2]"
                    placeholder="Nhập lại mật khẩu rút tiền"
                    required
                  />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-[#efeaff] bg-[#faf8ff] px-4 py-3 text-sm text-[#6a647d]">
                Mật khẩu rút tiền đã được thiết lập. Bạn chỉ cần lưu thêm tài khoản nhận tiền mới.
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingPayoutAccount}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6f5cf1] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5f4fe0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingPayoutAccount ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu tài khoản nhận tiền"
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-[#ebe6ff] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7c6cf2]">
              Tạo yêu cầu mới
            </p>
            <h3 className="text-2xl font-semibold tracking-tight text-[#241b15]">
              Rút tiền từ số dư hiện có
            </h3>
            <p className="max-w-2xl text-sm leading-6 text-[#6a647d]">
              Chọn tài khoản đã lưu, nhập mật khẩu rút tiền và số tiền muốn rút để gửi yêu cầu cho admin.
            </p>
          </div>

          <form onSubmit={handleSubmitWithdrawal} className="mt-6 grid gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#2f2747]">Tài khoản đã lưu</label>
              <select
                value={withdrawalForm.payoutAccountId}
                onChange={(event) =>
                  handleWithdrawalFormChange("payoutAccountId", event.target.value)
                }
                className="h-12 w-full rounded-2xl border border-[#e7e1ff] bg-white px-4 text-sm text-[#241b15] outline-none transition focus:border-[#7c6cf2]"
                disabled={payoutAccounts.length === 0}
                required
              >
                <option value="">Chọn tài khoản nhận tiền</option>
                {payoutAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {`${account.bankName} - ${maskAccountNumber(account.accountNumber)} - ${account.accountHolderName}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#2f2747]">Số tiền muốn rút</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatWithdrawalAmountInput(withdrawalForm.amount)}
                onChange={(event) =>
                  handleWithdrawalFormChange("amount", event.target.value)
                }
                className="h-12 w-full rounded-2xl border border-[#e7e1ff] bg-white px-4 text-sm text-[#241b15] outline-none transition focus:border-[#7c6cf2]"
                placeholder="Ví dụ: 500000"
                required
              />
              <p className="text-xs text-[#8b84a6]">
                Khả dụng hiện tại: {formatCurrency(balance?.availableAmount)}. Tối thiểu mỗi lần rút: 200.000đ.
              </p>
              {withdrawalAmountFieldError ? (
                <p className="text-xs text-rose-600">{withdrawalAmountFieldError}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#2f2747]">Mật khẩu rút tiền</label>
              <input
                type="password"
                value={withdrawalForm.withdrawalPassword}
                onChange={(event) =>
                  handleWithdrawalFormChange(
                    "withdrawalPassword",
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-2xl border border-[#e7e1ff] bg-white px-4 text-sm text-[#241b15] outline-none transition focus:border-[#7c6cf2]"
                placeholder="Nhập mật khẩu rút tiền"
                required
              />
              {withdrawalPasswordFieldError ? (
                <p className="text-xs text-rose-600">
                  {withdrawalPasswordFieldError}
                </p>
              ) : null}
            </div>

            {payoutAccounts.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Bạn cần lưu ít nhất một tài khoản nhận tiền trước khi tạo yêu cầu rút tiền.
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#d8e7ff] bg-[linear-gradient(135deg,rgba(237,244,255,0.95),rgba(248,251,255,0.98))] px-4 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#3b82f6] shadow-sm">
                  <CircleAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1f4f9c]">
                    Kiểm tra kỹ tài khoản và số tiền trước khi gửi.
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#4a6a9a]">
                    Admin sẽ dựa trên tài khoản đã lưu của bạn để duyệt và xử lý thanh toán.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingWithdrawal || payoutAccounts.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6f5cf1] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5f4fe0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingWithdrawal ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  "Gửi yêu cầu rút tiền"
                )}
              </button>
            </div>
          </form>
        </section>
      </section>

      <section className="rounded-[28px] border border-[#ebe6ff] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[#241b15]">
              Yêu cầu rút tiền gần đây
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6a647d]">
              Danh sách gọn các yêu cầu gần nhất, hiển thị tối đa 10 dòng mỗi trang.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#ebe6ff] bg-[#faf8ff] px-4 py-3 text-sm font-medium text-[#645d86]">
            <Wallet className="h-4 w-4 text-[#6f5cf1]" />
            {formatNumber(withdrawalMeta?.totalItems || 0)} yêu cầu
          </div>
        </div>

        {withdrawalRequests.length === 0 ? (
          <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 px-6 py-10 text-center">
            <p className="text-base font-semibold text-[#241b15]">
              Chưa có yêu cầu rút tiền nào
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6a647d]">
              Khi bạn tạo yêu cầu đầu tiên, thông tin sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-[#f0ebff] text-left text-sm">
                <thead className="bg-[linear-gradient(180deg,#fdfcff_0%,#faf8ff_100%)] text-[#7c7891]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Thời gian</th>
                    <th className="px-4 py-3 font-semibold">Số tiền</th>
                    <th className="px-4 py-3 font-semibold">Ngân hàng</th>
                    <th className="px-4 py-3 font-semibold">Tài khoản nhận</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f4f0ff]">
                  {withdrawalRequests.map((request) => {
                    const status =
                      withdrawalStatusMeta[request.status] || withdrawalStatusMeta.pending;

                    return (
                      <tr
                        key={request.id}
                        className="bg-white text-[#2f261f] transition hover:bg-[#fcfbff]"
                      >
                        <td className="px-4 py-4 align-top text-[#6a647d]">
                          {formatDateTime(request.requestedAt)}
                        </td>
                        <td className="px-4 py-4 align-top font-semibold text-[#241b15]">
                          {formatCurrency(request.amount)}
                        </td>
                        <td className="px-4 py-4 align-top text-[#4f4963]">
                          {request.accountInfo?.bankName || "--"}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-medium text-[#241b15]">
                            {maskAccountNumber(request.accountInfo?.accountNumber)}
                          </p>
                          <p className="mt-1 text-xs text-[#8b84a6]">
                            {request.accountInfo?.accountHolderName || "--"}
                          </p>
                          {request.rejectReason ? (
                            <p className="mt-1 text-xs text-rose-700">
                              Từ chối: {request.rejectReason}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span
                            className={[
                              "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                              status.className,
                            ].join(" ")}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#6a647d]">
                Trang {withdrawalMeta.page || 1} / {withdrawalMeta.totalPages || 1}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    loadWithdrawalRequests(
                      Math.max(1, (withdrawalMeta.page || 1) - 1)
                    )
                  }
                  disabled={!withdrawalMeta.hasPreviousPage || isHistoryLoading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#e7e1ff] px-4 py-2 text-sm font-medium text-[#645d86] transition hover:bg-[#faf8ff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() =>
                    loadWithdrawalRequests((withdrawalMeta.page || 1) + 1)
                  }
                  disabled={!withdrawalMeta.hasNextPage || isHistoryLoading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#e7e1ff] px-4 py-2 text-sm font-medium text-[#645d86] transition hover:bg-[#faf8ff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isHistoryLoading ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#6a647d]">
                <Loader2 className="h-4 w-4 animate-spin text-[#6f5cf1]" />
                Đang tải danh sách yêu cầu...
              </div>
            ) : null}
          </>
        )}
      </section>
    </section>
  );
};

export default ArtistWithdrawalRequestsPage;
