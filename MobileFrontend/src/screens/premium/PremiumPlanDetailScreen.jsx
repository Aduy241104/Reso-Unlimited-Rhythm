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

const SummaryRow = ({ label, value, valueStyle }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, valueStyle]}>{value}</Text>
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

  const currentPlanId = useMemo(() => resolveCurrentPlanId(subscription), [subscription]);
  const isCurrentPlan = isSamePlan(plan?._id, currentPlanId) && Boolean(subscription?.isPremium);

  const loadDetail = useCallback(
    async (options = {}) => {
      if (!planId) {
        setErrorMessage('Khong tim thay goi Premium can xem.');
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
        setErrorMessage(
          subscriptionResult.status === 'rejected'
            ? subscriptionResult.reason?.message || 'Khong the dong bo trang thai Premium hien tai.'
            : ''
        );
      } catch (error) {
        setErrorMessage(error?.message || 'Khong the tai chi tiet goi Premium luc nay.');
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
    ? 'Dang nhap de mua goi'
    : isCurrentPlan
      ? 'Gia han goi nay'
      : 'Xac nhan mua goi';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {plan?.name || 'Chi tiet Premium'}
        </Text>
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
            <Text style={styles.retryButtonText}>Thu lai</Text>
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
          <View style={styles.heroCard}>
            <Text style={styles.heroBadge}>{isCurrentPlan ? 'DANG HOAT DONG' : 'PREMIUM PLAN'}</Text>
            <Text style={styles.heroTitle}>{plan?.name || 'Premium'}</Text>
            <Text style={styles.heroSubtitle}>
              {plan?.description || 'Goi Premium giup ban nghe nhac khong bi gian doan va mo khoa them tinh nang.'}
            </Text>

            <View style={styles.pricePanel}>
              <Text style={styles.heroPrice}>{formatPremiumPrice(plan?.price)}</Text>
              <Text style={styles.heroPriceCaption}>
                Tong thanh toan {formatPremiumPrice(plan?.totalPrice)} trong {formatDurationDays(plan?.durationDays)}
              </Text>
            </View>

            {isCurrentPlan ? (
              <View style={styles.statusPanel}>
                <Text style={styles.statusTitle}>Goi nay dang la goi hien tai cua ban</Text>
                <Text style={styles.statusSubtitle}>
                  Premium duoc kich hoat den {formatPremiumDate(subscription?.premiumEndDate)}.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thong tin thanh toan</Text>
            <View style={styles.panel}>
              <SummaryRow label="Gia goi" value={formatPremiumPrice(plan?.price)} />
              <SummaryRow label="VAT" value={formatPremiumPrice(plan?.taxAmount)} />
              <SummaryRow
                label="Tong thanh toan"
                value={formatPremiumPrice(plan?.totalPrice)}
                valueStyle={styles.summaryValueStrong}
              />
              <SummaryRow label="Thoi han" value={formatDurationDays(plan?.durationDays)} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quyen loi bao gom</Text>
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
              <Text style={styles.sectionTitle}>Trang thai tai khoan</Text>
              <View style={styles.panel}>
                <SummaryRow label="Premium" value={subscription?.isPremium ? 'Dang bat' : 'Chua kich hoat'} />
                <SummaryRow
                  label="Goi hien tai"
                  value={subscription?.currentPlan?.name || subscription?.activeSubscription?.plan?.name || 'Chua co'}
                />
                <SummaryRow
                  label="Het han"
                  value={subscription?.premiumEndDate ? formatPremiumDate(subscription.premiumEndDate) : 'Chua co'}
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    backgroundColor: '#121212',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollBody: {
    paddingBottom: 34,
  },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  heroBadge: {
    color: '#96e8b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 29,
    fontWeight: '900',
    marginTop: 10,
  },
  heroSubtitle: {
    color: '#b5b5b5',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  pricePanel: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#252525',
  },
  heroPrice: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
  },
  heroPriceCaption: {
    color: '#9e9e9e',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  statusPanel: {
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#122016',
    borderWidth: 1,
    borderColor: '#1c5d34',
  },
  statusTitle: {
    color: '#dffbe8',
    fontSize: 14,
    fontWeight: '800',
  },
  statusSubtitle: {
    color: '#b0d9bd',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
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
  summaryValueStrong: {
    fontSize: 15,
    fontWeight: '900',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1d1d1d',
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#1db954',
  },
  featureText: {
    flex: 1,
    color: '#f0f0f0',
    fontSize: 13,
    lineHeight: 19,
  },
  inlineError: {
    marginTop: 18,
    marginHorizontal: 20,
    borderRadius: 18,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#242424',
  },
  footer: {
    marginTop: 28,
    paddingHorizontal: 20,
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
});
