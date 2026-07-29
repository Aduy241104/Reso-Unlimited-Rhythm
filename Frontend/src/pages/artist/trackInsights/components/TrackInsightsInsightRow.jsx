const TrackInsightsInsightRow = ({
  label,
  value,
  helper,
  accentClassName = "bg-[#8b5e3c]",
}) => (
  <div className="rounded-[14px] border border-[#e7e1ff] bg-[#f8f6ff] p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[13px] font-medium text-[#6b6682]">{label}</p>
        <p className="mt-1 text-base font-semibold text-[#2f2747]">{value}</p>
      </div>
      <div className={["h-9 w-1 rounded-full", accentClassName].join(" ")} />
    </div>
    <p className="mt-2 text-[13px] leading-5 text-[#7c7891]">{helper}</p>
  </div>
);

export default TrackInsightsInsightRow;
