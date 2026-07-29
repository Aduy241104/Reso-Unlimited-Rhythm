import { ClipboardList, LoaderCircle } from "lucide-react";
import { resolveRevenueWorkflow } from "../workflow";

const RevenueWorkflowActions = ({ period, actionModal, onOpenAction }) => {
  const workflow = resolveRevenueWorkflow(period);
  const hasAvailableAction = Object.values(workflow.actions ?? {}).some(Boolean);
  const isSubmitting = actionModal?.isOpen && actionModal?.phase === "submitting";

  return (
    <button
      type="button"
      onClick={() => onOpenAction()}
      disabled={isSubmitting}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
        hasAvailableAction
          ? "border-violet-200 bg-white text-slate-900 hover:border-violet-300 hover:bg-violet-50"
          : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {isSubmitting ? (
        <LoaderCircle size={16} className="animate-spin" />
      ) : (
        <ClipboardList size={16} />
      )}
      Xử lý doanh thu
    </button>
  );
};

export default RevenueWorkflowActions;
