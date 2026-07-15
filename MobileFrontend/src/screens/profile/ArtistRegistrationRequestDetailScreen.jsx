import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Alert,
  Linking,
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
import AppAvatar from '../../components/common/AppAvatar';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import artistRegistrationRequestDetailService from '../../services/artistRegistrationRequestDetailService';

const CHECKLIST_LABELS = [
  { key: 'profileComplete', label: 'Hồ sơ nghệ sĩ đầy đủ' },
  { key: 'identityVerified', label: 'Thông tin định danh hợp lệ' },
  { key: 'hasMusicActivity', label: 'Có hoạt động âm nhạc rõ ràng' },
  { key: 'socialLinksValid', label: 'Liên kết hoạt động hợp lệ' },
  { key: 'noImpersonation', label: 'Không có dấu hiệu giả mạo' },
  { key: 'acceptedCopyrightPolicy', label: 'Đã chấp nhận cam kết bản quyền' },
];

const SOCIAL_LINK_LABELS = {
  spotify: 'Spotify',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  soundcloud: 'SoundCloud',
  website: 'Website',
  other: 'Liên kết khác',
};

const getStatusColor = (status) => {
  if (status === 'approved') {
    return '#1ed760';
  }

  if (status === 'rejected') {
    return '#ff8f8f';
  }

  return '#f3c26b';
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Chưa có';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Chưa có';
  }

  return parsedDate.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateOnly = (value) => {
  if (!value) {
    return 'Chưa có';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Chưa có';
  }

  return parsedDate.toLocaleDateString('vi-VN');
};

const formatRequestCode = (requestId) => {
  if (!requestId) {
    return '--';
  }

  return `#${String(requestId).slice(-8).toUpperCase()}`;
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || 'Chưa có'}</Text>
  </View>
);

