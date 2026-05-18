export const LYRICS_THEME_PALETTES = [
  {
    background: "#7a1f3d",
    border: "rgba(255,255,255,0.18)",
    shadow: "0 24px 60px rgba(122,31,61,0.32)",
    primaryText: "#fff7f9",
    secondaryText: "#ffd6e0",
    accentText: "#ffe27a",
    supportText: "#ffe4ec",
    panelText: "#ffe0e8",
    emptyText: "#ffe0e8",
  },
  {
    background: "#1d6d3dff",
    border: "rgba(255,255,255,0.16)",
    shadow: "0 24px 60px rgba(20,83,45,0.3)",
    primaryText: "#f4fff7",
    secondaryText: "#c9f7d8",
    accentText: "#ffe27a",
    supportText: "#defce7",
    panelText: "#d8fbe3",
    emptyText: "#d8fbe3",
  },
  {
    background: "#546cb0ff",
    border: "rgba(255,255,255,0.16)",
    shadow: "0 24px 60px rgba(29,78,216,0.3)",
    primaryText: "#f8fbff",
    secondaryText: "#dbeafe",
    accentText: "#fde68a",
    supportText: "#e0edff",
    panelText: "#d9e7ff",
    emptyText: "#d9e7ff",
  },
  {
    background: "#7c2d12",
    border: "rgba(255,255,255,0.16)",
    shadow: "0 24px 60px rgba(124,45,18,0.3)",
    primaryText: "#fff9f5",
    secondaryText: "#fed7aa",
    accentText: "#fde68a",
    supportText: "#ffedd5",
    panelText: "#ffe4cf",
    emptyText: "#ffe4cf",
  },
  {
    background: "#5b21b6",
    border: "rgba(255,255,255,0.16)",
    shadow: "0 24px 60px rgba(91,33,182,0.32)",
    primaryText: "#fbf8ff",
    secondaryText: "#e9d5ff",
    accentText: "#fef08a",
    supportText: "#f3e8ff",
    panelText: "#eddcff",
    emptyText: "#eddcff",
  },
  {
    background: "#155e75",
    border: "rgba(255,255,255,0.16)",
    shadow: "0 24px 60px rgba(21,94,117,0.3)",
    primaryText: "#f4feff",
    secondaryText: "#bae6fd",
    accentText: "#fde68a",
    supportText: "#d8f7ff",
    panelText: "#d2f1f8",
    emptyText: "#d2f1f8",
  },
];

export const getLyricsThemeKey = (track) => {
  if (!track) {
    return "default-track";
  }

  return track.id || `${track.title || "track"}-${track.artistName || "artist"}`;
};

export const getLyricsThemeIndex = (track) => {
  const themeKey = getLyricsThemeKey(track);
  let hash = 0;

  for (let index = 0; index < themeKey.length; index += 1) {
    hash = ((hash << 5) - hash) + themeKey.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash) % LYRICS_THEME_PALETTES.length;
};

export const getLyricsTheme = (track) => {
  return LYRICS_THEME_PALETTES[getLyricsThemeIndex(track)];
};

export const getLyricsThemeByIndex = (themeIndex = 0) => {
  const normalizedIndex =
    Number.isInteger(themeIndex) && themeIndex >= 0
      ? themeIndex % LYRICS_THEME_PALETTES.length
      : 0;

  return LYRICS_THEME_PALETTES[normalizedIndex];
};

export const getRandomLyricsThemeIndex = (previousThemeIndex = -1) => {
  const paletteCount = LYRICS_THEME_PALETTES.length;

  if (paletteCount <= 1) {
    return 0;
  }

  const randomBuffer = new Uint32Array(1);
  globalThis.crypto?.getRandomValues?.(randomBuffer);

  const safePreviousIndex =
    Number.isInteger(previousThemeIndex) &&
    previousThemeIndex >= 0 &&
    previousThemeIndex < paletteCount
      ? previousThemeIndex
      : -1;

  if (safePreviousIndex === -1) {
    return randomBuffer[0] % paletteCount;
  }

  const nextIndex = randomBuffer[0] % (paletteCount - 1);
  return nextIndex >= safePreviousIndex ? nextIndex + 1 : nextIndex;
};
