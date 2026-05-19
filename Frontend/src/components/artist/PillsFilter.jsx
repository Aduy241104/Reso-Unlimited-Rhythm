const PillsFilter = ({ items = [], value, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      { items.map((item) => {
        const isActive = item.value === value;

        return (
          <button
            key={ item.value }
            type="button"
            onClick={ () => onChange?.(item.value) }
            className={[
              "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition duration-300",
              isActive
                ? "border-white/12 bg-white text-[#0f0f0f] shadow-[0_12px_30px_rgba(255,255,255,0.08)]"
                : "border-white/10 bg-white/[0.03] text-white/62 hover:border-white/18 hover:bg-white/[0.06] hover:text-white",
            ].join(" ")}
          >
            { item.label }
          </button>
        );
      }) }
    </div>
  );
};

export default PillsFilter;
