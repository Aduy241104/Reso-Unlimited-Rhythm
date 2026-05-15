import { formatFullNumber } from "../../utils/artistProfile";
import SectionHeader from "./SectionHeader";

const AboutArtistSection = ({ profile, isLoading = false }) => {
  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Identity"
        title="About The Artist"
        description="Built like a cinematic profile card, with room for story, scale, and branding."
      />

      { isLoading ? (
        <div className="h-[24rem] animate-pulse border border-white/6 bg-white/[0.04]" />
      ) : (
        <article className="group relative overflow-hidden  bg-[#101010]">
          <div className="absolute inset-0 overflow-hidden">
            { profile.aboutImage ? (
              <img
                src={ profile.aboutImage }
                alt={ profile.name }
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,#2b2b2b_0%,#161616_48%,#101010_100%)]" />
            ) }
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.42)_38%,rgba(10,10,10,0.92)_100%)]" />
          </div>

          <div className="relative min-h-[24rem] px-5 py-6 sm:px-8 sm:py-8 lg:min-h-[28rem] lg:px-10 lg:py-10">
            <div className="flex h-full items-end">
              <div className="max-w-3xl">
                <div className="mb-5 flex flex-wrap gap-6 text-sm text-white/72">
                  <span>{ formatFullNumber(profile.monthlyListeners) } monthly listeners</span>
                  <span>{ formatFullNumber(profile.followers) } followers</span>
                  { profile.location ? <span>{ profile.location }</span> : null }
                </div>

                <h3 className="font-title text-3xl font-black tracking-tight text-white sm:text-4xl">
                  { profile.name }
                </h3>
                { profile.bio ? (
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d8d8d8] sm:text-base">
                    { profile.bio }
                  </p>
                ) : null }
              </div>
            </div>
          </div>
        </article>
      ) }
    </section>
  );
};

export default AboutArtistSection;
