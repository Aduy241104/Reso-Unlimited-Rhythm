import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import recentListeningService from '../../services/recentListeningService';
import { getErrorMessage, getInitials } from '../../utils/media';

const CHART_BAR_MAX_HEIGHT = 112;

const formatCount = (value) => new Intl.NumberFormat('vi-VN').format(
  Math.max(0, Math.round(Number(value) || 0))
);

const formatListeningMinutes = (value) => {
  const totalMinutes = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} phút`;
  }

  if (minutes <= 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${minutes} phút`;
};

const formatChartLabel = (value, fallback = '') => {
  if (typeof value === 'string') {
    const [, month, day] = value.split('-');

    if (month && day) {
      return `${day}/${month}`;
    }
  }

  return fallback || '--';
};

const isSameLocalDate = (left, right) => (
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()
);

const formatListenedAt = (value) => {
  const listenedDate = value ? new Date(value) : null;

  if (!listenedDate || Number.isNaN(listenedDate.getTime())) {
    return 'Không rõ thời gian';
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const timeLabel = listenedDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSameLocalDate(listenedDate, now)) {
    return `Hôm nay · ${timeLabel}`;
  }

  if (isSameLocalDate(listenedDate, yesterday)) {
    return `Hôm qua · ${timeLabel}`;
  }

  return `${listenedDate.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} · ${timeLabel}`;
};

const isPremiumAccessDeniedError = (error) => {
  const requiredPlan = String(error?.errors?.requiredPlan || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  return Number(error?.status) === 403
    && (requiredPlan === 'premium' || message.includes('premium'));
};

const StatCard = ({ icon, label, value }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={19} color="#ffffff" />
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Artwork = ({ uri, label }) => {
  if (uri) {
    return <Image source={{ uri }} style={styles.trackArtwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.trackArtwork, styles.trackArtworkFallback]}>
      <Text style={styles.trackArtworkText}>{getInitials(label)}</Text>
    </View>
  );
};

const RecentTrackRow = ({ item, isLast, onPress }) => {
  const track = item?.track || {};
  const artist = item?.artist || {};

  return (
    <TouchableOpacity
      style={[styles.trackRow, isLast && styles.trackRowLast]}
      activeOpacity={0.75}
      onPress={onPress}
      disabled={!track?.id}
    >
      <Artwork uri={track?.image || item?.album?.coverImage} label={track?.title} />

      <View style={styles.trackCopy}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track?.title || 'Bài hát chưa có tên'}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {artist?.name || 'Nghệ sĩ không xác định'}
        </Text>
        <Text style={styles.trackTime} numberOfLines={1}>
          {formatListenedAt(item?.listenedAt)}
        </Text>
      </View>

      <View style={styles.trackTrailing}>
        <Text style={styles.trackMinutes}>
          {formatListeningMinutes(item?.listenedMinutes)}
        </Text>
        {track?.id ? <Ionicons name="chevron-forward" size={17} color="#737373" /> : null}
      </View>
    </TouchableOpacity>
  );
};

