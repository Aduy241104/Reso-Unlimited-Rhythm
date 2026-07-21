import albumService from './albumService';
import artistService from './artistService';
import playlistService from './playlistService';
import recommendationService from './recommendationService';
import trackService from './trackService';

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getPreviousLocalDate = (date) => {
  const previousDate = new Date(date);
  previousDate.setDate(previousDate.getDate() - 1);

  return formatLocalDate(previousDate);
};

const formatLocalMonth = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
};

const getErrorMessage = (error, fallback) => error?.message || fallback;
const getItems = (result) => (result.status === 'fulfilled' ? result.value.items : []);

export const homeService = {
  async getHomepageData(options = {}) {
    const now = new Date();
    const date = options.date || getPreviousLocalDate(now);
    const month = options.month || formatLocalMonth(now);
    const includeRecommendations = Boolean(options.includeRecommendations);
    const topTrackLimit = options.topTrackLimit || 5;
    const topArtistLimit = options.topArtistLimit || 5;
    const playlistLimit = options.playlistLimit || 10;
    const albumLimit = options.albumLimit || 10;

    const [
      dailyTopTracks,
      monthlyTopTracks,
      dailyTopArtists,
      monthlyTopArtists,
      systemPlaylists,
      recentAlbums,
      recommendedPlaylists,
    ] = await Promise.allSettled([
      trackService.getDailyTopTracks({ date, limit: topTrackLimit }),
      trackService.getMonthlyTopTracks({ month, limit: topTrackLimit }),
      artistService.getDailyTopArtists({ date, limit: topArtistLimit }),
      artistService.getMonthlyTopArtists({ month, limit: topArtistLimit }),
      playlistService.getSystemPlaylists({ page: 1, limit: playlistLimit }),
      albumService.getRecentAlbums({ page: 1, limit: albumLimit }),
      includeRecommendations
        ? recommendationService.getDailyMixes()
        : Promise.resolve({ items: [] }),
    ]);

    const sectionErrors = {};
    const result = {
      dailyTopTracks: getItems(dailyTopTracks),
      monthlyTopTracks: getItems(monthlyTopTracks),
      dailyTopArtists: getItems(dailyTopArtists),
      monthlyTopArtists: getItems(monthlyTopArtists),
      systemPlaylists: getItems(systemPlaylists),
      recentAlbums: getItems(recentAlbums),
      recommendedPlaylists: getItems(recommendedPlaylists),
      sectionErrors,
      query: { date, month },
    };

    if (dailyTopTracks.status === 'rejected') {
      sectionErrors.dailyTopTracks = getErrorMessage(
        dailyTopTracks.reason,
        'Không thể tải bảng xếp hạng bài hát theo ngày.'
      );
    }

    if (monthlyTopTracks.status === 'rejected') {
      sectionErrors.monthlyTopTracks = getErrorMessage(
        monthlyTopTracks.reason,
        'Không thể tải bảng xếp hạng bài hát theo tháng.'
      );
    }

    if (dailyTopArtists.status === 'rejected') {
      sectionErrors.dailyTopArtists = getErrorMessage(
        dailyTopArtists.reason,
        'Không thể tải bảng xếp hạng nghệ sĩ theo ngày.'
      );
    }

    if (monthlyTopArtists.status === 'rejected') {
      sectionErrors.monthlyTopArtists = getErrorMessage(
        monthlyTopArtists.reason,
        'Không thể tải bảng xếp hạng nghệ sĩ theo tháng.'
      );
    }

    if (systemPlaylists.status === 'rejected') {
      sectionErrors.systemPlaylists = getErrorMessage(
        systemPlaylists.reason,
        'Không thể tải playlist hệ thống.'
      );
    }

    if (recentAlbums.status === 'rejected') {
      sectionErrors.recentAlbums = getErrorMessage(
        recentAlbums.reason,
        'Không thể tải album nổi bật.'
      );
    }

    if (includeRecommendations && recommendedPlaylists.status === 'rejected') {
      sectionErrors.recommendedPlaylists = getErrorMessage(
        recommendedPlaylists.reason,
        'Không thể tải playlist gợi ý lúc này.'
      );
    }

    if (
      result.dailyTopTracks.length === 0 &&
      result.monthlyTopTracks.length === 0 &&
      result.dailyTopArtists.length === 0 &&
      result.monthlyTopArtists.length === 0 &&
      result.systemPlaylists.length === 0 &&
      result.recommendedPlaylists.length === 0 &&
      result.recentAlbums.length === 0 &&
      Object.keys(sectionErrors).length > 0
    ) {
      throw new Error('Không thể tải dữ liệu trang chủ.');
    }

    return result;
  },
};

export default homeService;
