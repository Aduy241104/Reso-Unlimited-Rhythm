import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/common/AppButton';
import ReportReasonSelector from '../../components/report/ReportReasonSelector';
import contentReportService from '../../services/contentReportService';

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

export default function CreateReportScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const targetId = route?.params?.targetId || '';
  const targetType = route?.params?.targetType || 'track';
  const targetTitle = route?.params?.targetTitle || '';

  const [draft, setDraft] = useState(() =>
    contentReportService.createReportDraft({ targetId, targetType, targetTitle })
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const targetLabel = useMemo(
    () => contentReportService.REPORT_TARGET_LABELS[draft.targetType] || draft.targetType || 'Nội dung',
    [draft.targetType]
  );

  const handleDraftChange = useCallback((field, value) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      const nextErrors = { ...previous };
      delete nextErrors[field];
      return nextErrors;
    });
    setSubmitError('');
  }, []);

  const handleReasonChange = useCallback((value) => {
    handleDraftChange('reason', value);
  }, [handleDraftChange]);

  const handlePickImages = useCallback(async () => {
    if (draft.images.length >= contentReportService.MAX_REPORT_IMAGES) {
      Alert.alert(
        'Đã đủ số ảnh',
        `Bạn chỉ có thể chọn tối đa ${contentReportService.MAX_REPORT_IMAGES} ảnh minh chứng.`
      );
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Chưa có quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh để chọn hình minh chứng.');
        return;
      }

      const remainingSlots = contentReportService.MAX_REPORT_IMAGES - draft.images.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const nextImages = (Array.isArray(result.assets) ? result.assets : [])
        .map((asset, index) => normalizeSelectedImage(asset, `report-evidence-${index + 1}`))
        .filter(Boolean)
        .slice(0, remainingSlots);

      if (nextImages.length === 0) {
        Alert.alert('Không thể chọn ảnh', 'Ảnh đã chọn không hợp lệ. Vui lòng thử lại.');
        return;
      }

      handleDraftChange('images', [...draft.images, ...nextImages]);
    } catch {
      Alert.alert('Không thể chọn ảnh', 'Đã có lỗi xảy ra khi mở thư viện ảnh.');
    }
  }, [draft.images, handleDraftChange]);

  const handleRemoveImage = useCallback((index) => {
    handleDraftChange(
      'images',
      draft.images.filter((_, imageIndex) => imageIndex !== index)
    );
  }, [draft.images, handleDraftChange]);

  const handleSubmit = useCallback(async () => {
    const validationErrors = contentReportService.validateReportDraft(draft);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setSubmitError('');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await contentReportService.submitReport(draft);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(contentReportService.translateReportError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [draft]);

  const handleBackToContent = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCreateAnotherReport = useCallback(() => {
    setDraft(contentReportService.createReportDraft({ targetId, targetType, targetTitle }));
    setFieldErrors({});
    setSubmitError('');
    setIsSubmitted(false);
  }, [targetId, targetTitle, targetType]);

  if (isSubmitted) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToContent} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gửi báo cáo</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={54} color="#1ed760" />
          </View>
          <Text style={styles.successTitle}>Gửi báo cáo thành công</Text>
          <Text style={styles.successText}>
            Cảm ơn bạn đã gửi báo cáo. Đội ngũ sẽ xem xét nội dung và xử lý trong thời gian sớm nhất.
          </Text>

          <AppButton title="Quay lại nội dung" onPress={handleBackToContent} style={styles.successPrimaryButton} />
          <AppButton title="Gửi báo cáo khác" onPress={handleCreateAnotherReport} style={styles.successSecondaryButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gửi báo cáo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 30, 36) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="flag-outline" size={24} color="#f3c26b" />
          </View>
          <Text style={styles.heroEyebrow}>CREATE REPORT</Text>
          <Text style={styles.heroTitle}>Gửi báo cáo nội dung hoặc vấn đề</Text>
          <Text style={styles.heroText}>
            Hãy mô tả rõ vấn đề bạn gặp phải để đội ngũ có thể kiểm tra và xử lý nhanh hơn.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loại nội dung</Text>
            <Text style={styles.infoValue}>{targetLabel}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nội dung đang báo cáo</Text>
            <Text style={styles.infoValue}>{draft.targetTitle || 'Nội dung đã chọn'}</Text>
          </View>
        </View>

        {fieldErrors.targetId || fieldErrors.targetType ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{fieldErrors.targetId || fieldErrors.targetType}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lý do báo cáo</Text>
          <ReportReasonSelector
            groups={contentReportService.REPORT_REASON_GROUPS}
            value={draft.reason}
            onChange={handleReasonChange}
            disabled={isSubmitting}
            error={fieldErrors.reason}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mô tả chi tiết</Text>
          <View style={[styles.textAreaWrap, fieldErrors.description ? styles.textAreaWrapError : null]}>
            <TextInput
              value={draft.description}
              onChangeText={(value) => handleDraftChange('description', value)}
              placeholder="Mô tả cụ thể vấn đề hoặc nội dung bạn muốn báo cáo..."
              placeholderTextColor="#7d7d7d"
              multiline
              textAlignVertical="top"
              style={styles.textArea}
              editable={!isSubmitting}
              maxLength={contentReportService.MAX_REPORT_DESCRIPTION_LENGTH}
            />
          </View>
          <View style={styles.counterRow}>
            <Text style={styles.helperText}>Hãy cung cấp đủ chi tiết để đội ngũ dễ xác minh hơn.</Text>
            <Text style={styles.counterText}>
              {draft.description.length}/{contentReportService.MAX_REPORT_DESCRIPTION_LENGTH}
            </Text>
          </View>
          {fieldErrors.description ? <Text style={styles.fieldErrorText}>{fieldErrors.description}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ảnh minh chứng</Text>
            <Text style={styles.sectionMeta}>{draft.images.length}/{contentReportService.MAX_REPORT_IMAGES}</Text>
          </View>

          <TouchableOpacity
            style={styles.uploadCard}
            onPress={handlePickImages}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            <View style={styles.uploadTextWrap}>
              <Text style={styles.uploadTitle}>Tải lên tối đa 5 ảnh minh chứng</Text>
              <Text style={styles.uploadSubtitle}>PNG, JPG hoặc WEBP</Text>
            </View>
            <View style={styles.uploadIconWrap}>
              <Ionicons name="images-outline" size={20} color="#f3c26b" />
            </View>
          </TouchableOpacity>

          {fieldErrors.images ? <Text style={styles.fieldErrorText}>{fieldErrors.images}</Text> : null}

          {draft.images.length > 0 ? (
            <View style={styles.imageList}>
              {draft.images.map((image, index) => (
                <View key={`${image.name}-${index}`} style={styles.imageItem}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} contentFit="cover" transition={120} />
                  <View style={styles.imageMeta}>
                    <Text style={styles.imageName} numberOfLines={1}>{image.name || `Ảnh ${index + 1}`}</Text>
                    <Text style={styles.imageHint}>Ảnh minh chứng {index + 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    activeOpacity={0.8}
                    onPress={() => handleRemoveImage(index)}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close" size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {submitError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{submitError}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <AppButton title="Hủy" onPress={() => navigation.goBack()} disabled={isSubmitting} style={styles.cancelButton} />
          <AppButton title="Gửi báo cáo" onPress={handleSubmit} isLoading={isSubmitting} style={styles.submitButton} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050505',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backButtonText: {
    color: '#f3c26b',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 66,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
  },
  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b1710',
    borderWidth: 1,
    borderColor: '#3a2f1b',
  },
  heroEyebrow: {
    color: '#f3c26b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 14,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    marginTop: 8,
  },
  heroText: {
    color: '#b9b9b9',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  infoCard: {
    borderRadius: 18,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
  },
  infoRow: {
    gap: 5,
  },
  infoLabel: {
    color: '#8f8f8f',
    fontSize: 12,
    fontWeight: '700',
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#232323',
    marginVertical: 12,
  },
  section: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionMeta: {
    color: '#8f8f8f',
    fontSize: 12,
    fontWeight: '700',
  },
  textAreaWrap: {
    minHeight: 160,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    backgroundColor: '#121212',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  textAreaWrapError: {
    borderColor: '#ff8f8f',
  },
  textArea: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 21,
    minHeight: 130,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  helperText: {
    flex: 1,
    color: '#7f7f7f',
    fontSize: 12,
    lineHeight: 18,
  },
  counterText: {
    color: '#9a9a9a',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#313131',
    backgroundColor: '#121212',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  uploadTextWrap: {
    flex: 1,
  },
  uploadTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  uploadSubtitle: {
    color: '#8b8b8b',
    fontSize: 12,
    marginTop: 5,
  },
  uploadIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b1710',
  },
  imageList: {
    gap: 10,
  },
  imageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    backgroundColor: '#121212',
    padding: 10,
  },
  imagePreview: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#0f0f0f',
  },
  imageMeta: {
    flex: 1,
    gap: 4,
  },
  imageName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  imageHint: {
    color: '#8b8b8b',
    fontSize: 12,
  },
  removeImageButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
  },
  errorBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#5a2d2d',
    backgroundColor: '#1a1111',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorBannerText: {
    color: '#ffb0b0',
    fontSize: 13,
    lineHeight: 19,
  },
  fieldErrorText: {
    color: '#ff8f8f',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2f2f2f',
  },
  submitButton: {
    flex: 1.3,
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  successIconWrap: {
    marginBottom: 16,
  },
  successTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  successText: {
    color: '#b9b9b9',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  successPrimaryButton: {
    width: '100%',
    marginTop: 26,
  },
  successSecondaryButton: {
    width: '100%',
    marginTop: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2f2f2f',
  },
});
