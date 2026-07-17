import React, { useCallback, useMemo, useState } from 'react';
import {
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
import AppButton from '../../components/common/AppButton';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import paymentService from '../../services/paymentService';

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

const formatDateTime = (value) => {
  if (!value) {
    return 'Không có';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Không có';
  }

  const pad = (number) => String(number).padStart(2, '0');

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

export default function PaymentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const initialPayment = route?.params?.payment || null;
  const paymentId = route?.params?.paymentId || initialPayment?._id || initialPayment?.id || '';
  const [paymentDetail, setPaymentDetail] = useState(initialPayment);
  const [isLoading, setIsLoading] = useState(Boolean(isAuthenticated && paymentId && !initialPayment));
  const [errorMessage, setErrorMessage] = useState('');

  const handleOpenLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const loadPaymentDetail = useCallback(async () => {
    if (!isAuthenticated) {
      setPaymentDetail(initialPayment);
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

    if (!paymentId) {
      setPaymentDetail(initialPayment);
      setErrorMessage('Không tìm thấy thông tin thanh toán.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const detail = await paymentService.getPaymentDetail(paymentId);

      if (!detail?.id && !detail?._id) {
        if (initialPayment) {
          setPaymentDetail(initialPayment);
          return;
        }

        setPaymentDetail(null);
        setErrorMessage('Không lấy được dữ liệu chi tiết thanh toán.');
        return;
      }

      setPaymentDetail((currentDetail) => ({
        ...(currentDetail || {}),
        ...detail,
      }));
    } catch (error) {
      if (!initialPayment) {
        setPaymentDetail(null);
        setErrorMessage(error?.message || 'Không thể tải chi tiết thanh toán lúc này.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [initialPayment, isAuthenticated, paymentId]);

  useFocusEffect(
    useCallback(() => {
      loadPaymentDetail();
    }, [loadPaymentDetail])
  );

  const status = useMemo(() => getMappedStatus(paymentDetail?.status), [paymentDetail?.status]);
  const packageDuration = useMemo(() => {
    const startDate = paymentDetail?.subscriptionStartDate;
    const endDate = paymentDetail?.subscriptionEndDate;

    if (startDate && endDate) {
      return `${formatDateTime(startDate)} - ${formatDateTime(endDate)}`;
    }

    if (endDate) {
      return `Đến ${formatDateTime(endDate)}`;
    }

    if (paymentDetail?.durationDays) {
      return `${paymentDetail.durationDays} ngày`;
    }

    return '';
  }, [paymentDetail?.durationDays, paymentDetail?.subscriptionEndDate, paymentDetail?.subscriptionStartDate]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết thanh toán</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!isAuthenticated ? (
        <View style={styles.centerState}>
          <Text style={styles.helperText}>Bạn cần đăng nhập để xem chi tiết thanh toán.</Text>
          <AppButton title="Đăng nhập" onPress={handleOpenLogin} style={styles.loginButton} />
        </View>
      ) : isLoading && !paymentDetail ? (
        <View style={styles.centerState}>
          <AppLoader size="large" color="#ffffff" />
        </View>
      ) : errorMessage && !paymentDetail ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={loadPaymentDetail} activeOpacity={0.82}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : !paymentDetail ? (
        <View style={styles.centerState}>
          <Text style={styles.helperText}>Không có dữ liệu chi tiết thanh toán.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.planName}>{paymentDetail?.planName || 'Premium'}</Text>
            <Text style={styles.amount}>{formatCurrency(paymentDetail?.amount)}</Text>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>
            <View style={styles.panel}>
              <DetailRow label="Tên gói Premium" value={paymentDetail?.planName || 'Premium'} />
              <DetailRow label="Giá tiền" value={formatCurrency(paymentDetail?.amount)} />
              <DetailRow label="Trạng thái thanh toán" value={status?.label} />
              <DetailRow label="Phương thức thanh toán" value={paymentDetail?.method || 'VNPay'} />
              <DetailRow label="Mã giao dịch" value={paymentDetail?.transactionId || 'Không có'} />
              {paymentDetail?.invoiceNumber ? <DetailRow label="Mã đơn hàng" value={paymentDetail?.invoiceNumber} /> : null}
              <DetailRow label="Ngày tạo" value={formatDateTime(paymentDetail?.createdAt)} />
              <DetailRow label="Ngày thanh toán" value={formatDateTime(paymentDetail?.paidAt)} />
              {packageDuration ? <DetailRow label="Thời hạn gói" value={packageDuration} /> : null}
              {paymentDetail?.content ? <DetailRow label="Nội dung thanh toán" value={paymentDetail?.content} /> : null}
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.inlineErrorWrap}>
              <Text style={styles.inlineErrorText}>{errorMessage}</Text>
            </View>
          ) : null}
        </ScrollView>
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
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  helperText: {
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
  scrollBody: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: '#212129',
    gap: 12,
  },
  planName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  amount: {
    color: '#f3f4f6',
    fontSize: 28,
    fontWeight: '800',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  panel: {
    borderRadius: 20,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: '#212129',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#212129',
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
  inlineErrorWrap: {
    paddingHorizontal: 4,
  },
  inlineErrorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },
});
