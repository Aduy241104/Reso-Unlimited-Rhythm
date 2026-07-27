import TrackTwoLevelMenu from "../trackMenu/TrackTwoLevelMenu";
import SectionHeader from "./SectionHeader";
import TrackRow from "./TrackRow";

const getArtistName = (track) =>
  track?.artist?.name ||
  track?.artistName ||
  track?.artistId?.name ||
  "Unknown Artist";

const getTrackImage = (track) =>
  track?.image ||
  track?.coverImage ||
  track?.album?.coverImage ||
  track?.avatar ||
  "";

const PopularTracksSection = ({
  tracks = [],
  isLoading = false,
  onComingSoonClick,
}) => {
  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Nghe nhiều"
        title="Phổ biến"
        description="Những bài hát đang nhận được nhiều sự quan tâm nhất từ người nghe."
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
            Sắp ra mắt
          </button>
        }
      />

      <div className="bg-transparent">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-3 px-3 pb-3 pt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/34 sm:grid-cols-[2.25rem_minmax(0,1.2fr)_minmax(0,0.8fr)_4rem_2.5rem]">
          <span>#</span>
          <span>Tiêu đề</span>
          <span className="hidden sm:block">Lượt phát</span>
          <span className="text-right">Thời lượng</span>
          <span aria-hidden="true" className="hidden sm:block" />
        </div>

        { isLoading ? (
          <div className="space-y-1 px-3">
            { Array.from({ length: 5 }).map((_, index) => (
              <div
                key={ index }
                className="grid animate-pulse grid-cols-[2.25rem_minmax(0,1fr)_4rem] items-center gap-3 px-1 py-3 sm:grid-cols-[2.25rem_minmax(0,1.2fr)_minmax(0,0.8fr)_4rem_2.5rem]"
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
                <div className="hidden h-8 w-8 justify-self-end rounded-full bg-white/7 sm:block" />
              </div>
            )) }
          </div>
        ) : tracks.length > 0 ? (
          <div>
            { tracks.map((track, index) => (
              <TrackRow
                key={ track?._id || track?.id || track?.title || index }
                index={ String(index + 1).padStart(2, "0") }
                image={ getTrackImage(track) }
                title={ track?.title || "Untitled track" }
                artistName={ getArtistName(track) }
                plays={ track?.plays || "0" }
                duration={ track?.duration || "--:--" }
                track={ track }
                menu={ <TrackTwoLevelMenu track={ track } /> }
              />
            )) }
          </div>
        ) : (
          <div className="px-4 py-8 text-sm text-white/48">
            Chưa có bài hát phổ biến nào từ hệ thống.
          </div>
        ) }
      </div>
    </section>
  );
};

export default PopularTracksSection;
