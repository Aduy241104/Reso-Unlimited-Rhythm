export const STATUS_CONFIG = {
  open: {
    label: "Kỳ đang mở",
    tone: "bg-violet-50 text-violet-700 border-violet-200",
    helper: "Doanh thu vẫn đang phát sinh trong kỳ này.",
  },
  closed: {
    label: "Đã đóng kỳ",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    helper: "Kỳ doanh thu đã đóng và chờ bước tính toán tiếp theo.",
  },
  calculated: {
    label: "Đã tính doanh thu",
    tone: "bg-violet-50 text-violet-700 border-violet-200",
    helper: "Số liệu đã được tổng hợp và có thể đối soát.",
  },
  confirmed: {
    label: "Đã xác nhận",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    helper: "Kỳ doanh thu đã được xác nhận.",
  },
  paid: {
    label: "Đã chi trả",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
    helper: "Doanh thu của kỳ này đã hoàn tất chi trả.",
  },
  pending: {
    label: "Chờ xử lý",
    tone: "bg-violet-50 text-violet-700 border-violet-200",
    helper: "Kỳ doanh thu đang chờ xử lý thêm.",
  },
  not_created: {
    label: "Chưa tạo kỳ",
    tone: "bg-slate-100 text-slate-600 border-slate-200",
    helper: "Backend chưa tạo revenue period cho tháng này.",
  },
};

export const MONTH_LABELS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

export const CHART_COLORS = ["#8b5cf6", "#d946ef", "#6366f1"];
