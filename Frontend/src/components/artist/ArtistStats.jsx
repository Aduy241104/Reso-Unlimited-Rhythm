import { formatCompactNumber, formatFullNumber } from "../../utils/artistProfile";

const ArtistStats = ({ monthlyListeners, followers }) => {
  const items = [
    {
      label: "Monthly listeners",
      value: formatFullNumber(monthlyListeners),
      detail: `${formatCompactNumber(monthlyListeners)} active reach`,
    },
    {
      label: "Followers",
      value: formatFullNumber(followers),
      detail: `${formatCompactNumber(followers)} loyal audience`,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      { items.map((item) => (
        <article
          key={ item.label }
          className="bg-[#181818] px-5 py-5 transition duration-300 hover:bg-[#202020]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
            { item.label }
          </p>
          <p className="mt-4 font-title text-3xl font-black tracking-tight text-white">
            { item.value }
          </p>
          <p className="mt-2 text-sm text-white/42">{ item.detail }</p>
        </article>
      )) }
    </div>
  );
};

export default ArtistStats;
