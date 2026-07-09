import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import ArtistBirthDatePickerModal from '../../components/profile/ArtistBirthDatePickerModal';
import ArtistDeclarationModal from '../../components/profile/ArtistDeclarationModal';
import ArtistRegistrationHistoryList from '../../components/profile/ArtistRegistrationHistoryList';
import { useAuth } from '../../hooks/useAuth';
import artistRegistrationRequestService from '../../services/artistRegistrationRequestService';
import { toDisplayDateValue } from '../../utils/artistRegistrationDate';
import { formatDateLabel } from '../../utils/media';

const GENRE_OPTIONS = [
  'Pop',
  'Rock',
  'Hip Hop',
  'R&B',
  'Electronic',
  'Jazz',
  'Classical',
  'Country',
  'Latin',
  'K-Pop',
  'Indie',
  'Metal',
  'Folk',
  'Blues',
  'Reggae',
  'Other',
];

const SOCIAL_LINK_FIELDS = [
  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
  { key: 'website', label: 'Website', placeholder: 'https://...' },
  { key: 'other', label: 'Liên kết khác', placeholder: 'https://...' },
];

const DECLARATION_CONTENT = {
  acceptedTerms: {
    title: 'Điều khoản dành cho nghệ sĩ',
    description: 'Bạn cần đọc kỹ điều khoản trước khi xác nhận tham gia với vai trò nghệ sĩ.',
    acceptLabel: 'Tôi đã đọc và đồng ý',
    sections: [
      {
        heading: '1. Trách nhiệm hồ sơ nghệ sĩ',
        body: 'Bạn chịu trách nhiệm duy trì hồ sơ nghệ sĩ chính xác, đầy đủ và luôn cập nhật. Mọi thông tin sai lệch về danh tính, hình ảnh đại diện, tiểu sử hoặc liên kết giới thiệu đều có thể khiến yêu cầu bị từ chối hoặc bị thu hồi quyền nghệ sĩ sau này.',
      },
      {
        heading: '2. Quy chuẩn nội dung công khai',
        body: 'Nội dung bạn xuất hiện với vai trò nghệ sĩ không được vi phạm pháp luật, không chứa yếu tố giả mạo, xúc phạm, kích động thù ghét hoặc gây hiểu nhầm cho người nghe. Nền tảng có quyền yêu cầu chỉnh sửa hoặc tạm ẩn nội dung nếu phát hiện rủi ro.',
      },
      {
        heading: '3. Hợp tác với quá trình xét duyệt',
        body: 'Trong quá trình xét duyệt, bạn có thể được yêu cầu bổ sung thông tin, hình ảnh xác minh hoặc giải trình thêm. Nếu không phản hồi trong thời gian hợp lý, yêu cầu đăng ký có thể bị dừng hoặc từ chối.',
      },
      {
        heading: '4. Quyền kiểm tra và xử lý',
        body: 'Nền tảng có quyền kiểm tra lại hồ sơ nghệ sĩ bất kỳ lúc nào để bảo đảm an toàn cho cộng đồng. Nếu phát hiện hồ sơ không còn phù hợp, quyền nghệ sĩ có thể bị giới hạn, tạm khóa hoặc thu hồi theo chính sách quản trị.',
      },
    ],
  },
  copyrightCommitment: {
    title: 'Cam kết bản quyền nội dung',
    description: 'Bạn chỉ nên xác nhận khi thật sự hiểu rõ trách nhiệm bản quyền của mình.',
    acceptLabel: 'Tôi cam kết chịu trách nhiệm',
    sections: [
      {
        heading: '1. Quyền sở hữu hoặc quyền sử dụng hợp pháp',
        body: 'Bạn xác nhận rằng mọi nội dung âm nhạc, hình ảnh, bản ghi, lời bài hát, artwork hoặc tài liệu quảng bá do bạn cung cấp đều thuộc quyền sở hữu của bạn hoặc bạn đã được cho phép sử dụng hợp pháp.',
      },
      {
        heading: '2. Không đăng tải nội dung xâm phạm',
        body: 'Bạn không được sử dụng nội dung của cá nhân, tổ chức hay nghệ sĩ khác khi chưa có quyền rõ ràng. Điều này bao gồm bản thu, beat, phối khí, ảnh, logo, thiết kế, video, tài khoản mạng xã hội và mọi tài sản trí tuệ liên quan.',
      },
      {
        heading: '3. Chịu trách nhiệm khi có khiếu nại',
        body: 'Nếu có tranh chấp, khiếu nại hoặc yêu cầu gỡ bỏ liên quan đến bản quyền, bạn phải phối hợp cung cấp chứng cứ và tự chịu trách nhiệm trước pháp luật cũng như trước bên thứ ba về nội dung đã đăng tải.',
      },
      {
        heading: '4. Biện pháp xử lý vi phạm',
        body: 'Khi phát hiện dấu hiệu vi phạm bản quyền, nền tảng có thể tạm ẩn nội dung, đóng băng quyền nghệ sĩ, từ chối yêu cầu hiện tại hoặc áp dụng biện pháp quản trị cần thiết để bảo vệ cộng đồng và chủ sở hữu quyền hợp pháp.',
      },
    ],
  },
};

