import { Navigate } from "react-router-dom";
import ArtistDashboardLayout from "../layout/artistDashboard/ArtistDashboardLayout";
import MainLayout from "../layout/mainLayout/MainLayout";
import AlbumDetailPage from "../pages/album/AlbumDetailPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import SearchResultPage from "../pages/search/SearchResultPage";
import ArtistOverviewPage from "../pages/artist/ArtistOverviewPage";
import ArtistProfileEditPage from "../pages/artist/ArtistProfileEditPage";
import ArtistProfilePage from "../pages/artist/ArtistProfilePage";
import ArtistRoyaltiesPage from "../pages/artist/ArtistRoyaltiesPage";
import ArtistWithdrawalRequestsPage from "../pages/artist/ArtistWithdrawalRequestsPage";
import ArtistAlbumPage from "../pages/artist/ArtistAlbumPage";
import ArtistAlbumDetailPage from "../pages/artist/ArtistAlbumDetailPage";
import ArtistCreateAlbumPage from "../pages/artist/ArtistCreateAlbumPage";
import ArtistCreateReleaseSchedulePage from "../pages/artist/ArtistCreateReleaseSchedulePage";
import ArtistEditAlbumPage from "../pages/artist/ArtistEditAlbumPage";
import ArtistEditReleaseSchedulePage from "../pages/artist/ArtistEditReleaseSchedulePage";
import ArtistReleaseScheduleDetailPage from "../pages/artist/ArtistReleaseScheduleDetailPage";
import ArtistNotificationDetailPage from "../pages/artist/ArtistNotificationDetailPage";
import ArtistNotificationsPage from "../pages/artist/ArtistNotificationsPage";
import ArtistFollowerPage from "../pages/artist/ArtistFollowerPage";
import ArtistTrackInsightsPage from "../pages/artist/ArtistTrackInsightsPage";
import ArtistRevenueOverview from "../pages/artist/revenue/ArtistRevenueOverview";
import ArtistRevenueHistory from "../pages/artist/revenue/ArtistRevenueHistory";
import ArtistRevenuePeriodDetail from "../pages/artist/revenue/ArtistRevenuePeriodDetail";
import {
  MyMusicPage,
  ReleasesPage,
  SettingsPage,
} from "../pages/artist/ArtistSectionPages";
import CreateTrackPage from "../pages/artist/CreateTrackPage";
import ArtistTrackDetailPage from "../pages/artist/ArtistTrackDetailPage";
import ArtistTrackEditPage from "../pages/artist/ArtistTrackEditPage";
import ArtistLyricsPage from "../pages/artist/ArtistLyricsPage";
import HomePage from "../pages/home/HomePage";
import LyricsPage from "../pages/lyrics/LyricsPage";
import GenreListPage from "../pages/usergenre/GenreListPage";
import GenreDetailPage from "../pages/usergenre/GenreDetailPage";
import DailyTopTracksPage from "../pages/track/DailyTopTracksPage";
import MonthlyTopTracksPage from "../pages/track/MonthlyTopTracksPage";
import NotificationsPage from "../pages/notifications/NotificationsPage";
import ArtistProfilePageView from "../pages/profile/ArtistProfilePage";
import ArtistRegistrationRequestPage from "../pages/artistRegistrationRequest/ArtistRegistrationRequestPage";
import PlaylistDetailPage from "../pages/playlist/PlaylistDetailPage";
import PremiumPaymentFailedPage from "../pages/premium/PremiumPaymentFailedPage";
import PremiumPaymentSuccessPage from "../pages/premium/PremiumPaymentSuccessPage";
import PremiumPage from "../pages/premium/PremiumPage";
import PaymentHistoryPage from "../pages/userPayment/PaymentHistoryPage";
import PaymentReceiptPdfPage from "../pages/userPayment/PaymentReceiptPdfPage";
import TrackDetailPage from "../pages/track/TrackDetailPage";
import UserRecentListeningPage from "../pages/userInsign/user.recentListening.page";
import UserFavoriteTracksPage from "../pages/userFavorite/UserFavoriteTracksPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import { recommendationRoutes } from "./recommendationRoutes";
import RoleRoute from "./RoleRoute";
import { libaryRoutes } from "./libaryRoutes";
import { routePaths } from "./routePaths";
import { userPlaylistRoutes } from "./userPlaylistRoutes";
import { userProfileRoutes } from "./userProfileRoutes";
import { myArtistRegistrationRequestRoutes } from "./myArtistRegistrationRequestRoutes";
import { userReportRoutes } from "./userReportRoutes";

const publicArtistProfilePath = routePaths.artistBrowseProfile();
const featuredArtistProfilePath = routePaths.artistBrowseProfile("featured");

