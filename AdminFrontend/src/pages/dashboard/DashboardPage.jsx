import { useState, useEffect } from "react";
import {
    getOverviewStatsService,
    getMonthlyOverviewService,
    getNewUsersByMonthService,
} from "../../services/dashboardService";

/* ─── Helpers ─────────────────────────────────────────────────── */
const formatNumber = (num) => {
    if (num == null) return "0";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toLocaleString();
};

const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const toDDMMYYYY = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const toMonthYear = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ─── Skeleton ──────────────────────────────────────────────── */
const Skeleton = ({ lines = 3, height = "h-4" }) => (
    <div className="space-y-2">
        {[...Array(lines)].map((_, i) => (
            <div key={i} className={`w-full animate-pulse rounded bg-slate-200 ${height}`} />
        ))}
    </div>
);

/* ─── StatCard ──────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, badge }) => (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {label}
                </p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900 tracking-tight">
                    {value}
                </p>
                {sub && (
                    <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
                )}
            </div>
            {badge && (
                <span className="ml-3 shrink-0 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wide">
                    {badge}
                </span>
            )}
        </div>
    </div>
);

/* ─── ChartBar ─────────────────────────────────────────────── */
const StreamBar = ({ date, streams, maxStreams, label }) => {
    const pct = maxStreams > 0 ? Math.max((streams / maxStreams) * 100, 4) : 4;
    const displayDate = label || toDDMMYYYY(date);

    return (
        <div className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-700">
                {formatNumber(streams)}
            </span>
            <div className="flex h-32 w-full items-end justify-center">
                <div
                    className="w-full max-w-[2.5rem] bg-blue-600 transition-all duration-500"
                    style={{ height: `${pct}%` }}
                />
            </div>
            <span className="text-[10px] font-semibold text-slate-400">{displayDate}</span>
        </div>
    );
};

const UserBar = ({ month, newUsers, maxNewUsers, isCurrentMonth }) => {
    const pct = maxNewUsers > 0 ? Math.max((newUsers / maxNewUsers) * 100, 4) : 4;

    return (
        <div className="flex flex-1 flex-col items-center gap-1.5">
            <span className={`text-[11px] font-bold ${isCurrentMonth ? "text-slate-900" : "text-slate-400"}`}>
                {formatNumber(newUsers)}
            </span>
            <div className="flex h-24 w-full items-end justify-center">
                <div
                    className={`w-full max-w-[2.5rem] transition-all duration-500 ${
                        isCurrentMonth ? "bg-blue-600" : "bg-slate-200"
                    }`}
                    style={{ height: `${pct}%` }}
                />
            </div>
            <span className={`text-[10px] font-semibold ${isCurrentMonth ? "text-slate-900 font-bold" : "text-slate-400"}`}>
                {month}
            </span>
        </div>
    );
};

