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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import EmptyState from '../../components/common/EmptyState';
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

const PremiumSectionTitle = ({ eyebrow, title, subtitle }) => (
  <View style={styles.sectionHeading}>
    {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
  </View>
);

const PremiumPlanCard = ({ plan, isActive, onPress }) => {
  const featurePreview = Array.isArray(plan?.features) ? plan.features.slice(0, 3) : [];

  return (
    <TouchableOpacity
      style={[styles.planCard, isActive && styles.planCardActive]}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View style={styles.planCardTopRow}>
        <View style={styles.planChip}>
          <Text style={styles.planChipText}>{formatDurationDays(plan?.durationDays)}</Text>
        </View>
        {isActive ? (
          <View style={[styles.planChip, styles.activeChip]}>
            <Text style={styles.activeChipText}>Đang sử dụng</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.planName}>{plan?.name || 'Premium'}</Text>
      <Text style={styles.planDescription} numberOfLines={3}>
        {plan?.description || 'Mở khóa đầy đủ trải nghiệm Premium cho tài khoản của bạn.'}
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.planPrice}>{formatPremiumPrice(plan?.price)}</Text>
        <Text style={styles.totalPriceText}>Tổng thanh toán {formatPremiumPrice(plan?.totalPrice)}</Text>
      </View>

      <View style={styles.featureWrap}>
        {featurePreview.map((featureCode) => (
          <View key={featureCode} style={styles.featurePill}>
            <Text style={styles.featurePillText}>{getPremiumFeatureLabel(featureCode)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.planCardFooter}>
        <Text style={styles.taxText}>Đã gồm VAT {formatPremiumPrice(plan?.taxAmount)}</Text>
        <Text style={styles.linkText}>Xem chi tiết</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function PremiumOverviewScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  const activePlanId = useMemo(() => resolveCurrentPlanId(subscription), [subscription]);

  const loadPremiumData = useCallback(
    async (options = {}) => {
      const refresh = Boolean(options?.refresh);

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [planResult, subscriptionResult] = await Promise.allSettled([
          premiumService.getPremiumPlans(),
          isAuthenticated ? premiumService.getMySubscription() : Promise.resolve(null),
        ]);

        if (planResult.status !== 'fulfilled') {
          throw planResult.reason;
        }

        const planList = planResult.value;
        const mySubscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null;

        setPlans(planList);
        setSubscription(mySubscription);
        setErrorMessage('');
        setWarningMessage(
          subscriptionResult.status === 'rejected'
            ? subscriptionResult.reason?.message || 'Không thể đồng bộ trạng thái Premium hiện tại.'
            : ''
        );
      } catch (error) {
        setErrorMessage(error?.message || 'Không thể tải danh sách Premium lúc này.');
        setWarningMessage('');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAuthenticated]
  );

  useFocusEffect(
    useCallback(() => {
      loadPremiumData();
    }, [loadPremiumData])
  );

  const openStackScreen = useCallback(
    (screenName, params) => {
      const parentNavigation = navigation.getParent();

      if (parentNavigation) {
        parentNavigation.navigate(screenName, params);
        return;
      }

      navigation.navigate(screenName, params);
    },
    [navigation]
  );

  const handleOpenPlanDetail = useCallback(
    (plan) => {
      if (!plan?._id) {
        return;
      }

      openStackScreen('PremiumPlanDetail', {
        planId: plan._id,
        initialPlan: plan,
      });
    },
    [openStackScreen]
  );

  const handlePrimaryAction = useCallback(() => {
    if (!isAuthenticated) {
      openStackScreen('Login');
      return;
    }

    const primaryPlan =
      plans.find((item) => isSamePlan(item?._id, activePlanId)) ||
      plans[0] ||
      null;

    if (!primaryPlan) {
      return;
    }

    handleOpenPlanDetail(primaryPlan);
  }, [activePlanId, handleOpenPlanDetail, isAuthenticated, openStackScreen, plans]);

  const summaryTitle = subscription?.isPremium
    ? `Premium đang hoạt động đến ${formatPremiumDate(subscription?.premiumEndDate)}`
    : 'Mở khóa Premium để nghe nhạc không giới hạn';
  const summarySubtitle = subscription?.isPremium
    ? `Gói hiện tại: ${subscription?.currentPlan?.name || subscription?.activeSubscription?.plan?.name || 'Premium'}`
    : 'Xem danh sách gói, chi tiết từng gói và xác nhận mua ngay trong app.';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerEyebrow}>RESO PREMIUM</Text>
          <Text style={styles.headerTitle}>Chọn gói phù hợp</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={handlePrimaryAction} activeOpacity={0.78}>
          <Text style={styles.headerActionText}>{isAuthenticated ? 'Xem gói' : 'Đăng nhập'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage && plans.length === 0 ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} onPress={() => loadPremiumData()} activeOpacity={0.82}>
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
              onRefresh={() => loadPremiumData({ refresh: true })}
              tintColor="#ffffff"
            />
          }
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroBadge}>{subscription?.isPremium ? 'PREMIUM ĐANG HOẠT ĐỘNG' : 'TRUY CẬP PREMIUM'}</Text>
            <Text style={styles.heroTitle}>{summaryTitle}</Text>
            <Text style={styles.heroSubtitle}>{summarySubtitle}</Text>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaCard}>
                <Text style={styles.heroMetaLabel}>Trạng thái</Text>
                <Text style={styles.heroMetaValue}>
                  {subscription?.isPremium ? 'Đang Premium' : isAuthenticated ? 'Chưa nâng cấp' : 'Khách'}
                </Text>
              </View>
              <View style={styles.heroMetaCard}>
                <Text style={styles.heroMetaLabel}>Gói đang xem</Text>
                <Text style={styles.heroMetaValue}>{plans.length} gói</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <PremiumSectionTitle
              eyebrow="DANH SÁCH GÓI"
              title="Các gói Premium hiện có"
              subtitle="Nhấn vào từng gói để xem đầy đủ quyền lợi và xác nhận mua."
            />

            {warningMessage ? (
              <View style={styles.inlineState}>
                <ErrorState message={warningMessage} />
              </View>
            ) : plans.length === 0 ? (
              <View style={styles.inlineState}>
                <EmptyState />
              </View>
            ) : (
              plans.map((plan) => (
                <PremiumPlanCard
                  key={plan._id}
                  plan={plan}
                  isActive={isSamePlan(plan?._id, activePlanId) && Boolean(subscription?.isPremium)}
                  onPress={() => handleOpenPlanDetail(plan)}
                />
              ))
            )}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
    backgroundColor: '#000000',
  },
  headerEyebrow: {
    color: '#9a9a9a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  headerAction: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  headerActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
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
    paddingBottom: 36,
  },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  heroBadge: {
    color: '#a8f0cc',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: 10,
  },
  heroSubtitle: {
    color: '#b3b3b3',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  heroMetaCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#242424',
  },
  heroMetaLabel: {
    color: '#8f8f8f',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroMetaValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionHeading: {
    marginBottom: 14,
  },
  sectionEyebrow: {
    color: '#7f7f7f',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  sectionSubtitle: {
    color: '#9d9d9d',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  inlineState: {
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#202020',
  },
  planCard: {
    marginBottom: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#232323',
  },
  planCardActive: {
    borderColor: '#1db954',
    backgroundColor: '#111612',
  },
  planCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  planChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  planChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  activeChip: {
    backgroundColor: '#15351f',
    borderColor: '#1d7d43',
  },
  activeChipText: {
    color: '#95efb5',
    fontSize: 11,
    fontWeight: '700',
  },
  planName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 14,
  },
  planDescription: {
    color: '#a8a8a8',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  priceRow: {
    marginTop: 18,
  },
  planPrice: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  totalPriceText: {
    color: '#8e8e8e',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  featureWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  featurePill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  featurePillText: {
    color: '#f0f0f0',
    fontSize: 11,
    fontWeight: '600',
  },
  planCardFooter: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  taxText: {
    color: '#8d8d8d',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  linkText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
