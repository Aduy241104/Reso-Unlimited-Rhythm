import { Clock3, X } from "lucide-react";
import { StatusBadge } from "./RevenueShared";
import {
  formatLifecycleValue,
  getRevenuePeriodLabel,
} from "../revenueOverviewModel";

const RevenueLifecycleModal = ({
  isOpen,
  onClose,
  period,
  lifecycleItems,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Clock3 size={22} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  Lịch sử xử lý
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
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {lifecycleItems.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">
                Chưa có mốc thời gian nào được ghi nhận cho kỳ này.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {lifecycleItems.map((item, index) => (
                <div key={item.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3.5 w-3.5 rounded-full bg-slate-900" />
                    {index < lifecycleItems.length - 1 ? (
                      <div className="mt-2 h-full w-px bg-slate-200" />
                    ) : null}
                  </div>

                  <div className="pb-5">
                    <p className="text-sm font-semibold text-slate-950">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatLifecycleValue(item.value)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {item.helper}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueLifecycleModal;
