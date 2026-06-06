import TrackInsightsSummaryCard from "./TrackInsightsSummaryCard";

const TrackInsightsSummaryGrid = ({ summaryCards }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {summaryCards.map((card) => (
      <TrackInsightsSummaryCard
        key={card.label}
        icon={card.icon}
        label={card.label}
        value={card.value}
        helper={card.helper}
      />
    ))}
  </div>
);

export default TrackInsightsSummaryGrid;
