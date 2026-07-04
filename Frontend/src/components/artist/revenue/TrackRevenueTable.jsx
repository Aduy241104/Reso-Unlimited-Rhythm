import { Disc3 } from "lucide-react";
import { useState } from "react";
import { formatCurrency, formatNumber } from "../../../utils/revenueFormat";

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

const TrackRevenueTable = ({ tracks = [] }) => {
    if (!tracks.length) {
        return (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
                <p className="text-sm font-medium text-zinc-800">
                    Chưa có track phát sinh doanh thu
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                    Khi kỳ doanh thu được xác nhận, các track có stream hợp lệ sẽ xuất hiện tại đây.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-[0.12em] text-zinc-500">
                        <tr>
                            <th className="px-5 py-3 font-semibold">Track</th>
                            <th className="px-5 py-3 text-right font-semibold">Doanh thu</th>
                            <th className="px-5 py-3 text-right font-semibold">Stream hợp lệ</th>
                            <th className="px-5 py-3 text-right font-semibold">Play count</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-100">
                        { tracks.map((track) => (
                            <tr
                                key={ track.trackId }
                                className="transition hover:bg-zinc-50"
                            >
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <TrackAvatar src={ track.avatar } title={ track.title } />

                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-zinc-950">
                                                { track.title || "Không có tiêu đề" }
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-zinc-500">
                                                ID: { track.trackId }
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-5 py-4 text-right font-semibold text-zinc-950">
                                    { formatCurrency(track.artistRevenueAmount) }
                                </td>

                                <td className="px-5 py-4 text-right text-zinc-700">
                                    { formatNumber(track.eligibleStreams) }
                                </td>

                                <td className="px-5 py-4 text-right text-zinc-500">
                                    { formatNumber(track.playCount) }
                                </td>
                            </tr>
                        )) }
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TrackRevenueTable;