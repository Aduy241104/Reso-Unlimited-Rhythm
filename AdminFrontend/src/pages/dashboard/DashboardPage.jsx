import { useState, useEffect } from "react";
import {
    getOverviewStatsService,
    getMonthlyOverviewService,
} from "../../services/dashboardService";

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

const StatCard = ({ label, value, sub, accent }) => (
    <div className="rounded-3xl border border-black bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">
            {label}
        </p>
        <p className={`mt-2 text-3xl font-bold ${accent ? "text-black" : "text-black"}`}>
            {value}
        </p>
        {sub && (
            <p className="mt-1 text-xs text-black/40">{sub}</p>
        )}
    </div>
);

const DayBar = ({ day, streams, maxStreams, date }) => {
    const heightPct = maxStreams > 0 ? Math.max((streams / maxStreams) * 100, 2) : 2;
    const dayLabel = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
    const fullDate = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return (
        <div className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end justify-center">
                <div
                    className="w-full max-w-[3rem] rounded-t-lg bg-black transition-all duration-300 hover:bg-black/80"
                    style={{ height: `${heightPct}%` }}
                    title={`${streams.toLocaleString()} streams`}
                />
            </div>
            <div className="text-center">
                <p className="text-xs font-semibold text-black/60">{dayLabel}</p>
                <p className="text-[10px] text-black/40">{fullDate}</p>
            </div>
            <p className="text-xs font-medium text-black">{formatNumber(streams)}</p>
        </div>
    );
};

