import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  CircleDollarSign,
  LoaderCircle,
  Lock,
  Music2,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { routePaths } from "../../../routes/routePaths";
import { StatusBadge } from "./RevenueShared";
import { formatCurrency, formatNumber, formatPeriodLabel } from "../utils";
import {
  getRevenueActionLabel,
  getRevenueWorkflowSteps,
  isRevenueActionEnabled,
} from "../workflow";

const ACTION_CONFIG = {
  close: {
    title: "Chốt kỳ doanh thu",
    icon: Lock,
    loadingDescription:
      "Hệ thống đang khóa kỳ, tổng hợp doanh thu premium và đếm stream hợp lệ.",
    successTitle: "Chốt kỳ thành công",
  },
  calculate: {
    title: "Tính doanh thu",
    icon: Calculator,
    loadingDescription:
      "Hệ thống đang tính doanh thu cho nghệ sĩ và cập nhật doanh thu theo bài hát.",
    successTitle: "Tính doanh thu thành công",
  },
  confirm: {
    title: "Xác nhận phân phối",
    icon: CheckCircle2,
    loadingDescription:
      "Hệ thống đang cộng tiền vào số dư nghệ sĩ và khóa bước xác nhận của kỳ này.",
    successTitle: "Xác nhận phân phối thành công",
  },
};

