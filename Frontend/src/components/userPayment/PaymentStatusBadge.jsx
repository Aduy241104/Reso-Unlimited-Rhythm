const STATUS_META = {
  success: {
    label: "Đã thanh toán",
    dotClassName: "bg-emerald-400",
    badgeClassName: "bg-[#1f1f1f] text-emerald-200",
  },
  pending: {
    label: "Đang xử lý",
    dotClassName: "bg-amber-400",
    badgeClassName: "bg-[#1f1f1f] text-amber-100",
  },
  failed: {
    label: "Thất bại",
    dotClassName: "bg-rose-400",
    badgeClassName: "bg-[#1f1f1f] text-rose-200",
  },
  refunded: {
    label: "Đã hoàn tiền",
    dotClassName: "bg-sky-400",
    badgeClassName: "bg-[#1f1f1f] text-sky-200",
  },
  cancelled: {
    label: "Đã hủy",
    dotClassName: "bg-white/35",
    badgeClassName: "bg-[#1f1f1f] text-white/70",
  },
  unknown: {
    label: "Không xác định",
    dotClassName: "bg-white/35",
    badgeClassName: "bg-[#1f1f1f] text-white/70",
  },
};

const normalizeStatus = (status) => {
  if (typeof status !== "string") {
    return "unknown";
  }

  const normalizedStatus = status.trim().toLowerCase();
  return STATUS_META[normalizedStatus] ? normalizedStatus : "unknown";
};

const PaymentStatusBadge = ({ status, className = "" }) => {
  const normalizedStatus = normalizeStatus(status);
  const meta = STATUS_META[normalizedStatus];

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        meta.badgeClassName,
        className,
      ].join(" ")}
    >
      <span className={["h-2 w-2 rounded-full", meta.dotClassName].join(" ")} />
      <span>{meta.label}</span>
    </span>
  );
};

export default PaymentStatusBadge;