const normalizeSelectedImage = (asset, fallbackName) => {
  if (!asset?.uri) {
    return null;
  }

  const extensionMatch = String(asset.uri).match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const extension = extensionMatch?.[1]?.toLowerCase() || 'jpg';

  return {
    uri: asset.uri,
    name: asset.fileName || `${fallbackName}-${Date.now()}.${extension}`,
    type: asset.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  };
};

const getStatusColor = (status) => {
  if (status === 'approved') {
    return '#1ed760';
  }

  if (status === 'rejected') {
    return '#ff9b9b';
  }

  return '#ffd166';
};

const getLatestRequest = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return [...items].sort((left, right) => {
    const leftTime = new Date(left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  })[0];
};

const DeclarationToggle = ({ label, value, onPress, error }) => (
  <View style={styles.declarationWrap}>
    <TouchableOpacity
      style={[styles.declarationRow, error ? styles.declarationRowError : null]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name={value ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={value ? '#f3c26b' : '#8f8f8f'}
      />
      <Text style={styles.declarationText}>{label}</Text>
    </TouchableOpacity>
    {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
  </View>
);

const ImagePickerField = ({ title, helperText, image, onPick, onClear, error }) => (
  <View style={styles.imageField}>
    <Text style={styles.fieldTitle}>{title}</Text>
    <TouchableOpacity
      style={[styles.imagePickerCard, error ? styles.imagePickerCardError : null]}
      onPress={onPick}
      activeOpacity={0.85}
    >
      {image?.uri ? (
        <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={24} color="#8f8f8f" />
          <Text style={styles.imagePlaceholderTitle}>Chọn ảnh</Text>
          <Text style={styles.imagePlaceholderText}>{helperText}</Text>
        </View>
      )}
    </TouchableOpacity>
    <View style={styles.imageActionRow}>
      <AppButton title={image?.uri ? 'Đổi ảnh' : 'Chọn ảnh'} onPress={onPick} style={styles.secondaryActionButton} />
      {image?.uri ? <AppButton title="Xóa" onPress={onClear} style={styles.clearImageButton} /> : null}
    </View>
    {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
  </View>
);

export default function ArtistRegistrationRequestMobileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [draft, setDraft] = useState(() => artistRegistrationRequestService.createArtistRegistrationDraft());
  const [fieldErrors, setFieldErrors] = useState({});
  const [screenError, setScreenError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [activeDeclarationKey, setActiveDeclarationKey] = useState('');
  const [activeView, setActiveView] = useState(
    route?.params?.initialView === 'history' ? 'history' : 'form'
  );
  const scrollViewRef = useRef(null);
  const historySectionOffsetRef = useRef(0);

  const latestRequest = useMemo(() => getLatestRequest(requests), [requests]);
  const isListenerAccount = user?.role === 'user';
  const hasPendingRequest = latestRequest?.status === 'pending';
  const hasApprovedRequest = latestRequest?.status === 'approved';
  const isArtistAccount = user?.role === 'artist';
  const canSubmitRequest = isListenerAccount && !isArtistAccount && !hasPendingRequest && !hasApprovedRequest;
  const hasAnyRequest = requests.length > 0;
  const isHistoryView = activeView === 'history';
  const displayDateOfBirth = useMemo(() => toDisplayDateValue(draft.dateOfBirth), [draft.dateOfBirth]);
  const activeDeclarationConfig = activeDeclarationKey ? DECLARATION_CONTENT[activeDeclarationKey] : null;
  const selectedGenreText = useMemo(
    () => (draft.genres.length > 0 ? draft.genres.join(', ') : 'Chưa chọn thể loại'),
    [draft.genres]
  );

  useEffect(() => {
    if (displayDateOfBirth && draft.dateOfBirth !== displayDateOfBirth) {
      setDraft((prev) => ({ ...prev, dateOfBirth: displayDateOfBirth }));
    }
  }, [displayDateOfBirth, draft.dateOfBirth]);

  useEffect(() => {
    setActiveView(route?.params?.initialView === 'history' ? 'history' : 'form');
  }, [route?.params?.initialView]);

  useEffect(() => {
    if (activeView !== 'history' || isLoading || requests.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(historySectionOffsetRef.current - 12, 0),
        animated: true,
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [activeView, isLoading, requests.length]);

  const loadRequests = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const items = await artistRegistrationRequestService.getMyRequests();
      setRequests(items);
      setScreenError('');
    } catch (error) {
      setScreenError(
        artistRegistrationRequestService.translateArtistRegistrationError(
          error,
          'Không thể tải thông tin đăng ký nghệ sĩ lúc này.'
        )
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
      return undefined;
    }, [loadRequests])
  );

  const clearFieldError = useCallback((field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });
  }, []);

  const handleDraftChange = useCallback((field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    setSubmitError('');
    setSubmitSuccess('');
  }, [clearFieldError]);

  const handleSocialLinkChange = useCallback((field, value) => {
    setDraft((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [field]: value,
      },
    }));
    setSubmitError('');
    setSubmitSuccess('');
  }, []);

  const toggleGenre = useCallback((genre) => {
    setDraft((prev) => {
      const exists = prev.genres.includes(genre);
      return {
        ...prev,
        genres: exists ? prev.genres.filter((item) => item !== genre) : [...prev.genres, genre],
      };
    });
    setSubmitError('');
    setSubmitSuccess('');
  }, []);

  const setDeclarationValue = useCallback((field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    setSubmitError('');
    setSubmitSuccess('');
  }, [clearFieldError]);

  const handleDeclarationPress = useCallback((field) => {
    if (draft[field]) {
      setDeclarationValue(field, false);
      return;
    }

    setActiveDeclarationKey(field);
  }, [draft, setDeclarationValue]);

  const handleToggleTruthfulCommitment = useCallback(() => {
    setDeclarationValue('truthfulInformationCommitment', !draft.truthfulInformationCommitment);
  }, [draft.truthfulInformationCommitment, setDeclarationValue]);

  const handlePickImage = useCallback(async (field, fallbackName) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Chưa có quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh để chọn hình.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const nextImage = normalizeSelectedImage(result.assets?.[0], fallbackName);

      if (!nextImage) {
        Alert.alert('Không thể chọn ảnh', 'Ảnh đã chọn không hợp lệ. Vui lòng thử lại.');
        return;
      }

      handleDraftChange(field, nextImage);
    } catch {
      Alert.alert('Không thể chọn ảnh', 'Đã có lỗi xảy ra khi mở thư viện ảnh.');
    }
  }, [handleDraftChange]);

  const handleClearImage = useCallback((field) => {
    handleDraftChange(field, null);
  }, [handleDraftChange]);

  const handleCancelPendingRequest = useCallback(() => {
    if (!latestRequest?.id || isCancelling) {
      return;
    }

    Alert.alert(
      'Hủy yêu cầu đăng ký',
      'Bạn có chắc muốn hủy yêu cầu đăng ký nghệ sĩ đang chờ duyệt không?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy yêu cầu',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              setSubmitError('');
              await artistRegistrationRequestService.cancelRequest(latestRequest.id);
              setSubmitSuccess('Đã hủy yêu cầu đăng ký nghệ sĩ.');
              await loadRequests({ refresh: true });
            } catch (error) {
              setSubmitError(
                artistRegistrationRequestService.translateArtistRegistrationError(
                  error,
                  'Không thể hủy yêu cầu lúc này.'
                )
              );
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  }, [isCancelling, latestRequest?.id, loadRequests]);

  const handleSubmitRequest = useCallback(async () => {
    const validationErrors = artistRegistrationRequestService.validateArtistRegistrationDraft(draft);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setSubmitError('Vui lòng kiểm tra lại thông tin đăng ký.');
      setSubmitSuccess('');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      await artistRegistrationRequestService.submitRequest(draft);
      setDraft(artistRegistrationRequestService.createArtistRegistrationDraft());
      setFieldErrors({});
      setActiveView('history');
      setSubmitSuccess('Đã gửi yêu cầu đăng ký nghệ sĩ thành công.');
      await loadRequests({ refresh: true });
    } catch (error) {
      const nextFieldErrors = artistRegistrationRequestService.extractArtistRegistrationFieldErrors(error);

      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
      }

      setSubmitError(artistRegistrationRequestService.translateArtistRegistrationError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [draft, loadRequests]);

  const handleOpenDatePicker = useCallback(() => {
    setIsDatePickerVisible(true);
  }, []);

  const handleCloseDatePicker = useCallback(() => {
    setIsDatePickerVisible(false);
  }, []);

  const handleConfirmDatePicker = useCallback((value) => {
    handleDraftChange('dateOfBirth', value);
    setIsDatePickerVisible(false);
  }, [handleDraftChange]);

  const handleCloseDeclarationModal = useCallback(() => {
    setActiveDeclarationKey('');
  }, []);

  const handleAcceptDeclaration = useCallback(() => {
    if (!activeDeclarationKey) {
      return;
    }

    setDeclarationValue(activeDeclarationKey, true);
    setActiveDeclarationKey('');
  }, [activeDeclarationKey, setDeclarationValue]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.centerState}>
          <AppLoader size="large" />
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
        <Text style={styles.headerTitle}>Đăng ký nghệ sĩ</Text>
        <View style={styles.headerSpacer} />
      </View>

      {screenError ? (
        <View style={styles.centerState}>
          <ErrorState message={screenError} />
          <AppButton title="Thử lại" onPress={() => loadRequests()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.scrollBody, { paddingBottom: 32 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadRequests({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>ARTIST REQUEST</Text>
            <Text style={styles.heroTitle}>Gửi yêu cầu trở thành nghệ sĩ</Text>
            <Text style={styles.heroText}>
              Hoàn thiện hồ sơ, giấy tờ xác minh và kênh hoạt động để đội ngũ quản trị xét duyệt tài khoản nghệ sĩ của bạn.
            </Text>
          </View>

          <View
            onLayout={({ nativeEvent }) => {
              historySectionOffsetRef.current = nativeEvent.layout.y;
            }}
          />

          {latestRequest ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trạng thái yêu cầu gần nhất</Text>
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <View>
                    <Text style={styles.statusName}>{latestRequest.stageName || 'Yêu cầu đăng ký nghệ sĩ'}</Text>
                    <Text style={styles.statusDate}>Gửi ngày {formatDateLabel(latestRequest.createdAt) || '--'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { borderColor: getStatusColor(latestRequest.status) }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(latestRequest.status) }]}>
                      {latestRequest.statusLabel}
                    </Text>
                  </View>
                </View>

                {latestRequest.rejectReason ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteTitle}>Lý do từ chối</Text>
                    <Text style={styles.noteText}>{latestRequest.rejectReason}</Text>
                  </View>
                ) : null}

                {latestRequest.status === 'pending' ? (
                  <AppButton
                    title="Hủy yêu cầu đang chờ duyệt"
                    onPress={handleCancelPendingRequest}
                    isLoading={isCancelling}
                    style={styles.cancelRequestButton}
                  />
                ) : null}
              </View>
            </View>
          ) : null}

          <ArtistRegistrationHistoryList requests={latestRequest ? requests.slice(1) : requests} />

          {submitSuccess ? <Text style={styles.successBanner}>{submitSuccess}</Text> : null}
          {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

          {isHistoryView ? (
            !hasAnyRequest ? (
              <View style={styles.section}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>Chưa có yêu cầu nào</Text>
                  <Text style={styles.infoText}>Bạn chưa gửi yêu cầu đăng ký nghệ sĩ nào trước đây.</Text>
                </View>
              </View>
            ) : null
          ) : !isListenerAccount ? (
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Tài khoản hiện không phù hợp</Text>
                <Text style={styles.infoText}>Chỉ tài khoản người dùng thường mới có thể gửi yêu cầu đăng ký nghệ sĩ.</Text>
              </View>
            </View>
          ) : isArtistAccount ? (
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Tài khoản đã là nghệ sĩ</Text>
                <Text style={styles.infoText}>Bạn không cần gửi thêm yêu cầu đăng ký nghệ sĩ cho tài khoản này.</Text>
              </View>
            </View>
          ) : hasApprovedRequest ? (
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Yêu cầu đã được duyệt</Text>
                <Text style={styles.infoText}>Yêu cầu đăng ký nghệ sĩ của bạn đã được chấp thuận. Vui lòng đăng nhập lại nếu quyền nghệ sĩ chưa cập nhật.</Text>
              </View>
            </View>
          ) : canSubmitRequest ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin đăng ký</Text>

              <AppInput
                label="Tên nghệ sĩ"
                value={draft.stageName}
                onChangeText={(value) => handleDraftChange('stageName', value)}
                placeholder="Nhập nghệ danh của bạn"
                autoCapitalize="words"
                autoCorrect={false}
                error={fieldErrors.stageName}
              />

              <AppInput
                label="Tiểu sử nghệ sĩ"
                value={draft.bio}
                onChangeText={(value) => handleDraftChange('bio', value)}
                placeholder="Giới thiệu về phong cách âm nhạc và hành trình của bạn"
                autoCapitalize="sentences"
                autoCorrect={false}
              />

              <ImagePickerField
                title="Ảnh đại diện nghệ sĩ"
                helperText="Không bắt buộc, nhưng nên có để hồ sơ nhìn chuyên nghiệp hơn"
                image={draft.avatar}
                onPick={() => handlePickImage('avatar', 'artist-avatar')}
                onClear={() => handleClearImage('avatar')}
              />

              <AppInput
                label="Họ tên trên CCCD"
                value={draft.fullName}
                onChangeText={(value) => handleDraftChange('fullName', value)}
                placeholder="Theo giấy tờ tùy thân"
                autoCapitalize="words"
                autoCorrect={false}
                error={fieldErrors.fullName}
              />

              <AppInput
                label="Số CCCD/CMND"
                value={draft.idNumber}
                onChangeText={(value) => handleDraftChange('idNumber', value)}
                placeholder="Nhập số giấy tờ tùy thân"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                error={fieldErrors.idNumber}
              />

              <View style={styles.dateFieldGroup}>
                <Text style={styles.fieldTitle}>Ngày sinh</Text>
                <TouchableOpacity
                  style={[styles.dateFieldButton, fieldErrors.dateOfBirth ? styles.dateFieldButtonError : null]}
                  onPress={handleOpenDatePicker}
                  activeOpacity={0.85}
                >
                  <View style={styles.dateFieldIconWrap}>
                    <Ionicons name="calendar-outline" size={18} color="#f3c26b" />
                  </View>
                  <View style={styles.dateFieldContent}>
                    <Text style={styles.dateFieldCaption}>Chạm để chọn ngày</Text>
                    <Text
                      style={[
                        styles.dateFieldValue,
                        !displayDateOfBirth ? styles.dateFieldValuePlaceholder : null,
                      ]}
                    >
                      {displayDateOfBirth || 'dd-mm-yyyy'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#8f8f8f" />
                </TouchableOpacity>
                <Text style={styles.dateFieldHelper}>Chọn bằng lịch và điều chỉnh nhanh tháng, năm trong popup.</Text>
                {fieldErrors.dateOfBirth ? <Text style={styles.fieldErrorText}>{fieldErrors.dateOfBirth}</Text> : null}
              </View>

              <ImagePickerField
                title="Ảnh mặt trước giấy tờ"
                helperText="Bắt buộc để xác minh danh tính"
                image={draft.frontImage}
                onPick={() => handlePickImage('frontImage', 'identity-front')}
                onClear={() => handleClearImage('frontImage')}
                error={fieldErrors.frontImage}
              />

              <ImagePickerField
                title="Ảnh mặt sau giấy tờ"
                helperText="Bắt buộc để xác minh danh tính"
                image={draft.backImage}
                onPick={() => handlePickImage('backImage', 'identity-back')}
                onClear={() => handleClearImage('backImage')}
                error={fieldErrors.backImage}
              />

              <View style={styles.sectionBlock}>
                <View style={styles.sectionBlockHeader}>
                  <Text style={styles.sectionBlockTitle}>Thể loại âm nhạc</Text>
                  <Text style={styles.sectionBlockMeta}>{selectedGenreText}</Text>
                </View>
                <View style={styles.genreRow}>
                  {GENRE_OPTIONS.map((genre) => {
                    const isSelected = draft.genres.includes(genre);

                    return (
                      <TouchableOpacity
                        key={genre}
                        style={[styles.genreChip, isSelected ? styles.genreChipSelected : null]}
                        onPress={() => toggleGenre(genre)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.genreChipText, isSelected ? styles.genreChipTextSelected : null]}>{genre}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionBlockTitle}>Kênh hoạt động</Text>
                {SOCIAL_LINK_FIELDS.map((field) => (
                  <AppInput
                    key={field.key}
                    label={field.label}
                    value={draft.socialLinks[field.key]}
                    onChangeText={(value) => handleSocialLinkChange(field.key, value)}
                    placeholder={field.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                ))}
              </View>

              <AppInput
                label="Link demo bài hát"
                value={draft.demoTrackUrlsText}
                onChangeText={(value) => handleDraftChange('demoTrackUrlsText', value)}
                placeholder="Mỗi link cách nhau bằng dấu phẩy hoặc xuống dòng"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <AppInput
                label="Link sản phẩm âm nhạc đã phát hành"
                value={draft.musicLinksText}
                onChangeText={(value) => handleDraftChange('musicLinksText', value)}
                placeholder="Mỗi link cách nhau bằng dấu phẩy hoặc xuống dòng"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.textAreaGroup}>
                <Text style={styles.fieldTitle}>Mô tả thêm về hoạt động âm nhạc</Text>
                <View style={styles.textAreaWrap}>
                  <TextInput
                    value={draft.portfolioDescription}
                    onChangeText={(value) => handleDraftChange('portfolioDescription', value)}
                    placeholder="Chia sẻ thêm về dự án, thành tích, cộng tác hoặc kinh nghiệm biểu diễn của bạn"
                    placeholderTextColor="#7d7d7d"
                    style={styles.textArea}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <DeclarationToggle
                label="Tôi đã đọc và đồng ý với điều khoản dành cho nghệ sĩ trên nền tảng."
                value={draft.acceptedTerms}
                onPress={() => handleDeclarationPress('acceptedTerms')}
                error={fieldErrors.acceptedTerms}
              />
              <DeclarationToggle
                label="Tôi chịu hoàn toàn trách nhiệm về quyền sở hữu và bản quyền đối với nội dung âm nhạc mà tôi cung cấp."
                value={draft.copyrightCommitment}
                onPress={() => handleDeclarationPress('copyrightCommitment')}
                error={fieldErrors.copyrightCommitment}
              />
              <DeclarationToggle
                label="Tôi xác nhận toàn bộ thông tin gửi lên là trung thực, chính xác và thuộc về tôi hoặc đơn vị đại diện hợp pháp."
                value={draft.truthfulInformationCommitment}
                onPress={handleToggleTruthfulCommitment}
                error={fieldErrors.truthfulInformationCommitment}
              />

              <AppButton
                title="Gửi yêu cầu đăng ký nghệ sĩ"
                onPress={handleSubmitRequest}
                isLoading={isSubmitting}
                style={styles.submitButton}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Chưa thể gửi yêu cầu mới</Text>
                <Text style={styles.infoText}>
                  Bạn đang có một yêu cầu đăng ký nghệ sĩ chờ duyệt. Vui lòng đợi kết quả hoặc hủy yêu cầu hiện tại.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <ArtistBirthDatePickerModal
        visible={isDatePickerVisible}
        value={displayDateOfBirth}
        onClose={handleCloseDatePicker}
        onConfirm={handleConfirmDatePicker}
        bottomInset={insets.bottom}
      />
      <ArtistDeclarationModal
        visible={Boolean(activeDeclarationConfig)}
        title={activeDeclarationConfig?.title || ''}
        description={activeDeclarationConfig?.description || ''}
        sections={activeDeclarationConfig?.sections || []}
        acceptLabel={activeDeclarationConfig?.acceptLabel || 'Xác nhận'}
        onClose={handleCloseDeclarationModal}
        onAccept={handleAcceptDeclaration}
        bottomInset={insets.bottom}
      />
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
    backgroundColor: '#141414',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 18,
  },
  heroEyebrow: {
    color: '#f3c26b',
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
    marginTop: 8,
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
  sectionBlock: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#141414',
  },
  sectionBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionBlockTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionBlockMeta: {
    flex: 1,
    textAlign: 'right',
    color: '#8f8f8f',
    fontSize: 11,
  },
  statusCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  statusDate: {
    color: '#9a9a9a',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noteBox: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    padding: 12,
  },
  noteTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  noteText: {
    color: '#b5b5b5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  cancelRequestButton: {
    marginTop: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  infoCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  infoText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  dateFieldGroup: {
    marginBottom: 16,
  },
  fieldTitle: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
  },
  dateFieldButton: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    backgroundColor: '#141414',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateFieldButtonError: {
    borderColor: '#ef4444',
  },
  dateFieldIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d1710',
    borderWidth: 1,
    borderColor: '#4a3b23',
  },
  dateFieldContent: {
    flex: 1,
  },
  dateFieldCaption: {
    color: '#9a9a9a',
    fontSize: 11,
    marginBottom: 4,
  },
  dateFieldValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dateFieldValuePlaceholder: {
    color: '#7d7d7d',
  },
  dateFieldHelper: {
    color: '#9a9a9a',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    backgroundColor: '#111111',
  },
  genreChipSelected: {
    borderColor: '#f3c26b',
    backgroundColor: '#2a2113',
  },
  genreChipText: {
    color: '#d0d0d0',
    fontSize: 12,
    fontWeight: '700',
  },
  genreChipTextSelected: {
    color: '#f8ddaf',
  },
  textAreaGroup: {
    marginBottom: 16,
  },
  textAreaWrap: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    backgroundColor: '#141414',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 98,
    color: '#ffffff',
    fontSize: 14,
  },
  imageField: {
    marginBottom: 16,
  },
  imagePickerCard: {
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    backgroundColor: '#141414',
    overflow: 'hidden',
  },
  imagePickerCardError: {
    borderColor: '#ef4444',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  imagePlaceholderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  imagePlaceholderText: {
    color: '#9a9a9a',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  imageActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: '#f3c26b',
  },
  clearImageButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  declarationWrap: {
    marginBottom: 12,
  },
  declarationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
  },
  declarationRowError: {
    borderColor: '#ef4444',
  },
  declarationText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 20,
  },
  fieldErrorText: {
    color: '#ff8e8e',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  errorBanner: {
    color: '#ff8e8e',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  successBanner: {
    color: '#7ff0a6',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: '#f3c26b',
  },
  retryButton: {
    minWidth: 160,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
});
