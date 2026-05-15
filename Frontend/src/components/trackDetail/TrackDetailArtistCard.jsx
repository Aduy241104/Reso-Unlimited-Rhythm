const TrackDetailArtistCard = ({ avatar, name, role }) => (
  <section className="sm:p-2">
    <h2 className="text-2xl font-semibold tracking-tight text-[#111111] dark:text-white">
      { "Ngh\u1ec7 s\u0129" }
    </h2>

    <div
      className="
        mt-5 flex items-center gap-4 p-2">
      <img
        src={ avatar }
        alt={ name }
        className="h-16 w-16 rounded-full object-cover shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
      />

      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-[#111111] dark:text-white">
          { name }
        </p>
        <p className="mt-1 text-sm text-[#52525b] dark:text-[#a1a1aa]">{ role }</p>
      </div>
    </div>
  </section>
);

export default TrackDetailArtistCard;
