import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";
import { StatusBadge } from "./RevenueShared";
import {
  REVENUE_ACTIONS,
  buildActionResultItems,
  getRevenuePeriodLabel,
} from "../revenueOverviewModel";

const RevenueActionConfirmModal = ({
  period,
  modalState,
  onClose,
  onConfirm,
}) => {
  if (!modalState?.isOpen) {
    return null;
  }

  const actionKey = modalState.actionKey;
  const action = actionKey ? REVENUE_ACTIONS[actionKey] : null;
  const phase = modalState.phase || "idle";
  const isSubmitting = phase === "submitting";
  const isSuccess = phase === "success";
  const isError = phase === "error";
  const resultItems = buildActionResultItems(actionKey, modalState.result);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                {isSubmitting ? (
                  <LoaderCircle size={22} className="animate-spin" />
                ) : (
                  <Sparkles size={22} />
                )}
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {action?.title || "Xử lý doanh thu"}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span>{getRevenuePeriodLabel(period)}</span>
                  <span className="text-slate-300">•</span>
                  <StatusBadge status={period?.status} />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className="text-sm leading-7 text-slate-600">
              {action?.description}
            </p>
          </div>

          {isSubmitting ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <LoaderCircle
                  size={18}
                  className="mt-0.5 shrink-0 animate-spin text-sky-600"
                />
                <div>
                  <p className="text-sm font-semibold text-sky-900">
                    Đang xử lý yêu cầu
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sky-700">
                    Hệ thống đang cập nhật dữ liệu doanh thu cho bước này.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
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
                      {action?.successMessage}
                    </p>
                  </div>
                </div>
              </div>

              {resultItems.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {resultItems.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSuccess ? "Đóng" : "Hủy"}
          </button>

          {phase === "idle" ? (
            <button
              type="button"
              onClick={() => void onConfirm()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <CheckCircle2 size={16} />
              {action?.buttonLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RevenueActionConfirmModal;
