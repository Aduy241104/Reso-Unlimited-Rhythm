import albumService from './albumService';
import artistService from './artistService';
import playlistService from './playlistService';
import trackService from './trackService';

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatLocalMonth = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
};

const getErrorMessage = (error, fallback) => error?.message || fallback;

export const homeService = {
  async getHomepageData(options = {}) {
    const now = new Date();
    const date = options.date || formatLocalDate(now);
    const month = options.month || formatLocalMonth(now);
    const topTrackPreviewLimit = options.topTrackPreviewLimit || 1;
    const topArtistLimit = options.topArtistLimit || 10;
    const playlistLimit = options.playlistLimit || 10;
    const albumLimit = options.albumLimit || 10;

    const [dailyTopTracks, monthlyTopTracks, monthlyTopArtists, systemPlaylists, recentAlbums] = await Promise.allSettled([
      trackService.getDailyTopTracks({ date, limit: topTrackPreviewLimit }),
      trackService.getMonthlyTopTracks({ month, limit: topTrackPreviewLimit }),
      artistService.getMonthlyTopArtists({ month, limit: topArtistLimit }),
      playlistService.getSystemPlaylists({ page: 1, limit: playlistLimit }),
      albumService.getRecentAlbums({ page: 1, limit: albumLimit }),
    ]);

    const sectionErrors = {};
    const topTrackCollections = [];

    if (dailyTopTracks.status === 'fulfilled') {
      topTrackCollections.push(
        trackService.buildTopTrackCollectionSummary({
          period: 'daily',
          date,
          items: dailyTopTracks.value.items,
          totalItems: dailyTopTracks.value.totalItems,
        })
      );
    }

    if (monthlyTopTracks.status === 'fulfilled') {
      topTrackCollections.push(
        trackService.buildTopTrackCollectionSummary({
          period: 'monthly',
          month,
          items: monthlyTopTracks.value.items,
          totalItems: monthlyTopTracks.value.totalItems,
        })
      );
    }

    const result = {
      topTrackCollections,
      monthlyTopArtists: monthlyTopArtists.status === 'fulfilled' ? monthlyTopArtists.value.items : [],
      systemPlaylists: systemPlaylists.status === 'fulfilled' ? systemPlaylists.value.items : [],
      recentAlbums: recentAlbums.status === 'fulfilled' ? recentAlbums.value.items : [],
      sectionErrors,
      query: { date, month },
    };

    if (topTrackCollections.length === 0 && (dailyTopTracks.status === 'rejected' || monthlyTopTracks.status === 'rejected')) {
      const trackErrors = [];

      if (dailyTopTracks.status === 'rejected') {
        trackErrors.push(getErrorMessage(dailyTopTracks.reason, 'Không thể tải top bài hát ngày.'));
      }

      if (monthlyTopTracks.status === 'rejected') {
        trackErrors.push(getErrorMessage(monthlyTopTracks.reason, 'Không thể tải top bài hát tháng.'));
      }

      sectionErrors.topTrackCollections = trackErrors.join(' ');
    }

    if (monthlyTopArtists.status === 'rejected') {
      sectionErrors.monthlyTopArtists = getErrorMessage(monthlyTopArtists.reason, 'Không thể tải nghệ sĩ nổi bật theo tháng.');
    }

    if (systemPlaylists.status === 'rejected') {
      sectionErrors.systemPlaylists = getErrorMessage(systemPlaylists.reason, 'Không thể tải playlist hệ thống.');
    }

    if (recentAlbums.status === 'rejected') {
      sectionErrors.recentAlbums = getErrorMessage(recentAlbums.reason, 'Không thể tải album mới.');
    }

    if (
      result.topTrackCollections.length === 0 &&
      result.monthlyTopArtists.length === 0 &&
      result.systemPlaylists.length === 0 &&
      result.recentAlbums.length === 0 &&
      Object.keys(sectionErrors).length > 0
    ) {
      throw new Error('Không thể tải dữ liệu trang chủ.');
    }

    return result;
  },
};

export default homeService;
