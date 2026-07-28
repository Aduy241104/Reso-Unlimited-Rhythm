import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import contentReportDetailService from '../../services/contentReportDetailService';

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
    return 'Chưa có';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Chưa có';
  }

  return parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'Chưa có'}</Text>
  </View>
);

const SectionCard = ({ title, subtitle, iconName, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
        <Ionicons name={iconName} size={18} color="#f3c26b" />
      </View>
      <View style={styles.sectionHeaderTextWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

export default function ReportDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const reportId = route?.params?.reportId;

  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const statusColor = getStatusColor(report?.status);
  const timelineState = useMemo(() => {
    const isResolved = report?.status === 'resolved';
    const isRejected = report?.status === 'rejected';
    const isReviewing = report?.status === 'reviewing' || report?.status === 'pending';

    return [
      {
        key: 'reviewing',
        label: 'Đang xem xét',
        done: isReviewing || isResolved || isRejected,
      },
      {
        key: 'final',
        label: isResolved ? 'Đã xử lý' : isRejected ? 'Bị từ chối' : 'Hoàn thành',
        done: isResolved || isRejected,
      },
    ];
  }, [report?.status]);

  const loadReportDetail = useCallback(async ({ refresh = false } = {}) => {
    if (!reportId) {
      setReport(null);
      setErrorMessage('Không tìm thấy mã báo cáo để xem chi tiết.');
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
      const nextReport = await contentReportDetailService.getReportDetail(reportId);
      setReport(nextReport);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(contentReportDetailService.translateReportDetailError(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [reportId]);

  useFocusEffect(
    useCallback(() => {
      loadReportDetail();
      return undefined;
    }, [loadReportDetail])
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết báo cáo</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      </View>
    );
  }

  if (errorMessage && !report) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết báo cáo</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={() => loadReportDetail()} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Chi tiết báo cáo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 30, 36) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadReportDetail({ refresh: true })}
            tintColor="#ffffff"
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="flag-outline" size={22} color="#f3c26b" />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>REPORT DETAIL</Text>
              <Text style={styles.heroTitle}>Chi tiết báo cáo</Text>
              <Text style={styles.heroText}>Mã báo cáo #{String(report?.id || '').slice(-8).toUpperCase() || '--'}</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.targetBadge}>
              <Ionicons name={getTargetIconName(report?.targetType)} size={14} color="#f3c26b" />
              <Text style={styles.targetBadgeText}>{report?.targetTypeLabel}</Text>
            </View>
            <View style={[styles.statusBadge, { borderColor: statusColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{report?.statusLabel}</Text>
            </View>
          </View>
        </View>

        {report?.status === 'resolved' || report?.status === 'rejected' ? (
          <View style={[styles.resultBanner, report?.status === 'resolved' ? styles.resultBannerResolved : styles.resultBannerRejected]}>
            <View style={styles.resultHeader}>
              <Ionicons
                name={report?.status === 'resolved' ? 'checkmark-circle' : 'close-circle'}
                size={22}
                color={report?.status === 'resolved' ? '#b7ffd0' : '#ffc2c2'}
              />
              <Text style={styles.resultTitle}>
                {report?.status === 'resolved' ? 'Kết quả xử lý' : 'Lý do từ chối'}
              </Text>
            </View>
            <InfoRow label="Hình thức xử lý" value={report?.resolutionLabel} />
            {report?.resolutionNote ? <InfoRow label="Ghi chú từ quản trị viên" value={report.resolutionNote} /> : null}
          </View>
        ) : null}

        <SectionCard title="Trạng thái xử lý" subtitle="Tiến trình hiện tại của báo cáo" iconName="git-network-outline">
          <View style={styles.timelineRow}>
            {timelineState.map((item, index) => (
              <View key={item.key} style={styles.timelineItemWrap}>
                <View style={styles.timelineNodeWrap}>
                  <View style={[styles.timelineNode, item.done ? styles.timelineNodeDone : null]}>
                    <Ionicons
                      name={item.done ? 'checkmark' : 'ellipse-outline'}
                      size={item.done ? 14 : 12}
                      color={item.done ? '#1ed760' : '#8b8b8b'}
                    />
                  </View>
                  {index < timelineState.length - 1 ? (
                    <View style={[styles.timelineLine, item.done ? styles.timelineLineDone : null]} />
                  ) : null}
                </View>
                <Text style={[styles.timelineLabel, item.done ? styles.timelineLabelDone : null]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="Nội dung báo cáo" subtitle="Thông tin chính của báo cáo bạn đã gửi" iconName="alert-circle-outline">
          <InfoRow label="Loại nội dung" value={report?.targetTypeLabel} />
          <InfoRow label="Mã nội dung" value={report?.targetId} />
          <InfoRow label="Lý do báo cáo" value={report?.reasonLabel} />
          <InfoRow label="Mô tả chi tiết" value={report?.description} />
        </SectionCard>

        {Array.isArray(report?.images) && report.images.length > 0 ? (
          <SectionCard
            title="Hình ảnh minh chứng"
            subtitle={`${report.images.length} hình ảnh đã gửi kèm`}
            iconName="image-outline"
          >
            <View style={styles.imageGrid}>
              {report.images.map((imageUrl, index) => (
                <View key={`${imageUrl}-${index}`} style={styles.imageCard}>
                  <Image source={{ uri: imageUrl }} style={styles.imagePreview} contentFit="cover" transition={120} />
                  <Text style={styles.imageCaption}>Ảnh minh chứng {index + 1}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        <SectionCard title="Thông tin thời gian" subtitle="Mốc thời gian liên quan đến báo cáo" iconName="time-outline">
          <InfoRow label="Ngày gửi" value={formatDateTime(report?.createdAt)} />
          <InfoRow label="Cập nhật lần cuối" value={formatDateTime(report?.updatedAt)} />
          <InfoRow label="Thời điểm xử lý" value={formatDateTime(report?.handledAt)} />
        </SectionCard>
      </ScrollView>
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  heroTextWrap: {
    flex: 1,
  },
  heroEyebrow: {
    color: '#f3c26b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    marginTop: 4,
  },
  heroText: {
    color: '#b9b9b9',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  heroMetaRow: {
    marginTop: 16,
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
  resultBanner: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
  },
  resultBannerResolved: {
    backgroundColor: '#112017',
    borderColor: '#2f6a44',
  },
  resultBannerRejected: {
    backgroundColor: '#1b1212',
    borderColor: '#663737',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18140d',
    borderWidth: 1,
    borderColor: '#342916',
  },
  sectionHeaderTextWrap: {
    flex: 1,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#8d8d8d',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#121212',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
    gap: 12,
  },
  infoRow: {
    borderRadius: 16,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  infoLabel: {
    color: '#8f8f8f',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 21,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  timelineItemWrap: {
    flex: 1,
  },
  timelineNodeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineNode: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3a3a3a',
    backgroundColor: '#151515',
  },
  timelineNodeDone: {
    borderColor: '#2f6a44',
    backgroundColor: '#102115',
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#303030',
    marginHorizontal: 8,
  },
  timelineLineDone: {
    backgroundColor: '#2f6a44',
  },
  timelineLabel: {
    marginTop: 10,
    color: '#8f8f8f',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineLabelDone: {
    color: '#ffffff',
  },
  imageGrid: {
    gap: 12,
  },
  imageCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    backgroundColor: '#151515',
  },
  imagePreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#101010',
  },
  imageCaption: {
    color: '#d0d0d0',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
