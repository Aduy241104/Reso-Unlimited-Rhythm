import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    BadgeCheck,
    Disc3,
    Headphones,
    Percent,
    Wallet,
} from "lucide-react";
import artistRevenueService from "../../../services/artistRevenueService";
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
        label: "Đã tính",
        className: "bg-violet-100 text-violet-700",
    },
    confirmed: {
        label: "Đã xác nhận",
        className: "bg-emerald-100 text-emerald-700",
    },
};

const TRACK_STATUS_CONFIG = {
    active: {
        label: "Đang hoạt động",
        className: "bg-emerald-100 text-emerald-700",
    },
    hidden: {
        label: "Đã ẩn",
        className: "bg-zinc-100 text-zinc-700",
    },
    blocked: {
        label: "Bị khóa",
        className: "bg-red-100 text-red-700",
    },
};

const APPROVAL_STATUS_CONFIG = {
    approved: {
        label: "Đã duyệt",
        className: "bg-violet-100 text-violet-700",
    },
    pending: {
        label: "Chờ duyệt",
        className: "bg-amber-100 text-amber-700",
    },
    rejected: {
        label: "Từ chối",
        className: "bg-red-100 text-red-700",
    },
    draft: {
        label: "Bản nháp",
        className: "bg-zinc-100 text-zinc-700",
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

const getTrackStatusConfig = (status) => {
    return TRACK_STATUS_CONFIG[status] || {
        label: "Không xác định",
        className: "bg-zinc-100 text-zinc-600",
    };
};

const getApprovalStatusConfig = (status) => {
    return APPROVAL_STATUS_CONFIG[status] || {
        label: "Không xác định",
        className: "bg-zinc-100 text-zinc-600",
    };
};

const StatCard = ({ icon: Icon, label, value, accent = false }) => {
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

const TrackAvatar = ({ src, title }) => {
    const [hasError, setHasError] = useState(false);

    if (!src || hasError) {
        return (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                <Disc3 className="h-5 w-5" />
            </div>
        );
    }

    return (
        <img
            src={ src }
            alt={ title || "Track" }
            onError={ () => setHasError(true) }
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
        />
    );
};

const DetailSkeleton = () => {
    return (
        <div className="space-y-5">
            <div className="h-[88px] animate-pulse rounded-2xl bg-zinc-100" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                { Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={ index }
                        className="h-[104px] animate-pulse rounded-2xl bg-zinc-100"
                    />
                )) }
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="h-[420px] animate-pulse rounded-2xl bg-zinc-100" />
                <div className="h-[420px] animate-pulse rounded-2xl bg-zinc-100" />
            </div>
        </div>
    );
};

const ArtistRevenuePeriodDetail = () => {
    const { id } = useParams();

    const [detail, setDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchPeriodDetail = useCallback(async () => {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const data = await artistRevenueService.getRevenuePeriodDetail(id);
            setDetail(data);
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                "Không thể tải chi tiết kỳ doanh thu.";

            setErrorMessage(message);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPeriodDetail();
    }, [fetchPeriodDetail]);

    const period = detail?.period || {};
    const summary = detail?.summary || {};
    const totals = detail?.totals || {};
    const trackRevenues = detail?.trackRevenues || [];

    const statusConfig = useMemo(() => {
        return getStatusConfig(summary.status || period.status);
    }, [summary.status, period.status]);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-white px-4 py-6 text-zinc-950 md:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <DetailSkeleton />
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
                            onClick={ fetchPeriodDetail }
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
        <main className="min-h-screen bg-white text-zinc-950 ">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="overflow-hidden text-black">
                    <div className="relative">

                        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <Link
                                    to={ routePaths.artistRevenueHistory }
                                    className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-black transition hover:text-red"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Quay lại lịch sử
                                </Link>

                                <h1 className="mt-1 text-xl text-black font-semibold tracking-tight md:text-2xl">
                                    Kỳ doanh thu { period.label || "—" }
                                </h1>
                            </div>

                            <span
                                className={ `
                                    w-fit rounded-full px-3 py-1.5 text-xs font-semibold
                                    ${statusConfig.className}
                                `}
                            >
                                { statusConfig.label }
                            </span>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={ Wallet }
                        label="Doanh thu nhận được"
                        value={ formatCurrency(summary.artistRevenueAmount) }
                        accent
                    />

                    <StatCard
                        icon={ Headphones }
                        label="Tổng số lượt stream"
                        value={ formatNumber(totals.totalEligibleStreams || summary.totalEligibleStreams) }
                    />

                    <StatCard
                        icon={ Disc3 }
                        label="Bài hát phát sinh doanh thu"
                        value={ formatNumber(totals.trackCount) }
                    />

                    <StatCard
                        icon={ BadgeCheck }
                        label="Trạng thái"
                        value={ statusConfig.label }
                    />
                </section>

                <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
                            <h2 className="text-sm font-semibold text-zinc-950">
                                Doanh thu theo track
                            </h2>

                            <p className="text-xs text-zinc-500">
                                { formatNumber(trackRevenues.length) } track
                            </p>
                        </div>

                        { trackRevenues.length === 0 ? (
                            <div className="flex min-h-[260px] flex-col items-center justify-center px-5 py-10 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                                    <Disc3 className="h-5 w-5" />
                                </div>

                                <h3 className="mt-4 text-sm font-semibold text-zinc-950">
                                    Chưa có track phát sinh doanh thu
                                </h3>

                                <p className="mt-1 max-w-md text-sm text-zinc-500">
                                    Track có stream hợp lệ trong kỳ sẽ được hiển thị tại đây.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                                        <tr>
                                            <th className="whitespace-nowrap px-5 py-3 font-semibold">
                                                Track
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                                                Doanh thu
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                                                Stream hợp lệ
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                                                Người nghe
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-3 font-semibold">
                                                Trạng thái
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-zinc-100">
                                        { trackRevenues.map((track) => {
                                            const activeStatusConfig = getTrackStatusConfig(track.activeStatus);
                                            const approvalStatusConfig = getApprovalStatusConfig(track.approvalStatus);

                                            return (
                                                <tr
                                                    key={ track.trackId }
                                                    className="transition hover:bg-zinc-50"
                                                >
                                                    <td className="min-w-[260px] px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <TrackAvatar
                                                                src={ track.avatar }
                                                                title={ track.title }
                                                            />

                                                            <div className="min-w-0">
                                                                <p className="truncate font-semibold text-zinc-950">
                                                                    { track.title || "Không có tiêu đề" }
                                                                </p>

                                                                <p className="mt-0.5 text-xs text-zinc-500">
                                                                    Phát hành: { formatDate(track.releaseDate) }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-zinc-950">
                                                        { formatCurrency(track.artistRevenueAmount) }
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 text-right text-zinc-700">
                                                        { formatNumber(track.eligibleStreams) }
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 text-right text-zinc-700">
                                                        { formatNumber(track.uniqueListeners) }
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            <span
                                                                className={ `
                                                                    inline-flex rounded-full px-2.5 py-1 text-xs font-semibold
                                                                    ${activeStatusConfig.className}
                                                                `}
                                                            >
                                                                { activeStatusConfig.label }
                                                            </span>

                                                            <span
                                                                className={ `
                                                                    inline-flex rounded-full px-2.5 py-1 text-xs font-semibold
                                                                    ${approvalStatusConfig.className}
                                                                `}
                                                            >
                                                                { approvalStatusConfig.label }
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }) }
                                    </tbody>
                                </table>
                            </div>
                        ) }
                    </div>

                    <aside className="space-y-4">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-zinc-950">
                                Thông tin kỳ
                            </h2>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                                        Kỳ doanh thu
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-zinc-950">
                                        { period.label || "—" }
                                    </p>
                                </div>

                                <div className="border-t border-zinc-100 pt-4">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                                        Thời gian kỳ
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-zinc-800">
                                        { formatDate(period.periodStart) }
                                        <span className="mx-1.5 text-zinc-400">
                                            →
                                        </span>
                                        { formatDate(period.periodEnd) }
                                    </p>
                                </div>

                                <div className="border-t border-zinc-100 pt-4">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                                        Thời gian tính
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-zinc-800">
                                        { formatDateTime(summary.calculatedAt) }
                                    </p>
                                </div>

                                <div className="border-t border-zinc-100 pt-4">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                                        Thời gian xác nhận
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-zinc-800">
                                        { formatDateTime(summary.confirmedAt) }
                                    </p>
                                </div>

                                <div className="border-t border-zinc-100 pt-4">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                                        Cập nhật gần nhất
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-zinc-800">
                                        { formatDateTime(summary.updatedAt) }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-zinc-950">
                                Tổng hợp track
                            </h2>

                            <div className="mt-5 space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                                        <Wallet className="h-4 w-4" />
                                        Tổng doanh thu track
                                    </div>

                                    <p className="text-sm font-semibold text-zinc-950">
                                        { formatCurrency(totals.totalTrackRevenueAmount) }
                                    </p>
                                </div>

                                <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                                        <Headphones className="h-4 w-4" />
                                        Stream hợp lệ
                                    </div>

                                    <p className="text-sm font-semibold text-zinc-950">
                                        { formatNumber(totals.totalEligibleStreams) }
                                    </p>
                                </div>

                                <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                                        <Disc3 className="h-4 w-4" />
                                        Số track
                                    </div>

                                    <p className="text-sm font-semibold text-zinc-950">
                                        { formatNumber(totals.trackCount) }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </section>
            </div>
        </main>
    );
};

export default ArtistRevenuePeriodDetail;
