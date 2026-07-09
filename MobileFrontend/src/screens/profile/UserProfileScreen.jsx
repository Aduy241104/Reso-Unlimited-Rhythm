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
import AppAvatar from '../../components/common/AppAvatar';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import userProfileService from '../../services/userProfileService';
import { getErrorMessage } from '../../utils/media';

const buildInfoRows = (profile) => {
  if (!profile) {
    return [];
  }

  return [
    { label: 'Email', value: profile.email || 'Chưa có email' },
    { label: 'Vai trò', value: profile.roleLabel || 'Không xác định' },
    { label: 'Trạng thái', value: profile.activeStatusLabel || 'Không xác định' },
    { label: 'Premium', value: profile.isPremium ? 'Đang sử dụng' : 'Chưa nâng cấp' },
    profile.username ? { label: 'Username', value: profile.username } : null,
    profile.id ? { label: 'Mã tài khoản', value: profile.id } : null,
  ].filter(Boolean);
};

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [profile, setProfile] = useState(() => userProfileService.normalizeUserProfile({}, user));
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfile = useCallback(async ({ refresh = false } = {}) => {
    if (!isAuthenticated) {
      setProfile(userProfileService.normalizeUserProfile({}, user));
      setErrorMessage('');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await userProfileService.getMyProfile(user);
      setProfile(result);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Không thể tải thông tin tài khoản lúc này.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated, user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      return undefined;
    }, [loadProfile])
  );

  const infoRows = useMemo(() => buildInfoRows(profile), [profile]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hồ sơ của bạn</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>Cần đăng nhập</Text>
          <Text style={styles.emptyText}>
            Hãy đăng nhập để xem thông tin tài khoản và trạng thái gói của bạn.
          </Text>
          <AppButton title="Đi đến đăng nhập" onPress={() => navigation.navigate('Login')} style={styles.loginButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ của bạn</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <AppButton title="Thử lại" onPress={() => loadProfile()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollBody, { paddingBottom: 32 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadProfile({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
        >
          <View style={styles.heroCard}>
            <AppAvatar uri={profile?.avatar} label={profile?.displayName} size={88} style={styles.heroAvatar} />
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>TAI KHOAN DANG NHAP</Text>
              <Text style={styles.heroTitle}>{profile?.displayName || 'Tai khoan cua ban'}</Text>
              <Text style={styles.heroText}>{profile?.email || 'Chưa có email'}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{profile?.roleLabel || 'Tai khoan'}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{profile?.isPremium ? 'Premium' : 'Gói thường'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
            <View style={styles.panel}>
              {infoRows.map((item, index) => (
                <View
                  key={`${item.label}-${index}`}
                  style={[styles.infoRow, index === infoRows.length - 1 ? styles.infoRowLast : null]}
                >
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              ))}
            </View>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
    backgroundColor: '#000000',
  },
  backButton: {
    minWidth: 56,
    paddingVertical: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
  },
  heroAvatar: {
    borderColor: '#2f2f2f',
  },
  heroContent: {
    flex: 1,
    marginLeft: 14,
  },
  heroEyebrow: {
    color: '#8a8a8a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  heroText: {
    color: '#b5b5b5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    backgroundColor: '#171717',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeText: {
    color: '#d4d4d4',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  panel: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    minWidth: 160,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  loginButton: {
    minWidth: 180,
    marginTop: 16,
    backgroundColor: '#1ed760',
  },
});