const STEP_TONE = {
  completed: {
    icon: "bg-blue-600 text-white border-blue-600",
    text: "text-slate-900",
    pill: "border-blue-200 bg-blue-50 text-blue-700",
    label: "Đã hoàn tất",
  },
  active: {
    icon: "bg-blue-600 text-white border-blue-600",
    text: "text-blue-700",
    pill: "border-blue-200 bg-blue-50 text-blue-700",
    label: "Đang xử lý",
  },
  pending: {
    icon: "bg-white text-slate-400 border-slate-200",
    text: "text-slate-500",
    pill: "border-slate-200 bg-slate-50 text-slate-500",
    label: "Chưa sẵn sàng",
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
          label: "Lượt stream hợp lệ",
          value: formatNumber(result.totalEligibleStreams),
          icon: Music2,
        },
      ];
    case "calculate":
      return [
        {
          key: "artistSummaryCount",
          label: "Bản ghi nghệ sĩ đã cập nhật",
          value: formatNumber(result.artistSummaryCount),
          icon: Wallet,
        },
        {
          key: "trackRevenueCount",
          label: "Bản ghi doanh thu bài hát đã cập nhật",
          value: formatNumber(result.trackRevenueCount),
          icon: Music2,
        },
      ];
    case "confirm":
      return [
        {
          key: "confirmedArtistCount",
          label: "Nghệ sĩ đã được cộng tiền",
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

const RevenueWorkflowModal = ({
  period,
  modalState,
  onClose,
  onConfirm,
  onSelectAction,
}) => {
  const location = useLocation();

  if (!modalState?.isOpen) {
    return null;
  }

  const phase = modalState.phase || "idle";
  const steps = getRevenueWorkflowSteps(period);
  const isSubmitting = phase === "submitting";
  const isSuccess = phase === "success";
  const isError = phase === "error";
  const selectedActionKey = modalState.actionKey;
  const selectedActionConfig = selectedActionKey
    ? ACTION_CONFIG[selectedActionKey]
    : null;
  const Icon = selectedActionConfig?.icon ?? Sparkles;
  const resultItems = buildResultItems(selectedActionKey, modalState.result);
  const completedCount = steps.filter((step) => step.state === "completed").length;
  const activeStep =
    steps.find((step) => step.state === "active") ||
    steps[completedCount] ||
    null;
  const actionLabel = selectedActionKey
    ? getRevenueActionLabel(period, selectedActionKey)
    : "";
  const isDetailPage =
    location.pathname === routePaths.revenueSharingDetail(period?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] shadow-[0_24px_60px_rgba(37,99,235,0.16)]">
        <div className="border-b border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#f5f9ff_100%)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-[inset_0_0_0_1px_rgba(191,219,254,0.8)]">
                {isSubmitting ? (
                  <LoaderCircle size={22} className="animate-spin" />
                ) : (
                  <Sparkles size={22} />
                )}
              </div>

              <div className="space-y-1.5">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    Phân phối doanh thu
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    {formatPeriodLabel(period?.year, period?.month)}
                    <span className="text-slate-300">•</span>
                    <StatusBadge status={period?.status} />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-blue-100 bg-white p-2 text-slate-400 transition hover:border-blue-200 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border border-blue-100 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(59,130,246,0.06)]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">
                  Tiến trình xử lý
                </p>

                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {completedCount}/{steps.length} hoàn tất
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                {steps.map((step, index) => {
                  const tone = STEP_TONE[step.state] || STEP_TONE.pending;
                  const nextStep = steps[index + 1];
                  const connectorFilled =
                    step.state === "completed" &&
                    (nextStep?.state === "completed" || nextStep?.state === "active");

                  return (
                    <div key={step.key} className="relative flex flex-col items-center text-center">
                      <div className="flex w-full items-center justify-center">
                        <div
                          className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border ${tone.icon}`}
                        >
                          {step.state === "pending" ? (
                            <span className="text-xs font-semibold">{index + 1}</span>
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                        </div>

                        {index < steps.length - 1 ? (
                          <div
                            className={`absolute left-[calc(50%+1.25rem)] right-[-50%] top-4 h-[3px] rounded-full ${
                              connectorFilled ? "bg-blue-600" : "bg-blue-100"
                            }`}
                          />
                        ) : null}
                      </div>

                      <p className={`mt-2.5 text-[13px] font-semibold ${tone.text}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(59,130,246,0.06)]">
            <p className="text-sm font-semibold text-slate-950">Thao tác</p>

            <div className="mt-3 grid gap-2.5">
              {steps.map((step) => {
                const isEnabled = isRevenueActionEnabled(period, step.key);
                const isSelected = selectedActionKey === step.key;
                const tone = STEP_TONE[step.state] || STEP_TONE.pending;
                const StepIcon = ACTION_CONFIG[step.key]?.icon ?? Sparkles;

                return (
                  <div
                    key={step.key}
                    className={`rounded-2xl border bg-white px-4 py-4 transition ${
                      isSelected
                        ? "border-blue-300 ring-2 ring-blue-100"
                        : "border-blue-100"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <StepIcon size={17} />
                        </div>

                        <p className="text-sm font-semibold text-slate-950">
                          {step.label}
                        </p>

                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.pill}`}
                        >
                          {tone.label}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectAction?.(step.key)}
                        disabled={!isEnabled || isSubmitting}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          isEnabled
                            ? "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                            : "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                        }`}
                      >
                        <ChevronRight size={16} />
                        {getRevenueActionLabel(period, step.key)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isSubmitting ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <LoaderCircle
                  size={18}
                  className="mt-0.5 shrink-0 animate-spin text-blue-600"
                />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Đang xử lý yêu cầu
                  </p>
                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    {selectedActionConfig?.loadingDescription}
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
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
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
                      Dữ liệu doanh thu đã được cập nhật và dashboard sẽ được làm mới
                      sau thao tác này.
                    </p>
                  </div>
                </div>
              </div>

              {resultItems.length > 0 ? (
                <div className="grid gap-2.5 md:grid-cols-2">
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

                          <div className="rounded-2xl bg-white p-2 text-blue-600">
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

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-blue-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Đóng
          </button>

          {phase === "idle" && selectedActionConfig ? (
            <button
              type="button"
              onClick={() => void onConfirm()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Icon size={16} />
              {actionLabel}
            </button>
          ) : !isDetailPage && period?.id ? (
            <Link
              to={routePaths.revenueSharingDetail(period.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <CircleDollarSign size={16} />
              Xem chi tiết phân phối
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RevenueWorkflowModal;