const SectionCard = ({ title, subtitle, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

const ImagePreviewCard = ({ title, uri }) => (
  <View style={styles.imageCard}>
    <Text style={styles.imageCardTitle}>{title}</Text>
    {uri ? (
      <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" transition={120} />
    ) : (
      <View style={styles.imagePlaceholder}>
        <Ionicons name="image-outline" size={22} color="#777777" />
        <Text style={styles.imagePlaceholderText}>Chưa có ảnh</Text>
      </View>
    )}
  </View>
);

export default function ArtistRegistrationRequestDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const requestId = route?.params?.requestId;

  const [requestDetail, setRequestDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const socialLinkEntries = useMemo(
    () => Object.entries(requestDetail?.socialLinks || {}).filter(([, value]) => Boolean(value)),
    [requestDetail?.socialLinks]
  );

  const loadRequestDetail = useCallback(async ({ refresh = false } = {}) => {
    if (!requestId) {
      setRequestDetail(null);
      setErrorMessage('Không tìm thấy mã yêu cầu để xem chi tiết.');
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
      const detail = await artistRegistrationRequestDetailService.getRequestDetail(requestId);
      setRequestDetail(detail);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(
        artistRegistrationRequestDetailService.translateArtistRegistrationDetailError(
          error,
          'Không thể tải chi tiết yêu cầu lúc này.'
        )
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      loadRequestDetail();
    }, [loadRequestDetail])
  );

  const handleOpenLink = useCallback(async (url) => {
    if (!url) {
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        Alert.alert('Không thể mở liên kết', 'Liên kết này hiện không khả dụng trên thiết bị của bạn.');
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Không thể mở liên kết', error?.message || 'Đã xảy ra lỗi khi mở liên kết.');
    }
  }, []);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết yêu cầu</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <AppLoader size="large" />
          <Text style={styles.loadingText}>Đang tải chi tiết yêu cầu...</Text>
        </View>
      </View>
    );
  }

  if (errorMessage && !requestDetail) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết yêu cầu</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <AppButton title="Thử lại" onPress={() => loadRequestDetail()} style={styles.retryButton} />
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(requestDetail?.status);
  const isPendingReview = requestDetail?.status === 'pending';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết yêu cầu</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 28, 36) }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadRequestDetail({ refresh: true })}
            tintColor="#ffffff"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <AppAvatar
              uri={requestDetail?.avatar || requestDetail?.user?.avatar}
              label={requestDetail?.stageName || requestDetail?.user?.displayName}
              size={72}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>YÊU CẦU ĐĂNG KÝ NGHỆ SĨ</Text>
              <Text style={styles.heroTitle}>{requestDetail?.stageName || 'Yêu cầu đăng ký nghệ sĩ'}</Text>
              <Text style={styles.heroText}>
                Mã yêu cầu {formatRequestCode(requestDetail?.id)} • Gửi ngày {formatDateOnly(requestDetail?.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={[styles.statusPill, { borderColor: statusColor }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {requestDetail?.statusLabel || 'Không xác định'}
              </Text>
            </View>
            <Text style={styles.heroMetaText}>Cập nhật {formatDateTime(requestDetail?.updatedAt)}</Text>
          </View>
        </View>

        {requestDetail?.rejectReason ? (
          <View style={[styles.noticeCard, styles.noticeDanger]}>
            <Text style={styles.noticeTitle}>Lý do từ chối</Text>
            <Text style={styles.noticeText}>{requestDetail.rejectReason}</Text>
          </View>
        ) : null}

        {requestDetail?.review?.adminNote ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Ghi chú từ quản trị viên</Text>
            <Text style={styles.noticeText}>{requestDetail.review.adminNote}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={[styles.noticeCard, styles.noticeWarning]}>
            <Text style={styles.noticeTitle}>Thông báo</Text>
            <Text style={styles.noticeText}>{errorMessage}</Text>
          </View>
        ) : null}

        <SectionCard title="Trạng thái xử lý" subtitle="Thông tin tổng quan của yêu cầu">
          <DetailRow label="Trạng thái hiện tại" value={requestDetail?.statusLabel} />
          <DetailRow label="Ngày gửi" value={formatDateTime(requestDetail?.createdAt)} />
          <DetailRow label="Ngày cập nhật" value={formatDateTime(requestDetail?.updatedAt)} />
          <DetailRow label="Ngày duyệt/xử lý" value={formatDateTime(requestDetail?.reviewedAt)} />
          <DetailRow
            label="Người duyệt"
            value={requestDetail?.reviewedBy?.displayName || requestDetail?.reviewedBy?.email || 'Chưa có'}
          />
        </SectionCard>

        <SectionCard title="Thông tin nghệ sĩ" subtitle="Các dữ liệu người dùng đã gửi trong hồ sơ">
          <DetailRow label="Nghệ danh" value={requestDetail?.stageName} />
          <DetailRow label="Tiểu sử" value={requestDetail?.bio || 'Chưa bổ sung tiểu sử'} />
          <View style={styles.genreWrap}>
            <Text style={styles.detailLabel}>Thể loại</Text>
            <View style={styles.genreRow}>
              {requestDetail?.genres?.length ? requestDetail.genres.map((genre) => (
                <View key={genre} style={styles.genreChip}>
                  <Text style={styles.genreChipText}>{genre}</Text>
                </View>
              )) : (
                <Text style={styles.emptyInlineText}>Chưa chọn thể loại</Text>
              )}
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Thông tin tài khoản" subtitle="Tài khoản đã gửi yêu cầu">
          <DetailRow label="Họ tên tài khoản" value={requestDetail?.user?.fullName || 'Chưa cập nhật'} />
          <DetailRow label="Email" value={requestDetail?.user?.email} />
        </SectionCard>

        <SectionCard title="Thông tin định danh" subtitle="Dùng để xác minh nghệ sĩ">
          <DetailRow label="Họ tên trên CCCD" value={requestDetail?.identityInfo?.fullName} />
          <DetailRow label="Số CCCD/CMND" value={requestDetail?.identityInfo?.idNumber} />
          <DetailRow label="Ngày sinh" value={formatDateOnly(requestDetail?.identityInfo?.dateOfBirth)} />
          <View style={styles.imageGrid}>
            <ImagePreviewCard title="Ảnh mặt trước" uri={requestDetail?.identityInfo?.frontImage} />
            <ImagePreviewCard title="Ảnh mặt sau" uri={requestDetail?.identityInfo?.backImage} />
          </View>
        </SectionCard>

        <SectionCard title="Kênh hoạt động" subtitle="Liên kết người dùng đã cung cấp">
          {socialLinkEntries.length ? socialLinkEntries.map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={styles.linkRow}
              activeOpacity={0.85}
              onPress={() => handleOpenLink(value)}
            >
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkLabel}>{SOCIAL_LINK_LABELS[key] || key}</Text>
                <Text style={styles.linkValue} numberOfLines={1}>{value}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color="#f3c26b" />
            </TouchableOpacity>
          )) : (
            <Text style={styles.emptyText}>Người dùng chưa thêm liên kết hoạt động nào.</Text>
          )}
        </SectionCard>

        <SectionCard title="Hồ sơ âm nhạc" subtitle="Mô tả và các liên kết minh chứng">
          <DetailRow
            label="Mô tả hồ sơ"
            value={requestDetail?.portfolio?.description || 'Chưa bổ sung mô tả hoạt động âm nhạc'}
          />

          <View style={styles.listBlock}>
            <Text style={styles.listTitle}>Demo track</Text>
            {requestDetail?.portfolio?.demoTrackUrls?.length ? requestDetail.portfolio.demoTrackUrls.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.linkChip}
                activeOpacity={0.85}
                onPress={() => handleOpenLink(item)}
              >
                <Text style={styles.linkChipText} numberOfLines={1}>{item}</Text>
              </TouchableOpacity>
            )) : (
              <Text style={styles.emptyText}>Chưa có demo track.</Text>
            )}
          </View>

          <View style={styles.listBlock}>
            <Text style={styles.listTitle}>Liên kết âm nhạc</Text>
            {requestDetail?.portfolio?.musicLinks?.length ? requestDetail.portfolio.musicLinks.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.linkChip}
                activeOpacity={0.85}
                onPress={() => handleOpenLink(item)}
              >
                <Text style={styles.linkChipText} numberOfLines={1}>{item}</Text>
              </TouchableOpacity>
            )) : (
              <Text style={styles.emptyText}>Chưa có liên kết âm nhạc.</Text>
            )}
          </View>
        </SectionCard>

        <SectionCard title="Cam kết đã xác nhận" subtitle="Trạng thái các điều khoản người dùng đã tích">
          <DetailRow
            label="Điều khoản dành cho nghệ sĩ"
            value={requestDetail?.artistDeclaration?.acceptedTerms ? 'Đã đồng ý' : 'Chưa đồng ý'}
          />
          <DetailRow
            label="Cam kết bản quyền"
            value={requestDetail?.artistDeclaration?.copyrightCommitment ? 'Đã xác nhận' : 'Chưa xác nhận'}
          />
          <DetailRow
            label="Cam kết thông tin trung thực"
            value={requestDetail?.artistDeclaration?.truthfulInformationCommitment ? 'Đã xác nhận' : 'Chưa xác nhận'}
          />
          <DetailRow
            label="Thời điểm xác nhận"
            value={formatDateTime(requestDetail?.artistDeclaration?.acceptedAt)}
          />
        </SectionCard>

        <SectionCard title="Checklist xét duyệt" subtitle="Thông tin tham khảo từ quá trình kiểm tra">
          {CHECKLIST_LABELS.map((item) => {
            const isDone = Boolean(requestDetail?.review?.checklist?.[item.key]);
            const checklistIconName = isPendingReview
              ? 'remove-circle-outline'
              : isDone
                ? 'checkmark-circle'
                : 'close-circle';
            const checklistColor = isPendingReview
              ? '#9a9a9a'
              : isDone
                ? '#1ed760'
                : '#ff8f8f';
            const checklistText = isPendingReview ? 'Chờ xét duyệt' : isDone ? 'Đạt' : 'Chưa đạt';

            return (
              <View key={item.key} style={styles.checklistRow}>
                <View style={styles.checklistLabelWrap}>
                  <Ionicons
                    name={checklistIconName}
                    size={18}
                    color={checklistColor}
                  />
                  <Text style={styles.checklistLabel}>{item.label}</Text>
                </View>
                <Text style={[styles.checklistValue, { color: checklistColor }]}>
                  {checklistText}
                </Text>
              </View>
            );
          })}
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
    alignSelf: 'stretch',
  },
  loadingText: {
    marginTop: 8,
    color: '#b9b9b9',
    fontSize: 13,
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
  heroContent: {
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
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  heroText: {
    color: '#b9b9b9',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  heroMetaRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#252525',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#191919',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroMetaText: {
    flex: 1,
    textAlign: 'right',
    color: '#8f8f8f',
    fontSize: 12,
  },
  noticeCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  noticeDanger: {
    borderColor: '#5b2c2c',
    backgroundColor: '#1a1111',
  },
  noticeWarning: {
    borderColor: '#4d4123',
    backgroundColor: '#1a1610',
  },
  noticeTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  noticeText: {
    color: '#d1d1d1',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    gap: 4,
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
  },
  sectionCard: {
    backgroundColor: '#121212',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
    gap: 6,
  },
  detailLabel: {
    color: '#8f8f8f',
    fontSize: 12,
    fontWeight: '700',
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 21,
  },
  genreWrap: {
    paddingTop: 12,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#313131',
  },
  genreChipText: {
    color: '#f4f4f4',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyInlineText: {
    color: '#8f8f8f',
    fontSize: 13,
    marginTop: 8,
  },
  imageGrid: {
    marginTop: 14,
    gap: 12,
  },
  imageCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    backgroundColor: '#161616',
    padding: 12,
  },
  imageCardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#0c0c0c',
  },
  imagePlaceholder: {
    height: 180,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#242424',
    gap: 8,
  },
  imagePlaceholderText: {
    color: '#7d7d7d',
    fontSize: 12,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },
  linkTextWrap: {
    flex: 1,
    gap: 4,
  },
  linkLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  linkValue: {
    color: '#9d9d9d',
    fontSize: 12,
  },
  emptyText: {
    color: '#8f8f8f',
    fontSize: 13,
    lineHeight: 19,
  },
  listBlock: {
    marginTop: 14,
    gap: 8,
  },
  listTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  linkChip: {
    borderRadius: 12,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkChipText: {
    color: '#f3c26b',
    fontSize: 12,
    fontWeight: '700',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },
  checklistLabelWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checklistLabel: {
    color: '#f3f3f3',
    fontSize: 13,
    lineHeight: 19,
  },
  checklistValue: {
    fontSize: 12,
    fontWeight: '800',
  },
});
