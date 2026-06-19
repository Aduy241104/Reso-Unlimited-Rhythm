import { Calculator, CheckCircle2, Lock, LoaderCircle } from "lucide-react";
import {
  getRevenueActionLabel,
  isRevenueActionEnabled,
} from "../workflow";

const ACTIONS = [
  {
    key: "close",
    icon: Lock,
  },
  {
    key: "calculate",
    icon: Calculator,
  },
  {
    key: "confirm",
    icon: CheckCircle2,
  },
];

const RevenueWorkflowActions = ({ period, actionModal, onOpenAction }) => {
  const hasPeriodId = Boolean(period?.id);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        const isEnabled = hasPeriodId && isRevenueActionEnabled(period, action.key);
        const isActive =
          actionModal?.isOpen &&
          actionModal?.actionKey === action.key &&
          actionModal?.phase === "submitting";

        return (
          <button
            key={action.key}
            type="button"
            onClick={() => onOpenAction(action.key)}
            disabled={!isEnabled || isActive}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
              isEnabled
                ? action.key === "confirm"
                  ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800"
                  : "border-violet-200 bg-white text-slate-900 hover:border-violet-300 hover:bg-violet-50"
                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            }`}
          >
            {isActive ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Icon size={16} />
            )}
            {getRevenueActionLabel(period, action.key)}
          </button>
        );
      })}
    </div>
  );
};

export default RevenueWorkflowActions;
