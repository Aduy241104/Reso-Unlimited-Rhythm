import { LayoutGrid, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { routePaths } from "../../routes/routePaths";
import {
  normalizeSearchAllPayload,
  searchAll,
} from "../../services/searchService";
import SearchSuggestionDropdown from "./SearchSuggestionDropdown";

const EMPTY_RESULTS = {
  songs: [],
  artists: [],
  albums: [],
};

const SEARCH_DEBOUNCE_DELAY = 700;

const SearchBar = ({
  className = "",
  value,
  defaultValue,
  onChange,
  onSubmit,
  onKeyDown,
  placeholder = "B\u1EA1n mu\u1ED1n ph\u00E1t n\u1ED9i dung g\u00EC?",
  name = "search",
  disabled = false,
  ...inputProps
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState(EMPTY_RESULTS);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentValue = isControlled ? value ?? "" : internalValue;
  const normalizedKeyword = currentValue.trim();
  const debouncedKeyword = useDebouncedValue(normalizedKeyword, SEARCH_DEBOUNCE_DELAY);

  useEffect(() => {
    if (location.pathname !== routePaths.search) {
      return;
    }

    const keywordFromQuery = searchParams.get("q") || "";

    if (isControlled) {
      if (typeof onChange === "function") {
        onChange({
          target: { name, value: keywordFromQuery },
          currentTarget: { name, value: keywordFromQuery },
        });
      }

      return;
    }

    setInternalValue(keywordFromQuery);
  }, [
    isControlled,
    location.pathname,
    location.search,
    name,
    onChange,
    searchParams,
  ]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!isDropdownOpen || !debouncedKeyword) {
      if (!normalizedKeyword) {
        setSuggestions(EMPTY_RESULTS);
      }

      setLoading(false);
      return undefined;
    }

    let isActive = true;

    const loadSuggestions = async () => {
      setLoading(true);

      try {
        const payload = await searchAll(debouncedKeyword);

        if (!isActive) {
          return;
        }

        setSuggestions(normalizeSearchAllPayload(payload));
      } catch {
        if (isActive) {
          setSuggestions(EMPTY_RESULTS);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadSuggestions();

    return () => {
      isActive = false;
    };
  }, [debouncedKeyword, isDropdownOpen, normalizedKeyword]);

  const handleSubmit = (event) => {
    if (typeof onSubmit === "function") {
      onSubmit(event);
    }

    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    if (!normalizedKeyword) {
      setIsDropdownOpen(false);
      return;
    }

    setIsDropdownOpen(false);
    navigate(`${routePaths.search}?q=${encodeURIComponent(normalizedKeyword)}`);
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;

    if (!isControlled) {
      setInternalValue(nextValue);
    }

    if (typeof onChange === "function") {
      onChange(event);
    }

    setIsDropdownOpen(Boolean(nextValue.trim()));

    if (!nextValue.trim()) {
      setSuggestions(EMPTY_RESULTS);
    }
  };

  const handleInputFocus = () => {
    if (normalizedKeyword) {
      setIsDropdownOpen(true);
    }
  };

  const handleKeyDown = (event) => {
    if (typeof onKeyDown === "function") {
      onKeyDown(event);
    }

    if (event.key === "Escape") {
      setIsDropdownOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue("");
    }

    if (typeof onChange === "function") {
      onChange({
        target: { name, value: "" },
        currentTarget: { name, value: "" },
      });
    }

    setSuggestions(EMPTY_RESULTS);
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const handleBrowseGenres = () => {
    setIsDropdownOpen(false);
    navigate(routePaths.userGenres);
  };

  const handleSuggestionSelect = () => {
    setIsDropdownOpen(false);
  };

  const shouldShowDropdown = isDropdownOpen && Boolean(normalizedKeyword);

  return (
    <form
      ref={containerRef}
      role="search"
      onSubmit={handleSubmit}
      className={[
        "relative min-w-0 w-full",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div
        className="
          flex
          items-center
          h-10 sm:h-12
          w-full
          min-w-0
          rounded-full
          bg-[#242424]
          border
          border-[#3a3a3a]
          px-3 sm:px-4
          transition
          hover:border-[#5a5a5a]
          focus-within:border-[#ffffff33]
        "
      >
        <Search className="h-4 w-4 shrink-0 text-[#b3b3b3] sm:h-5 sm:w-5" />

        <input
          ref={inputRef}
          type="text"
          name={name}
          value={currentValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className="
            flex-1
            min-w-0
            bg-transparent
            px-2 sm:px-3
            text-sm sm:text-base
            text-white
            outline-none
            placeholder:text-[#b3b3b3]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
          {...inputProps}
        />

        {normalizedKeyword ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="X\u00F3a t\u00ECm ki\u1EBFm"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b3b3b3] transition hover:bg-[#3a3a3a] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <div
          className="
            mx-2
            hidden min-[420px]:block sm:mx-3
            h-6
            w-px
            shrink-0
            bg-[#5a5a5a]
          "
          aria-hidden="true"
        />

        <button
          type="button"
          title="Duy\u1EC7t th\u1EC3 lo\u1EA1i"
          aria-label="Duy\u1EC7t th\u1EC3 lo\u1EA1i"
          onClick={handleBrowseGenres}
          className="
            hidden min-[420px]:flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-full
            text-[#b3b3b3]
            transition-all
            hover:bg-[#3a3a3a]
            hover:text-white
          "
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
      </div>

      <SearchSuggestionDropdown
        keyword={normalizedKeyword}
        results={suggestions}
        loading={loading}
        visible={shouldShowDropdown}
        onSelect={handleSuggestionSelect}
      />
    </form>
  );
};

export default SearchBar;
