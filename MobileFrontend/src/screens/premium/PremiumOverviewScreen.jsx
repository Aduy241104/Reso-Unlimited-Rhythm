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

const SummaryItem = ({ label, value }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const SectionHeader = ({ title, subtitle }) => (
  <View style={styles.sectionHeader}>
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
      <View style={styles.planHeaderRow}>
        <View style={styles.planTitleWrap}>
          <Text style={styles.planName}>{plan?.name || 'Premium'}</Text>
          <Text style={styles.planDuration}>{formatDurationDays(plan?.durationDays)}</Text>
        </View>
        {isActive ? (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Đang sử dụng</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.planDescription} numberOfLines={2}>
        {plan?.description || 'Mở khóa trải nghiệm nghe nhạc trọn vẹn cho tài khoản của bạn.'}
      </Text>

      <View style={styles.priceBlock}>
        <Text style={styles.priceCaption}>Tổng thanh toán</Text>
        <Text style={styles.planPrice}>{formatPremiumPrice(plan?.totalPrice)}</Text>
        <Text style={styles.priceMeta}>
          Giá gói {formatPremiumPrice(plan?.price)} • VAT {formatPremiumPrice(plan?.taxAmount)}
        </Text>
      </View>

      {featurePreview.length > 0 ? (
        <View style={styles.featureList}>
          {featurePreview.map((featureCode) => (
            <View key={featureCode} style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{getPremiumFeatureLabel(featureCode)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.planAction}>Xem chi tiết</Text>
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
        setErrorMessage(error?.message || 'Không thể tải danh sách gói Premium lúc này.');
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
    ? `Premium đang hoạt động đến ${formatPremiumDate(subscription?.premiumEndDate) || 'khi có cập nhật mới'}`
    : 'Chọn gói Premium phù hợp với bạn';
  const summarySubtitle = subscription?.isPremium
    ? `Gói hiện tại: ${subscription?.currentPlan?.name || subscription?.activeSubscription?.plan?.name || 'Premium'}`
    : 'Xem nhanh quyền lợi, thời hạn và tổng thanh toán của từng gói.';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0d" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Gói Premium</Text>
          <Text style={styles.headerSubtitle}>Nâng cấp tài khoản để nghe nhạc liền mạch hơn.</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={handlePrimaryAction} activeOpacity={0.8}>
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
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{summaryTitle}</Text>
            <Text style={styles.summarySubtitle}>{summarySubtitle}</Text>

            <View style={styles.summaryGrid}>
              <SummaryItem
                label="Trạng thái"
                value={subscription?.isPremium ? 'Đang hoạt động' : isAuthenticated ? 'Chưa nâng cấp' : 'Khách'}
              />
              <SummaryItem label="Số gói hiện có" value={`${plans.length} gói`} />
            </View>
          </View>

          {warningMessage ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{warningMessage}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title="Danh sách gói"
              subtitle="Chạm vào gói để xem chi tiết và xác nhận mua."
            />

            {plans.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Hiện chưa có gói nào.</Text>
                <Text style={styles.emptySubtitle}>Hãy kéo xuống để tải lại danh sách gói Premium.</Text>
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
    backgroundColor: '#0b0b0d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1f',
    backgroundColor: '#0b0b0d',
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#a8a8b3',
    fontSize: 13,
    lineHeight: 19,
  },
  headerAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#17171c',
    borderWidth: 1,
    borderColor: '#2a2a31',
  },
  headerActionText: {
    color: '#ffffff',
    fontSize: 13,
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
    paddingBottom: 36,
    gap: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#212129',
    gap: 16,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 28,
  },
  summarySubtitle: {
    color: '#b2b2bc',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#1a1a20',
    borderWidth: 1,
    borderColor: '#26262e',
    gap: 8,
  },
  summaryLabel: {
    color: '#9d9da8',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#a8a8b3',
    fontSize: 13,
    lineHeight: 19,
  },
  emptyCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#212129',
    gap: 6,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#a8a8b3',
    fontSize: 13,
    lineHeight: 19,
  },
  planCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#212129',
    gap: 14,
  },
  planCardActive: {
    borderColor: '#4c9668',
    backgroundColor: '#141a16',
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  planTitleWrap: {
    flex: 1,
    gap: 6,
  },
  planName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  planDuration: {
    color: '#b5b5bf',
    fontSize: 13,
    fontWeight: '600',
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1a2a20',
    borderWidth: 1,
    borderColor: '#345641',
  },
  activeBadgeText: {
    color: '#cdeed7',
    fontSize: 11,
    fontWeight: '700',
  },
  planDescription: {
    color: '#afafb8',
    fontSize: 14,
    lineHeight: 20,
  },
  priceBlock: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#1a1a20',
    gap: 6,
  },
  priceCaption: {
    color: '#9898a3',
    fontSize: 12,
    fontWeight: '600',
  },
  planPrice: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: '800',
  },
  priceMeta: {
    color: '#9e9ea8',
    fontSize: 12,
    lineHeight: 18,
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    lineHeight: 18,
  },
  planAction: {
    color: '#f0c15d',
    fontSize: 13,
    fontWeight: '700',
  },
});
