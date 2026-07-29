const TrackInsightsSummaryCard = ({ icon, label, value, helper }) => {
  const Icon = icon;

  return (
    <article className="rounded-[15px] border border-[#e7e1ff] bg-white p-3 shadow-sm shadow-[#7c6cf2]/[0.05]">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8.5 w-8.5 items-center justify-center rounded-[11px] bg-[#f3f0ff] text-[#6f5cf1]">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-2.5 text-[12px] font-medium text-[#6b6682]">{label}</p>
      <p className="mt-1 text-[20px] font-semibold tracking-tight text-[#2f2747]">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] leading-5 text-[#7c7891]">{helper}</p>
    </article>
  );
};

export default TrackInsightsSummaryCard;
