import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Disc3,
    Headphones,
    Wallet,
} from "lucide-react";
import artistRevenueService from "../../../services/artistRevenueService";
import { routePaths } from "../../../routes/routePaths";

const PAGE_LIMIT = 20;

const STATUS_CONFIG = {
    open: {
        label: "Đang mở",
        className: "bg-zinc-100 text-zinc-700",
    },
    closed: {
        label: "Đã chốt kỳ",
        className: "bg-zinc-900 text-white",
    },
    calculated: {
        label: "Đã tính",
        className: "bg-violet-100 text-violet-700",
    },
    confirmed: {
        label: "Đã xác nhận",
        className: "bg-emerald-100 text-emerald-700",
    },
};

const formatCurrency = (value = 0) => {
    const safeValue = Number(value) || 0;

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(safeValue);
};

const formatNumber = (value = 0) => {
    const safeValue = Number(value) || 0;

    return new Intl.NumberFormat("vi-VN").format(safeValue);
};

const formatDate = (value) => {
    if (!value) return "—";

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
};

const formatDateTime = (value) => {
    if (!value) return "—";

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
};

const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || {
        label: "Không xác định",
        className: "bg-zinc-100 text-zinc-600",
    };
};

const RevenueHistoryCard = ({ icon: Icon, label, value, accent = false }) => {
    return (
        <div
            className={ `
                rounded-2xl border bg-white p-4 shadow-sm
                ${accent ? "border-violet-200" : "border-zinc-200"}
            `}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                        { label }
                    </p>

                    <p className="mt-2 truncate text-xl font-semibold text-zinc-950">
                        { value }
                    </p>
                </div>

                { Icon && (
                    <div
                        className={ `
                            flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                            ${accent ? "bg-violet-100 text-violet-700" : "bg-zinc-100 text-zinc-700"}
                        `}
                    >
                        <Icon className="h-4 w-4" />
                    </div>
                ) }
            </div>
        </div>
    );
};

const RevenueHistorySkeleton = () => {
    return (
        <div className="space-y-5">
            <div className="h-[88px] animate-pulse rounded-2xl bg-zinc-100" />

            <div className="grid gap-4 md:grid-cols-3">
                { Array.from({ length: 3 }).map((_, index) => (
                    <div
                        key={ index }
                        className="h-[104px] animate-pulse rounded-2xl bg-zinc-100"
                    />
                )) }
            </div>

            <div className="h-[420px] animate-pulse rounded-2xl bg-zinc-100" />
        </div>
    );
};

