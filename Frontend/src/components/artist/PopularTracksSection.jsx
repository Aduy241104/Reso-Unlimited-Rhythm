import SectionHeader from "./SectionHeader";
import TrackRow from "./TrackRow";

const PopularTracksSection = ({
  tracks = [],
  isLoading = false,
  onComingSoonClick,
}) => {
  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Most played"
        title="Popular"
        description="A focused view of the tracks pulling the strongest audience response right now."
        action={
          <button
            type="button"
            onClick={ onComingSoonClick }
            className="
              inline-flex items-center justify-center rounded-full border border-[#1DB954]/80
              bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em]
              text-white shadow-[0_0_0_rgba(29,185,84,0)] backdrop-blur-xl transition-all duration-300
              hover:scale-[1.04] hover:border-[#1DB954] hover:bg-black/60
              hover:shadow-[0_0_24px_rgba(29,185,84,0.3)]
            "
          >
            Coming Soon
          </button>
        }
      />

      <div className="bg-transparent">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-3 px-3 pb-3 pt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/34 sm:grid-cols-[2.25rem_minmax(0,1.2fr)_minmax(0,0.8fr)_4rem]">
          <span>#</span>
          <span>Title</span>
          <span className="hidden sm:block">Plays</span>
          <span className="text-right">Time</span>
        </div>

        { isLoading ? (
          <div className="space-y-1 px-3">
            { Array.from({ length: 5 }).map((_, index) => (
              <div
                key={ index }
                className="grid animate-pulse grid-cols-[2.25rem_minmax(0,1fr)_4rem] items-center gap-3 px-1 py-3 sm:grid-cols-[2.25rem_minmax(0,1.2fr)_minmax(0,0.8fr)_4rem]"
              >
                <div className="h-4 w-4 rounded-full bg-white/8" />
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white/8" />
                  <div className="space-y-2">
                    <div className="h-4 w-36 bg-white/10" />
                    <div className="h-3 w-20 bg-white/7" />
                  </div>
                </div>
                <div className="hidden h-4 w-16 justify-self-start bg-white/7 sm:block" />
                <div className="h-4 w-10 justify-self-end bg-white/7" />
              </div>
            )) }
          </div>
        ) : tracks.length > 0 ? (
          <div>
            { tracks.map((track, index) => (
              <TrackRow
                key={ track.id || track.title || index }
                index={ String(index + 1).padStart(2, "0") }
                image={ track.image }
                title={ track.title }
                plays={ track.plays }
                duration={ track.duration }
              />
            )) }
          </div>
        ) : (
          <div className="px-4 py-8 text-sm text-white/48">
            No popular tracks available from the backend yet.
          </div>
        ) }
      </div>
    </section>
  );
};

export default PopularTracksSection;
