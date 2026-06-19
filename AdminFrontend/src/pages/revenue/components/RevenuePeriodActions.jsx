import { Calculator, CheckCircle2, Lock, LoaderCircle } from "lucide-react";

const ACTIONS = [
  {
    key: "close",
    label: "Chốt kỳ",
    icon: Lock,
  },
  {
    key: "calculate",
    label: "Tính doanh thu",
    icon: Calculator,
  },
  {
    key: "confirm",
    label: "Xác nhận phân phối",
    icon: CheckCircle2,
  },
];

const getEnabledActionKey = (status) => {
  switch (status) {
    case "open":
      return "close";
    case "closed":
      return "calculate";
    case "calculated":
      return "confirm";
    default:
      return null;
  }
};

const RevenuePeriodActions = ({
  period,
  actionModal,
  onOpenAction,
}) => {
  const enabledActionKey = getEnabledActionKey(period?.status);
  const hasPeriodId = Boolean(period?.id);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        const isEnabled = hasPeriodId && enabledActionKey === action.key;
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
                ? "border-violet-200 bg-white text-slate-900 hover:border-violet-300 hover:bg-violet-50"
                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            }`}
          >
            {isActive ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Icon size={16} />
            )}
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

export default RevenuePeriodActions;