/* ─── DataTable ─────────────────────────────────────────────── */
const DataTable = ({ columns, rows, emptyMsg = "No data available." }) => (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
            <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                    {columns.map((col) => (
                        <th
                            key={col.key}
                            className={`px-4 py-2.5 font-semibold uppercase tracking-[0.12em] text-slate-400 ${
                                col.align === "right" ? "text-right" : "text-left"
                            }`}
                        >
                            {col.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td colSpan={columns.length} className="py-8 text-center text-slate-400">
                            {emptyMsg}
                        </td>
                    </tr>
                ) : (
                    rows.map((row, idx) => (
                        <tr key={row.key || idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={`px-4 py-2.5 ${col.align === "right" ? "text-right" : "text-left"} ${
                                        col.bold ? "font-bold text-slate-900" : "text-slate-500"
                                    }`}
                                >
                                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
);

/* ─── SectionCard ───────────────────────────────────────────── */
const SectionCard = ({ title, subtitle, badge, children, action }) => (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div>
                {subtitle && (
                    <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        {subtitle}
                    </p>
                )}
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
            </div>
            <div className="flex items-center gap-3">
                {badge !== undefined && badge !== null && (
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wide">
                        {formatNumber(badge)}
                    </span>
                )}
                {action}
            </div>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

/* ─── LoadingSpinner ─────────────────────────────────────────── */
const Spinner = () => (
    <div className="flex h-32 items-center justify-center rounded-xl border border-slate-200">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
);

/* ─── DashboardPage ──────────────────────────────────────────── */
const DashboardPage = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const [overview, setOverview] = useState(null);
    const [monthly, setMonthly] = useState(null);
    const [monthOffset, setMonthOffset] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
    const [message, setMessage] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedMonthYear, setSelectedMonthYear] = useState("");
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonthNum, setSelectedMonthNum] = useState(currentMonth);
    const [newUsersByMonth, setNewUsersByMonth] = useState(null);
    const [isLoadingNewUsers, setIsLoadingNewUsers] = useState(false);

    const loadOverview = async () => {
        setIsLoading(true);
        setMessage("");
        try {
            const data = await getOverviewStatsService();
            setOverview(data);
        } catch (error) {
            setMessage(error?.response?.data?.message || error?.message || "Failed to load overview stats.");
        } finally {
            setIsLoading(false);
        }
    };

    const loadMonthly = async (year, month) => {
        setIsLoadingMonthly(true);
        try {
            const data = await getMonthlyOverviewService(year, month);
            setMonthly(data);
        } catch (error) {
            console.error("Failed to load monthly stats:", error);
        } finally {
            setIsLoadingMonthly(false);
        }
    };

    const loadNewUsersByMonth = async () => {
        setIsLoadingNewUsers(true);
        try {
            const data = await getNewUsersByMonthService();
            setNewUsersByMonth(data);
        } catch (error) {
            console.error("Failed to load new users by month:", error);
        } finally {
            setIsLoadingNewUsers(false);
        }
    };

    useEffect(() => {
        void loadOverview();
        void loadNewUsersByMonth();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            void loadOverview();
            void loadNewUsersByMonth();
        }, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const year = target.getFullYear();
        const month = target.getMonth() + 1;
        setSelectedYear(year);
        setSelectedMonthNum(month);
        setSelectedMonth(target.toLocaleDateString("vi-VN", { month: "long", year: "numeric" }));
        setSelectedMonthYear(`${String(month).padStart(2, "0")}/${year}`);
        void loadMonthly(year, month);
    }, [monthOffset]);

    const maxDayStreams = overview?.last7Days?.length > 0
        ? Math.max(...overview.last7Days.map((d) => d.streams))
        : 0;

    const periodTotal = overview?.last7Days?.reduce((sum, d) => sum + d.streams, 0) ?? 0;

    return (
        <section className="space-y-5 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">

            {/* Header */}
            <div className="flex items-end justify-between pb-2 px-1">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Analytics
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                        Platform Overview
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-400 leading-relaxed">
                        Real-time streaming statistics and platform performance metrics.
                    </p>
                </div>
                <div className="hidden text-right lg:block">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Last updated
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-600">
                        {toDDMMYYYY(new Date().toISOString())}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                        {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
            </div>

            {/* Error banner */}
            {message && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {message}
                </div>
            )}

            {/* ── Overview Cards ── */}
            {isLoading ? (
                <Skeleton lines={1} height="h-28" />
            ) : overview ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total Streams"
                        value={formatNumber(overview.streamsThisMonth)}
                        sub={`All time: ${formatNumber(overview.streamsAllTime)}`}
                    />
                    <StatCard
                        label="Total Users"
                        value={formatNumber(overview.totalUsers)}
                        sub="Registered accounts"
                    />
                    <StatCard
                        label="Total Artists"
                        value={formatNumber(overview.totalArtists)}
                        sub="Active artists"
                    />
                    <StatCard
                        label="Active Tracks"
                        value={formatNumber(overview.totalTracks)}
                        sub="Approved & active"
                    />
                </div>
            ) : null}

            {/* ── Charts Row ── */}
            <div className="grid gap-4 lg:grid-cols-2">
                {isLoading ? (
                    <Skeleton lines={1} height="h-64" />
                ) : overview?.last7Days?.length > 0 ? (
                    <SectionCard
                        title="Streaming Activity"
                        subtitle="Last 7 Days"
                        badge={periodTotal}
                    >
                        <div className="flex items-end gap-1">
                            {overview.last7Days.map((day) => (
                                <StreamBar
                                    key={day.date}
                                    date={day.date}
                                    streams={day.streams}
                                    maxStreams={maxDayStreams}
                                />
                            ))}
                        </div>
                    </SectionCard>
                ) : null}

                {isLoadingNewUsers ? (
                    <Skeleton lines={1} height="h-64" />
                ) : newUsersByMonth ? (
                    <SectionCard
                        title="User Growth"
                        subtitle={`${newUsersByMonth.year}`}
                        badge={newUsersByMonth.totalNewUsers}
                    >
                        <div className="flex items-end gap-0.5">
                            {newUsersByMonth.months.map((m) => (
                                <UserBar
                                    key={m.monthNum}
                                    month={m.month}
                                    newUsers={m.newUsers}
                                    maxNewUsers={newUsersByMonth.maxNewUsers}
                                    isCurrentMonth={m.monthNum === currentMonth && newUsersByMonth.year === currentYear}
                                />
                            ))}
                        </div>
                    </SectionCard>
                ) : null}
            </div>

            {/* ── Monthly Stats ── */}
            <SectionCard
                title={selectedMonth}
                subtitle={selectedMonthYear}
                action={
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedYear}
                            onChange={(e) => {
                                const newYear = Number(e.target.value);
                                setSelectedYear(newYear);
                                const newOffset = (currentYear - newYear) * 12 + (currentMonth - selectedMonthNum);
                                setMonthOffset(newOffset);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            {[...Array(5)].map((_, i) => {
                                const y = currentYear - i;
                                return (
                                    <option key={y} value={y}>{y}</option>
                                );
                            })}
                        </select>
                        <select
                            value={selectedMonthNum}
                            onChange={(e) => {
                                const newMonth = Number(e.target.value);
                                setSelectedMonthNum(newMonth);
                                const newOffset = (currentYear - selectedYear) * 12 + (currentMonth - newMonth);
                                setMonthOffset(newOffset);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            {monthNames.map((name, idx) => {
                                const monthVal = idx + 1;
                                return (
                                    <option key={monthVal} value={monthVal}>{name}</option>
                                );
                            })}
                        </select>
                    </div>
                }
            >
                {isLoadingMonthly ? (
                    <Spinner />
                ) : monthly ? (
                    <div className="space-y-6">
                        {/* Monthly KPIs */}
                        <div className="grid gap-3 md:grid-cols-3">
                            <StatCard
                                label="Total Streams"
                                value={formatNumber(monthly.streamingStats?.totalStreams ?? 0)}
                            />
                            <StatCard
                                label="New Users"
                                value={formatNumber(monthly.userStats?.newUsers ?? 0)}
                                sub={`Total: ${formatNumber(monthly.userStats?.totalUsers ?? 0)}`}
                            />
                            <StatCard
                                label="Total Artists"
                                value={formatNumber(monthly.artistStats?.totalArtists ?? 0)}
                            />
                        </div>

                        {/* Daily breakdown table */}
                        {monthly.dailyStats?.length > 0 ? (
                            <>
                                <div>
                                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                                        Daily Breakdown
                                    </p>
                                    <DataTable
                                        columns={[
                                            { key: "date", label: "Date", render: (v) => toMonthYear(v) },
                                            { key: "totalStreams", label: "Streams", align: "right", bold: true },
                                            { key: "uniqueUsers", label: "Unique Users", align: "right" },
                                            {
                                                key: "totalListeningTime",
                                                label: "Listening Time",
                                                align: "right",
                                                render: (v) => formatDuration(v ?? 0),
                                            },
                                        ]}
                                        rows={monthly.dailyStats.map((d) => ({ ...d, key: d.date }))}
                                    />
                                </div>

                                {(() => {
                                    const topTrack = monthly.dailyStats.reduce((best, day) => {
                                        const dayTop = day.topTracks?.[0];
                                        if (!dayTop) return best;
                                        if (!best || (dayTop.streamCount ?? 0) > (best.streamCount ?? 0)) {
                                            return { ...dayTop, date: day.date };
                                        }
                                        return best;
                                    }, null);

                                    if (!topTrack) return null;

                                    return (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                                                Top Track of the Month
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{topTrack.title || "Unknown"}</p>
                                                    <p className="mt-0.5 text-xs text-slate-400">{toDDMMYYYY(topTrack.date)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-blue-600">
                                                        {formatNumber(topTrack.streamCount ?? 0)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">streams</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </>
                        ) : (
                            <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200">
                                <p className="text-xs text-slate-400">No streaming data for this month.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-400">No data available for this month.</p>
                    </div>
                )}
            </SectionCard>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <p className="text-[10px] text-slate-400">
                    Data refreshes automatically every 30 minutes
                </p>
                <p className="text-[10px] text-slate-400">
                    All dates in dd/mm/yyyy format
                </p>
            </div>
        </section>
    );
};

export default DashboardPage;
