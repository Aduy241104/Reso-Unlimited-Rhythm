const SectionHeader = ({ eyebrow, title, description, action }) => {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        { eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/36">
            { eyebrow }
          </p>
        ) : null }
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-title text-[1.7rem] font-black tracking-tight text-white sm:text-[2rem]">
              { title }
            </h2>
            { action ? <div className="shrink-0">{ action }</div> : null }
          </div>
          { description ? (
            <p className="max-w-2xl text-sm leading-6 text-white/52">
              { description }
            </p>
          ) : null }
        </div>
      </div>
    </div>
  );
};

export default SectionHeader;
