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
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition sm:px-4",
        isDark
          ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#f7f1ea] hover:bg-[#241f28]"
          : "border-[#e7ddd2] bg-white text-[#111111] hover:bg-[#f7f7f7]",
      ].join(" ")}
    >
      <FontAwesomeIcon icon={ isDark ? faSun : faMoon } className="text-sm" />
      <span className="hidden sm:inline">{ isDark ? "Light" : "Dark" }</span>
    </button>
  );
};

export default ThemeToggle;
