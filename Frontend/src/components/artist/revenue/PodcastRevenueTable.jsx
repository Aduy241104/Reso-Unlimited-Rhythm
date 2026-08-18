import { Headphones } from "lucide-react";
import { useState } from "react";
import { formatCurrency, formatNumber } from "../../../utils/revenueFormat";

const PodcastArtwork = ({ src, title }) => {
    const [hasError, setHasError] = useState(false);

    if (!src || hasError) {
        return (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                <Headphones className="h-5 w-5" />
            </div>
        );
    }

    return (
        <img
            src={ src }
            alt={ title || "Podcast" }
            onError={ () => setHasError(true) }
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
        />
    );
};

const PodcastRevenueTable = ({ podcasts = [] }) => {
    if (!podcasts.length) {
        return (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
                <p className="text-sm font-medium text-zinc-800">
                    Chua co podcast phat sinh doanh thu
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                    Podcast co stream hop le trong ky doanh thu se hien thi tai day.
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
                            <th className="px-5 py-3 font-semibold">Podcast</th>
                            <th className="px-5 py-3 text-right font-semibold">Doanh thu</th>
                            <th className="px-5 py-3 text-right font-semibold">Luot nghe hop le</th>
                            <th className="px-5 py-3 text-right font-semibold">Luot phat</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-100">
                        { podcasts.map((podcast) => (
                            <tr
                                key={ podcast.podcastId }
                                className="transition hover:bg-zinc-50"
                            >
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <PodcastArtwork
                                            src={ podcast.coverImageUrl }
                                            title={ podcast.title }
                                        />

                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-zinc-950">
                                                { podcast.title || "Podcast chua dat ten" }
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-zinc-500">
                                                ID: { podcast.podcastId }
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-5 py-4 text-right font-semibold text-zinc-950">
                                    { formatCurrency(podcast.artistRevenueAmount) }
                                </td>

                                <td className="px-5 py-4 text-right text-zinc-700">
                                    { formatNumber(podcast.eligibleStreams) }
                                </td>

                                <td className="px-5 py-4 text-right text-zinc-500">
                                    { formatNumber(podcast.listenCount) }
                                </td>
                            </tr>
                        )) }
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PodcastRevenueTable;