const ArtistRevenueHistory = () => {
    const navigate = useNavigate();
    const [revenuePeriods, setRevenuePeriods] = useState([]);
    const [meta, setMeta] = useState({
        page: 1,
        limit: PAGE_LIMIT,
        total: 0,
        totalPages: 1,
    });

    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchRevenuePeriods = useCallback(async () => {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const result = await artistRevenueService.getRevenuePeriods({
                page,
                limit: PAGE_LIMIT,
            });

            setRevenuePeriods(result.revenuePeriods || []);
            setMeta({
                page: result.meta?.page || page,
                limit: result.meta?.limit || PAGE_LIMIT,
                total: result.meta?.total || 0,
                totalPages: result.meta?.totalPages || 1,
            });
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                "Không thể tải lịch sử doanh thu.";

            setErrorMessage(message);
        } finally {
            setIsLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchRevenuePeriods();
    }, [fetchRevenuePeriods]);

    const currentPageStats = useMemo(() => {
        return revenuePeriods.reduce(
            (result, item) => {
                result.totalRevenue += Number(item?.summary?.artistRevenueAmount) || 0;
                result.totalEligibleStreams += Number(item?.summary?.totalEligibleStreams) || 0;
                result.totalTracks += Number(item?.trackCount) || 0;

                return result;
            },
            {
                totalRevenue: 0,
                totalEligibleStreams: 0,
                totalTracks: 0,
            }
        );
    }, [revenuePeriods]);

    const canGoPrevious = page > 1;
    const canGoNext = page < meta.totalPages;

    const handlePreviousPage = () => {
        if (!canGoPrevious) return;
        setPage((currentPage) => currentPage - 1);
    };

    const handleNextPage = () => {
        if (!canGoNext) return;
        setPage((currentPage) => currentPage + 1);
    };

    const handleOpenDetail = (periodId) => {
        if (!periodId) return;
        navigate(routePaths.artistRevenuePeriodDetail(periodId));
    };

    if (isLoading) {
        return (
            <main className="min-h-screen bg-white px-4 py-6 text-zinc-950 md:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <RevenueHistorySkeleton />
                </div>
            </main>
        );
    }

    if (errorMessage) {
        return (
            <main className="min-h-screen bg-white px-4 py-6 text-zinc-950 md:px-6 lg:px-8">
                <div className="mx-auto flex min-h-[420px] max-w-7xl items-center justify-center">
                    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-red-600">
                            !
                        </div>

                        <h2 className="mt-4 text-base font-semibold text-zinc-950">
                            Không tải được dữ liệu
                        </h2>

                        <p className="mt-2 text-sm text-zinc-500">
                            { errorMessage }
                        </p>

                        <button
                            type="button"
                            onClick={ fetchRevenuePeriods }
                            className="mt-5 inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-medium text-white transition hover:bg-zinc-800"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white text-zinc-950">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="overflow-hidden text-black">
                    <div className="">
                        <div className="relative ">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500">
                                    Revenue history
                                </p>

                                <h1 className="mt-1 text-xl font-semibold tracking-tight text-black md:text-2xl">
                                    Lịch sử doanh thu
                                </h1>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
                        <h2 className="text-sm font-semibold text-zinc-950">
                            Danh sách kỳ doanh thu
                        </h2>

                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <CalendarDays className="h-4 w-4" />
                            Trang { meta.page } / { meta.totalPages }
                        </div>
                    </div>

                    { revenuePeriods.length === 0 ? (
                        <div className="flex min-h-[280px] flex-col items-center justify-center px-5 py-10 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                                <Wallet className="h-5 w-5" />
                            </div>

                            <h3 className="mt-4 text-sm font-semibold text-zinc-950">
                                Chưa có lịch sử doanh thu
                            </h3>

                            <p className="mt-1 max-w-md text-sm text-zinc-500">
                                Khi kỳ doanh thu được xác nhận, dữ liệu sẽ được hiển thị tại đây.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">
                                            Kỳ
                                        </th>

                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">
                                            Thời gian
                                        </th>

                                        <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                                            Doanh thu
                                        </th>

                                        <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                                            Stream hợp lệ
                                        </th>

                                        <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                                            Track
                                        </th>

                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">
                                            Trạng thái
                                        </th>

                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">
                                            Xác nhận
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-zinc-100">
                                    { revenuePeriods.map((item) => {
                                        const period = item?.period || {};
                                        const summary = item?.summary || {};
                                        const statusConfig = getStatusConfig(
                                            summary.status || period.status
                                        );

                                        return (
                                            <tr
                                                key={ item.revenueSummaryId || item.id }
                                                className="cursor-pointer transition hover:bg-zinc-50"
                                                onClick={ () => handleOpenDetail(item.revenueSummaryId || item.id) }
                                            >
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <div>
                                                        <p className="font-semibold text-zinc-950">
                                                            { period.label || "—" }
                                                        </p>

                                                        <p className="mt-0.5 text-xs text-zinc-500">
                                                            Tháng { period.month || "—" }/{ period.year || "—" }
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-700">
                                                    { formatDate(period.periodStart) }
                                                    <span className="mx-1.5 text-zinc-400">
                                                        →
                                                    </span>
                                                    { formatDate(period.periodEnd) }
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-zinc-950">
                                                    { formatCurrency(summary.artistRevenueAmount) }
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right text-zinc-700">
                                                    { formatNumber(summary.totalEligibleStreams) }
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right text-zinc-700">
                                                    { formatNumber(item.trackCount) }
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <span
                                                        className={ `
                                                            inline-flex rounded-full px-2.5 py-1 text-xs font-semibold
                                                            ${statusConfig.className}
                                                        `}
                                                    >
                                                        { statusConfig.label }
                                                    </span>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-500">
                                                    { formatDateTime(summary.confirmedAt) }
                                                </td>
                                            </tr>
                                        );
                                    }) }
                                </tbody>
                            </table>
                        </div>
                    ) }

                    <div className="flex items-center justify-between gap-4 border-t border-zinc-200 px-5 py-4">
                        <p className="text-xs text-zinc-500">
                            Hiển thị { formatNumber(revenuePeriods.length) } / { formatNumber(meta.total) } kỳ
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={ handlePreviousPage }
                                disabled={ !canGoPrevious }
                                className="
                                    inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-zinc-200
                                    bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50
                                    disabled:cursor-not-allowed disabled:opacity-50
                                "
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Trước
                            </button>

                            <button
                                type="button"
                                onClick={ handleNextPage }
                                disabled={ !canGoNext }
                                className="
                                    inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-zinc-200
                                    bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50
                                    disabled:cursor-not-allowed disabled:opacity-50
                                "
                            >
                                Sau
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default ArtistRevenueHistory;
