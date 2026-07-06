import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
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

  const handleDelete = useCallback((notification) => {
    const notificationId = getNotificationId(notification);

    if (!notificationId) {
      return;
    }

    Alert.alert('Xoa thong bao?', 'Thong bao nay se duoc an khoi danh sach cua ban.', [
      { text: 'Huy', style: 'cancel' },
      {
        text: 'Xoa',
        style: 'destructive',
        onPress: async () => {
          const previousNotifications = notifications;
          setNotifications((prev) =>
            prev.filter((item) => String(getNotificationId(item)) !== String(notificationId))
          );

          try {
            await notificationService.deleteNotification(notificationId);
          } catch (error) {
            setNotifications(previousNotifications);
          }
        },
      },
    ]);
  }, [notifications]);

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
            onPress={() => handleDelete(item)}
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
          <View>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>{getTypeMeta(detailTarget).label}</Text>
                <Text style={styles.modalTitle}>{detailTarget?.title || 'Thong bao'}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setDetailTarget(null)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalContent}>
              {detailTarget?.content || detailTarget?.targetName || 'Khong co noi dung chi tiet.'}
            </Text>

            <DetailRow label="Ten noi dung" value={detailTarget?.targetName} />
            <DetailRow label="Nghe si" value={detailTarget?.artistName} />
            <DetailRow label="Doi tuong" value={detailTarget?.targetType} />
            <DetailRow label="Thoi gian" value={formatDateTime(detailTarget?.createdAt)} />
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  modalEyebrow: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalContent: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 18,
    marginBottom: 12,
  },
  detailRow: {
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#2C2635',
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
});