export const appRoutes = [
  {
    element: <MainLayout />,
    children: [
      {
        path: routePaths.home,
        element: <HomePage />,
      },
      {
        path: routePaths.search,
        element: <SearchResultPage />,
      },
      {
        path: routePaths.userGenres,
        element: <GenreListPage />,
      },
      {
        path: routePaths.userGenreDetail(),
        element: <GenreDetailPage />,
      },
      {
        path: routePaths.dailyTopTracks,
        element: <DailyTopTracksPage />,
      },
      {
        path: routePaths.monthlyTopTracks,
        element: <MonthlyTopTracksPage />,
      },
      {
        path: routePaths.albumDetail(),
        element: <AlbumDetailPage />,
      },
      {
        path: routePaths.playlistDetail(),
        element: <PlaylistDetailPage />,
      },
      {
        path: routePaths.lyrics,
        element: <LyricsPage />,
      },
      {
        path: routePaths.trackDetail(),
        element: <TrackDetailPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: routePaths.notifications,
            element: <NotificationsPage />,
          },
        ],
      },
      {
        path: routePaths.premiumPaymentSuccess,
        element: <PremiumPaymentSuccessPage />,
      },
      {
        path: routePaths.premiumPaymentFailed,
        element: <PremiumPaymentFailedPage />,
      },
      {
        path: publicArtistProfilePath,
        element: <ArtistProfilePageView />,
      },
      {
        path: routePaths.legacyArtistProfile,
        element: <Navigate to={featuredArtistProfilePath} replace />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: userProfileRoutes,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: routePaths.userRecentListeningActivity,
        element: <UserRecentListeningPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: routePaths.userFavoriteTracks,
            element: <UserFavoriteTracksPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: routePaths.userPaymentHistory,
        element: <PaymentHistoryPage />,
      },
      {
        path: routePaths.userPaymentReceipt,
        element: <PaymentReceiptPdfPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: routePaths.premium,
        element: <PremiumPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: routePaths.artistRegistrationRequest,
        element: <ArtistRegistrationRequestPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: myArtistRegistrationRequestRoutes,
  },
  {
    element: <ProtectedRoute />,
    children: userReportRoutes,
  },
  {
    element: <ProtectedRoute />,
    children: userPlaylistRoutes,
  },
  {
    element: <ProtectedRoute />,
    children: recommendationRoutes,
  },
  {
    element: <ProtectedRoute />,
    children: libaryRoutes,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute allowedRoles={["artist"]} />,
        children: [
          {
            path: routePaths.artistRoot,
            element: <ArtistDashboardLayout />,
            children: [
              {
                index: true,
                element: <ArtistOverviewPage />,
              },
              {
                path: routePaths.artistMusic,
                element: <MyMusicPage />,
              },
              {
                path: routePaths.artistCreateTrack,
                element: <CreateTrackPage />,
              },
              {
                path: routePaths.artistTrackDetail(),
                element: <ArtistTrackDetailPage />,
              },
              {
                path: routePaths.artistTrackEdit(),
                element: <ArtistTrackEditPage />,
              },
              {
                path: routePaths.artistLyrics,
                element: <ArtistLyricsPage />,
              },
              {
                path: routePaths.artistAlbums,
                element: <ArtistAlbumPage />,
              },
              {
                path: routePaths.artistCreateAlbum,
                element: <ArtistCreateAlbumPage />,
              },
              {
                path: routePaths.artistEditAlbum(),
                element: <ArtistEditAlbumPage />,
              },
              {
                path: routePaths.artistAlbumDetail(),
                element: <ArtistAlbumDetailPage />,
              },
              {
                path: "releases",
                element: <ReleasesPage />,
              },
              {
                path: "releases/create",
                element: <ArtistCreateReleaseSchedulePage />,
              },
              {
                path: "releases/:id/edit",
                element: <ArtistEditReleaseSchedulePage />,
              },
              {
                path: "releases/:id",
                element: <ArtistReleaseScheduleDetailPage />,
              },
              {
                path: routePaths.artistAnalytics,
                element: <ArtistTrackInsightsPage />,
              },
              {
                path: routePaths.artistNotifications,
                element: <ArtistNotificationsPage />,
              },
              {
                path: routePaths.artistFollowers,
                element: <ArtistFollowerPage />,
              },
              {
                path: routePaths.artistNotificationDetail(),
                element: <ArtistNotificationDetailPage />,
              },
              {
                path: routePaths.artistRoyalties,
                element: <ArtistRevenueOverview />,
              },
              {
                path: routePaths.artistBalanceManagement,
                element: <ArtistRoyaltiesPage />,
              },
              {
                path: routePaths.artistRevenueHistory,
                element: <ArtistRevenueHistory />,
              },
              {
                path: routePaths.artistRevenuePeriodDetail(),
                element: <ArtistRevenuePeriodDetail />,
              },
              {
                path: routePaths.artistWithdrawalRequests,
                element: <ArtistWithdrawalRequestsPage />,
              },
              {
                path: routePaths.artistSettings,
                element: <SettingsPage />,
              },
              {
                path: routePaths.artistProfileEdit,
                element: <ArtistProfileEditPage />,
              },
              {
                path: routePaths.artistProfile,
                element: <ArtistProfilePage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: routePaths.forgotPassword,
    element: <ForgotPasswordPage />,
  },
  {
    path: routePaths.resetPassword,
    element: <ResetPasswordPage />,
  },
  {
    element: <PublicRoute />,
    children: [
      {
        path: routePaths.login,
        element: <LoginPage />,
      },
      {
        path: routePaths.register,
        element: <RegisterPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to={routePaths.home} replace />,
  },
];

