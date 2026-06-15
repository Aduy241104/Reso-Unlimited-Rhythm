import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "../../hooks/useTheme";

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={[
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition sm:w-auto sm:gap-2 sm:px-3",
        isDark
          ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#f7f1ea] hover:bg-[#241f28]"
          : "border-[#e7ddd2] bg-white text-[#111111] hover:bg-[#f7f7f7]",
      ].join(" ")}
    >
      <FontAwesomeIcon icon={ isDark ? faSun : faMoon } className="text-xs" />
      <span className="hidden sm:inline">{ isDark ? "Light" : "Dark" }</span>
    </button>
  );
};

export default ThemeToggle;
