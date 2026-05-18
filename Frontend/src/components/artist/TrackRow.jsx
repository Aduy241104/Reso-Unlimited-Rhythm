const TrackRow = ({
  index,
  image,
  title,
  plays,
  duration,
}) => {
  return (
    <div
      className="
        group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3
        px-3 py-3 transition duration-300 hover:bg-white/[0.045] sm:grid-cols-[2.25rem_minmax(0,1.2fr)_minmax(0,0.8fr)_4rem]
      "
    >
      <span className="text-sm font-medium text-white/42">{ index }</span>

      <div className="flex min-w-0 items-center gap-4">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-[#242424]">
          { image ? (
            <img
              src={ image }
              alt={ title }
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.08]"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,#343434,#161616)]" />
          ) }
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white sm:text-[15px]">
            { title }
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/34">
            Catalog highlight
          </p>
        </div>
      </div>

      <span className="hidden truncate text-sm text-white/48 sm:block">{ plays }</span>
      <span className="text-right text-sm text-white/44">{ duration }</span>
    </div>
  );
};

export default TrackRow;
