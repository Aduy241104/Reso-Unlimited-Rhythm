import { useNavigate } from "react-router-dom";
import ArtistSectionPage from "./ArtistSectionPage";
import { routePaths } from "../../routes/routePaths";

export const MyMusicPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <ArtistSectionPage
        title="My Music"
        description="Organize tracks, update metadata, and keep your music library prepared for release and promotion."
      />
      
      <button
        onClick={() => navigate(routePaths.artistCreateTrack)}
        className="rounded-md bg-[#8b5e3c] px-6 py-2 font-medium text-white hover:bg-[#6d4a2f] transition-colors"
      >
        + Create Track
      </button>
    </div>
  );
};

export const ReleasesPage = () => (
  <ArtistSectionPage
    title="Releases"
    description="Plan release schedules, monitor launch readiness, and track how each project performs after it goes live."
  />
);

export const AnalyticsPage = () => (
  <ArtistSectionPage
    title="Analytics"
    description="Review audience growth, platform performance, and streaming insights across your full catalog."
  />
);

export const FansPage = () => (
  <ArtistSectionPage
    title="Fans"
    description="Understand who is listening, where they are discovering your music, and how engagement changes over time."
  />
);

export const RoyaltiesPage = () => (
  <ArtistSectionPage
    title="Royalties"
    description="Track earnings, review payout timelines, and keep a clear picture of your revenue sources."
  />
);

export const SettingsPage = () => (
  <ArtistSectionPage
    title="Settings"
    description="Manage your artist profile, platform preferences, and dashboard-level account controls."
  />
);
