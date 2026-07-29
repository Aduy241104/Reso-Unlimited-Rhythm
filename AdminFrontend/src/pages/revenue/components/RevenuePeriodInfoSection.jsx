import { DashboardCard } from "./RevenueShared";
import { formatDate, formatDateTime } from "../utils";

const InfoItem = ({ label, value, helper, tone = "muted" }) => (
  <div
    className={`rounded-2xl border p-4 ${
      tone === "muted"
        ? "border-slate-200 bg-slate-50"
        : "border-slate-200 bg-white"
    }`}
  >
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
  </div>
);

const RevenuePeriodInfoSection = ({
  period,
  confirmedByLabel,
  confirmedByEmail,
  lifecycleTimestamps,
}) => (
  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
    <DashboardCard className="border-slate-200">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">
          Thông tin kỳ doanh thu
        </h2>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <InfoItem
          label="Thời gian áp dụng"
          value={`${formatDate(period?.periodStart)} - ${formatDate(
            period?.periodEnd
          )}`}
        />
        <InfoItem
          label="Người xác nhận"
          value={confirmedByLabel}
          helper={confirmedByEmail || "Chưa có email"}
        />
        <InfoItem
          label="Tổng hợp gần nhất"
          value={formatDateTime(lifecycleTimestamps?.lastAggregatedAt)}
          tone="plain"
        />
        <InfoItem
          label="Cập nhật cuối"
          value={formatDateTime(lifecycleTimestamps?.updatedAt)}
          tone="plain"
        />
      </div>
    </DashboardCard>

    <DashboardCard className="border-slate-200 px-5 py-14 text-center">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-medium text-slate-700">
          Giao diện chi tiết kỳ doanh thu chỉ hiển thị dữ liệu nghiệp vụ cần đối
          soát. Phần biểu đồ đã được lược bỏ theo yêu cầu.
        </p>
      </div>
    </DashboardCard>
  </div>
);

export default RevenuePeriodInfoSection;
