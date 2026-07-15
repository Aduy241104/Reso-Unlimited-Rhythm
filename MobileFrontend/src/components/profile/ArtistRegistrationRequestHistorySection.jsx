import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDateLabel } from '../../utils/media';

const getStatusColor = (status) => {
  if (status === 'approved') {
    return '#1ed760';
  }

  if (status === 'rejected') {
    return '#ff9b9b';
  }

  return '#ffd166';
};

const getStatusSummary = (request) => {
  if (request?.status === 'approved') {
    return 'Yêu cầu đã được duyệt thành công.';
  }

  if (request?.status === 'rejected') {
    return 'Yêu cầu đã bị từ chối. Hãy mở chi tiết để xem thêm thông tin.';
  }

  return 'Yêu cầu đang chờ quản trị viên xem xét.';
};

const getReviewedLabel = (request) => {
  const reviewDate = request?.reviewedAt || request?.updatedAt;

  if (!reviewDate) {
    return '';
  }

  if (request?.status === 'pending') {
    return `Cập nhật ${formatDateLabel(reviewDate) || '--'}`;
  }

  return `Xử lý ${formatDateLabel(reviewDate) || '--'}`;
};

export default function ArtistRegistrationRequestHistorySection({ requests = [], onPressItem }) {
  if (!Array.isArray(requests) || requests.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>Lịch sử yêu cầu đăng ký</Text>
          <Text style={styles.sectionMeta}>Hiển thị {requests.length} yêu cầu trước đó</Text>
        </View>
        <View style={styles.sectionBadge}>
          <Ionicons name="albums-outline" size={14} color="#f3c26b" />
          <Text style={styles.sectionBadgeText}>{requests.length}</Text>
        </View>
      </View>

      {requests.map((request, index) => {
        const statusColor = getStatusColor(request.status);
        const reviewedLabel = getReviewedLabel(request);
        const isPressable = typeof onPressItem === 'function' && Boolean(request?.id);

        return (
          <TouchableOpacity
            key={request.id || `${request.status}-${index}`}
            style={styles.card}
            activeOpacity={0.88}
            disabled={!isPressable}
            onPress={() => onPressItem?.(request)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.cardTitle}>{request.stageName || 'Yêu cầu đăng ký nghệ sĩ'}</Text>
                <Text style={styles.cardDate}>Gửi ngày {formatDateLabel(request.createdAt) || '--'}</Text>
                {reviewedLabel ? <Text style={styles.cardDate}>{reviewedLabel}</Text> : null}
              </View>

              <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                  {request.statusLabel || 'Không xác định'}
                </Text>
              </View>
            </View>

            <Text style={styles.summaryText}>{getStatusSummary(request)}</Text>

            {request.rejectReason ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>Lý do từ chối</Text>
                <Text style={styles.noteText} numberOfLines={2}>{request.rejectReason}</Text>
              </View>
            ) : null}

            {isPressable ? (
              <View style={styles.footerRow}>
                <Text style={styles.footerHint}>Chạm để xem chi tiết hồ sơ</Text>
                <Ionicons name="chevron-forward" size={18} color="#f3c26b" />
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionMeta: {
    color: '#9a9a9a',
    fontSize: 12,
    marginTop: 4,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  sectionBadgeText: {
    color: '#f8ddaf',
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
    marginTop: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  cardDate: {
    color: '#9a9a9a',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryText: {
    color: '#d2d2d2',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  noteBox: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    padding: 12,
  },
  noteTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  noteText: {
    color: '#b5b5b5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  footerRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  footerHint: {
    color: '#f3c26b',
    fontSize: 12,
    fontWeight: '700',
  },
});
