import React from "react";
import { REVENUE_ACTIONS } from "../revenueOverviewModel";

const RevenueWorkflowPanel = ({ workflowCards = [], onActionClick }) => {
    return (
        <div className="border-b border-slate-200 bg-white px-5 py-4">
            <div>
                <div>
                    <h2 className="text-base font-semibold text-slate-950">
                        {"Quy tr\u00ECnh doanh thu"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {"Ch\u1ED1t k\u1EF3, t\u00EDnh ph\u00E2n b\u1ED5 v\u00E0 x\u00E1c nh\u1EADn doanh thu cho ngh\u1EC7 s\u0129."}
                    </p>
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
                                        { step.unavailableReason || step.tone.label }
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
