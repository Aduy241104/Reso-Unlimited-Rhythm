export const formatCurrency = (value = 0) => {
    const safeValue = Number(value) || 0;

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(safeValue);
};

export const formatNumber = (value = 0) => {
    const safeValue = Number(value) || 0;

    return new Intl.NumberFormat("vi-VN").format(safeValue);
};

export const formatDateTime = (value) => {
    if (!value) return "Chưa có dữ liệu";

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
};