import albumRoutes from "./album.routes.js";
import artistBrowseRoutes from "./artistBrowse.routes.js";
import artistNotificationRoutes from "./artist.notification.routes.js";
import artistReleaseScheduleRoutes from "./artist.releaseSchedule.routes.js";
import artistTrackAnalyticsRoutes from "./artist.trackAnalytics.routes.js";
import artistWithdrawalRoutes from "./artist.withdrawal.routes.js";
import artistRoutes from "./artist.routes.js";
import artistRegistrationRoutes from "./artist.registration.routes.js";
import userArtistRegistrationListRoutes from "./user.artistRegistrationList.routes.js";
import artistAlbumRoutes from "./artist.album.routes.js";
import genreRoutes from "./genre.routes.js";
import authenticationRoutes from "./authentication.routes.js";
import notificationRoutes from "./notification.routes.js";
import playlistRoutes from "./playlist.routes.js";
import trackRoutes from "./track.routes.js";
import listenEventRoutes from "./listenEvent.routes.js";
import artistTrackRoutes from "./artist.track.routes.js";
import lyricsRoutes from "./artist.lyrics.routes.js";
import adminRoutes from "./admin.routes.js";
import libaryRoutes from "./libary.routes.js";
import subscriptionRoutes from "./subscription.routes.js";
import transactionRoutes from "./transaction.routes.js";
import userRoutes from "./user.routes.js";
import userRecentListeningRoutes from "./user.recentListening.routes.js";
import userPlaylistRoutes from "./user.playlist.routes.js"
import adminArtistRouter from "./admin.artist.router.js";
import adminNotificationRouter from "./admin.notification.router.js";
import userReportRoutes from "./user.report.routes.js";
import userGenreRoutes from "./user.genre.routes.js";
import searchRoutes from "./search.routes.js";
import userFavoriteRoutes from "./user.favorite.route.js";
import userNotificationRouter from "./user.notification.router.js";
import userPaymentHistoryRoutes from "./user.payment.history.route.js";
import userSubscriptionRoutes from "./user.subscription.routes.js";

function route(app) {
    app.use("/api/auth", authenticationRoutes);
    app.use("/api/notifications", notificationRoutes);
    app.use("/api/artist/notifications", artistNotificationRoutes);
    app.use("/api/user/notifications", userNotificationRouter);
    app.use("/api/genres", genreRoutes);
    app.use("/api/albums", albumRoutes);
    app.use("/api/browse/artists", artistBrowseRoutes);
    app.use("/api/artist/release-schedules", artistReleaseScheduleRoutes);
    app.use("/api/artists", artistRoutes);
    app.use("/api/artists", artistWithdrawalRoutes);
    app.use("/api/users", artistRegistrationRoutes);
    app.use("/api/users/artist-registration-requests", userArtistRegistrationListRoutes);
    app.use("/api/artists/albums", artistAlbumRoutes);
    app.use("/api/artist", artistTrackAnalyticsRoutes);
    app.use("/api/playlists", playlistRoutes);
    app.use("/api/artist/track", artistTrackRoutes);
    app.use("/api/tracks", trackRoutes);
    app.use("/api/listen-events", listenEventRoutes);
    app.use("/api/artist/lyrics", lyricsRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/libary", libaryRoutes);
    app.use("/api", subscriptionRoutes);
    app.use("/api/transactions", transactionRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/users", userRecentListeningRoutes);
    app.use("/api/users", userReportRoutes);
    app.use("/api/users/playlists", userPlaylistRoutes);
    app.use("/api/admin/artists", adminArtistRouter);
    app.use("/api/browse/genres", userGenreRoutes);
    app.use("/api/search", searchRoutes);
    app.use("/api/users/favorites", userFavoriteRoutes);
    app.use("/api/admin/notifications", adminNotificationRouter);
    app.use("/api/users/payment-history", userPaymentHistoryRoutes);
    app.use("/api/users/payments", userPaymentHistoryRoutes);
    app.use("/api/users/subscription", userSubscriptionRoutes);

}

export default route;


