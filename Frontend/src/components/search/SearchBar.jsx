import { LayoutGrid, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { USER_INPUT_LIMITS } from "../../constants/userInputLimits";
import { routePaths } from "../../routes/routePaths";

const normalizeSubmittedKeyword = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const SearchBar = ({
  className = "",
  value,
  defaultValue,
  onChange,
  onSubmit,
  onKeyDown,
  placeholder = "Bạn muốn phát nội dung gì?",
  name = "search",
  disabled = false,
  ...inputProps
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const inputRef = useRef(null);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = isControlled ? value ?? "" : internalValue;
  const submittedKeyword = normalizeSubmittedKeyword(currentValue);

  useEffect(() => {
    if (location.pathname !== routePaths.search) {
      return;
    }

    const keywordFromQuery = searchParams.get("q") || "";

    if (isControlled) {
      onChange?.({
        target: { name, value: keywordFromQuery },
        currentTarget: { name, value: keywordFromQuery },
      });
      return;
    }

    const syncTimer = setTimeout(() => {
      setInternalValue(keywordFromQuery);
    }, 0);

    return () => clearTimeout(syncTimer);
  }, [isControlled, location.pathname, location.search, name, onChange, searchParams]);

  const navigateToSearch = () => {
    if (!submittedKeyword) {
      return;
    }

    navigate(`${routePaths.search}?q=${encodeURIComponent(submittedKeyword)}`);
  };

  const handleSubmit = (event) => {
    onSubmit?.(event);

    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();
    navigateToSearch();
  };

  const handleInputChange = (event) => {
    if (!isControlled) {
      setInternalValue(event.target.value);
    }

    onChange?.(event);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue("");
    }

    onChange?.({
      target: { name, value: "" },
      currentTarget: { name, value: "" },
    });
    inputRef.current?.focus();
  };

  const handleBrowseGenres = () => {
    navigate(routePaths.userGenres);
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={["relative min-w-0 w-full", className].filter(Boolean).join(" ")}
    >
      <div className="flex h-10 min-w-0 w-full items-center rounded-full border border-[#3a3a3a] bg-[#242424] px-3 transition hover:border-[#5a5a5a] focus-within:border-[#ffffff33] sm:h-12 sm:px-4">
        <button
          type="submit"
          aria-label="Tìm kiếm"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b3b3b3] transition hover:bg-[#3a3a3a] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#1ed760]/40"
        >
          <Search className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <input
          ref={inputRef}
          {...inputProps}
          type="text"
          name={name}
          value={currentValue}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={USER_INPUT_LIMITS.search}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-[#b3b3b3] disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-base"
        />

        {submittedKeyword ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Xóa tìm kiếm"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b3b3b3] transition hover:bg-[#3a3a3a] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <div className="mx-2 hidden h-6 w-px shrink-0 bg-[#5a5a5a] min-[420px]:block sm:mx-3" aria-hidden="true" />

        <button
          type="button"
          title="Duyệt thể loại"
          aria-label="Duyệt thể loại"
          onClick={handleBrowseGenres}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#b3b3b3] transition-all hover:bg-[#3a3a3a] hover:text-white min-[420px]:flex"
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
