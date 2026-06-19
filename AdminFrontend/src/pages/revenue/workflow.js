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
            "Ky doanh thu nay van dang mo. Admin can chot ky truoc khi tinh doanh thu cho artist.",
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
            "Ky da duoc chot. Buoc tiep theo la tinh doanh thu de chia artist pool theo stream hop le.",
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
            "Ky nay da tinh doanh thu. Ban co the tinh lai neu so lieu thay doi hoac xac nhan de cong tien vao vi artist.",
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
            "Ky doanh thu nay da hoan tat xac nhan va doanh thu da duoc cong vao so du artist.",
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
            "Backend chua tao revenue period cho thang nay, nen hien tai chua the chot ky hoac tinh doanh thu.",
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
    return "Tinh lai doanh thu";
  }

  switch (actionKey) {
    case "close":
      return "Chot ky";
    case "calculate":
      return "Tinh doanh thu";
    case "confirm":
      return "Xac nhan phan phoi";
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
      label: "Chot ky",
      description: "Khoa du lieu premium revenue va stream hop le cua ky.",
      state: resolveStepState("close"),
    },
    {
      key: "calculate",
      label: "Tinh doanh thu",
      description: "Phan bo artist pool cho artist va track theo stream hop le.",
      state: resolveStepState("calculate"),
    },
    {
      key: "confirm",
      label: "Xac nhan",
      description: "Cong tien vao so du artist va danh dau ky da hoan tat.",
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
