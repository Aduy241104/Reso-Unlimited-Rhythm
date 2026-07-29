import { useLayoutEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./contexts/ThemeContext";
import defaultImage from "./assets/images/default-image.svg";

function App() {
  useLayoutEffect(() => {
    const applyFallback = (image) => {
      if (
        !(image instanceof HTMLImageElement) ||
        image.getAttribute("src") === defaultImage
      ) {
        return false;
      }

      image.removeAttribute("srcset");
      image
        .closest("picture")
        ?.querySelectorAll("source")
        .forEach((source) => source.removeAttribute("srcset"));
      image.src = defaultImage;
      return true;
    };

    const handleImageError = (event) => {
      if (applyFallback(event.target)) {
        event.stopPropagation();
      }
    };

    document.addEventListener("error", handleImageError, true);

    document.querySelectorAll("img").forEach((image) => {
      if (image.complete && image.naturalWidth === 0) {
        applyFallback(image);
      }
    });

    return () => {
      document.removeEventListener("error", handleImageError, true);
    };
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
