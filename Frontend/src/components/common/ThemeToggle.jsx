import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "../../hooks/useTheme";

const ThemeToggle = ({ variant = "default" }) => {
  const { isDark, toggleTheme } = useTheme();
  const isMenuVariant = variant === "menu";
  const ariaLabel = isDark
    ? "Chuyển sang giao diện sáng"
    : "Chuyển sang giao diện tối";
  const shortLabel = isDark ? "Sáng" : "Tối";
  const menuLabel = isDark
    ? "Chuyển sang giao diện sáng"
    : "Chuyển sang giao diện tối";

  return (
    <button
      type="button"
      onClick={ toggleTheme }
      aria-label={ ariaLabel }
      className={
        isMenuVariant
          ? [
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition sm:text-sm",
              isDark
                ? "text-[#f7f1ea] hover:bg-[#241f28] hover:text-[#f5b66f]"
                : "text-[#111111] hover:bg-[#f9fafb] hover:text-[#111111]",
            ].join(" ")
          : [
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition sm:w-auto sm:gap-2 sm:px-3",
              isDark
                ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#f7f1ea] hover:bg-[#241f28]"
                : "border-[#e7ddd2] bg-white text-[#111111] hover:bg-[#f7f7f7]",
            ].join(" ")
      }
    >
      <FontAwesomeIcon icon={ isDark ? faSun : faMoon } className="text-xs" />
      <span className={ isMenuVariant ? "inline" : "hidden sm:inline" }>
        { isMenuVariant ? menuLabel : shortLabel }
      </span>
    </button>
  );
};

export default ThemeToggle;
