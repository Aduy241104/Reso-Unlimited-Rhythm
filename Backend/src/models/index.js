import Album from "./Album.js";
import Artist from "./Artist.js";
import ArtistDailyStat from "./ArtistDailyStat.js";
import ArtistRanking from "./ArtistRanking.js";
import ArtistMonthlyStat from "./ArtistMonthlyStat.js";
import ArtistRequest from "./ArtistRequest.js";
import ArtistRevenueSummary from "./ArtistRevenueSummary.js";
import ArtistStat from "./ArtistStat.js";
import ArtistVerificationRequest from "./ArtistVerificationRequest.js";
import Genre from "./Genre.js";
import Interaction from "./Interaction.js";
import ListenEvent from "./ListenEvent.js";
import Notification from "./Notification.js";
import Plan from "./Plan.js";
import Playlist from "./Playlist.js";
import PlatformMonthlyStat from "./PlatformMonthlyStat.js";
import PersonalizedMix from "./PersonalizedMix.js";
import UserRecentListeningActivity from "./userRecentListeningActivity.model.js";
import UserRecentListeningInsightsCache from "./userRecentListeningInsightsCache.model.js";
import RefreshToken from "./RefreshToken.js";
import ReleaseSchedule from "./ReleaseSchedule.js";
import Report from "./Report.js";
import SearchEvent from "./SearchEvent.js";
import Subscription from "./Subscription.js";
import Track from "./Track.js";
import TrackDailyRanking from "./TrackDailyRanking.js";
import TrackDailyStat from "./TrackDailyStat.js";
import TrackMonthlyRanking from "./TrackMonthlyRanking.js";
import TrackMonthlyStat from "./TrackMonthlyStat.js";
import Transaction from "./Transaction.js";
import User from "./User.js";
import UserListeningDailyStat from "./UserListeningDailyStat.js";
import VerificationToken from "./VerificationToken.js";
import WithdrawalRequest from "./WithdrawalRequest.js";
import RevenuePeriod from "./RevenuePeriod.js"; 

export default {
    Album,
    Artist,
    ArtistDailyStat,
    ArtistRanking,
    ArtistDailyRanking: ArtistRanking,
    ArtistMonthlyRanking: ArtistRanking,
    ArtistMonthlyStat,
    ArtistRequest,
    ArtistRevenueSummary,
    ArtistStat,
    ArtistVerificationRequest,
    Genre,
    Interaction,
    ListenEvent,
    Notification,
    Plan,
    Playlist,
    PlatformMonthlyStat,
    PersonalizedMix,
    UserRecentListeningActivity,
    UserRecentListeningInsightsCache,
    RecentListeningActivity: UserRecentListeningActivity,
    UserRecentListeningInsights: UserRecentListeningInsightsCache,
    RefreshToken,
    ReleaseSchedule,
    Report,
    SearchEvent,
    Subscription,
    Track,
    TrackDailyRanking,
    TrackDailyStat,
    TrackMonthlyRanking,
    TrackMonthlyStat,
    Transaction,
    User,
    UserListeningDailyStat,
    VerificationToken,
    WithdrawalRequest,
    RevenuePeriod,
};
