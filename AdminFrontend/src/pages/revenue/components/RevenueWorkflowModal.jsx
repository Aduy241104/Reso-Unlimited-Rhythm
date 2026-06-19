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
import { formatCurrency, formatNumber, formatPeriodLabel } from "../utils";
import { getRevenueActionLabel, resolveRevenueWorkflow } from "../workflow";

const ACTION_CONFIG = {
  close: {
    title: "Chot ky doanh thu",
    icon: Lock,
    idleDescription:
      "Sau khi chot ky, he thong se khoa so lieu doanh thu cua ky nay de chuan bi cho buoc tinh doanh thu.",
    loadingDescription:
      "He thong dang khoa ky, tong hop premium revenue va dem stream hop le.",
    successTitle: "Chot ky thanh cong",
  },
  calculate: {
    title: "Tinh doanh thu",
    icon: Calculator,
    idleDescription:
      "He thong se phan bo artist pool theo tong stream hop le cua artist va track trong ky nay.",
    loadingDescription:
      "He thong dang tinh doanh thu cho artist va cap nhat revenue theo track.",
    successTitle: "Tinh doanh thu thanh cong",
  },
  confirm: {
    title: "Xac nhan phan phoi",
    icon: CheckCircle2,
    idleDescription:
      "Sau khi xac nhan, doanh thu da tinh se duoc cong vao so du cua artist va khong the xac nhan lai.",
    loadingDescription:
      "He thong dang cong tien vao so du artist va khoa buoc xac nhan cua ky nay.",
    successTitle: "Xac nhan phan phoi thanh cong",
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
          label: "Quy nghe si",
          value: formatCurrency(result.totalArtistPool),
          icon: Wallet,
        },
        {
          key: "platform",
          label: "Doanh thu nen tang",
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
          label: "Artist summary da cap nhat",
          value: formatNumber(result.artistSummaryCount),
          icon: Wallet,
        },
        {
          key: "trackRevenueCount",
          label: "Track revenue da cap nhat",
          value: formatNumber(result.trackRevenueCount),
          icon: Music2,
        },
      ];
    case "confirm":
      return [
        {
          key: "confirmedArtistCount",
          label: "Artist da cong tien",
          value: formatNumber(result.confirmedArtistCount),
          icon: Wallet,
        },
        {
          key: "totalConfirmedAmount",
          label: "Tong tien da xac nhan",
          value: formatCurrency(result.totalConfirmedAmount),
          icon: CircleDollarSign,
        },
      ];
    default:
      return [];
  }
};

const RevenueWorkflowModal = ({ period, modalState, onClose, onConfirm }) => {
  if (!modalState?.isOpen || !modalState?.actionKey) {
    return null;
  }

  const actionConfig = ACTION_CONFIG[modalState.actionKey];

  if (!actionConfig) {
    return null;
  }

  const Icon = actionConfig.icon;
  const phase = modalState.phase || "idle";
  const workflow = resolveRevenueWorkflow(period);
  const reminder = workflow.reminder;
  const resultItems = buildResultItems(modalState.actionKey, modalState.result);
  const isSubmitting = phase === "submitting";
  const isSuccess = phase === "success";
  const isError = phase === "error";
  const actionLabel = getRevenueActionLabel(period, modalState.actionKey);
  const actionTitle =
    modalState.actionKey === "calculate" && workflow.actions?.canRecalculate
      ? "Tinh lai doanh thu"
      : actionConfig.title;

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
                    {isSuccess ? actionConfig.successTitle : actionTitle}
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

          {phase === "idle" && reminder ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">
                Trang thai hien tai
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {reminder.message}
              </p>
            </div>
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
                    Dang xu ly yeu cau
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
                    Khong the hoan tat thao tac
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
                      Thao tac da hoan tat
                    </p>
                    <p className="mt-1 text-sm leading-6 text-emerald-700">
                      Du lieu doanh thu da duoc cap nhat va dashboard se duoc lam moi
                      sau thao tac nay.
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
            {isSuccess ? "Dong" : "Huy"}
          </button>

          {phase === "idle" ? (
            <button
              type="button"
              onClick={() => void onConfirm()}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Icon size={16} />
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RevenueWorkflowModal;
