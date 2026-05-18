import { ArrowLeft, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";

const COUNTDOWN_SEGMENTS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
];

const createCountdownState = (scheduledAt) => {
  const targetTimestamp = new Date(scheduledAt).getTime();

  if (!Number.isFinite(targetTimestamp)) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const remainingTime = Math.max(targetTimestamp - Date.now(), 0);
  const totalSeconds = Math.floor(remainingTime / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

const formatCountdownValue = (value) => String(value).padStart(2, "0");

const formatScheduledLabel = (scheduledAt) => {
  const releaseDate = new Date(scheduledAt);

  if (Number.isNaN(releaseDate.getTime())) {
    return "Release schedule pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(releaseDate);
};

const buildDescription = ({ artistName, releaseTitle, releaseType }) =>
  `${artistName || "This artist"} is counting down to the ${String(releaseType).toLowerCase()} release of ${releaseTitle}.`;

const ComingSoonCountdownOverlay = ({
  isVisible = false,
  comingRelease = null,
  artistName = "Artist",
  overlayBounds = null,
  onBack,
}) => {
  const [countdown, setCountdown] = useState(() =>
    createCountdownState(comingRelease?.scheduledAt)
  );

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const updateCountdown = () => {
      setCountdown(createCountdownState(comingRelease?.scheduledAt));
    };

    updateCountdown();

    const countdownInterval = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(countdownInterval);
    };
  }, [comingRelease?.scheduledAt, isVisible]);

  const releaseTitle = comingRelease?.title || `${artistName} next release`;
  const releaseType = comingRelease?.type || "Release";
  const scheduleLabel = formatScheduledLabel(comingRelease?.scheduledAt);
  const hasScheduledRelease = Boolean(comingRelease?.scheduledAt);
  const backgroundImage = comingRelease?.image || "";
  const description = buildDescription({
    artistName,
    releaseTitle,
    releaseType,
  });

  return (
    <div
      style={ overlayBounds ?? undefined }
      className={ `
        fixed z-[70] overflow-hidden bg-black transition-all duration-700
        ease-[cubic-bezier(0.22,1,0.36,1)]
        ${overlayBounds ? "" : "inset-0"}
        ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}
      ` }
    >
      <div
        className={ `
          absolute inset-0 transition-transform duration-[3200ms] ease-out
          scale-100
        ` }
      >
        { backgroundImage ? (
          <div
            className="absolute inset-0 bg-center bg-no-repeat blur-[3px]"
            style={ {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "contain",
              backgroundPosition: "center top",
              filter: "saturate(1.08) brightness(0.72)",
            } }
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#101010_0%,#181818_42%,#050505_100%)]" />
        ) }
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.74)_34%,rgba(0,0,0,0.48)_60%,rgba(0,0,0,0.78)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.14)_0%,rgba(0,0,0,0.1)_26%,rgba(0,0,0,0.34)_66%,rgba(0,0,0,0.82)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,185,84,0.22),transparent_26%),radial-gradient(circle_at_78%_18%,rgba(29,185,84,0.18),transparent_22%),radial-gradient(circle_at_center,transparent_42%,rgba(0,0,0,0.46)_100%)]" />
      <div className="absolute right-[8%] top-[12%] h-44 w-44 rounded-full bg-[#1DB954]/16 blur-[110px]" />
      <div className="absolute left-[12%] bottom-[8%] h-40 w-40 rounded-full bg-white/5 blur-[120px]" />
      <div className="absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.98)]" />

      <div
        className={ `
          relative z-10 flex min-h-full items-center justify-center px-5 py-8 sm:px-8 lg:px-10 transition-all
          duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isVisible ? "scale-100 blur-0" : "scale-[1.02] blur-md"}
        ` }
      >
        <div
          className={ `
            w-full max-w-[620px] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
            ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}
          ` }
        >
          <div
            className="
              relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(145deg,rgba(0,0,0,0.42),rgba(0,0,0,0.2))]
              px-7 py-6 shadow-[0_0_42px_rgba(29,185,84,0.08),0_28px_110px_rgba(0,0,0,0.52)]
              backdrop-blur-[20px]
            "
            style={ {
              animation: isVisible ? "comingSoonFloat 6s ease-in-out infinite" : "none",
            } }
          >
            <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)]" />
            <div
              className="absolute inset-0 opacity-80"
              style={ {
                backgroundImage:
                  "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015) 34%, rgba(29,185,84,0.08) 100%)",
                animation: isVisible ? "comingSoonPulse 4.5s ease-in-out infinite" : "none",
              } }
            />

            <div className="relative space-y-3 text-left">
              <div className="inline-flex w-fit items-center gap-2.5 rounded-full border border-[#1DB954]/24 bg-black/30 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#e7fff0] backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-[#1DB954] shadow-[0_0_14px_rgba(29,185,84,0.8)]" />
                Coming Release
              </div>

              <div className="space-y-3">
                <h2 className="max-w-[14ch] font-title text-[3rem] font-black leading-[0.9] tracking-[-0.07em] text-white sm:text-[4rem]">
                  { releaseTitle }
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-sm text-white/62">
                  <span className="font-semibold text-[#d8ffe6]">{ releaseType }</span>
                  <span className="text-[#1DB954]/80">/</span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-[#1DB954]" />
                    { scheduleLabel }
                  </span>
                </div>

                <p className="max-w-[480px] text-sm leading-5 text-white/58">
                  { description }
                </p>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2">
                { COUNTDOWN_SEGMENTS.map((segment) => (
                  <div
                    key={ segment.key }
                    className="
                      min-h-[82px] rounded-[1.1rem] border border-white/10
                      bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))]
                      px-2 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.16)]
                      backdrop-blur-md
                      flex flex-col items-center justify-center text-center
                    "
                  >
                    <div className="font-title text-[2.3rem] font-black leading-none tracking-[-0.08em] text-white">
                      { formatCountdownValue(countdown[segment.key]) }
                    </div>
                    <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">
                      { segment.label }
                    </div>
                  </div>
                )) }
              </div>

              { !hasScheduledRelease ? (
                <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-black/28 px-4 py-4 text-sm text-white/58">
                  No scheduled coming release is available from the backend yet.
                </div>
              ) : null }

              <button
                type="button"
                onClick={ onBack }
                className="
                  mt-5 inline-flex w-fit items-center justify-center gap-2 rounded-full border border-white/14
                  bg-black/42 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em]
                  text-white transition-all duration-300 hover:scale-[1.03] hover:border-[#1DB954]/55
                  hover:bg-black/62 hover:shadow-[0_0_24px_rgba(29,185,84,0.18)]
                "
              >
                <ArrowLeft className="h-4 w-4" />
                Back To Artist Page
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes comingSoonFloat {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-8px);
            }
          }

          @keyframes comingSoonPulse {
            0%, 100% {
              opacity: 0.62;
            }
            50% {
              opacity: 0.95;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ComingSoonCountdownOverlay;
