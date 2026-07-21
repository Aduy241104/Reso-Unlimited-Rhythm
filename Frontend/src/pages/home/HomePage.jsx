import ContentCardSection from "../../components/content/ContentCardSection";
import TrackChartSection from "../../components/home/TrackChartSection";
import { useAuth } from "../../hooks/useAuth";
import { useContentPlayback } from "../../hooks/useContentPlayback";
import { useHomePageData } from "../../hooks/useHomePageData";
import { useRecommendationMixes } from "../../hooks/useRecommendationMixes";
import { routePaths } from "../../routes/routePaths";
import {
  mapAlbumsToContentCards,
  mapSystemPlaylistsToContentCards,
} from "../../utils/homeContent";
import {
  mapTopArtistsToRankingCards,
  mapTopTracksToRankingCards,
} from "../../utils/homeRankings";
import {
  getRecommendationUserDisplayName,
  mapRecommendationMixesToContentCards,
} from "../../utils/recommendation";

const HomePage = () => {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const {
    albums,
    systemPlaylists,
    dailyTopTracks,
    monthlyTopTracks,
    monthlyTopArtists,
    dailyTopArtists,
    isLoadingAlbums,
    isLoadingSystemPlaylists,
    isLoadingDailyTopTracks,
    isLoadingMonthlyTopTracks,
    isLoadingMonthlyTopArtists,
    isLoadingDailyTopArtists,
    albumsError,
    systemPlaylistsError,
    dailyTopTracksError,
    monthlyTopTracksError,
    monthlyTopArtistsError,
    dailyTopArtistsError,
  } = useHomePageData();
  const {
    mixes: recommendationMixes,
    isLoading: isLoadingRecommendationMixes,
    errorMessage: recommendationMixesError,
  } = useRecommendationMixes({
    enabled: isAuthenticated && !isAuthLoading,
  });
  const {
    playbackError,
    playAlbumItem,
    playPlaylistItem,
    playRecommendationMixItem,
  } = useContentPlayback();
  const recommendationUserName = getRecommendationUserDisplayName(user);
  const shouldShowRecommendationSection = isAuthenticated && !isAuthLoading;

  return (
    <section className="min-w-0 space-y-6 p-5 sm:space-y-8 lg:space-y-10">
      {albumsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          {albumsError}
        </div>
      ) : null}

      {systemPlaylistsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          {systemPlaylistsError}
        </div>
      ) : null}

      {recommendationMixesError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          {recommendationMixesError}
        </div>
      ) : null}

      {dailyTopTracksError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          {dailyTopTracksError}
        </div>
      ) : null}

      {monthlyTopTracksError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          {monthlyTopTracksError}
        </div>
      ) : null}

      {monthlyTopArtistsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          {monthlyTopArtistsError}
        </div>
      ) : null}

      {dailyTopArtistsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          {dailyTopArtistsError}
        </div>
      ) : null}

      <TrackChartSection
        label="Bảng xếp hạng ngày"
        title="Top bài hát theo ngày"
        items={ mapTopTracksToRankingCards(dailyTopTracks, { period: "daily" }) }
        isLoading={ isLoadingDailyTopTracks }
        emptyMessage="Hiện chưa có dữ liệu bảng xếp hạng bài hát theo ngày."
        showPlayButton={false}
        actionLabel="Xem thêm"
        actionHref={routePaths.dailyTopTracks}
      />

      <TrackChartSection
        label="Bảng xếp hạng tháng"
        title="Top bài hát theo tháng"
        items={ mapTopTracksToRankingCards(monthlyTopTracks, { period: "monthly" }) }
        isLoading={ isLoadingMonthlyTopTracks }
        emptyMessage="Hiện chưa có dữ liệu bảng xếp hạng bài hát theo tháng."
        showPlayButton={ false }
        actionLabel="Xem thêm"
        actionHref={ routePaths.monthlyTopTracks }
      />

      <TrackChartSection
        label="Nghệ sĩ nổi bật"
        title="Top nghệ sĩ theo ngày"
        items={ mapTopArtistsToRankingCards(dailyTopArtists, { period: "daily" }) }
        isLoading={ isLoadingDailyTopArtists }
        emptyMessage="Hiện chưa có dữ liệu bảng xếp hạng nghệ sĩ theo ngày."
        showPlayButton={ false }
        actionLabel="Xem thêm"
        actionHref={ routePaths.dailyTopArtists }
      />

      <TrackChartSection
        label="Nghệ sĩ nổi bật"
        title="Top nghệ sĩ theo tháng"
        items={ mapTopArtistsToRankingCards(monthlyTopArtists, { period: "monthly" }) }
        isLoading={ isLoadingMonthlyTopArtists }
        emptyMessage="Hiện chưa có dữ liệu bảng xếp hạng nghệ sĩ theo tháng."
        showPlayButton={ false }
        actionLabel="Xem thêm"
        actionHref={ routePaths.monthlyTopArtists }
      />

      <ContentCardSection
        title="Playlist hệ thống"
        items={mapSystemPlaylistsToContentCards(systemPlaylists)}
        isLoading={isLoadingSystemPlaylists}
        emptyMessage="Hiện chưa có dữ liệu playlist hệ thống."
        onPlay={playPlaylistItem}
      />

      {shouldShowRecommendationSection ? (
        <ContentCardSection
          label="Daily Mix"
          title={`Dành cho ${recommendationUserName}`}
          items={mapRecommendationMixesToContentCards(
            recommendationMixes,
            recommendationUserName
          )}
          isLoading={isLoadingRecommendationMixes}
          emptyMessage="Hôm nay chưa có playlist gợi ý cá nhân nào sẵn sàng."
          onPlay={(item) => playRecommendationMixItem(item, user)}
        />
      ) : null}

      <ContentCardSection
        label="Album"
        title="Album nổi bật"
        items={mapAlbumsToContentCards(albums)}
        isLoading={isLoadingAlbums}
        emptyMessage="Hiện chưa có dữ liệu album."
        onPlay={playAlbumItem}
      />

      {playbackError ? (
        <div
          className="
            rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm
            text-rose-700 dark:text-rose-300
          "
        >
          {playbackError}
        </div>
      ) : null}
    </section>
  );
};

export default HomePage;
