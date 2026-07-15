const RevenueStatCard = ({
    icon: Icon,
    label,
    value,
    description,
    accent = false,
}) => {
    return (
        <div
            className={ `
                rounded-2xl border bg-white p-4 shadow-sm
                ${accent ? "border-violet-200" : "border-zinc-200"}
            `}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                        { label }
                    </p>

                    <p className="mt-2 truncate text-xl font-semibold text-zinc-950">
                        { value }
                    </p>

                    { description && (
                        <p className="mt-1 text-xs text-zinc-500">
                            { description }
                        </p>
                    ) }
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

export default RevenueStatCard;