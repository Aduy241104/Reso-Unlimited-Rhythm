import ContentCardSection from "./ContentCardSection";

const createPlaceholderImage = (label, startColor, endColor) => {
  const safeLabel = label || "Music";
  const firstLetter = safeLabel.charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#bg)" />
      <circle cx="500" cy="120" r="120" fill="rgba(255,255,255,0.08)" />
      <circle cx="120" cy="520" r="170" fill="rgba(255,255,255,0.08)" />
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="220" font-family="Arial, sans-serif" font-weight="700">${firstLetter}</text>
      <text x="50%" y="82%" text-anchor="middle" fill="rgba(255,255,255,0.78)" font-size="42" font-family="Arial, sans-serif" letter-spacing="8">${safeLabel.toUpperCase()}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const demoCards = [
  {
    id: "playlist-made-for-you",
    type: "playlist",
    title: "Made For You",
    subtitle: "Spotify",
    image: createPlaceholderImage("Made For You", "#3b82f6", "#0f172a"),
  },
  {
    id: "artist-low-g",
    type: "artist",
    title: "Low G",
    subtitle: "Artist",
    image: createPlaceholderImage("Low G", "#8b5cf6", "#111827"),
  },
  {
    id: "podcast-night-shift",
    type: "podcast",
    title: "Night Shift",
    subtitle: "Podcast",
    image: createPlaceholderImage("Night Shift", "#f97316", "#1f2937"),
  },
  {
    id: "recommendation-neo-vibes",
    type: "recommendation",
    title: "Neo Vibes",
    subtitle: "Recommended for you",
    image: createPlaceholderImage("Neo Vibes", "#14b8a6", "#0f172a"),
  },
  {
    id: "featured-studio-session",
    type: "featured content",
    title: "Studio Session",
    subtitle: "Featured content",
    image: createPlaceholderImage("Studio Session", "#ec4899", "#111827"),
  },
  {
    id: "album-midnight-run",
    type: "album",
    title: "Midnight Run",
    subtitle: "Album",
    image: createPlaceholderImage("Midnight Run", "#22c55e", "#111827"),
  },
  {
    id: "playlist-deep-focus",
    type: "playlist",
    title: "Deep Focus",
    subtitle: "Playlist",
    image: createPlaceholderImage("Deep Focus", "#06b6d4", "#0f172a"),
  },
  {
    id: "artist-rhyder",
    type: "artist",
    title: "RHYDER",
    subtitle: "Artist",
    image: createPlaceholderImage("RHYDER", "#f59e0b", "#1f2937"),
  },
  {
    id: "podcast-sound-lab",
    type: "podcast",
    title: "Sound Lab",
    subtitle: "Podcast",
    image: createPlaceholderImage("Sound Lab", "#ef4444", "#111827"),
  },
  {
    id: "featured-live-session",
    type: "featured content",
    title: "Live Session",
    subtitle: "Featured content",
    image: createPlaceholderImage("Live Session", "#a855f7", "#0f172a"),
  },
  {
    id: "album-neon-dreams",
    type: "album",
    title: "Neon Dreams",
    subtitle: "Album",
    image: createPlaceholderImage("Neon Dreams", "#14b8a6", "#111827"),
  },
  {
    id: "playlist-summer-hits",
    type: "playlist",
    title: "Summer Hits",
    subtitle: "Playlist",
    image: createPlaceholderImage("Summer Hits", "#fb7185", "#1f2937"),
  },
  {
    id: "artist-low-fi-kid",
    type: "artist",
    title: "Low-Fi Kid",
    subtitle: "Artist",
    image: createPlaceholderImage("Low-Fi Kid", "#84cc16", "#111827"),
  },
  {
    id: "podcast-after-hours",
    type: "podcast",
    title: "After Hours",
    subtitle: "Podcast",
    image: createPlaceholderImage("After Hours", "#38bdf8", "#0f172a"),
  },
  {
    id: "featured-city-lights",
    type: "featured content",
    title: "City Lights",
    subtitle: "Featured content",
    image: createPlaceholderImage("City Lights", "#f97316", "#111827"),
  },
  {
    id: "album-echos",
    type: "album",
    title: "Echos",
    subtitle: "Album",
    image: createPlaceholderImage("Echos", "#6366f1", "#0f172a"),
  },
  {
    id: "playlist-vietnam-vibes",
    type: "playlist",
    title: "Vietnam Vibes",
    subtitle: "Playlist",
    image: createPlaceholderImage("Vietnam Vibes", "#10b981", "#111827"),
  },
  {
    id: "artist-tranq",
    type: "artist",
    title: "Tranq",
    subtitle: "Artist",
    image: createPlaceholderImage("Tranq", "#eab308", "#1f2937"),
  },
  {
    id: "podcast-morning-brew",
    type: "podcast",
    title: "Morning Brew",
    subtitle: "Podcast",
    image: createPlaceholderImage("Morning Brew", "#8b5cf6", "#111827"),
  },
  {
    id: "featured-future-beats",
    type: "featured content",
    title: "Future Beats",
    subtitle: "Featured content",
    image: createPlaceholderImage("Future Beats", "#0ea5e9", "#0f172a"),
  },
];

const DemoContentSection = ({ onPlay }) => {
  return (
    <ContentCardSection
      label="Reusable system"
      title="Same component, many content types"
      description="These examples use the same ContentCard API to prove the layout stays flexible beyond albums."
      items={ demoCards }
      onPlay={ onPlay }
    />
  );
};

export default DemoContentSection;
