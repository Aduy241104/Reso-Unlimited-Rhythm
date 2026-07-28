import { useEffect, useState } from "react";
import { getColor } from "colorthief";

export const DEFAULT_DETAIL_HEADER_GRADIENT =
  "linear-gradient(180deg, hsl(220 12% 30%) 0%, hsl(220 12% 17%) 58%, #121212 100%)";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createGradient = ({ r, g, b }) => {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;

  if (delta > 0) {
    if (max === r / 255) {
      hue = 60 * (((g - b) / 255 / delta) % 6);
    } else if (max === g / 255) {
      hue = 60 * ((b - r) / 255 / delta + 2);
    } else {
      hue = 60 * ((r - g) / 255 / delta + 4);
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const adjustedSaturation = clamp(saturation * 100, 0, 82);
  const topLightness = clamp(lightness * 100, 26, 46);
  const middleLightness = clamp(topLightness * 0.52, 12, 24);
  const glowLightness = clamp(topLightness + 8, 32, 54);

  return [
    `radial-gradient(circle at 82% 4%, hsl(${Math.round(hue)} ${Math.round(adjustedSaturation)}% ${Math.round(glowLightness)}% / 0.58), transparent 38%)`,
    `linear-gradient(180deg, hsl(${Math.round(hue)} ${Math.round(adjustedSaturation)}% ${Math.round(topLightness)}%) 0%, hsl(${Math.round(hue)} ${Math.round(adjustedSaturation)}% ${Math.round(middleLightness)}%) 58%, #121212 100%)`,
  ].join(", ");
};

const useDominantColorGradient = (
  imageSource,
  fallbackGradient = DEFAULT_DETAIL_HEADER_GRADIENT
) => {
  const [extractedGradient, setExtractedGradient] = useState({
    imageSource: "",
    value: fallbackGradient,
  });

  useEffect(() => {
    let isCancelled = false;

    if (!imageSource) {
      return () => {
        isCancelled = true;
      };
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = async () => {
      try {
        const dominantColor = await getColor(image, { quality: 10 });

        if (!isCancelled && dominantColor) {
          setExtractedGradient({
            imageSource,
            value: createGradient(dominantColor.rgb()),
          });
        }
      } catch {
        // Keep the fallback gradient when canvas access or color extraction fails.
      }
    };

    image.onerror = () => {};

    image.src = imageSource;

    return () => {
      isCancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [fallbackGradient, imageSource]);

  if (!imageSource || extractedGradient.imageSource !== imageSource) {
    return fallbackGradient;
  }

  return extractedGradient.value;
};

export default useDominantColorGradient;
