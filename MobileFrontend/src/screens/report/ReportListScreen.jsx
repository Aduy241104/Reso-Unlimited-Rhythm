import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import contentReportListService from '../../services/contentReportListService';

const FILTER_OPTIONS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'reviewing', label: 'Đang xem xét' },
  { key: 'resolved', label: 'Đã xử lý' },
  { key: 'rejected', label: 'Bị từ chối' },
];

const getStatusColor = (status) => {
  if (status === 'resolved') {
    return '#1ed760';
  }

  if (status === 'rejected') {
    return '#ff8f8f';
  }

  return '#f3c26b';
};

const getTargetIconName = (targetType) => {
  if (targetType === 'album') {
    return 'disc-outline';
  }

  if (targetType === 'artist') {
    return 'mic-outline';
  }

  return 'musical-notes-outline';
};

const formatDateTime = (value) => {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getEmptyStateContent = (filterKey) => {
  if (filterKey === 'reviewing') {
    return {
      title: 'Chưa có báo cáo đang xem xét',
      description: 'Hiện không có báo cáo nào của bạn đang được tiếp nhận hoặc xem xét.',
    };
  }

  if (filterKey === 'resolved') {
    return {
      title: 'Chưa có báo cáo đã xử lý',
      description: 'Chưa có báo cáo nào được xử lý xong trong danh sách của bạn.',
    };
  }

  if (filterKey === 'rejected') {
    return {
      title: 'Chưa có báo cáo bị từ chối',
      description: 'Hiện chưa có báo cáo nào bị từ chối.',
    };
  }

  return {
    title: 'Chưa có báo cáo nào',
    description: 'Bạn chưa gửi báo cáo nào. Khi phát hiện nội dung vi phạm, bạn có thể gửi báo cáo từ trang chi tiết nội dung.',
  };
};

export default function ReportListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [summaryMeta, setSummaryMeta] = useState({ total: 0 });

  const loadReports = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await contentReportListService.getMyReports();
      setReports(Array.isArray(result?.items) ? result.items : []);
      setSummaryMeta({
        total: Number(result?.pagination?.total) || (Array.isArray(result?.items) ? result.items.length : 0),
      });
      setErrorMessage('');
    } catch (error) {
      setReports([]);
      setSummaryMeta({ total: 0 });
      setErrorMessage(contentReportListService.translateReportListError(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
      return undefined;
    }, [loadReports])
  );

  const filteredReports = useMemo(() => {
    if (activeFilter === 'all') {
      return reports;
    }

    if (activeFilter === 'reviewing') {
      return reports.filter((item) => item.status === 'reviewing' || item.status === 'pending');
    }

    return reports.filter((item) => item.status === activeFilter);
  }, [activeFilter, reports]);

  const emptyState = getEmptyStateContent(activeFilter);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Báo cáo của tôi</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo của tôi</Text>
        <View style={styles.headerSpacer} />
      </View>

      {errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={() => loadReports()} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 30, 36) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadReports({ refresh: true })}
              tintColor="#ffffff"
            />
          }
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="flag-outline" size={24} color="#f3c26b" />
            </View>
            <Text style={styles.heroEyebrow}>REPORT LIST</Text>
            <Text style={styles.heroTitle}>Danh sách báo cáo đã gửi</Text>
            <Text style={styles.heroText}>
              Theo dõi trạng thái xử lý của các báo cáo bạn đã gửi cho bài hát, album hoặc nghệ sĩ.
            </Text>
          </View>

          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((option) => {
              const isActive = option.key === activeFilter;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
                  onPress={() => setActiveFilter(option.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, isActive ? styles.filterChipTextActive : null]}>
                    {option.label}
                  </Text>
                  {option.key === 'all' && summaryMeta.total > 0 ? (
                    <View style={styles.filterCountBadge}>
                      <Text style={styles.filterCountBadgeText}>{summaryMeta.total}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredReports.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search-outline" size={28} color="#7d7d7d" />
              </View>
              <Text style={styles.emptyTitle}>{emptyState.title}</Text>
              <Text style={styles.emptyText}>{emptyState.description}</Text>
            </View>
          ) : (
            <View style={styles.listWrap}>
              {filteredReports.map((report) => {
                const statusColor = getStatusColor(report.status);

                return (
                  <View key={report.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.badgeRow}>
                        <View style={styles.targetBadge}>
                          <Ionicons name={getTargetIconName(report.targetType)} size={14} color="#f3c26b" />
                          <Text style={styles.targetBadgeText}>{report.targetTypeLabel}</Text>
                        </View>
                        <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {report.statusLabel}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.reasonText}>{report.reasonLabel}</Text>

                    {report.description ? (
                      <Text style={styles.descriptionText} numberOfLines={3}>
                        {report.description}
                      </Text>
                    ) : null}

                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={14} color="#8a8a8a" />
                      <Text style={styles.metaText}>Gửi: {formatDateTime(report.createdAt)}</Text>
                    </View>

                    {report.status === 'resolved' && report.resolutionNote ? (
                      <View style={[styles.noteBox, styles.noteBoxResolved]}>
                        <Text style={styles.noteTitle}>Phản hồi xử lý</Text>
                        <Text style={styles.noteText}>{report.resolutionNote}</Text>
                      </View>
                    ) : null}

                    {report.status === 'rejected' && report.resolutionNote ? (
                      <View style={[styles.noteBox, styles.noteBoxRejected]}>
                        <Text style={styles.noteTitle}>Lý do từ chối</Text>
                        <Text style={styles.noteText}>{report.resolutionNote}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050505',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backButtonText: {
    color: '#f3c26b',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 66,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 18,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  retryButtonText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
  },
  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b1710',
    borderWidth: 1,
    borderColor: '#3a2f1b',
  },
  heroEyebrow: {
    color: '#f3c26b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 14,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    marginTop: 8,
  },
  heroText: {
    color: '#b9b9b9',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    backgroundColor: '#121212',
  },
  filterChipActive: {
    borderColor: '#5a4520',
    backgroundColor: '#1c1710',
  },
  filterChipText: {
    color: '#cfcfcf',
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#f3c26b',
  },
  filterCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#242424',
    paddingHorizontal: 6,
  },
  filterCountBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCard: {
    marginTop: 4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#9a9a9a',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  listWrap: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#121212',
    padding: 16,
  },
  cardHeader: {
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  targetBadgeText: {
    color: '#f1f1f1',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#171717',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  reasonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
  },
  descriptionText: {
    color: '#a9a9a9',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },
  metaText: {
    color: '#8a8a8a',
    fontSize: 12,
  },
  noteBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  noteBoxResolved: {
    borderColor: '#24482f',
    backgroundColor: '#111913',
  },
  noteBoxRejected: {
    borderColor: '#5a2d2d',
    backgroundColor: '#1a1111',
  },
  noteTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  noteText: {
    color: '#c6c6c6',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});
