import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import premiumService from '../../services/premiumService';
import { formatPremiumDate } from '../../utils/premium';

const SummaryRow = ({ label, value, emphasize = false }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, emphasize && styles.summaryValueEmphasize]}>{value}</Text>
  </View>
);

const getParamValue = (value) => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
};

const formatFailureReason = (reason) => {
  const normalizedReason = getParamValue(reason);

  if (!normalizedReason) {
    return 'Giao dịch VNPAY không thành công.';
  }

  const reasonMap = {
    invalid_signature: 'Chữ ký callback từ VNPAY không hợp lệ.',
    'Order not found': 'Không tìm thấy đơn thanh toán trên hệ thống.',
    'Invalid amount': 'Số tiền giao dịch không khớp với đơn thanh toán.',
    'Order already confirmed': 'Đơn thanh toán này đã được xác nhận trước đó.',
    'Confirm success': 'Giao dịch VNPAY đã được tiếp nhận nhưng chưa thành công.',
  };

  return reasonMap[normalizedReason] || normalizedReason;
};

export default function PremiumPaymentResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isSuccess = route.name === 'PremiumPaymentSuccess';
  const invoiceNumber = getParamValue(route.params?.invoiceNumber);
  const failureReason = useMemo(() => formatFailureReason(route.params?.reason), [route.params?.reason]);

  const loadSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const latestSubscription = await premiumService.getMySubscription();
      setSubscription(latestSubscription);
    } catch (error) {
      setErrorMessage(error?.message || 'Không thể tải trạng thái Premium lúc này.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const headline = isSuccess ? 'Thanh toán hoàn tất' : 'Thanh toán chưa thành công';
  const subtitle = isSuccess
    ? subscription?.isPremium && subscription?.premiumEndDate
      ? `Gói Premium của bạn đang hoạt động đến ${formatPremiumDate(subscription.premiumEndDate)}.`
      : 'Ứng dụng đã nhận callback từ VNPAY. Nếu trạng thái gói chưa đổi, hãy thử vào lại sau ít phút.'
    : failureReason;

  const primaryActionLabel = !isAuthenticated ? 'Đăng nhập lại' : 'Mở tổng quan Premium';
  const handlePrimaryAction = useCallback(() => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    navigation.navigate('PremiumOverview');
  }, [isAuthenticated, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('MainTabs')} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Trang chủ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Kết quả thanh toán
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <View style={[styles.heroCard, isSuccess ? styles.heroCardSuccess : styles.heroCardFailed]}>
          <Text style={[styles.heroBadge, isSuccess ? styles.heroBadgeSuccess : styles.heroBadgeFailed]}>
            {isSuccess ? 'VNPAY THÀNH CÔNG' : 'VNPAY THẤT BẠI'}
          </Text>
          <Text style={styles.heroTitle}>{headline}</Text>
          <Text style={styles.heroSubtitle}>{subtitle}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin giao dịch</Text>
          <View style={styles.panel}>
            <SummaryRow label="Mã đơn" value={invoiceNumber || 'Không có'} />
            <SummaryRow label="Trạng thái" value={isSuccess ? 'Thành công' : 'Thất bại'} emphasize />
            <SummaryRow
              label="Premium hiện tại"
              value={subscription?.isPremium ? 'Đang hoạt động' : isAuthenticated ? 'Chưa kích hoạt' : 'Chưa đăng nhập'}
            />
            <SummaryRow
              label="Hết hạn"
              value={subscription?.premiumEndDate ? formatPremiumDate(subscription.premiumEndDate) : 'Chưa có'}
            />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loaderBlock}>
            <AppLoader size="large" />
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.inlineError}>
            <ErrorState message={errorMessage} />
          </View>
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handlePrimaryAction} activeOpacity={0.84}>
            <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.82}
          >
            <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  backButton: {
    minWidth: 56,
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 56,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
  },
  heroCard: {
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
  },
  heroCardSuccess: {
    backgroundColor: '#101711',
    borderColor: '#1d6537',
  },
  heroCardFailed: {
    backgroundColor: '#171010',
    borderColor: '#5d2929',
  },
  heroBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroBadgeSuccess: {
    color: '#b8f0c8',
  },
  heroBadgeFailed: {
    color: '#f3b2b2',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 10,
  },
  heroSubtitle: {
    color: '#d0d0d0',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
  },
  panel: {
    borderRadius: 20,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#202020',
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1d1d1d',
    gap: 14,
  },
  summaryLabel: {
    color: '#8f8f8f',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValueEmphasize: {
    fontSize: 14,
    fontWeight: '900',
  },
  loaderBlock: {
    marginTop: 18,
    paddingVertical: 20,
  },
  inlineError: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#242424',
  },
  footer: {
    marginTop: 'auto',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
