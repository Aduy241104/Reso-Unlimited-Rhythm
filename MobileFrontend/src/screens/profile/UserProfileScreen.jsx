import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
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
import AppInput from '../../components/common/AppInput';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import userProfileService from '../../services/userProfileService';
import profilePasswordService from '../../services/profilePasswordService';
import { getErrorMessage } from '../../utils/media';

const buildInfoRows = (profile) => {
  if (!profile) {
    return [];
  }

  return [
    { label: 'Họ và tên', value: profile?.profile?.fullName || 'Chưa cập nhật' },
    { label: 'Giới tính', value: profile?.profile?.genderLabel || 'Chưa cập nhật' },
    { label: 'Quốc gia', value: profile?.profile?.country || 'Chưa cập nhật' },
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
  const { isAuthenticated, user, updateUser } = useAuth();
  const [profile, setProfile] = useState(() => userProfileService.normalizeUserProfile({}, user));
  const [draft, setDraft] = useState(() => userProfileService.buildProfileDraft(user));
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [passwordDraft, setPasswordDraft] = useState(() => profilePasswordService.createPasswordDraft());
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');

  const syncDraftState = useCallback((nextProfile) => {
    setDraft(userProfileService.buildProfileDraft(nextProfile));
    setFormErrors({});
  }, []);

  const loadProfile = useCallback(async ({ refresh = false } = {}) => {
    if (!isAuthenticated) {
      const fallbackProfile = userProfileService.normalizeUserProfile({}, user);
      setProfile(fallbackProfile);
      syncDraftState(fallbackProfile);
      setErrorMessage('');
      setSaveErrorMessage('');
      setSuccessMessage('');
      setIsEditing(false);
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
      syncDraftState(result);
      setErrorMessage('');
      setSaveErrorMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Không thể tải thông tin tài khoản lúc này.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated, syncDraftState, user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      return undefined;
    }, [loadProfile])
  );

  const infoRows = useMemo(() => buildInfoRows(profile), [profile]);
  const isDraftChanged = useMemo(() => userProfileService.hasProfileChanges(draft, profile), [draft, profile]);

  const handleDraftChange = useCallback((field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });
    setSaveErrorMessage('');
    setSuccessMessage('');
  }, []);

  const handleSelectGender = useCallback((value) => {
    handleDraftChange('gender', value);
  }, [handleDraftChange]);

  const handleCancelEditing = useCallback(() => {
    syncDraftState(profile);
    setSaveErrorMessage('');
    setSuccessMessage('');
    setIsEditing(false);
  }, [profile, syncDraftState]);

  const handleStartEditing = useCallback(() => {
    syncDraftState(profile);
    setSaveErrorMessage('');
    setSuccessMessage('');
    setIsEditing(true);
  }, [profile, syncDraftState]);

  const handleSaveProfile = useCallback(async () => {
    const validationErrors = userProfileService.validateProfileDraft(draft, profile);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setSaveErrorMessage('Vui lòng kiểm tra lại thông tin đã nhập.');
      setSuccessMessage('');
      return;
    }

    if (!isDraftChanged) {
      setSaveErrorMessage('');
      setSuccessMessage('Thông tin hiện tại đã mới nhất.');
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage('');
    setSuccessMessage('');

    try {
      const updatedProfile = await userProfileService.updateMyProfile(draft, profile);
      setProfile(updatedProfile);
      syncDraftState(updatedProfile);
      await updateUser(updatedProfile);
      setErrorMessage('');
      setSuccessMessage('Đã cập nhật thông tin cá nhân.');
      setIsEditing(false);
    } catch (error) {
      setSaveErrorMessage(getErrorMessage(error, 'Không thể cập nhật thông tin lúc này.'));
    } finally {
      setIsSaving(false);
    }
  }, [draft, isDraftChanged, profile, syncDraftState, updateUser]);

  const resetPasswordState = useCallback(() => {
    setPasswordDraft(profilePasswordService.createPasswordDraft());
    setPasswordErrors({});
    setPasswordErrorMessage('');
  }, []);

  const handleOpenPasswordModal = useCallback(() => {
    resetPasswordState();
    setPasswordSuccessMessage('');
    setIsPasswordModalVisible(true);
  }, [resetPasswordState]);

  const handleClosePasswordModal = useCallback(() => {
    resetPasswordState();
    setIsPasswordModalVisible(false);
  }, [resetPasswordState]);

  const handlePasswordDraftChange = useCallback((field, value) => {
    setPasswordDraft((prev) => ({ ...prev, [field]: value }));
    setPasswordErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });
    setPasswordErrorMessage('');
    setPasswordSuccessMessage('');
  }, []);

  const handleSavePassword = useCallback(async () => {
    const validationErrors = profilePasswordService.validatePasswordDraft(passwordDraft);

    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      setPasswordErrorMessage('Vui lòng kiểm tra lại thông tin mật khẩu.');
      return;
    }

    setIsPasswordSaving(true);
    setPasswordErrorMessage('');

    try {
      await profilePasswordService.changeMyPassword(passwordDraft);
      setPasswordSuccessMessage('Đã cập nhật mật khẩu tài khoản.');
      handleClosePasswordModal();
    } catch (error) {
      setPasswordErrorMessage(profilePasswordService.translateChangePasswordError(error));
    } finally {
      setIsPasswordSaving(false);
    }
  }, [handleClosePasswordModal, passwordDraft]);

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
            Hãy đăng nhập để xem và cập nhật thông tin tài khoản của bạn.
          </Text>
          <AppButton
            title="Đi đến đăng nhập"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
          />
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
        <TouchableOpacity style={styles.editIconButton} onPress={handleStartEditing} activeOpacity={0.85}>
          <Ionicons name="create-outline" size={18} color="#ffffff" />
        </TouchableOpacity>
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
              <Text style={styles.heroEyebrow}>TÀI KHOẢN ĐANG ĐĂNG NHẬP</Text>
              <Text style={styles.heroTitle}>{profile?.displayName || 'Tài khoản của bạn'}</Text>
              <Text style={styles.heroText}>{profile?.email || 'Chưa có email'}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{profile?.roleLabel || 'Tài khoản'}</Text>
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
            {successMessage ? <Text style={styles.successBanner}>{successMessage}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bảo mật tài khoản</Text>
            <TouchableOpacity style={styles.securityCard} onPress={handleOpenPasswordModal} activeOpacity={0.85}>
              <View style={styles.securityIconWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>Đổi mật khẩu</Text>
                <Text style={styles.securityText}>Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8f8f8f" />
            </TouchableOpacity>
            {passwordSuccessMessage ? <Text style={styles.successBanner}>{passwordSuccessMessage}</Text> : null}
          </View>

          {user?.role === 'user' ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Đăng ký nghệ sĩ</Text>
              <TouchableOpacity
                style={styles.securityCard}
                onPress={() => navigation.navigate('ArtistRegistrationRequest')}
                activeOpacity={0.85}
              >
                <View style={styles.securityIconWrap}>
                  <Ionicons name="mic-outline" size={18} color="#ffffff" />
                </View>
                <View style={styles.securityContent}>
                  <Text style={styles.securityTitle}>Trở thành nghệ sĩ</Text>
                  <Text style={styles.securityText}>Gửi yêu cầu để nâng cấp tài khoản thành nghệ sĩ.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8f8f8f" />
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={isEditing}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <View style={[styles.modalCard, { marginBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
                <Text style={styles.modalSubtitle}>Cập nhật thông tin cá nhân của bạn</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={handleCancelEditing} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <AppInput
                label="Họ và tên"
                value={draft.fullName}
                onChangeText={(value) => handleDraftChange('fullName', value)}
                placeholder="Nhập họ và tên"
                autoCapitalize="words"
                autoCorrect={false}
                error={formErrors.fullName}
              />

              <Text style={styles.groupLabel}>Giới tính</Text>
              <View style={styles.genderRow}>
                {userProfileService.genderOptions.map((option) => {
                  const isSelected = draft.gender === option.value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.85}
                      onPress={() => handleSelectGender(option.value)}
                      style={[styles.genderChip, isSelected ? styles.genderChipSelected : null]}
                    >
                      <Text style={[styles.genderChipText, isSelected ? styles.genderChipTextSelected : null]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {formErrors.gender ? <Text style={styles.fieldError}>{formErrors.gender}</Text> : null}

              <AppInput
                label="Quốc gia"
                value={draft.country}
                onChangeText={(value) => handleDraftChange('country', value)}
                placeholder="VD: Việt Nam"
                autoCapitalize="words"
                autoCorrect={false}
              />

              {saveErrorMessage ? <Text style={styles.errorBanner}>{saveErrorMessage}</Text> : null}
            </ScrollView>

            <View style={styles.formActionRow}>
              <AppButton
                title="Lưu thay đổi"
                onPress={handleSaveProfile}
                isLoading={isSaving}
                disabled={!isDraftChanged}
                style={styles.saveButton}
              />
              <AppButton
                title="Hủy chỉnh sửa"
                onPress={handleCancelEditing}
                disabled={isSaving}
                style={styles.resetButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <View style={[styles.modalCard, { marginBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
                <Text style={styles.modalSubtitle}>Tạo mật khẩu mới để tăng bảo mật cho tài khoản.</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={handleClosePasswordModal} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <AppInput
                label="Mật khẩu hiện tại"
                value={passwordDraft.currentPassword}
                onChangeText={(value) => handlePasswordDraftChange('currentPassword', value)}
                placeholder="Nhập mật khẩu hiện tại"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                error={passwordErrors.currentPassword}
              />

              <AppInput
                label="Mật khẩu mới"
                value={passwordDraft.newPassword}
                onChangeText={(value) => handlePasswordDraftChange('newPassword', value)}
                placeholder="Nhập mật khẩu mới"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                error={passwordErrors.newPassword}
              />

              <AppInput
                label="Xác nhận mật khẩu mới"
                value={passwordDraft.confirmPassword}
                onChangeText={(value) => handlePasswordDraftChange('confirmPassword', value)}
                placeholder="Nhập lại mật khẩu mới"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                error={passwordErrors.confirmPassword}
              />

              {passwordErrorMessage ? <Text style={styles.errorBanner}>{passwordErrorMessage}</Text> : null}
            </ScrollView>

            <View style={styles.formActionRow}>
              <AppButton
                title="Cập nhật mật khẩu"
                onPress={handleSavePassword}
                isLoading={isPasswordSaving}
                style={styles.saveButton}
              />
              <AppButton
                title="Hủy"
                onPress={handleClosePasswordModal}
                disabled={isPasswordSaving}
                style={styles.resetButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  editIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
  },
  securityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  securityTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  securityText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
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
  groupLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    backgroundColor: '#111111',
  },
  genderChipSelected: {
    backgroundColor: '#1ed760',
    borderColor: '#1ed760',
  },
  genderChipText: {
    color: '#d0d0d0',
    fontSize: 12,
    fontWeight: '700',
  },
  genderChipTextSelected: {
    color: '#04120a',
  },
  fieldError: {
    color: '#ff8e8e',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  errorBanner: {
    color: '#ff8e8e',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  successBanner: {
    color: '#7ff0a6',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  formActionRow: {
    gap: 10,
  },
  saveButton: {
    backgroundColor: '#1ed760',
  },
  resetButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.74)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#101010',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    padding: 16,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  modalTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#9a9a9a',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2b2b2b',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
});