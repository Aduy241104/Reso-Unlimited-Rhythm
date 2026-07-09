import React, { useCallback, useState } from 'react';
import {
  FlatList,
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
import AppButton from '../../components/common/AppButton';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import paymentService from '../../services/paymentService';

const FILTER_OPTIONS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'success', label: 'Thành công' },
  { key: 'pending', label: 'Đang xử lý' },
  { key: 'failed', label: 'Thất bại' },
];

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => {
  const amount = Number(value) || 0;

  try {
    return currencyFormatter.format(amount);
  } catch (error) {
    return `${amount.toLocaleString('vi-VN')} VND`;
  }
};

const formatPaymentDate = (value) => {
  if (!value) {
    return 'Chưa có';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Chưa có';
  }

  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (error) {
    return date.toLocaleString('vi-VN');
  }
};

const getMappedStatus = (value) => {
  const normalizedStatus = String(value || '').trim().toLowerCase();

  if (['success', 'completed', 'paid'].includes(normalizedStatus)) {
    return {
      label: 'Thành công',
      textColor: '#c8f4d2',
      backgroundColor: '#122116',
      borderColor: '#275a34',
    };
  }

  if (normalizedStatus === 'pending') {
    return {
      label: 'Đang xử lý',
      textColor: '#ffe3a8',
      backgroundColor: '#231b0d',
      borderColor: '#6e5420',
    };
  }

  if (['failed', 'cancelled'].includes(normalizedStatus)) {
    return {
      label: 'Thất bại',
      textColor: '#ffcccc',
      backgroundColor: '#251313',
      borderColor: '#683434',
    };
  }

  return {
    label: value || 'Không xác định',
    textColor: '#e5e7eb',
    backgroundColor: '#17171c',
    borderColor: '#2b2b33',
  };
};

const DetailRow = ({ label, value, valueStyle }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
  </View>
);

const PaymentHistoryItem = ({ item, onPress }) => {
  const status = getMappedStatus(item?.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.cardHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.planName}>{item?.planName || 'Premium'}</Text>
          <Text style={styles.amount}>{formatCurrency(item?.amount)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: status?.backgroundColor,
              borderColor: status?.borderColor,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: status?.textColor }]}>{status?.label}</Text>
        </View>
      </View>

      <View style={styles.detailGroup}>
        <DetailRow label="Phương thức" value={item?.method || 'VNPay'} />
        <DetailRow label="Ngày thanh toán" value={formatPaymentDate(item?.paidAt)} />
        {item?.transactionId ? <DetailRow label="Mã giao dịch" value={item?.transactionId} valueStyle={styles.monoText} /> : null}
      </View>
    </TouchableOpacity>
  );
};

export default function PaymentHistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(isAuthenticated));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleOpenLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const handleSelectStatus = useCallback((statusKey) => {
    setSelectedStatus((currentStatus) => (currentStatus === statusKey ? currentStatus : statusKey));
  }, []);

  const handleOpenPaymentDetail = useCallback(
    (item) => {
      const paymentId = item?._id || item?.id;

      if (!paymentId) {
        return;
      }

      const parentNavigation = navigation?.getParent?.();
      const canOpenFromParent = parentNavigation?.getState?.()?.routeNames?.includes('PaymentDetail');
      const targetNavigation = canOpenFromParent ? parentNavigation : navigation;

      if (typeof targetNavigation?.push === 'function') {
        targetNavigation.push('PaymentDetail', {
          paymentId,
          payment: item,
        });
        return;
      }

      targetNavigation?.navigate?.('PaymentDetail', {
        paymentId,
        payment: item,
      });
    },
    [navigation]
  );

  const loadPaymentHistory = useCallback(
    async (status = selectedStatus, options = {}) => {
      if (!isAuthenticated) {
        setPaymentHistory([]);
        setErrorMessage('');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const refresh = Boolean(options?.refresh);

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const history = await paymentService.getPaymentHistory(status);

        setPaymentHistory(Array.isArray(history) ? history : []);
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error?.message || 'Không thể tải lịch sử thanh toán lúc này.');
        setPaymentHistory([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAuthenticated, selectedStatus]
  );

  useFocusEffect(
    useCallback(() => {
      loadPaymentHistory(selectedStatus);
    }, [loadPaymentHistory, selectedStatus])
  );

  const renderItem = useCallback(
    ({ item }) => <PaymentHistoryItem item={item} onPress={() => handleOpenPaymentDetail(item)} />,
    [handleOpenPaymentDetail]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử thanh toán</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isAuthenticated ? (
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {FILTER_OPTIONS.map((option) => {
              const isActive = selectedStatus === option?.key;

              return (
                <TouchableOpacity
                  key={option?.key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => handleSelectStatus(option?.key)}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{option?.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {!isAuthenticated ? (
        <View style={styles.centerState}>
          <Text style={styles.unauthText}>Bạn cần đăng nhập để xem lịch sử thanh toán.</Text>
          <AppButton title="Đăng nhập" onPress={handleOpenLogin} style={styles.loginButton} />
        </View>
      ) : isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" color="#ffffff" />
        </View>
      ) : errorMessage && paymentHistory.length === 0 ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={() => loadPaymentHistory(selectedStatus)} activeOpacity={0.82}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={paymentHistory}
          keyExtractor={(item) => item?._id || item?.id || `${item?.transactionId || 'payment'}-${item?.paidAt || 'unknown'}`}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            paymentHistory.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadPaymentHistory(selectedStatus, { refresh: true })}
              tintColor="#ffffff"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Không có giao dịch phù hợp.</Text>
            </View>
          }
        />
      )}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  backButton: {
    minWidth: 72,
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 72,
  },
  filterSection: {
    paddingTop: 16,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d33',
    backgroundColor: '#111113',
  },
  filterChipActive: {
    borderColor: '#f0c15d',
    backgroundColor: '#2f2410',
  },
  filterChipText: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#f8d98b',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  unauthText: {
    color: '#d4d4d8',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  loginButton: {
    minWidth: 180,
    marginTop: 18,
    backgroundColor: '#f0c15d',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2d2d33',
    backgroundColor: '#17171c',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    gap: 14,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyStateText: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: '#212129',
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    gap: 8,
  },
  planName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  amount: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailGroup: {
    paddingTop: 2,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  detailLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  monoText: {
    color: '#d4d4d8',
  },
});
