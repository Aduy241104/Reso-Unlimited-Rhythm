import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { DashboardCard } from "./RevenueShared";
import {
  getRevenueReminderTone,
  getRevenueWorkflowSteps,
  resolveRevenueWorkflow,
} from "../workflow";

const STEP_TONE = {
  completed: {
    dot: "border-emerald-200 bg-emerald-100 text-emerald-700",
    card: "border-emerald-200 bg-emerald-50",
    label: "Da xong",
  },
  active: {
    dot: "border-violet-200 bg-violet-100 text-violet-700",
    card: "border-violet-200 bg-violet-50",
    label: "Dang den luot",
  },
  pending: {
    dot: "border-slate-200 bg-slate-100 text-slate-500",
    card: "border-slate-200 bg-white",
    label: "Chua mo khoa",
  },
};

const RevenueWorkflowOverview = ({ period }) => {
  const workflow = resolveRevenueWorkflow(period);
  const reminder = workflow.reminder;
  const reminderTone = getRevenueReminderTone(reminder?.severity);
  const steps = getRevenueWorkflowSteps(period);

  return (
    <DashboardCard className="border-violet-200/60 bg-white">
      <div className="space-y-5 px-5 py-5 lg:px-6">
        {reminder ? (
          <div
            className={`rounded-2xl border px-4 py-4 ${reminderTone.container}`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Workflow hien tai</p>
                <p className={`mt-1 text-sm leading-6 ${reminderTone.text}`}>
                  {reminder.message}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-3">
          {steps.map((step, index) => {
            const tone = STEP_TONE[step.state] || STEP_TONE.pending;

            return (
              <div
                key={step.key}
                className={`rounded-2xl border px-4 py-4 ${tone.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Buoc {index + 1}
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-950">
                      {step.label}
                    </p>
                  </div>

                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border ${tone.dot}`}
                  >
                    {step.state === "completed" ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Circle size={16} />
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {tone.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardCard>
  );
};

export default RevenueWorkflowOverview;
