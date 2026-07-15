import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    BadgeCheck,
    CalendarDays,
    ChevronRight,
    Headphones,
    Wallet,
} from "lucide-react";
import artistRevenueService from "../../../services/artistRevenueService";
import RevenueBarChart from "../../../components/artist/revenue/RevenueBarChart";
import RevenueStatCard from "../../../components/artist/revenue/RevenueStatCard";
import TrackRevenueTable from "../../../components/artist/revenue/TrackRevenueTable";
import {
    formatCurrency,
    formatNumber,
} from "../../../utils/revenueFormat";
import { routePaths } from "../../../routes/routePaths";

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
        label: "Đã tính doanh thu",
        className: "bg-violet-100 text-violet-700",
    },
    confirmed: {
        label: "Đã xác nhận",
        className: "bg-emerald-100 text-emerald-700",
    },
};

const PageSkeleton = () => {
    return (
        <div className="space-y-6">
            <div className="h-24 animate-pulse rounded-2xl bg-zinc-100" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                { Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={ index }
                        className="h-32 animate-pulse rounded-2xl bg-zinc-100"
                    />
                )) }
            </div>

            <div className="h-[380px] animate-pulse rounded-2xl bg-zinc-100" />
            <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
        </div>
    );
};

const ArtistRevenueOverview = () => {
    const [revenueData, setRevenueData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchRevenue = useCallback(async ({ silent = false } = {}) => {
        try {
            if (silent) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            setErrorMessage("");

            const data = await artistRevenueService.getLatestRevenue();
            setRevenueData(data);
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                "Không thể tải dữ liệu doanh thu. Vui lòng thử lại.";

            setErrorMessage(message);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchRevenue();
    }, [fetchRevenue]);

    const latestPeriod = revenueData?.latestPeriod;
    const summary = revenueData?.summary;
    const revenueChart = revenueData?.revenueChart || [];
    const trackRevenues = revenueData?.trackRevenues || [];

    const statusConfig = useMemo(() => {
        return STATUS_CONFIG[summary?.status] || {
            label: "Không xác định",
            className: "bg-zinc-100 text-zinc-600",
        };
    }, [summary?.status]);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-white px-4 py-6 text-zinc-950 md:px-6 lg:px-8">
                <PageSkeleton />
            </main>
        );
    }

    if (errorMessage) {
        return (
            <main className="min-h-screen bg-white px-2 text-zinc-950 md:px-2 lg:px-2">
                <div className="flex min-h-[420px] items-center justify-center">
                    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                            !
                        </div>

                        <h2 className="mt-4 text-lg font-semibold text-zinc-950">
                            Không tải được doanh thu
                        </h2>

                        <p className="mt-2 text-sm text-zinc-500">
                            { errorMessage }
                        </p>

                        <button
                            type="button"
                            onClick={ () => fetchRevenue() }
                            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
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
                <section className="overflow-hidded text-black">
                    <div className="relative">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h1 className="mt-1 text-xl font-semibold tracking-tight text-black md:text-2xl">
                                    Tổng quan doanh thu
                                </h1>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                                <Link
                                    to={ routePaths.artistBalanceManagement }
                                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                                >
                                    <Wallet className="h-4 w-4" />
                                    Quản lý số dư
                                </Link>

                                <Link
                                    to={ routePaths.artistRevenueHistory }
                                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                                >
                                    Lịch sử doanh thu
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <RevenueStatCard
                        icon={ Wallet }
                        label="Doanh thu kỳ mới nhất"
                        value={ formatCurrency(summary?.artistRevenueAmount) }
                        description={ `Kỳ ${latestPeriod?.label || "chưa xác định"}` }
                        accent
                    />

                    <RevenueStatCard
                        icon={ Headphones }
                        label="Stream hợp lệ"
                        value={ formatNumber(summary?.totalEligibleStreams) }
                        description="Dùng để chia doanh thu"
                    />

                    <RevenueStatCard
                        icon={ BadgeCheck }
                        label="Trạng thái"
                        value={ statusConfig.label }
                        description="Theo kỳ doanh thu mới nhất"
                    />

                    <RevenueStatCard
                        icon={ CalendarDays }
                        label="Kỳ doanh thu"
                        value={ latestPeriod?.label || "Chưa có kỳ" }
                        description={
                            latestPeriod
                                ? `Tháng ${latestPeriod.month}/${latestPeriod.year}`
                                : "Chưa có dữ liệu"
                        }
                    />
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-zinc-950">
                                Doanh thu 12 kỳ gần nhất
                            </h2>

                            <p className="mt-1 text-sm text-zinc-500">
                                Biểu đồ cột thể hiện doanh thu nghệ sĩ theo từng kỳ.
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                            VND
                        </span>
                    </div>

                    <RevenueBarChart data={ revenueChart } />
                </section>

                <section className="space-y-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-zinc-950">
                                Doanh thu theo track
                            </h2>

                            <p className="mt-1 text-sm text-zinc-500">
                                Danh sách track có stream hợp lệ trong kỳ doanh thu mới nhất.
                            </p>
                        </div>

                        <p className="text-sm text-zinc-500">
                            { formatNumber(trackRevenues.length) } track
                        </p>
                    </div>

                    <TrackRevenueTable tracks={ trackRevenues } />
                </section>
            </div>
        </main>
    );
};

export default ArtistRevenueOverview;
