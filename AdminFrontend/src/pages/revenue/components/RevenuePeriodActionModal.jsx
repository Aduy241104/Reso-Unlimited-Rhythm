import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  Lock,
  Music2,
  Wallet,
  X,
} from "lucide-react";
import { StatusBadge } from "./RevenueShared";
import {
  formatCurrency,
  formatNumber,
  formatPeriodLabel,
} from "../utils";

const ACTION_CONFIG = {
  close: {
    title: "Chốt kỳ doanh thu",
    icon: Lock,
    confirmLabel: "Chốt kỳ",
    idleDescription:
      "Bạn có chắc muốn chốt kỳ doanh thu này không? Sau khi chốt, kỳ này sẽ được khóa để tính doanh thu.",
    loadingDescription:
      "Hệ thống đang khóa kỳ và tổng hợp doanh thu premium cùng stream hợp lệ.",
    successTitle: "Chốt kỳ thành công",
  },
  calculate: {
    title: "Tính doanh thu",
    icon: Calculator,
    confirmLabel: "Tính doanh thu",
    idleDescription:
      "Bạn có chắc muốn tính doanh thu cho kỳ này không? Hệ thống sẽ chia artist pool theo lượt stream hợp lệ.",
    loadingDescription:
      "Hệ thống đang tính doanh thu cho artist và track trong kỳ đã chọn.",
    successTitle: "Tính doanh thu thành công",
  },
  confirm: {
    title: "Xác nhận phân phối",
    icon: CheckCircle2,
    confirmLabel: "Xác nhận phân phối",
    idleDescription:
      "Bạn có chắc muốn xác nhận phân phối doanh thu không? Sau khi xác nhận, tiền sẽ được cộng vào số dư của artist và không thể xác nhận lại lần nữa.",
    loadingDescription:
      "Hệ thống đang cộng tiền vào số dư artist và khóa bước xác nhận lặp lại.",
    successTitle: "Xác nhận phân phối thành công",
  },
};

const buildResultItems = (actionKey, result) => {
  if (!result) {
    return [];
  }

  switch (actionKey) {
    case "close":
      return [
        {
          key: "premium",
          label: "Doanh thu premium",
          value: formatCurrency(result.totalPremiumRevenue),
          icon: CircleDollarSign,
        },
        {
          key: "artistPool",
          label: "Quỹ nghệ sĩ",
          value: formatCurrency(result.totalArtistPool),
          icon: Wallet,
        },
        {
          key: "platform",
          label: "Doanh thu nền tảng",
          value: formatCurrency(result.totalPlatformRevenue),
          icon: CircleDollarSign,
        },
        {
          key: "streams",
          label: "Eligible streams",
          value: formatNumber(result.totalEligibleStreams),
          icon: Music2,
        },
      ];
    case "calculate":
      return [
        {
          key: "artistSummaryCount",
          label: "Artist summary đã cập nhật",
          value: formatNumber(result.artistSummaryCount),
          icon: Wallet,
        },
        {
          key: "trackRevenueCount",
          label: "Track revenue đã cập nhật",
          value: formatNumber(result.trackRevenueCount),
          icon: Music2,
        },
      ];
    case "confirm":
      return [
        {
          key: "confirmedArtistCount",
          label: "Artist đã cộng tiền",
          value: formatNumber(result.confirmedArtistCount),
          icon: Wallet,
        },
        {
          key: "totalConfirmedAmount",
          label: "Tổng tiền đã xác nhận",
          value: formatCurrency(result.totalConfirmedAmount),
          icon: CircleDollarSign,
        },
      ];
    default:
      return [];
  }
};

const RevenuePeriodActionModal = ({
  period,
  modalState,
  onClose,
  onConfirm,
}) => {
  if (!modalState?.isOpen || !modalState?.actionKey) {
    return null;
  }

  const actionConfig = ACTION_CONFIG[modalState.actionKey];

  if (!actionConfig) {
    return null;
  }

  const Icon = actionConfig.icon;
  const phase = modalState.phase || "idle";
  const resultItems = buildResultItems(modalState.actionKey, modalState.result);
  const isSubmitting = phase === "submitting";
  const isSuccess = phase === "success";
  const isError = phase === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-violet-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        <div className="border-b border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#fcfbff_60%,#f6f2ff_100%)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                {isSubmitting ? (
                  <LoaderCircle size={22} className="animate-spin" />
                ) : (
                  <Icon size={22} />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-500">
                    Revenue Action
                  </p>
                  <StatusBadge status={period?.status} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {isSuccess ? actionConfig.successTitle : actionConfig.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {formatPeriodLabel(period?.year, period?.month)}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          {phase === "idle" ? (
            <p className="text-sm leading-7 text-slate-600">
              {actionConfig.idleDescription}
            </p>
          ) : null}

          {isSubmitting ? (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <LoaderCircle
                  size={18}
                  className="mt-0.5 shrink-0 animate-spin text-violet-600"
                />
                <div>
                  <p className="text-sm font-semibold text-violet-900">
                    Đang xử lý yêu cầu
                  </p>
                  <p className="mt-1 text-sm leading-6 text-violet-700">
                    {actionConfig.loadingDescription}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
                <div>
                  <p className="text-sm font-semibold text-rose-900">
                    Không thể hoàn tất thao tác
                  </p>
                  <p className="mt-1 text-sm leading-6 text-rose-700">
                    {modalState.error}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isSuccess ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Thao tác đã hoàn tất
                    </p>
                    <p className="mt-1 text-sm leading-6 text-emerald-700">
                      Dữ liệu doanh thu đã được cập nhật. Trang doanh thu sẽ tự làm mới khi bạn đóng modal này.
                    </p>
                  </div>
                </div>
              </div>

              {resultItems.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {resultItems.map((item) => {
                    const ResultIcon = item.icon;

                    return (
                      <div
                        key={item.key}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {item.label}
                            </p>
                            <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                              {item.value}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-2 text-violet-600">
                            <ResultIcon size={16} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSuccess ? "Đóng" : "Hủy"}
          </button>

          {phase === "idle" ? (
            <button
              type="button"
              onClick={() => void onConfirm()}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Icon size={16} />
              {actionConfig.confirmLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RevenuePeriodActionModal;
