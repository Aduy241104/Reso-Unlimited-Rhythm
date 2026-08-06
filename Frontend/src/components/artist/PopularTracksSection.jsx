import TrackTwoLevelMenu from "../trackMenu/TrackTwoLevelMenu";
import SectionHeader from "./SectionHeader";
import TrackRow from "./TrackRow";
import LoadingState from "../common/LoadingState";

const getArtistName = (track) =>
  track?.artist?.name ||
  track?.artistName ||
  track?.artistId?.name ||
  "Nghệ sĩ chưa xác định";

const getTrackImage = (track) =>
  track?.avatar ||
  track?.artist?.avatar ||
  track?.image ||
  track?.coverImage ||
  track?.album?.coverImage ||
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
          <LoadingState message="Đang tải bài hát..." className="min-h-[14rem]" />
        ) : tracks.length > 0 ? (
          <div>
            { tracks.map((track, index) => (
              <TrackRow
                key={ track?._id || track?.id || track?.title || index }
                index={ String(index + 1).padStart(2, "0") }
                image={ getTrackImage(track) }
                title={ track?.title || "Bài hát chưa có tên" }
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
