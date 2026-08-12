export const createPodcastPlaceholder = (title = "Podcast") => {
  const label = String(title || "Podcast").trim().slice(0, 22) || "Podcast";
  const initial = label.charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="podcast-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#806ee4" />
          <stop offset="100%" stop-color="#241b45" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#podcast-bg)" />
      <circle cx="500" cy="120" r="140" fill="rgba(255,255,255,0.1)" />
      <circle cx="100" cy="520" r="180" fill="rgba(255,255,255,0.08)" />
      <text x="50%" y="47%" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="220" font-family="Arial, sans-serif" font-weight="700">${initial}</text>
      <text x="50%" y="83%" text-anchor="middle" fill="rgba(255,255,255,0.78)" font-size="34" font-family="Arial, sans-serif" font-weight="700" letter-spacing="6">PODCAST</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const getPodcastArtwork = (podcast) => {
  const coverImageUrl = typeof podcast?.coverImageUrl === "string"
    ? podcast.coverImageUrl.trim()
    : "";

  return coverImageUrl || createPodcastPlaceholder(podcast?.title);
};
