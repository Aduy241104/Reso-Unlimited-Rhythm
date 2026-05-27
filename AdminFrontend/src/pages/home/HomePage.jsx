import { useEffect, useState } from "react";
import {
    getOverviewStatsService,
    getDailyStatsService,
    getTopTracksService,
    getTopArtistsService,
} from "../../services/dashboardService";

const formatNumber = (num) => {
    if (num === undefined || num === null) return "0";
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
};

const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const StatCard = ({ label, value, unit, change, icon, loading }) => (
    <div className="rounded-3xl border border-black bg-white p-5">
        <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">{label}</p>
            {icon && <span className="text-black/30">{icon}</span>}
        </div>
        {loading ? (
            <div className="mt-3 h-8 w-24 animate-pulse rounded bg-black/10" />
        ) : (
            <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-black">{value}</span>
                {unit && <span className="text-sm font-medium text-black/50">{unit}</span>}
            </div>
        )}
        {change !== undefined && !loading && (
            <p className={`mt-2 text-xs font-medium ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {change >= 0 ? "+" : ""}{change}% vs prev period
            </p>
        )}
    </div>
);

const TopItemRow = ({ rank, name, count, barWidth }) => (
    <div className="flex items-center gap-4">
        <span className="w-6 shrink-0 text-center text-xs font-bold text-black/40">{rank}</span>
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-black">{name}</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                <div
                    className="h-full rounded-full bg-black transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                />
            </div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-black/60">{formatNumber(count)}</span>
    </div>
);

const DailyChartBar = ({ day, streams, maxStreams }) => {
    const height = maxStreams > 0 ? (streams / maxStreams) * 100 : 0;
    return (
        <div className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end justify-center">
                <div
                    className="w-full max-w-8 rounded-t-md bg-black transition-all duration-300"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${formatNumber(streams)} streams`}
                />
            </div>
            <span className="text-[10px] font-medium text-black/40">{day}</span>
        </div>
    );
};

const DashboardPage = () => {
    const [overview, setOverview] = useState(null);
    const [dailyStats, setDailyStats] = useState([]);
    const [topTracks, setTopTracks] = useState([]);
    const [topArtists, setTopArtists] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [periodDays, setPeriodDays] = useState(7);

    const loadData = async (days) => {
        setIsLoading(true);
        setError("");
        try {
            const [overviewData, dailyData, tracksData, artistsData] = await Promise.all([
                getOverviewStatsService(days),
                getDailyStatsService(days),
                getTopTracksService(10),
                getTopArtistsService(10),
            ]);
            setOverview(overviewData?.summary || null);
            setDailyStats(dailyData || []);
            setTopTracks(tracksData || []);
            setTopArtists(artistsData || []);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || "Failed to load dashboard data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadData(periodDays);
    }, [periodDays]);

    const maxDailyStreams = Math.max(...dailyStats.map((d) => d.totalStreams || 0), 1);
    const maxTrackStreams = Math.max(...topTracks.map((t) => t.streamCount || 0), 1);
    const maxArtistStreams = Math.max(...topArtists.map((a) => a.streamCount || 0), 1);

    const lastUpdated = overview
        ? new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : null;

    return (
        <section className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="rounded-[2rem] border border-black bg-white px-8 py-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">
                        Dashboard
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold text-black">
                        Streaming Statistics
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">
                        Platform-wide streaming analytics and performance metrics.
                    </p>
                    {lastUpdated && (
                        <p className="mt-2 text-xs text-black/40">
                            Auto-refresh at {lastUpdated} &middot; Data updated daily via cron
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex rounded-2xl border border-black/10 bg-white p-1">
                        {[7, 14, 30].map((d) => (
                            <button
                                key={d}
                                onClick={() => setPeriodDays(d)}
                                className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                                    periodDays === d
                                        ? "bg-black text-white"
                                        : "text-black/50 hover:bg-black/5 hover:text-black"
                                }`}
                            >
                                {d}D
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
                    {error}
                </div>
            )}

            {/* Top KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Streams"
                    value={formatNumber(overview?.totalStreams ?? 0)}
                    unit={`in ${periodDays} days`}
                    change={overview?.streamsChange}
                    loading={isLoading}
                />
                <StatCard
                    label="Avg Daily Streams"
                    value={formatNumber(overview?.avgDailyStreams ?? 0)}
                    unit="/ day"
                    loading={isLoading}
                />
                <StatCard
                    label="Unique Listeners"
                    value={formatNumber(overview?.totalUniqueUsers ?? 0)}
                    change={overview?.activeUsersChange}
                    loading={isLoading}
                />
                <StatCard
                    label="Listening Time"
                    value={formatDuration(overview?.totalListeningTime ?? 0)}
                    loading={isLoading}
                />
            </div>

            {/* Secondary KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard
                    label="Today Streams"
                    value={formatNumber(overview?.todayStreams ?? 0)}
                    loading={isLoading}
                />
                <StatCard
                    label="Today Users"
                    value={formatNumber(overview?.todayUniqueUsers ?? 0)}
                    loading={isLoading}
                />
                <StatCard
                    label="Total Users"
                    value={formatNumber(overview?.totalUsers ?? 0)}
                    loading={isLoading}
                />
                <StatCard
                    label="Total Tracks"
                    value={formatNumber(overview?.totalTracks ?? 0)}
                    loading={isLoading}
                />
                <StatCard
                    label="Total Artists"
                    value={formatNumber(overview?.totalArtists ?? 0)}
                    loading={isLoading}
                />
                <StatCard
                    label="Avg per Stream"
                    value={formatDuration(
                        overview?.totalStreams > 0
                            ? Math.round((overview?.totalListeningTime ?? 0) / overview.totalStreams)
                            : 0
                    )}
                    loading={isLoading}
                />
            </div>

            {/* Daily Streams Chart */}
            <div className="rounded-[2rem] border border-black bg-white p-6">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/45">
                            Streams
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-black">
                            Daily Stream Volume
                        </h2>
                    </div>
                    <p className="text-sm font-medium text-black/50">
                        Last {dailyStats.length} days
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex h-44 items-end gap-2">
                        {Array.from({ length: periodDays }).map((_, i) => (
                            <div
                                key={i}
                                className="flex-1 animate-pulse rounded-t-md bg-black/10"
                                style={{ height: `${40 + Math.random() * 60}%` }}
                            />
                        ))}
                    </div>
                ) : dailyStats.length === 0 ? (
                    <div className="flex h-44 items-center justify-center text-sm text-black/40">
                        No streaming data available yet.
                    </div>
                ) : (
                    <div className="flex items-end gap-2">
                        {dailyStats.map((day) => (
                            <DailyChartBar
                                key={day.date}
                                day={formatDate(day.date)}
                                streams={day.totalStreams || 0}
                                maxStreams={maxDailyStreams}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Top Tracks + Top Artists */}
            <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[2rem] border border-black bg-white p-6">
                    <div className="mb-5 flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/45">
                                Ranking
                            </p>
                            <h2 className="mt-2 text-xl font-semibold text-black">
                                Top Tracks
                            </h2>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse">
                                    <div className="h-4 w-6 rounded bg-black/10" />
                                    <div className="h-4 flex-1 rounded bg-black/10" />
                                    <div className="h-4 w-12 rounded bg-black/10" />
                                </div>
                            ))}
                        </div>
                    ) : topTracks.length === 0 ? (
                        <p className="text-sm text-black/40">No track data available.</p>
                    ) : (
                        <div className="space-y-4">
                            {topTracks.slice(0, 10).map((track, index) => (
                                <TopItemRow
                                    key={track.trackId}
                                    rank={index + 1}
                                    name={track.title || "Unknown"}
                                    count={track.streamCount}
                                    barWidth={(track.streamCount / maxTrackStreams) * 100}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-[2rem] border border-black bg-white p-6">
                    <div className="mb-5 flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/45">
                                Ranking
                            </p>
                            <h2 className="mt-2 text-xl font-semibold text-black">
                                Top Artists
                            </h2>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse">
                                    <div className="h-4 w-6 rounded bg-black/10" />
                                    <div className="h-4 flex-1 rounded bg-black/10" />
                                    <div className="h-4 w-12 rounded bg-black/10" />
                                </div>
                            ))}
                        </div>
                    ) : topArtists.length === 0 ? (
                        <p className="text-sm text-black/40">No artist data available.</p>
                    ) : (
                        <div className="space-y-4">
                            {topArtists.slice(0, 10).map((artist, index) => (
                                <TopItemRow
                                    key={artist.artistId}
                                    rank={index + 1}
                                    name={artist.name || "Unknown"}
                                    count={artist.streamCount}
                                    barWidth={(artist.streamCount / maxArtistStreams) * 100}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Streaming Summary Table */}
            <div className="rounded-[2rem] border border-black bg-white overflow-hidden">
                <div className="border-b border-black/10 px-6 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/45">
                        Details
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-black">
                        Daily Breakdown
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-black">
                        <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-600">
                            <tr>
                                <th className="border-b border-black/10 px-6 py-4">Date</th>
                                <th className="border-b border-black/10 px-6 py-4 text-right">Streams</th>
                                <th className="border-b border-black/10 px-6 py-4 text-right">Unique Users</th>
                                <th className="border-b border-black/10 px-6 py-4 text-right">Listening Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="border-b border-black/5 px-6 py-4"><div className="h-4 w-20 animate-pulse rounded bg-black/10" /></td>
                                        <td className="border-b border-black/5 px-6 py-4"><div className="ml-auto h-4 w-16 animate-pulse rounded bg-black/10" /></td>
                                        <td className="border-b border-black/5 px-6 py-4"><div className="ml-auto h-4 w-16 animate-pulse rounded bg-black/10" /></td>
                                        <td className="border-b border-black/5 px-6 py-4"><div className="ml-auto h-4 w-16 animate-pulse rounded bg-black/10" /></td>
                                    </tr>
                                ))
                            ) : dailyStats.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-sm text-black/40">
                                        No data available yet. Stream data is collected daily at 01:00 AM.
                                    </td>
                                </tr>
                            ) : (
                                dailyStats.slice().reverse().map((day) => (
                                    <tr key={day.date} className="even:bg-slate-50">
                                        <td className="border-b border-black/5 px-6 py-4 font-medium">
                                            {formatDate(day.date)}
                                        </td>
                                        <td className="border-b border-black/5 px-6 py-4 text-right">
                                            {formatNumber(day.totalStreams)}
                                        </td>
                                        <td className="border-b border-black/5 px-6 py-4 text-right">
                                            {formatNumber(day.uniqueUsers)}
                                        </td>
                                        <td className="border-b border-black/5 px-6 py-4 text-right">
                                            {formatDuration(day.totalListeningTime)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};

export default DashboardPage;
