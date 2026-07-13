const ACTION_FLAG_MAP = {
  close: "canClose",
  calculate: "canCalculate",
  confirm: "canConfirm",
};

export const buildFallbackRevenueWorkflow = (status) => {
  switch (status) {
    case "open":
      return {
        needsAttention: true,
        reminder: {
          code: "open_period_ready_to_close",
          severity: "warning",
          message:
            "Kỳ doanh thu này vẫn đang mở. Admin cần chốt kỳ trước khi tính doanh thu cho nghệ sĩ.",
        },
        actions: {
          canClose: true,
          canCalculate: false,
          canRecalculate: false,
          canConfirm: false,
        },
      };
    case "closed":
      return {
        needsAttention: true,
        reminder: {
          code: "closed_period_ready_to_calculate",
          severity: "warning",
          message:
            "Kỳ đã được chốt. Bước tiếp theo là tính doanh thu để phân bổ artist pool theo stream hợp lệ.",
        },
        actions: {
          canClose: false,
          canCalculate: true,
          canRecalculate: false,
          canConfirm: false,
        },
      };
    case "calculated":
      return {
        needsAttention: true,
        reminder: {
          code: "calculated_period_ready_to_confirm",
          severity: "info",
          message:
            "Kỳ này đã tính doanh thu. Bạn có thể tính lại nếu số liệu thay đổi hoặc xác nhận để cộng tiền vào ví nghệ sĩ.",
        },
        actions: {
          canClose: false,
          canCalculate: true,
          canRecalculate: true,
          canConfirm: true,
        },
      };
    case "confirmed":
      return {
        needsAttention: false,
        reminder: {
          code: "confirmed_period_completed",
          severity: "success",
          message:
            "Kỳ doanh thu này đã hoàn tất xác nhận và doanh thu đã được cộng vào số dư nghệ sĩ.",
        },
        actions: {
          canClose: false,
          canCalculate: false,
          canRecalculate: false,
          canConfirm: false,
        },
      };
    case "not_created":
      return {
        needsAttention: true,
        reminder: {
          code: "period_not_created",
          severity: "muted",
          message:
            "Backend chưa tạo revenue period cho tháng này, nên hiện tại chưa thể chốt kỳ hoặc tính doanh thu.",
        },
        actions: {
          canClose: false,
          canCalculate: false,
          canRecalculate: false,
          canConfirm: false,
        },
      };
    default:
      return {
        needsAttention: false,
        reminder: null,
        actions: {
          canClose: false,
          canCalculate: false,
          canRecalculate: false,
          canConfirm: false,
        },
      };
  }
};

export const resolveRevenueWorkflow = (period) => {
  const fallback = buildFallbackRevenueWorkflow(period?.status);
  const backendWorkflow = period?.workflow ?? {};
  const reminder = backendWorkflow.reminder ?? fallback.reminder;
  const actions = {
    ...fallback.actions,
    ...(backendWorkflow.actions ?? {}),
  };

  return {
    ...fallback,
    ...backendWorkflow,
    reminder,
    actions,
    needsAttention:
      typeof backendWorkflow.needsAttention === "boolean"
        ? backendWorkflow.needsAttention
        : Boolean(reminder),
  };
};

export const isRevenueActionEnabled = (period, actionKey) => {
  const workflow = resolveRevenueWorkflow(period);
  const actionFlag = ACTION_FLAG_MAP[actionKey];

  if (!actionFlag) {
    return false;
  }

  return Boolean(workflow.actions?.[actionFlag]);
};

export const getRevenueActionLabel = (period, actionKey) => {
  if (
    actionKey === "calculate" &&
    resolveRevenueWorkflow(period).actions?.canRecalculate
  ) {
    return "Tính lại doanh thu";
  }

  switch (actionKey) {
    case "close":
      return "Chốt kỳ";
    case "calculate":
      return "Tính doanh thu";
    case "confirm":
      return "Xác nhận phân phối";
    default:
      return "";
  }
};

export const getRevenueWorkflowSteps = (period) => {
  const status = period?.status;

  const resolveStepState = (actionKey) => {
    if (status === "confirmed") {
      return "completed";
    }

    if (status === "calculated") {
      if (actionKey === "close" || actionKey === "calculate") return "completed";
      if (actionKey === "confirm") return "active";
    }

    if (status === "closed") {
      if (actionKey === "close") return "completed";
      if (actionKey === "calculate") return "active";
    }

    if (status === "open" && actionKey === "close") {
      return "active";
    }

    return "pending";
  };

  return [
    {
      key: "close",
      label: "Chốt kỳ",
      description: "Khóa dữ liệu doanh thu premium và stream hợp lệ của kỳ.",
      state: resolveStepState("close"),
    },
    {
      key: "calculate",
      label: "Tính doanh thu",
      description: "Phân bổ artist pool cho nghệ sĩ và bài hát theo stream hợp lệ.",
      state: resolveStepState("calculate"),
    },
    {
      key: "confirm",
      label: "Xác nhận",
      description: "Cộng tiền vào số dư nghệ sĩ và đánh dấu kỳ đã hoàn tất.",
      state: resolveStepState("confirm"),
    },
  ];
};

export const getRevenueReminderTone = (severity) => {
  switch (severity) {
    case "warning":
      return {
        container: "border-amber-200 bg-amber-50 text-amber-900",
        text: "text-amber-700",
      };
    case "info":
      return {
        container: "border-sky-200 bg-sky-50 text-sky-900",
        text: "text-sky-700",
      };
    case "success":
      return {
        container: "border-emerald-200 bg-emerald-50 text-emerald-900",
        text: "text-emerald-700",
      };
    default:
      return {
        container: "border-slate-200 bg-slate-50 text-slate-900",
        text: "text-slate-600",
      };
  }
};
