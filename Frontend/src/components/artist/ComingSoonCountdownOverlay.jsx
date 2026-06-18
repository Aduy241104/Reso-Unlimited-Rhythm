import { ArrowLeft, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";

const COUNTDOWN_SEGMENTS = [
  { key: "days", label: "Ngàyy" },
  { key: "hours", label: "Giờ" },
  { key: "minutes", label: "Phút" },
  { key: "seconds", label: "Giây" },
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
    return "L\u1ecbch ph\u00e1t h\u00e0nh \u0111ang ch\u1edd c\u1eadp nh\u1eadt";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(releaseDate);
};

const buildDescription = ({ artistName, releaseTitle, releaseType }) =>
  `${artistName || "Ngh\u1ec7 s\u0129 n\u00e0y"} \u0111ang \u0111\u1ebfm ng\u01b0\u1ee3c \u0111\u1ebfn th\u1eddi \u0111i\u1ec3m ph\u00e1t h\u00e0nh ${String(releaseType).toLowerCase()} ${releaseTitle}.`;

const ComingSoonCountdownOverlay = ({
  isVisible = false,
  comingRelease = null,
  artistName = "Ngh\u1ec7 s\u0129",
  overlayBounds = null,
  trackId = "",
  onBack,
}) => {
  const navigate = useNavigate();
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

  const releaseTitle = comingRelease?.title || `${artistName} sắp phát hành`;
  const releaseType = comingRelease?.type || "Ph\u00e1t h\u00e0nh";
  const scheduleLabel = formatScheduledLabel(comingRelease?.scheduledAt);
  const hasScheduledRelease = Boolean(comingRelease?.scheduledAt);
  const isCountdownFinished =
    hasScheduledRelease &&
    countdown.days === 0 &&
    countdown.hours === 0 &&
    countdown.minutes === 0 &&
    countdown.seconds === 0;
  const backgroundImage = comingRelease?.image || "";
  const description = buildDescription({
    artistName,
    releaseTitle,
    releaseType,
  });
  const overlayPositionStyle = overlayBounds
    ? {
        left: overlayBounds.left,
      }
    : undefined;

  const handleListenNow = () => {
    if (!trackId) {
      return;
    }

    navigate(routePaths.trackDetail(trackId));
  };

  return (
    <div
      style={ overlayPositionStyle }
      className={`
        fixed inset-x-0 bottom-0 top-[58px] z-[70] overflow-hidden bg-black transition-all duration-700
        lg:top-[62px]
        ease-[cubic-bezier(0.22,1,0.36,1)]
        ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}
      `}
    >
      <div
        className={`
          absolute inset-0 transition-transform duration-[3200ms] ease-out
          scale-100
        `}
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
        className={`
          relative z-10 flex h-full min-h-full w-full items-center justify-center overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8 transition-all
          duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isVisible ? "scale-100 blur-0" : "scale-[1.02] blur-md"}
        `}
      >
        <div
          className={`
            flex w-full max-w-[480px] justify-center overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
            ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}
          `}
        >
          <div
            className="
              relative w-full max-w-[480px] max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(145deg,rgba(0,0,0,0.42),rgba(0,0,0,0.2))]
              px-4 py-4 sm:px-5 sm:py-5 shadow-[0_0_42px_rgba(29,185,84,0.08),0_28px_110px_rgba(0,0,0,0.52)]
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
                Sắp phát hành
              </div>

              <div className="max-w-full space-y-3 overflow-hidden">
                <h2 className="max-w-full break-words overflow-hidden font-title text-[2rem] font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-[2.4rem] lg:text-[2.8rem]">
                  { releaseTitle }
                </h2>

                <div className="flex max-w-full flex-wrap items-center gap-2 text-sm text-white/62">
                  <span className="font-semibold text-[#d8ffe6]">{ releaseType }</span>
                  <span className="text-[#1DB954]/80">/</span>
                  <span className="inline-flex max-w-full items-center gap-2 break-words">
                    <CalendarDays className="h-3.5 w-3.5 text-[#1DB954]" />
                    <span className="break-words">{ scheduleLabel }</span>
                  </span>
                </div>

                <p className="max-w-full break-words text-sm leading-5 text-white/58">
                  { description }
                </p>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                { COUNTDOWN_SEGMENTS.map((segment) => (
                  <div
                    key={ segment.key }
                    className="
                      min-h-[72px] overflow-hidden rounded-[1rem] border border-white/10
                      bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))]
                      px-1.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.16)]
                      backdrop-blur-md
                      flex flex-col items-center justify-center text-center
                    "
                  >
                    <div className="max-w-full overflow-hidden font-title text-[1.8rem] font-black leading-none tracking-[-0.08em] text-white sm:text-[2rem]">
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
                 Hiện chưa có lịch phát hành nào.
                </div>
              ) : null }

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={ onBack }
                  className="
                    inline-flex max-w-full w-fit items-center justify-center gap-2 break-words rounded-full border border-white/14
                    bg-black/42 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em]
                    text-white transition-all duration-300 hover:scale-[1.03] hover:border-[#1DB954]/55
                    hover:bg-black/62 hover:shadow-[0_0_24px_rgba(29,185,84,0.18)]
                  "
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại trang nghệ sĩ
                </button>

                { isCountdownFinished ? (
                  <button
                    type="button"
                    onClick={ handleListenNow }
                    disabled={ !trackId }
                    className="
                      inline-flex items-center justify-center rounded-full
                      bg-[#1DB954] px-4 py-2.5 text-xs font-semibold uppercase
                      tracking-[0.16em] text-black transition-all duration-300
                      hover:scale-[1.03] hover:bg-[#20d760]
                      hover:shadow-[0_0_24px_rgba(29,185,84,0.28)]
                      disabled:cursor-not-allowed disabled:opacity-60
                    "
                  >
                    Nghe ngay
                  </button>
                ) : null }
              </div>
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
