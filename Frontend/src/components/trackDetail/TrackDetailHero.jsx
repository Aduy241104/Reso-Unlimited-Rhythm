import { Link } from "react-router-dom";

const HeroMetaSeparator = () => (
  <span className="text-white/45" aria-hidden="true">
    |
  </span>
);

const TrackDetailHero = ({
  image,
  title,
  artistName,
  artistAvatar,
  albumTitle,
  albumHref,
  releaseYear,
  duration,
  listensLabel,
}) => (
  <section className="relative overflow-hidden rounded-[10px] shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
    <div
      className="
        absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,215,96,0.32),transparent_34%),linear-gradient(180deg,rgba(31,31,31,0.16)_0%,rgba(18,18,18,0.82)_68%,#121212_100%)]
      "
    />
    <div className="relative px-4 pb-5 pt-4 sm:px-5 sm:pb-6 sm:pt-6 lg:px-6 lg:pb-10">
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:text-left">
        <div
          className="
            w-fit rounded-[16px] bg-black/15 p-1.5 shadow-[0_28px_70px_rgba(0,0,0,0.4)]
            backdrop-blur-sm
          "
        >
          <img
            src={ image }
            alt={ title }
            className="h-40 w-40 rounded-[16px] object-cover sm:h-52 sm:w-52 lg:h-60 lg:w-60"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/72">
            { "B\u00e0i h\u00e1t" }
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl lg:text-7xl">
            { title }
          </h1>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-white/82 sm:text-[15px] md:justify-start">
            <div className="flex items-center gap-3">
              <img
                src={ artistAvatar }
                alt={ artistName }
                className="h-9 w-9 rounded-full border border-white/15 object-cover"
              />
              <span className="font-medium text-white">{ artistName }</span>
            </div>
            <HeroMetaSeparator />
            { albumHref ? (
              <Link to={ albumHref } className="font-medium text-white/88 transition hover:text-white hover:underline">
                { albumTitle }
              </Link>
            ) : (
              <span>{ albumTitle }</span>
            ) }
            <HeroMetaSeparator />
            <span>{ releaseYear }</span>
            <HeroMetaSeparator />
            <span>{ duration }</span>
            <HeroMetaSeparator />
            <span>{ listensLabel }</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default TrackDetailHero;
