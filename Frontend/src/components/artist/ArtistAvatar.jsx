import { createMonogram } from "../../utils/artistProfile";

const ArtistAvatar = ({
  src,
  alt,
  size = "md",
  className = "",
  floating = false,
}) => {
  const sizeClasses = {
    sm: "h-11 w-11 text-xs",
    md: "h-14 w-14 text-sm",
    lg: "h-24 w-24 text-xl",
    xl: "h-32 w-32 text-2xl",
  };

  return (
    <div
      className={[
        "inline-flex items-center justify-center overflow-hidden rounded-full border border-white/12 bg-[#181818] text-white shadow-[0_16px_42px_rgba(0,0,0,0.38)]",
        sizeClasses[size] || sizeClasses.md,
        floating
          ? "bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.14),rgba(24,24,24,0.98))] ring-1 ring-emerald-400/25 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_45px_rgba(0,0,0,0.52),0_0_28px_rgba(29,185,84,0.18)]"
          : "",
        className,
      ].join(" ")}
    >
      { src ? (
        <img src={ src } alt={ alt } className="h-full w-full object-cover" />
      ) : (
        <span className="font-title font-black tracking-[0.18em] text-white/88">
          { createMonogram(alt) }
        </span>
      ) }
    </div>
  );
};

export default ArtistAvatar;
