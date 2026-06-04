import ContentCardSection from "../../components/content/ContentCardSection";
import DailyTopArtistsSection from "../../components/home/DailyTopArtistsSection";
import TrackChartSection from "../../components/home/TrackChartSection";
import { useContentPlayback } from "../../hooks/useContentPlayback";
import { useHomePageData } from "../../hooks/useHomePageData";
import { routePaths } from "../../routes/routePaths";
import { mapDailyTopTracksToContentCards } from "../../utils/dailyTopTracks";
import {
  mapAlbumsToContentCards,
  mapSystemPlaylistsToContentCards,
} from "../../utils/homeContent";
import { mapMonthlyTopArtistsToContentCards } from "../../utils/monthlyTopArtists";
import { mapMonthlyTopTracksToContentCards } from "../../utils/monthlyTopTracks";

const HomePage = () => {
  const {
    albums,
    systemPlaylists,
    dailyTopTracks,
    dailyTopTracksMeta,
    monthlyTopTracks,
    monthlyTopTracksMeta,
    monthlyTopArtists,
    monthlyTopArtistsMeta,
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
    dailyTopTracksDate,
    monthlyTopTracksDate,
    monthlyTopArtistsDate,
    dailyTopTracksLimit,
    monthlyTopTracksLimit,
    monthlyTopArtistsLimit,
  } = useHomePageData();

  const {
    playbackError,
    playAlbumItem,
    playPlaylistItem,
  } = useContentPlayback();

  return (
    <section className="space-y-8 sm:space-y-10">
      { albumsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { albumsError }
        </div>
      ) : null }

      { systemPlaylistsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { systemPlaylistsError }
        </div>
      ) : null }

      { dailyTopTracksError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { dailyTopTracksError }
        </div>
      ) : null }

      { monthlyTopTracksError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { monthlyTopTracksError }
        </div>
      ) : null }

      { monthlyTopArtistsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { monthlyTopArtistsError }
        </div>
      ) : null }

      <TrackChartSection
        label="Bảng xếp hạng"
        title="Top nhạc nổi bật"
        description="Theo dõi nhanh các bảng xếp hạng theo ngày, theo tháng và nghệ sĩ đang dẫn đầu."
        items={ [
          ...(!dailyTopTracksError
            ? mapDailyTopTracksToContentCards({
                topTracks: dailyTopTracks,
                meta: dailyTopTracksMeta || {},
                date: dailyTopTracksDate,
                limit: dailyTopTracksLimit,
              }).map((item) => ({
                ...item,
                raw: {
                  ...item.raw,
                  period: "daily",
                },
              }))
            : []),
          ...(!monthlyTopTracksError
            ? mapMonthlyTopTracksToContentCards({
                topTracks: monthlyTopTracks,
                meta: monthlyTopTracksMeta || {},
                month: monthlyTopTracksDate,
                limit: monthlyTopTracksLimit,
              }).map((item) => ({
                ...item,
                raw: {
                  ...item.raw,
                  period: "monthly",
                },
              }))
            : []),
          ...(!monthlyTopArtistsError
            ? mapMonthlyTopArtistsToContentCards({
                topArtists: monthlyTopArtists,
                meta: monthlyTopArtistsMeta || {},
                month: monthlyTopArtistsDate,
                limit: monthlyTopArtistsLimit,
              })
            : []),
        ] }
        isLoading={
          isLoadingDailyTopTracks ||
          isLoadingMonthlyTopTracks ||
          isLoadingMonthlyTopArtists
        }
        emptyMessage="Hiện chưa có dữ liệu bảng xếp hạng."
        showPlayButton={ false }
        actionLabel="Xem tất cả bảng xếp hạng"
        actionHref={ routePaths.dailyTopTracks }
      />

      <ContentCardSection
        title="Playlist hệ thống"
        description="Khám phá các playlist được tuyển chọn để phù hợp với từng khoảnh khắc nghe nhạc của bạn."
        items={ mapSystemPlaylistsToContentCards(systemPlaylists) }
        isLoading={ isLoadingSystemPlaylists }
        emptyMessage="Hiện chưa có dữ liệu playlist hệ thống."
        onPlay={ playPlaylistItem }
      />

      <ContentCardSection
        label="Album"
        title="Album nổi bật"
        description="Khám phá các album nổi bật và tuyển tập âm nhạc phù hợp với mọi tâm trạng."
        items={ mapAlbumsToContentCards(albums) }
        isLoading={ isLoadingAlbums }
        emptyMessage="Hiện chưa có dữ liệu album."
        onPlay={ playAlbumItem }
      />

      <DailyTopArtistsSection
        title="Top nghệ sĩ theo ngày"
        description="Những nghệ sĩ được nghe nhiều nhất hôm nay."
        items={ dailyTopArtists }
        isLoading={ isLoadingDailyTopArtists }
        errorMessage={ dailyTopArtistsError }
        emptyMessage="Hôm nay chưa có dữ liệu xếp hạng."
      />

      { playbackError ? (
        <div
          className="
            rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm
            text-rose-700 dark:text-rose-300
          "
        >
          { playbackError }
        </div>
      ) : null }
    </section>
  );
};

export default HomePage;
