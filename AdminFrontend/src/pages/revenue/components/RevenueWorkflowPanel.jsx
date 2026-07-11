import React from "react";
import { REVENUE_ACTIONS } from "../revenueOverviewModel";

const RevenueWorkflowPanel = ({ workflowCards = [], onActionClick }) => {
    const completedCount = workflowCards.filter(
        (step) => step.state === "completed"
    ).length;

    const progressPercent =
        workflowCards.length > 0
            ? Math.round((completedCount / workflowCards.length) * 100)
            : 0;

    return (
        <div className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-950">
                        Quy trình doanh thu
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Chốt kỳ, tính phân bổ và xác nhận doanh thu cho nghệ sĩ.
                    </p>
                </div>

                <div className="w-full lg:w-56">
                    <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>Tiến độ</span>
                        <span>{ progressPercent }%</span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                            style={ { width: `${progressPercent}%` } }
                        />
                    </div>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                { workflowCards.map((step, index) => {
                    const isCompleted = step.state === "completed";

                    return (
                        <div
                            key={ step.key }
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    className={ `flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCompleted
                                            ? "bg-indigo-500 text-white"
                                            : step.isAvailable
                                                ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                                                : "bg-white text-slate-400 ring-1 ring-slate-200"
                                        }` }
                                >
                                    { index + 1 }
                                </span>

                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-950">
                                        { step.title }
                                    </p>
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                        { step.tone.label }
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={ () => onActionClick(step.key) }
                                disabled={ !step.isAvailable }
                                className={ `shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${step.isAvailable
                                        ? "bg-indigo-500 text-white hover:bg-indigo-600"
                                        : "cursor-not-allowed bg-white text-slate-400"
                                    }` }
                            >
                                { REVENUE_ACTIONS[step.key].buttonLabel }
                            </button>
                        </div>
                    );
                }) }
            </div>
        </div>
    );
};

export default RevenueWorkflowPanel;