const DashboardPage = () => {
    const [overview, setOverview] = useState(null);
    const [monthly, setMonthly] = useState(null);
    const [monthOffset, setMonthOffset] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
    const [message, setMessage] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");

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

    useEffect(() => {
        void loadOverview();
    }, []);

    useEffect(() => {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const year = target.getFullYear();
        const month = target.getMonth() + 1;
        setSelectedMonth(target.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
        void loadMonthly(year, month);
    }, [monthOffset]);

    const maxDayStreams = overview?.last7Days?.length > 0
        ? Math.max(...overview.last7Days.map((d) => d.streams))
        : 0;

    return (
        <section className="space-y-6">
            {/* Header */}
            <div className="rounded-[2rem] border border-black bg-white p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">
                    Streaming Analytics
                </p>
                <h1 className="mt-3 text-4xl font-semibold text-black">
                    Platform Dashboard
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">
                    View system-wide streaming statistics including total streams, user activity,
                    and top-performing tracks across the platform.
                </p>
            </div>

            {message && (
                <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                    {message}
                </div>
            )}

            {/* Overview Cards */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-3xl border border-black bg-slate-100" />
                    ))}
                </div>
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

            {/* Last 7 Days Chart */}
            {overview?.last7Days && overview.last7Days.length > 0 && (
                <div className="rounded-[2rem] border border-black bg-white p-6">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/45">
                                Streaming Activity
                            </p>
                            <h2 className="mt-2 text-xl font-semibold text-black">
                                Last 7 Days
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-black/40">Total this period</p>
                            <p className="text-lg font-bold text-black">
                                {formatNumber(
                                    overview.last7Days.reduce((sum, d) => sum + d.streams, 0)
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex h-48 items-end gap-2">
                        {overview.last7Days.map((day) => (
                            <DayBar
                                key={day.date}
                                day={day}
                                streams={day.streams}
                                maxStreams={maxDayStreams}
                                date={day.date}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Monthly Overview Section */}
            <div className="rounded-[2rem] border border-black bg-white p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/45">
                            Monthly Statistics
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-black">
                            {selectedMonth}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMonthOffset((o) => o + 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-sm font-semibold text-black transition hover:bg-black/5 disabled:opacity-40"
                            aria-label="Previous month"
                        >
                            &#8592;
                        </button>
                        <button
                            onClick={() => setMonthOffset(0)}
                            disabled={monthOffset === 0}
                            className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-black transition hover:bg-black/5 disabled:opacity-40"
                        >
                            Current Month
                        </button>
                        <button
                            onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
                            disabled={monthOffset === 0}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-sm font-semibold text-black transition hover:bg-black/5 disabled:opacity-40"
                            aria-label="Next month"
                        >
                            &#8594;
                        </button>
                    </div>
                </div>

                {isLoadingMonthly ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    </div>
                ) : monthly ? (
                    <div className="space-y-6">
                        {/* Monthly stat summary */}
                        <div className="grid gap-4 md:grid-cols-3">
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

                        {/* Top Tracks */}
                        {monthly.dailyStats && monthly.dailyStats.length > 0 && (
                            <div>
                                <h3 className="mb-4 text-sm font-semibold text-black/60 uppercase tracking-wider">
                                    Top Tracks of the Month
                                </h3>
                                <div className="overflow-hidden rounded-2xl border border-black/10">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                                            <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-600">
                                                <tr>
                                                    <th className="border-b border-black/10 px-5 py-3 font-semibold">#</th>
                                                    <th className="border-b border-black/10 px-5 py-3 font-semibold">Track</th>
                                                    <th className="border-b border-black/10 px-5 py-3 text-right font-semibold">Streams</th>
                                                    <th className="border-b border-black/10 px-5 py-3 text-right font-semibold">Unique Users</th>
                                                    <th className="border-b border-black/10 px-5 py-3 text-right font-semibold">Listening Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {monthly.dailyStats.slice(0, 10).map((day, idx) => {
                                                    const totalStreams = day.topTracks?.reduce((sum, t) => sum + (t.streamCount ?? 0), 0) ?? 0;
                                                    const totalUnique = day.uniqueUsers ?? 0;
                                                    const totalTime = day.totalListeningTime ?? 0;
                                                    return (
                                                        <tr key={day.date} className="even:bg-slate-50/50">
                                                            <td className="border-b border-black/5 px-5 py-3 text-black/40">{idx + 1}</td>
                                                            <td className="border-b border-black/5 px-5 py-3">
                                                                <span className="font-medium text-black">{day.date}</span>
                                                                {day.topTracks?.[0] && (
                                                                    <p className="text-xs text-black/50">
                                                                        Top: {day.topTracks[0].title || "Unknown"}
                                                                    </p>
                                                                )}
                                                            </td>
                                                            <td className="border-b border-black/5 px-5 py-3 text-right font-semibold text-black">
                                                                {formatNumber(day.totalStreams)}
                                                            </td>
                                                            <td className="border-b border-black/5 px-5 py-3 text-right text-black/70">
                                                                {formatNumber(totalUnique)}
                                                            </td>
                                                            <td className="border-b border-black/5 px-5 py-3 text-right text-black/70">
                                                                {formatDuration(totalTime)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Daily breakdown */}
                        {monthly.dailyStats && monthly.dailyStats.length > 0 && (
                            <div>
                                <h3 className="mb-4 text-sm font-semibold text-black/60 uppercase tracking-wider">
                                    Daily Breakdown
                                </h3>
                                <div className="overflow-hidden rounded-2xl border border-black/10">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                                            <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-600">
                                                <tr>
                                                    <th className="border-b border-black/10 px-5 py-3 font-semibold">Date</th>
                                                    <th className="border-b border-black/10 px-5 py-3 text-right font-semibold">Streams</th>
                                                    <th className="border-b border-black/10 px-5 py-3 text-right font-semibold">Unique Users</th>
                                                    <th className="border-b border-black/10 px-5 py-3 text-right font-semibold">Listening Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {monthly.dailyStats.map((day) => (
                                                    <tr key={day.date} className="even:bg-slate-50/50">
                                                        <td className="border-b border-black/5 px-5 py-3 font-medium text-black">
                                                            {new Date(day.date).toLocaleDateString("en-US", {
                                                                weekday: "short",
                                                                month: "short",
                                                                day: "numeric",
                                                            })}
                                                        </td>
                                                        <td className="border-b border-black/5 px-5 py-3 text-right font-semibold text-black">
                                                            {formatNumber(day.totalStreams)}
                                                        </td>
                                                        <td className="border-b border-black/5 px-5 py-3 text-right text-black/70">
                                                            {formatNumber(day.uniqueUsers)}
                                                        </td>
                                                        <td className="border-b border-black/5 px-5 py-3 text-right text-black/70">
                                                            {formatDuration(day.totalListeningTime)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex h-32 items-center justify-center rounded-2xl border border-black/10">
                        <p className="text-sm text-black/40">No data available for this month.</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default DashboardPage;
