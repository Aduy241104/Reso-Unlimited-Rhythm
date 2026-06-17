import { Tooltip } from "recharts";
import { formatCurrency } from "../utils";

export const RevenueTooltipContent = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-xl">
      <p className="text-sm font-semibold text-slate-900">{payload[0].name}</p>
      <p className="mt-1 text-sm text-slate-600">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
};

export const RevenueTooltip = (props) => (
  <Tooltip content={<RevenueTooltipContent {...props} />} />
);
