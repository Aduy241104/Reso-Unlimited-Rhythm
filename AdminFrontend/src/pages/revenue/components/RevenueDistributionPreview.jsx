import { ArrowRight } from "lucide-react";
import {
    formatCurrency,
    formatNumber,
} from "../utils";
import DashboardCard from "./RevenueShared";

const RevenueDistributionPreview = ({
    artists = [],
    summary = {},
    onOpen,
}) => {
    const artistCount = artists.length;

    return (
        <DashboardCard className="border-slate-200">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Phân bổ nghệ sĩ
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                        Nghệ sĩ được phân bổ
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        { artistCount > 0
                            ? `Có ${formatNumber(artistCount)} nghệ sĩ được tính doanh thu trong kỳ này.`
                            : "Kỳ này chưa có nghệ sĩ nào được phân bổ doanh thu." }
                    </p>
                </div>

                { artistCount > 0 ? (
                    <button
                        type="button"
                        onClick={ onOpen }
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        Xem danh sách nghệ sĩ
                        <ArrowRight size={ 16 } />
                    </button>
                ) : null }
            </div>

            <div className="grid gap-3 p-5 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">Số nghệ sĩ</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                        { formatNumber(artistCount) }
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">
                        Tổng stream hợp lệ
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                        { formatNumber(summary?.totalEligibleStreams) }
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">Quỹ phân bổ</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                        { formatCurrency(summary?.artistPool) }
                    </p>
                </div>
            </div>
        </DashboardCard>
    );
};

export default RevenueDistributionPreview;