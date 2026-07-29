import { Play } from "lucide-react";

const sizeClassNames = {
  default: "h-14 px-7",
  compact: "h-12 px-5",
};

const iconSizeClassNames = {
  default: "h-5 w-5",
  compact: "h-5 w-5",
};

const baseClassName = `
  inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#E0FFE0] via-[#D3FFCE] to-[#FFD700] text-sm font-semibold text-black
  transition hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60
`;

const PlayButton = ({
  type = "button",
  label = "Play",
  size = "default",
  className = "",
  iconClassName = "",
  ...props
}) => {
  const resolvedSize = sizeClassNames[size] ? size : "default";

  return (
    <button
      type={ type }
      className={ [baseClassName, sizeClassNames[resolvedSize], className]
        .filter(Boolean)
        .join(" ") }
      { ...props }
    >
      <Play
        className={ ["fill-current", iconSizeClassNames[resolvedSize], iconClassName]
          .filter(Boolean)
          .join(" ") }
      />
      { label }
    </button>
  );
};

export default PlayButton;