export default function RecentListeningScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPremiumRequired, setIsPremiumRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadActivity = useCallback(async ({ refresh = false } = {}) => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setActivity(null);
      setIsPremiumRequired(false);
      setErrorMessage('');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const nextActivity = await recentListeningService.getMyRecentListeningActivity();
      setActivity(nextActivity);
      setIsPremiumRequired(false);
      setErrorMessage('');
    } catch (error) {
      if (isPremiumAccessDeniedError(error)) {
        setActivity(null);
        setIsPremiumRequired(true);
        setErrorMessage('');
      } else {
        setActivity(null);
        setIsPremiumRequired(false);
        setErrorMessage(
          getErrorMessage(error, 'Không thể tải hoạt động nghe gần đây lúc này.')
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthLoading, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void loadActivity();
    }, [loadActivity])
  );

  const chart = useMemo(() => (
    Array.isArray(activity?.chart) ? activity.chart : []
  ), [activity?.chart]);
  const topGenres = useMemo(() => (
    Array.isArray(activity?.topGenres) ? activity.topGenres.slice(0, 5) : []
  ), [activity?.topGenres]);
  const topTracks = useMemo(() => (
    Array.isArray(activity?.topTracks) ? activity.topTracks.slice(0, 3) : []
  ), [activity?.topTracks]);
  const recentTracks = useMemo(() => (
    Array.isArray(activity?.recentTracks) ? activity.recentTracks : []
  ), [activity?.recentTracks]);
  const summary = activity?.summary || {};
  const chartMaxListenCount = useMemo(
    () => Math.max(1, ...chart.map((item) => Number(item?.listenCount) || 0)),
    [chart]
  );

  const handleOpenTrack = useCallback((item) => {
    const trackId = item?.track?.id || item?.entityId || item?.id;

    if (!trackId) {
      return;
    }

    navigation.navigate('EntityDetail', {
      entityType: 'track',
      entityId: trackId,
      initialTitle: item?.track?.title || item?.title || 'Chi tiết bài hát',
    });
  }, [navigation]);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={23} color="#ffffff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Nghe gần đây</Text>
      <View style={styles.headerButton} />
    </View>
  );

  if (isAuthLoading || isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        {renderHeader()}
        <View style={styles.centerState}>
          <AppLoader size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Đang tải hoạt động nghe...</Text>
        </View>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        {renderHeader()}
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Ionicons name="person-outline" size={30} color="#ffffff" />
          </View>
          <Text style={styles.stateTitle}>Bạn cần đăng nhập</Text>
          <Text style={styles.stateText}>
            Đăng nhập để xem những bài hát và thống kê nghe gần đây của bạn.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isPremiumRequired) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        {renderHeader()}
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Ionicons name="lock-closed-outline" size={30} color="#ffffff" />
          </View>
          <Text style={styles.stateEyebrow}>DÀNH CHO PREMIUM</Text>
          <Text style={styles.stateTitle}>Mở khóa câu chuyện âm nhạc của bạn</Text>
          <Text style={styles.stateText}>
            Nâng cấp Premium để xem lượt nghe, thời gian nghe và những bài hát nổi bật trong 7 ngày qua.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('PremiumOverview')}
          >
            <Text style={styles.primaryButtonText}>Xem các gói Premium</Text>
            <Ionicons name="arrow-forward" size={18} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        {renderHeader()}
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.82}
            onPress={() => loadActivity()}
          >
            <Text style={styles.secondaryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {renderHeader()}

      <ScrollView
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadActivity({ refresh: true })}
            tintColor="#ffffff"
          />
        )}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="headset-outline" size={26} color="#000000" />
          </View>
          <Text style={styles.heroEyebrow}>HOẠT ĐỘNG CỦA BẠN</Text>
          <Text style={styles.heroTitle}>7 ngày nghe nhạc gần nhất</Text>
          <Text style={styles.heroText}>
            Tổng hợp các lượt nghe mới nhất và gu âm nhạc nổi bật của riêng bạn.
          </Text>
          {summary?.latestTrackTitle ? (
            <View style={styles.latestTrackPill}>
              <Ionicons name="musical-note" size={14} color="#ffffff" />
              <Text style={styles.latestTrackText} numberOfLines={1}>
                Gần nhất: {summary.latestTrackTitle}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="play-outline"
            label="Lượt nghe"
            value={formatCount(summary?.totalListens)}
          />
          <StatCard
            icon="time-outline"
            label="Thời gian"
            value={formatListeningMinutes(summary?.totalMinutes)}
          />
          <StatCard
            icon="calendar-outline"
            label="Ngày hoạt động"
            value={`${formatCount(summary?.activeDays)}/7`}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>TỔNG QUAN</Text>
              <Text style={styles.sectionTitle}>Lượt nghe theo ngày</Text>
            </View>
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeValue}>{formatCount(summary?.today?.listenCount)}</Text>
              <Text style={styles.todayBadgeLabel}>hôm nay</Text>
            </View>
          </View>

          <View style={styles.chart}>
            {chart.map((item, index) => {
              const listenCount = Math.max(0, Number(item?.listenCount) || 0);
              const barHeight = listenCount > 0
                ? Math.max(7, (listenCount / chartMaxListenCount) * CHART_BAR_MAX_HEIGHT)
                : 2;

              return (
                <View key={item?.id || `chart-${index}`} style={styles.chartColumn}>
                  <Text style={styles.chartValue}>{formatCount(listenCount)}</Text>
                  <View style={styles.chartBarArea}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: barHeight },
                        listenCount <= 0 && styles.chartBarEmpty,
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>
                    {formatChartLabel(item?.date, item?.label)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {topGenres.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>GU ÂM NHẠC</Text>
            <Text style={styles.sectionTitle}>Thể loại nổi bật</Text>

            <View style={styles.genreList}>
              {topGenres.map((genre) => {
                const percentage = Math.min(100, Math.max(0, Number(genre?.percentage) || 0));

                return (
                  <View key={genre?.id || genre?.name} style={styles.genreItem}>
                    <View style={styles.genreCopy}>
                      <Text style={styles.genreName} numberOfLines={1}>{genre?.name}</Text>
                      <Text style={styles.genrePercentage}>{percentage.toFixed(0)}%</Text>
                    </View>
                    <View style={styles.genreTrack}>
                      <View style={[styles.genreFill, { width: `${percentage}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {topTracks.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>NỔI BẬT</Text>
            <Text style={styles.sectionTitle}>Bài hát nghe nhiều</Text>

            <View style={styles.topTrackList}>
              {topTracks.map((track, index) => (
                <TouchableOpacity
                  key={track?.id || `top-track-${index}`}
                  style={styles.topTrackRow}
                  activeOpacity={0.75}
                  onPress={() => handleOpenTrack(track)}
                  disabled={!track?.entityId}
                >
                  <Text style={styles.topTrackRank}>{index + 1}</Text>
                  <Artwork uri={track?.image} label={track?.title} />
                  <View style={styles.topTrackCopy}>
                    <Text style={styles.trackTitle} numberOfLines={1}>{track?.title}</Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {formatCount(track?.listenCount)} lượt · {formatListeningMinutes(track?.listenedMinutes)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color="#737373" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.recentSection}>
          <View style={styles.recentHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>LỊCH SỬ MỚI NHẤT</Text>
              <Text style={styles.sectionTitle}>Vừa nghe gần đây</Text>
            </View>
            <Text style={styles.recentCount}>{recentTracks.length} lượt</Text>
          </View>

          <View style={styles.trackList}>
            {recentTracks.length > 0 ? (
              recentTracks.map((item, index) => (
                <RecentTrackRow
                  key={item?.id || `recent-${index}`}
                  item={item}
                  isLast={index === recentTracks.length - 1}
                  onPress={() => handleOpenTrack(item)}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="headset-outline" size={31} color="#737373" />
                <Text style={styles.emptyTitle}>Chưa có dữ liệu nghe gần đây</Text>
                <Text style={styles.emptyText}>
                  Khi bạn nghe nhạc, những hoạt động mới nhất sẽ xuất hiện tại đây.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#000000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#242424',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingText: {
    marginTop: 8,
    color: '#a3a3a3',
    fontSize: 13,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#2d2d2d',
    marginBottom: 20,
  },
  stateEyebrow: {
    color: '#a3a3a3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  stateTitle: {
    maxWidth: 320,
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateText: {
    maxWidth: 330,
    marginTop: 12,
    color: '#a3a3a3',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 24,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: '#ffffff',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    backgroundColor: '#101010',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  heroCard: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#0b0b0b',
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  heroEyebrow: {
    color: '#8c8c8c',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  heroTitle: {
    marginTop: 9,
    color: '#ffffff',
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroText: {
    marginTop: 10,
    color: '#9f9f9f',
    fontSize: 14,
    lineHeight: 21,
  },
  latestTrackPill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#303030',
  },
  latestTrackText: {
    flexShrink: 1,
    color: '#e5e5e5',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 112,
    padding: 13,
    borderRadius: 18,
    backgroundColor: '#0b0b0b',
    borderWidth: 1,
    borderColor: '#262626',
  },
  statValue: {
    marginTop: 13,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 5,
    color: '#777777',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: '#262626',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionEyebrow: {
    color: '#707070',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  sectionTitle: {
    marginTop: 6,
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  todayBadge: {
    alignItems: 'flex-end',
  },
  todayBadgeValue: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
  },
  todayBadgeLabel: {
    marginTop: 2,
    color: '#737373',
    fontSize: 10,
  },
  chart: {
    height: 168,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    marginTop: 22,
    paddingTop: 4,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartValue: {
    height: 17,
    color: '#8a8a8a',
    fontSize: 9,
    fontWeight: '700',
  },
  chartBarArea: {
    height: CHART_BAR_MAX_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  chartBar: {
    width: '68%',
    minWidth: 8,
    maxWidth: 28,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#ffffff',
  },
  chartBarEmpty: {
    backgroundColor: '#333333',
  },
  chartLabel: {
    marginTop: 8,
    color: '#737373',
    fontSize: 9,
    fontWeight: '600',
  },
  genreList: {
    gap: 15,
    marginTop: 20,
  },
  genreItem: {
    gap: 8,
  },
  genreCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  genreName: {
    flex: 1,
    color: '#e8e8e8',
    fontSize: 13,
    fontWeight: '700',
  },
  genrePercentage: {
    color: '#9a9a9a',
    fontSize: 12,
    fontWeight: '700',
  },
  genreTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: '#252525',
  },
  genreFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  topTrackList: {
    marginTop: 14,
  },
  topTrackRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#242424',
  },
  topTrackRank: {
    width: 18,
    color: '#777777',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  topTrackCopy: {
    flex: 1,
    minWidth: 0,
  },
  recentSection: {
    marginTop: 24,
  },
  recentHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 2,
    marginBottom: 12,
  },
  recentCount: {
    color: '#737373',
    fontSize: 12,
    fontWeight: '600',
  },
  trackList: {
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: '#262626',
  },
  trackRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#292929',
  },
  trackRowLast: {
    borderBottomWidth: 0,
  },
  trackArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1c1c1c',
  },
  trackArtworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#303030',
  },
  trackArtworkText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  trackCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  trackArtist: {
    marginTop: 3,
    color: '#9a9a9a',
    fontSize: 12,
  },
  trackTime: {
    marginTop: 3,
    color: '#626262',
    fontSize: 10,
    fontWeight: '600',
  },
  trackTrailing: {
    maxWidth: 83,
    alignItems: 'flex-end',
    gap: 8,
    marginLeft: 8,
  },
  trackMinutes: {
    color: '#8a8a8a',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 14,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#777777',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
