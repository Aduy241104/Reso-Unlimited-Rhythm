import React, { useCallback, useMemo, useState } from 'react';
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

const DetailRow = ({ label, value, emphasize = false }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, emphasize && styles.detailValueEmphasize]}>{value}</Text>
  </View>
);

export default function PremiumPlanDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { planId, initialPlan } = route.params || {};
  const [plan, setPlan] = useState(initialPlan || null);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  const currentPlanId = useMemo(() => resolveCurrentPlanId(subscription), [subscription]);
  const isCurrentPlan = isSamePlan(plan?._id, currentPlanId) && Boolean(subscription?.isPremium);

  const loadDetail = useCallback(
    async (options = {}) => {
      if (!planId) {
        setErrorMessage('Không tìm thấy gói Premium cần xem.');
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
      } catch (error) {
        setErrorMessage(error?.message || 'Không thể tải chi tiết gói Premium lúc này.');
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
      loadDetail();
    }, [loadDetail])
  );

  const handleCheckout = useCallback(() => {
    if (!plan?._id) {
      return;
    }

    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    navigation.navigate('PremiumCheckout', {
      planId: plan._id,
      initialPlan: plan,
    });
  }, [isAuthenticated, navigation, plan]);

  const actionText = !isAuthenticated
    ? 'Đăng nhập để tiếp tục'
    : isCurrentPlan
      ? 'Gia hạn gói này'
      : 'Tiếp tục xác nhận';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0d" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết gói</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage && !plan ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={() => loadDetail()} activeOpacity={0.82}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadDetail({ refresh: true })} tintColor="#ffffff" />
          }
        >
          <View style={styles.summaryCard}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{isCurrentPlan ? 'Gói đang dùng' : 'Thông tin gói'}</Text>
            </View>
            <Text style={styles.planName}>{plan?.name || 'Premium'}</Text>
            <Text style={styles.planDescription}>
              {plan?.description || 'Gói Premium giúp bạn nghe nhạc không bị gián đoạn và mở khóa thêm tính năng.'}
            </Text>

            <View style={styles.pricePanel}>
              <Text style={styles.priceCaption}>Tổng thanh toán</Text>
              <Text style={styles.priceValue}>{formatPremiumPrice(plan?.totalPrice)}</Text>
              <Text style={styles.priceMeta}>
                {formatDurationDays(plan?.durationDays)} • Giá gói {formatPremiumPrice(plan?.price)} • VAT {formatPremiumPrice(plan?.taxAmount)}
              </Text>
            </View>

            {isCurrentPlan ? (
              <View style={styles.activeNotice}>
                <Text style={styles.activeNoticeTitle}>Gói này đang được kích hoạt</Text>
                <Text style={styles.activeNoticeText}>
                  Premium của bạn hiện có hiệu lực đến {formatPremiumDate(subscription?.premiumEndDate) || 'khi có cập nhật mới'}.
                </Text>
              </View>
            ) : null}
          </View>

          {warningMessage ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{warningMessage}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>
            <View style={styles.panel}>
              <DetailRow label="Tên gói" value={plan?.name || 'Premium'} />
              <DetailRow label="Thời hạn" value={formatDurationDays(plan?.durationDays)} />
              <DetailRow label="Giá gói" value={formatPremiumPrice(plan?.price)} />
              <DetailRow label="VAT" value={formatPremiumPrice(plan?.taxAmount)} />
              <DetailRow label="Tổng thanh toán" value={formatPremiumPrice(plan?.totalPrice)} emphasize />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quyền lợi bao gồm</Text>
            <View style={styles.panel}>
              {(Array.isArray(plan?.features) ? plan.features : []).map((featureCode) => (
                <View key={featureCode} style={styles.featureRow}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>{getPremiumFeatureLabel(featureCode)}</Text>
                </View>
              ))}
            </View>
          </View>

          {isAuthenticated ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trạng thái tài khoản</Text>
              <View style={styles.panel}>
                <DetailRow label="Premium hiện tại" value={subscription?.isPremium ? 'Đang hoạt động' : 'Chưa kích hoạt'} />
                <DetailRow
                  label="Gói hiện tại"
                  value={subscription?.currentPlan?.name || subscription?.activeSubscription?.plan?.name || 'Chưa có'}
                />
                <DetailRow
                  label="Hết hạn"
                  value={subscription?.premiumEndDate ? formatPremiumDate(subscription?.premiumEndDate) : 'Chưa có'}
                />
              </View>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.inlineError}>
              <ErrorState message={errorMessage} />
            </View>
          ) : null}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleCheckout} activeOpacity={0.84}>
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
  activeNotice: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#182019',
    borderWidth: 1,
    borderColor: '#304a35',
    gap: 6,
  },
  activeNoticeTitle: {
    color: '#e4f7e8',
    fontSize: 14,
    fontWeight: '700',
  },
  activeNoticeText: {
    color: '#c6dfcb',
    fontSize: 13,
    lineHeight: 19,
  },
  messageCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#1a1820',
    borderWidth: 1,
    borderColor: '#343040',
  },
  messageText: {
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#212129',
    gap: 14,
  },
  detailLabel: {
    color: '#a6a6b1',
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  detailValueEmphasize: {
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
  primaryButtonText: {
    color: '#181611',
    fontSize: 14,
    fontWeight: '800',
  },
});
