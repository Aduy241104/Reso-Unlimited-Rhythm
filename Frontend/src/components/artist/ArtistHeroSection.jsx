import { CheckCircle2, MoreHorizontal } from "lucide-react";
import ArtistAvatar from "./ArtistAvatar";
import { formatFullNumber } from "../../utils/artistProfile";

const ArtistHeroSection = ({
  profile,
  isFollowing,
  isFollowLoading = false,
  followErrorMessage = "",
  onToggleFollow,
  onReport,
}) => {
  const followButtonLabel = isFollowLoading
    ? "\u0110ang x\u1eed l\u00fd..."
    : isFollowing
      ? "Đã theo dõi"
      : "Theo dõi";

  return (
    <section className="relative overflow-hidden bg-[#121212]">
      <div className="relative h-[22rem] w-full overflow-hidden sm:h-[28rem] lg:h-[34rem]">
        { profile.banner ? (
          <img
            src={ profile.banner }
            alt={ profile.name }
            className="h-full w-full object-cover opacity-[0.88]"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,#303030_0%,#1a1a1a_42%,#121212_100%)]" />
        ) }
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.18)_24%,rgba(18,18,18,0.58)_58%,#121212_100%)]" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-8 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-8">
            <ArtistAvatar
              src={ profile.avatar }
              alt={ profile.name }
              size="xl"
              className="h-28 w-28 border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.52)] sm:h-32 sm:w-32 lg:h-44 lg:w-44"
            />

            <div className="min-w-0 flex-1">
              { profile.verified ? (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <CheckCircle2 className="h-4 w-4 fill-[#3d91f4] text-[#3d91f4]" />
                  Verified Artist
                </span>
              ) : null }

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="font-title text-5xl font-black leading-none tracking-[-0.05em] text-white sm:text-7xl lg:text-[5.6rem]">
                  { profile.name }
                </h1>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/82 sm:text-base">
                <span>{ formatFullNumber(profile.monthlyListeners) } monthly listeners</span>
                <span className="text-white/35">&middot;</span>
                <span>{ formatFullNumber(profile.followers) } followers</span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={ onToggleFollow }
                  disabled={ isFollowLoading }
                  className="
                    rounded-full border border-white/25 px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em]
                    text-white transition duration-300 hover:scale-[1.02] hover:border-white/40 hover:bg-white/[0.08]
                    disabled:cursor-not-allowed disabled:opacity-70
                  "
                >
                  { followButtonLabel }
                </button>

                <button
                  type="button"
                  onClick={ onReport }
                  className="
                    rounded-full border border-white/25 px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em]
                    text-white transition duration-300 hover:scale-[1.02] hover:border-white/40 hover:bg-white/[0.08]
                  "
                >
                  Report
                </button>

                <button
                  type="button"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white/72 transition duration-300 hover:bg-white/[0.08] hover:text-white"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              { followErrorMessage ? (
                <p className="mt-3 text-sm text-rose-200/90">{ followErrorMessage }</p>
              ) : null }
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistHeroSection;
