import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ThemeContext from "./theme-context";

const STORAGE_KEY = "capstone-main-theme";

const getInitialTheme = () => {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  return storedTheme === "light" ? "light" : "dark";
};

const ARTIST_DASHBOARD_PREFIX = "/artist";

export const ThemeProvider = ({ children }) => {
  const location = useLocation();
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const rootElement = window.document.documentElement;
    const isArtistDashboard = location.pathname.startsWith(
      ARTIST_DASHBOARD_PREFIX
    );

    if (isArtistDashboard) {
      rootElement.classList.remove("dark");
      rootElement.style.colorScheme = "light";
      return;
    }

    rootElement.classList.toggle("dark", theme === "dark");
    rootElement.style.colorScheme = theme;
  }, [theme, location.pathname]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      toggleTheme: () =>
        setTheme((currentTheme) =>
          currentTheme === "dark" ? "light" : "dark"
        ),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
