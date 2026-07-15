import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import subscriptionService from '../../services/subscriptionService';

const STATUS_LABELS = {
  active: 'Đang hoạt động',
  pending: 'Đang xử lý',
  expired: 'Đã hết hạn',
  cancelled: 'Đã hủy',
  inactive: 'Không hoạt động',
};

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const formatDate = (value) => {
  if (!value) {
    return 'Chưa có';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Chưa có';
  }

  try {
    return dateFormatter.format(parsedDate);
  } catch {
    return parsedDate.toLocaleDateString('en-GB');
  }
};

const getRemainingDays = (value) => {
  if (!value) {
    return 0;
  }

  const endDate = new Date(value);

  if (Number.isNaN(endDate.getTime())) {
    return 0;
  }

  const diffInMs = endDate.getTime() - Date.now();

  if (diffInMs <= 0) {
    return 0;
  }

  return Math.max(0, Math.ceil(diffInMs / (1000 * 60 * 60 * 24)));
};

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Không thể tải trạng thái đăng ký lúc này.';

const resolvePlan = (subscription) =>
  subscription?.currentPlan || subscription?.activeSubscription?.plan || null;

const resolveStatus = (subscription) => {
  const status = subscription?.activeSubscription?.status;

  if (status) {
    return String(status).toLowerCase();
  }

  return subscription?.isPremium ? 'active' : 'inactive';
};

const hasSubscriptionData = (subscription) =>
  Boolean(
    subscription?.currentPlan?._id ||
      subscription?.currentPlan?.originalPlanId ||
      subscription?.currentPlan?.name ||
      subscription?.activeSubscription?._id ||
      subscription?.activeSubscription?.planId ||
      subscription?.activeSubscription?.plan?._id ||
      subscription?.activeSubscription?.plan?.name ||
      subscription?.premiumEndDate ||
      subscription?.activeSubscription?.status
  );

const InfoRow = ({ label, value, isLast = false }) => (
  <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default function SubscriptionStatusScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isMountedRef = useRef(true);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadSubscription = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await subscriptionService.getMySubscription();

      if (!isMountedRef.current) {
        return;
      }

      setSubscription(result);
      setErrorMessage('');
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      if (error?.response?.status === 404) {
        setSubscription(null);
        setErrorMessage('');
      } else {
        setErrorMessage(getErrorMessage(error));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadSubscription();

      return () => {
        isMountedRef.current = false;
      };
    }, [loadSubscription])
  );

  const subscriptionDetails = useMemo(() => {
    const plan = resolvePlan(subscription);
    const statusKey = resolveStatus(subscription);
    const endDate = subscription?.activeSubscription?.endDate || subscription?.premiumEndDate || null;
    const startDate = subscription?.activeSubscription?.startDate || null;
    const remainingDays = getRemainingDays(endDate);
    const hasSubscription = hasSubscriptionData(subscription);

    return {
      hasSubscription,
      planName: plan?.name || 'Premium',
      statusLabel: hasSubscription ? STATUS_LABELS[statusKey] || 'Không xác định' : 'Chưa đăng ký Premium',
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      remainingDays,
    };
  }, [subscription]);

  const infoRows = useMemo(
    () => [
      {
        label: 'Tên gói',
        value: subscriptionDetails.hasSubscription ? subscriptionDetails.planName : 'Free',
      },
      { label: 'Trạng thái', value: subscriptionDetails.statusLabel },
      { label: 'Ngày bắt đầu', value: subscriptionDetails.startDate },
      { label: 'Ngày hết hạn', value: subscriptionDetails.endDate },
      { label: 'Số ngày còn lại', value: `${subscriptionDetails.remainingDays} ngày` },
    ],
    [subscriptionDetails]
  );

  const shouldShowFreeCta = !subscriptionDetails.hasSubscription;

  const handleOpenPremiumScreen = useCallback(() => {
    navigation.navigate('PremiumOverview');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={18} color="#ffffff" />
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trạng thái đăng ký</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage && !subscriptionDetails.hasSubscription ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <AppButton title="Thử lại" onPress={() => loadSubscription()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadSubscription({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>GÓI HIỆN TẠI</Text>
            <Text style={styles.heroTitle}>
              {subscriptionDetails.hasSubscription ? subscriptionDetails.planName : 'Free'}
            </Text>
            <Text style={styles.heroText}>
              {subscriptionDetails.hasSubscription
                ? `Trạng thái: ${subscriptionDetails.statusLabel}`
                : 'Bạn đang sử dụng gói miễn phí của Reso Music.'}
            </Text>
          </View>

          {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

          {shouldShowFreeCta ? (
            <AppButton
              title="Xem các gói Premium"
              onPress={handleOpenPremiumScreen}
              style={styles.premiumButton}
            />
          ) : (
            <View style={styles.infoCard}>
              {infoRows.map((item, index) => (
                <InfoRow
                  key={`${item.label}-${index}`}
                  label={item.label}
                  value={item.value}
                  isLast={index === infoRows.length - 1}
                />
              ))}
            </View>
          )}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
    backgroundColor: '#000000',
  },
  backButton: {
    minWidth: 56,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    fontWeight: '700',
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
  scrollBody: {
    padding: 16,
  },
  heroCard: {
    backgroundColor: '#141414',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 18,
  },
  heroEyebrow: {
    color: '#8a8a8a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  heroText: {
    color: '#b5b5b5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  infoCard: {
    marginTop: 18,
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: '#8f8f8f',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    color: '#ff8e8e',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },
  retryButton: {
    minWidth: 160,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  premiumButton: {
    marginTop: 18,
    backgroundColor: '#f0c15d',
  },
});

