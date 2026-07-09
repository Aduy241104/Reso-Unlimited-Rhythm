import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
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
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import premiumService from '../../services/premiumService';
import {
  formatDurationDays,
  formatPremiumDate,
  formatPremiumPrice,
  getPremiumFeatureLabel,
  isSamePlan,
  resolveCurrentPlanId,
} from '../../utils/premium';

const CheckoutRow = ({ label, value, emphasize = false }) => (
  <View style={styles.checkoutRow}>
    <Text style={styles.checkoutLabel}>{label}</Text>
    <Text style={[styles.checkoutValue, emphasize && styles.checkoutValueEmphasize]}>{value}</Text>
  </View>
);

export default function PremiumCheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { planId, initialPlan } = route.params || {};
  const [plan, setPlan] = useState(initialPlan || null);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const pendingPaymentRef = useRef(false);
  const lastKnownPremiumEndDateRef = useRef('');

  const currentPlanId = useMemo(() => resolveCurrentPlanId(subscription), [subscription]);
  const isCurrentPlan = isSamePlan(plan?._id, currentPlanId) && Boolean(subscription?.isPremium);

  const loadCheckoutData = useCallback(
    async (options = {}) => {
      if (!planId) {
        setErrorMessage('Không tìm thấy gói Premium cần thanh toán.');
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
        const [planResult, subscriptionResult] = await Promise.allSettled([
          premiumService.getPremiumPlanDetail(planId),
          isAuthenticated ? premiumService.getMySubscription() : Promise.resolve(null),
        ]);

        if (planResult.status !== 'fulfilled') {
          throw planResult.reason;
        }

        const planDetail = planResult.value;
        const mySubscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null;

        setPlan(planDetail);
        setSubscription(mySubscription);
        setErrorMessage('');
        setWarningMessage(
          subscriptionResult.status === 'rejected'
            ? subscriptionResult.reason?.message || 'Không thể đồng bộ trạng thái Premium hiện tại.'
            : ''
        );
        lastKnownPremiumEndDateRef.current = mySubscription?.premiumEndDate || '';
      } catch (error) {
        setErrorMessage(error?.message || 'Không thể tải màn hình xác nhận thanh toán lúc này.');
        setWarningMessage('');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAuthenticated, planId]
  );

  useFocusEffect(
    useCallback(() => {
      loadCheckoutData();
    }, [loadCheckoutData])
  );

  useEffect(() => {
    const subscriptionListener = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active' || !pendingPaymentRef.current || !isAuthenticated) {
        return;
      }

      try {
        const latestSubscription = await premiumService.getMySubscription();
        const previousEndDate = lastKnownPremiumEndDateRef.current;
        const latestEndDate = latestSubscription?.premiumEndDate || '';

        setSubscription(latestSubscription);
        lastKnownPremiumEndDateRef.current = latestEndDate;

        if (latestSubscription?.isPremium && latestEndDate && latestEndDate !== previousEndDate) {
          setNoticeMessage('Trạng thái Premium đã được cập nhật. Nếu bạn vừa thanh toán xong, gói đã được gia hạn.');
          pendingPaymentRef.current = false;
          return;
        }

        setNoticeMessage('Nếu đã thanh toán xong mà trạng thái chưa đổi, hãy kéo để làm mới sau ít phút.');
      } catch (error) {
        setNoticeMessage('Chưa thể đồng bộ trạng thái Premium ngay lúc này. Bạn có thể thử lại sau.');
      }
    });

    return () => {
      subscriptionListener.remove();
    };
  }, [isAuthenticated]);

  const handleOpenLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const handleCreateOrder = useCallback(async () => {
    if (!plan?._id) {
      return;
    }

    if (!isAuthenticated) {
      handleOpenLogin();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await premiumService.createVnpayOrder(plan._id);

      if (!result?.paymentUrl) {
        throw new Error('Hệ thống chưa trả về đường dẫn thanh toán VNPAY.');
      }

      pendingPaymentRef.current = true;
      setNoticeMessage('Đã tạo đơn thanh toán. Sau khi hoàn tất trên VNPAY, hãy quay lại ứng dụng để kiểm tra trạng thái mới nhất.');
      await Linking.openURL(result.paymentUrl);
    } catch (error) {
      setErrorMessage(error?.message || 'Không thể tạo đơn thanh toán VNPAY lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  }, [handleOpenLogin, isAuthenticated, plan]);

  const actionText = !isAuthenticated
    ? 'Đăng nhập để tiếp tục'
    : isSubmitting
      ? 'Đang tạo đơn thanh toán...'
      ? 'Đang tạo đơn thanh toán...'
      : 'Thanh toán với VNPAY';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0d" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận thanh toán</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage && !plan ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={() => loadCheckoutData()} activeOpacity={0.82}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadCheckoutData({ refresh: true })}
              tintColor="#ffffff"
            />
          }
        >
          <View style={styles.summaryCard}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{isCurrentPlan ? 'Gia hạn gói' : 'Bước xác nhận'}</Text>
            </View>
            <Text style={styles.planName}>{plan?.name || 'Premium'}</Text>
            <Text style={styles.planDescription}>
              Kiểm tra lại thông tin gói trước khi chuyển sang cổng thanh toán VNPAY.
            </Text>

            <View style={styles.pricePanel}>
              <Text style={styles.priceCaption}>Tổng thanh toán</Text>
              <Text style={styles.priceValue}>{formatPremiumPrice(plan?.totalPrice)}</Text>
              <Text style={styles.priceMeta}>
                {formatDurationDays(plan?.durationDays)} • Giá gói {formatPremiumPrice(plan?.price)} • VAT {formatPremiumPrice(plan?.taxAmount)}
              </Text>
            </View>
          </View>

          {noticeMessage ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeText}>{noticeMessage}</Text>
            </View>
          ) : null}

          {warningMessage ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{warningMessage}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tóm tắt đơn hàng</Text>
            <View style={styles.panel}>
              <CheckoutRow label="Tên gói" value={plan?.name || 'Premium'} />
              <CheckoutRow label="Thời hạn" value={formatDurationDays(plan?.durationDays)} />
              <CheckoutRow label="Giá gói" value={formatPremiumPrice(plan?.price)} />
              <CheckoutRow label="VAT" value={formatPremiumPrice(plan?.taxAmount)} />
              <CheckoutRow label="Tổng thanh toán" value={formatPremiumPrice(plan?.totalPrice)} emphasize />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quyền lợi sẽ kích hoạt</Text>
            <View style={styles.panel}>
              {(Array.isArray(plan?.features) ? plan.features : []).map((featureCode) => (
                <View key={featureCode} style={styles.featureRow}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>{getPremiumFeatureLabel(featureCode)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tình trạng tài khoản</Text>
            <View style={styles.panel}>
              <CheckoutRow label="Đã đăng nhập" value={isAuthenticated ? 'Có' : 'Chưa'} />
              <CheckoutRow label="Premium hiện tại" value={subscription?.isPremium ? 'Đang hoạt động' : 'Chưa kích hoạt'} />
              <CheckoutRow
                label="Gói hiện tại"
                value={subscription?.currentPlan?.name || subscription?.activeSubscription?.plan?.name || 'Chưa có'}
              />
              <CheckoutRow
                label="Hết hạn"
                value={subscription?.premiumEndDate ? formatPremiumDate(subscription?.premiumEndDate) : 'Chưa có'}
                value={subscription?.premiumEndDate ? formatPremiumDate(subscription?.premiumEndDate) : 'Chưa có'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lưu ý thanh toán</Text>
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>Thanh toán được thực hiện trên cổng VNPAY do hệ thống cung cấp.</Text>
              <Text style={styles.noteText}>Sau khi thanh toán xong, hãy quay lại ứng dụng để đối chiếu trạng thái gói.</Text>
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>Thanh toán được thực hiện trên cổng VNPAY do hệ thống cung cấp.</Text>
              <Text style={styles.noteText}>Sau khi thanh toán xong, hãy quay lại ứng dụng để đối chiếu trạng thái gói.</Text>
              <Text style={styles.noteText}>Nếu bạn đang có Premium, thời gian còn lại sẽ được cộng dồn thay vì bị ghi đè.</Text>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.inlineError}>
              <ErrorState message={errorMessage} />
            </View>
          ) : null}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              onPress={handleCreateOrder}
              activeOpacity={0.84}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>{actionText}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1f',
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
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginHorizontal: 12,
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#212129',
    gap: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1c1c22',
    borderWidth: 1,
    borderColor: '#2e2e38',
  },
  badgeText: {
    color: '#d7d7df',
    fontSize: 11,
    fontWeight: '700',
  },
  planName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  planDescription: {
    color: '#b2b2bc',
    fontSize: 14,
    lineHeight: 20,
  },
  pricePanel: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#1a1a20',
    gap: 6,
  },
  priceCaption: {
    color: '#9999a5',
    fontSize: 12,
    fontWeight: '600',
  },
  priceValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  priceMeta: {
    color: '#a4a4ae',
    fontSize: 12,
    lineHeight: 18,
  },
  noticeCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#182019',
    borderWidth: 1,
    borderColor: '#304a35',
  },
  noticeText: {
    color: '#d9f0de',
    fontSize: 13,
    lineHeight: 19,
  },
  warningCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#1a1820',
    borderWidth: 1,
    borderColor: '#343040',
  },
  warningText: {
    color: '#d6d2e4',
    fontSize: 13,
    lineHeight: 19,
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
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#212129',
    overflow: 'hidden',
  },
  checkoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#212129',
    gap: 14,
  },
  checkoutLabel: {
    color: '#a6a6b1',
    fontSize: 13,
    fontWeight: '600',
  },
  checkoutValue: {
    flex: 1,
    textAlign: 'right',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  checkoutValueEmphasize: {
    fontSize: 15,
    fontWeight: '800',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#212129',
    gap: 10,
  },
  featureDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#f0c15d',
  },
  featureText: {
    flex: 1,
    color: '#f3f3f6',
    fontSize: 13,
    lineHeight: 19,
  },
  noteCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#212129',
    gap: 10,
  },
  noteText: {
    color: '#c9c9d1',
    fontSize: 13,
    lineHeight: 19,
  },
  inlineError: {
    borderRadius: 18,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#212129',
  },
  footer: {
    paddingTop: 4,
  },
  primaryButton: {
    backgroundColor: '#f0c15d',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#181611',
    fontSize: 14,
    fontWeight: '800',
  },
});
