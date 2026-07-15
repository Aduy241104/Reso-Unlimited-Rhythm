import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/common/AppHeader';
import AppLoader from '../../components/common/AppLoader';
import AppModal from '../../components/common/AppModal';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import notificationService from '../../services/notificationService';
import theme from '../../theme';
import { resolveImageUri } from '../../utils/media';

const PAGE_SIZE = 10;

const getNotificationId = (notification) => notification?._id || notification?.id;

const getTargetId = (notification) => {
  const targetId = notification?.targetId;

  if (!targetId) {
    return '';
  }

  if (typeof targetId === 'string') {
    return targetId;
  }

  return String(targetId?._id || targetId?.id || targetId || '');
};

const getRelativeTime = (value) => {
  if (!value) {
    return '';
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) {
    return 'Vua xong';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} phut truoc`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} gio truoc`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays} ngay truoc`;
  }

  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getTypeMeta = (notification = {}) => {
  if (notification.type === 'new_release' && notification.targetType === 'artist') {
    return { label: 'Sap phat hanh', icon: 'person-outline', color: '#a78bfa', backgroundColor: 'rgba(167, 139, 250, 0.14)' };
  }

  switch (notification.type) {
    case 'new_release':
      return { label: 'Bai hat moi', icon: 'musical-notes-outline', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.14)' };
    case 'artist_update':
    case 'follow':
      return { label: 'Nghe si', icon: 'person-outline', color: '#a78bfa', backgroundColor: 'rgba(167, 139, 250, 0.14)' };
    case 'payment':
      return { label: 'Thanh toan', icon: 'card-outline', color: '#2dd4bf', backgroundColor: 'rgba(45, 212, 191, 0.14)' };
    case 'subscription':
      return { label: 'Goi cuoc', icon: 'diamond-outline', color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.14)' };
    case 'report':
      return { label: 'Bao cao', icon: 'shield-alert-outline', color: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.14)' };
    case 'system':
      return { label: 'He thong', icon: 'megaphone-outline', color: '#60a5fa', backgroundColor: 'rgba(96, 165, 250, 0.14)' };
    default:
      return { label: 'Thong bao', icon: 'chatbubble-ellipses-outline', color: '#d1d5db', backgroundColor: 'rgba(255, 255, 255, 0.08)' };
  }
};

const mergeNotifications = (current = [], next = []) => {
  const map = new Map();

  [...current, ...next].forEach((notification) => {
    const id = getNotificationId(notification);

    if (id) {
      map.set(String(id), notification);
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a?.createdAt || 0).getTime();
    const timeB = new Date(b?.createdAt || 0).getTime();

    return timeB - timeA;
  });
};

const NotificationIcon = ({ notification }) => {
  const typeMeta = getTypeMeta(notification);
  const thumbnail = resolveImageUri(notification?.thumbnail);

  if (thumbnail) {
    return <Image source={{ uri: thumbnail }} style={styles.thumbnail} resizeMode="cover" />;
  }

  return (
    <View style={[styles.iconWrap, { backgroundColor: typeMeta.backgroundColor }]}>
      <Ionicons name={typeMeta.icon} size={22} color={typeMeta.color} />
    </View>
  );
};

const DetailRow = ({ label, value }) => {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{String(value)}</Text>
    </View>
  );
};

const DetailArtwork = ({ notification }) => {
  const typeMeta = getTypeMeta(notification);
  const thumbnail = resolveImageUri(notification?.thumbnail);

  if (thumbnail) {
    return <Image source={{ uri: thumbnail }} style={styles.detailArtworkImage} resizeMode="cover" />;
  }

  return (
    <View style={[styles.detailArtworkFallback, { backgroundColor: typeMeta.backgroundColor }]}>
      <Ionicons name={typeMeta.icon} size={30} color={typeMeta.color} />
    </View>
  );
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [detailTarget, setDetailTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const hasMore = useMemo(() => {
    if (!meta) {
      return false;
    }

    return page < Number(meta.totalPages || 0);
  }, [meta, page]);

  const loadNotifications = useCallback(async (nextPage = 1, options = {}) => {
    const isRefresh = Boolean(options.refresh);
    const isLoadMore = Boolean(options.loadMore);

    if (!isAuthenticated) {
      setNotifications([]);
      setMeta(null);
      setIsLoading(false);
      return;
    }

    if (isRefresh) {
      setIsRefreshing(true);
    } else if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await notificationService.getMyNotifications({
        page: nextPage,
        limit: PAGE_SIZE,
      });

      setNotifications((prev) =>
        isLoadMore ? mergeNotifications(prev, result.notifications) : result.notifications
      );
      setMeta(result.meta);
      setPage(nextPage);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error?.message || 'Khong the tai thong bao.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  const updateReadState = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((item) =>
        String(getNotificationId(item)) === String(notificationId)
          ? { ...item, isRead: true }
          : item
      )
    );
  }, []);

  const markAsRead = useCallback(async (notification) => {
    const notificationId = getNotificationId(notification);

    if (!notificationId || notification?.isRead) {
      return;
    }

    updateReadState(notificationId);

    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      loadNotifications(1);
    }
  }, [loadNotifications, updateReadState]);

  const navigateToTarget = useCallback((notification) => {
    const targetId = getTargetId(notification);
    const targetType = notification?.targetType;

    if (
      notification?.type === 'artist_update' ||
      (notification?.type === 'new_release' && targetType === 'artist')
    ) {
      const artistId =
        notification?.artistId?._id ||
        notification?.artistId?.id ||
        notification?.artistId ||
        targetId;

      if (artistId) {
        navigation.navigate('EntityDetail', {
          entityType: 'artist',
          entityId: String(artistId),
          initialTitle: notification?.artistName || notification?.targetName || 'Artist Detail',
        });
        return true;
      }
    }

    if (!targetId || !targetType) {
      return false;
    }

    if (['track', 'artist', 'playlist', 'album'].includes(targetType)) {
      navigation.navigate('EntityDetail', {
        entityType: targetType,
        entityId: targetId,
        initialTitle: notification?.targetName || notification?.title || 'Detail',
      });
      return true;
    }

    return false;
  }, [navigation]);

  const handlePressNotification = useCallback(async (notification) => {
    await markAsRead(notification);

    if (!navigateToTarget(notification)) {
      setDetailTarget({ ...notification, isRead: true });
    }
  }, [markAsRead, navigateToTarget]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    const notificationId = getNotificationId(deleteTarget);

    if (!notificationId) {
      setDeleteTarget(null);
      return;
    }

    const previousNotifications = notifications;
    setDeleteTarget(null);
    setNotifications((prev) =>
      prev.filter((item) => String(getNotificationId(item)) !== String(notificationId))
    );

    try {
      await notificationService.deleteNotification(notificationId);
    } catch (error) {
      setNotifications(previousNotifications);
    }
  }, [deleteTarget, notifications]);

  const openDeleteConfirm = useCallback((notification) => {
    const notificationId = getNotificationId(notification);

    if (!notificationId) {
      return;
    }

    setDeleteTarget(notification);
  }, []);

  const renderItem = ({ item }) => {
    const typeMeta = getTypeMeta(item);
    const subtitle = item?.targetName || item?.content || 'Chi tiet thong bao';

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item?.isRead && styles.notificationItemUnread]}
        activeOpacity={0.82}
        onPress={() => handlePressNotification(item)}
      >
        <NotificationIcon notification={item} />

        <View style={styles.notificationBody}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item?.title || 'Thong bao'}
          </Text>
          <Text style={styles.notificationSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>{typeMeta.label}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText} numberOfLines={1}>{getRelativeTime(item?.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.trailingActions}>
          {!item?.isRead ? <View style={styles.unreadDot} /> : null}
          <TouchableOpacity
            style={styles.deleteButton}
            activeOpacity={0.75}
            onPress={() => openDeleteConfirm(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) {
      return null;
    }

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return null;
    }

    if (!isAuthenticated) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={34} color="#6B7280" />
          <Text style={styles.emptyTitle}>Can dang nhap</Text>
          <Text style={styles.emptyText}>Dang nhap de xem thong bao cua ban.</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="radio-outline" size={34} color="#6B7280" />
        <Text style={styles.emptyTitle}>Chua co thong bao</Text>
        <Text style={styles.emptyText}>Thong bao tu he thong va nghe si se xuat hien o day.</Text>
      </View>
    );
  };

  const handleEndReached = () => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) {
      return;
    }

    loadNotifications(page + 1, { loadMore: true });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Notifications" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" color="#ffffff" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={() => loadNotifications(1)}>
            <Text style={styles.retryButtonText}>Thu lai</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, index) => String(getNotificationId(item) || `notification-${index}`)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadNotifications(1, { refresh: true })}
              tintColor="#ffffff"
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.25}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AppModal visible={Boolean(detailTarget)} onClose={() => setDetailTarget(null)} position="bottom">
        {detailTarget ? (
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <DetailArtwork notification={detailTarget} />

              <View style={styles.modalHeading}>
                <View style={styles.modalMetaLine}>
                  <View
                    style={[
                      styles.modalTypePill,
                      { backgroundColor: getTypeMeta(detailTarget).backgroundColor },
                    ]}
                  >
                    <Text style={[styles.modalTypeText, { color: getTypeMeta(detailTarget).color }]}>
                      {getTypeMeta(detailTarget).label}
                    </Text>
                  </View>
                  <Text style={styles.modalTimeText}>{getRelativeTime(detailTarget?.createdAt)}</Text>
                </View>

                <Text style={styles.modalTitle}>{detailTarget?.title || 'Thong bao'}</Text>
                {detailTarget?.targetName ? (
                  <Text style={styles.modalSubtitle} numberOfLines={2}>
                    {detailTarget.targetName}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setDetailTarget(null)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContentCard}>
              <Text style={styles.modalSectionLabel}>Noi dung</Text>
              <Text style={styles.modalContent}>
                {detailTarget?.content || detailTarget?.targetName || 'Khong co noi dung chi tiet.'}
              </Text>
            </View>

            <View style={styles.detailGrid}>
              <DetailRow label="Trang thai" value={detailTarget?.isRead ? 'Da doc' : 'Chua doc'} />
              <DetailRow label="Nguon gui" value={detailTarget?.sourceType} />
              <DetailRow label="Nguoi nhan" value={detailTarget?.receiverType} />
              <DetailRow label="Doi tuong" value={detailTarget?.targetType} />
              <DetailRow label="Ten noi dung" value={detailTarget?.targetName} />
              <DetailRow label="Nghe si" value={detailTarget?.artistName} />
              <DetailRow label="Thoi gian" value={formatDateTime(detailTarget?.createdAt)} />
            </View>

            {getTargetId(detailTarget) ? (
              <TouchableOpacity
                style={styles.openTargetButton}
                activeOpacity={0.82}
                onPress={() => {
                  const notification = detailTarget;
                  setDetailTarget(null);
                  navigateToTarget(notification);
                }}
              >
                <Ionicons name="open-outline" size={18} color="#000000" />
                <Text style={styles.openTargetButtonText}>Mo noi dung</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        ) : null}
      </AppModal>

      <AppModal visible={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} position="center">
        {deleteTarget ? (
          <View style={styles.deleteModal}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="trash-outline" size={26} color="#f87171" />
            </View>

            <Text style={styles.deleteTitle}>Xoa thong bao?</Text>
            <Text style={styles.deleteMessage}>
              Thong bao nay se duoc an khoi danh sach cua ban. Hanh dong nay chi ap dung cho tai khoan hien tai.
            </Text>

            <View style={styles.deletePreview}>
              <Text style={styles.deletePreviewTitle} numberOfLines={1}>
                {deleteTarget?.title || 'Thong bao'}
              </Text>
              <Text style={styles.deletePreviewText} numberOfLines={2}>
                {deleteTarget?.targetName || deleteTarget?.content || 'Chi tiet thong bao'}
              </Text>
            </View>

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteActionButton, styles.cancelDeleteButton]}
                activeOpacity={0.82}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.cancelDeleteText}>Huy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteActionButton, styles.confirmDeleteButton]}
                activeOpacity={0.82}
                onPress={handleDelete}
              >
                <Text style={styles.confirmDeleteText}>Xoa</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(167, 139, 250, 0.24)',
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#202020',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  notificationTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  notificationSubtitle: {
    color: '#d1d5db',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    maxWidth: 120,
    color: '#8f8f8f',
    fontSize: 11,
    fontWeight: '600',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#6b7280',
    marginHorizontal: 7,
  },
  trailingActions: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.primaryLight,
    marginBottom: 10,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerLoader: {
    paddingVertical: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  loginButton: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  retryButtonText: {
    color: '#000000',
    fontWeight: '800',
  },
  modalScroll: {
    maxHeight: 560,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#4b5563',
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailArtworkImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#202020',
  },
  detailArtworkFallback: {
    width: 68,
    height: 68,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeading: {
    flex: 1,
    minWidth: 0,
  },
  modalMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalTypePill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  modalTypeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalTimeText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
    marginTop: 8,
  },
  modalSubtitle: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalContentCard: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#121116',
    borderWidth: 1,
    borderColor: '#2C2635',
  },
  modalSectionLabel: {
    color: '#8f8f8f',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalContent: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  detailGrid: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2C2635',
  },
  detailRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2635',
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
  },
  detailLabel: {
    color: '#8f8f8f',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  openTargetButton: {
    height: 48,
    borderRadius: 999,
    marginTop: 18,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  openTargetButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  deleteModal: {
    alignItems: 'center',
  },
  deleteIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.24)',
  },
  deleteTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 16,
  },
  deleteMessage: {
    color: '#b9bec8',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  deletePreview: {
    alignSelf: 'stretch',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#121116',
    borderWidth: 1,
    borderColor: '#2C2635',
  },
  deletePreviewTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  deletePreviewText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  deleteActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  deleteActionButton: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDeleteButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: '#2C2635',
  },
  confirmDeleteButton: {
    backgroundColor: '#ffffff',
  },
  cancelDeleteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  confirmDeleteText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
});
