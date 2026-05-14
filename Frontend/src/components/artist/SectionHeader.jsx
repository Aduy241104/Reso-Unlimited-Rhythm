const SectionHeader = ({ eyebrow, title, description, action }) => {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2">
        { eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/36">
            { eyebrow }
          </p>
        ) : null }
        <div>
          <h2 className="font-title text-[1.7rem] font-black tracking-tight text-white sm:text-[2rem]">
            { title }
          </h2>
          { description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/52">
              { description }
            </p>
          ) : null }
        </div>
      </div>

      { action ? <div className="shrink-0">{ action }</div> : null }
    </div>
  );
};

export default SectionHeader;
