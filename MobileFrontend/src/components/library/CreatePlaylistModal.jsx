import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppButton from '../common/AppButton';
import AppModal from '../common/AppModal';
import AppInput from '../common/AppInput';

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;

const normalizeTitle = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeDescription = (value) => (typeof value === 'string' ? value.trim() : '');

export default function CreatePlaylistModal({
  visible,
  existingPlaylists = [],
  isSubmitting = false,
  submitError = '',
  onClose,
  onSubmit,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setTitleError('');
      setDescriptionError('');
    }
  }, [visible]);

  const existingTitles = useMemo(
    () =>
      existingPlaylists.map((item) => normalizeTitle(item?.title)).filter(Boolean),
    [existingPlaylists]
  );

  const validate = () => {
    const normalizedTitle = normalizeTitle(title);
    const normalizedDescription = normalizeDescription(description);
    let nextTitleError = '';
    let nextDescriptionError = '';

    if (!normalizedTitle) {
      nextTitleError = 'Vui lòng nhập tên playlist.';
    } else if (normalizedTitle.length > TITLE_MAX_LENGTH) {
      nextTitleError = `Tên playlist tối đa ${TITLE_MAX_LENGTH} ký tự.`;
    } else if (existingTitles.includes(normalizedTitle)) {
      nextTitleError = 'Bạn đã có một playlist trùng tên này.';
    }

    if (normalizedDescription.length > DESCRIPTION_MAX_LENGTH) {
      nextDescriptionError = `Mô tả tối đa ${DESCRIPTION_MAX_LENGTH} ký tự.`;
    }

    setTitleError(nextTitleError);
    setDescriptionError(nextDescriptionError);

    return !nextTitleError && !nextDescriptionError;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    onSubmit?.({
      title: normalizeTitle(title),
      description: normalizeDescription(description),
    });
  };

  return (
    <AppModal visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.eyebrow}>TẠO PLAYLIST</Text>
            <Text style={styles.title}>Bắt đầu playlist mới</Text>
            <Text style={styles.subtitle}>
              Playlist mới sẽ mặc định là riêng tư và bạn có thể chỉnh sửa sau.
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <Text style={styles.closeButtonText}>Đóng</Text>
          </Pressable>
        </View>

        <AppInput
          label="Tên playlist"
          value={title}
          onChangeText={setTitle}
          placeholder="Lái xe đêm muộn"
          autoCapitalize="sentences"
          autoCorrect={false}
          maxLength={TITLE_MAX_LENGTH}
          error={titleError}
        />

        <View style={styles.textAreaGroup}>
          <Text style={styles.textAreaLabel}>Mô tả</Text>
          <View style={[styles.textAreaWrap, descriptionError ? styles.textAreaWrapError : null]}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả ngắn về playlist này."
              placeholderTextColor="#7d7d7d"
              style={styles.textArea}
              multiline
              textAlignVertical="top"
              maxLength={DESCRIPTION_MAX_LENGTH}
            />
          </View>
          <View style={styles.textAreaFooter}>
            <Text style={styles.helperText}>Không bắt buộc</Text>
            <Text style={styles.counterText}>{description.trim().length}/{DESCRIPTION_MAX_LENGTH}</Text>
          </View>
          {descriptionError ? <Text style={styles.errorText}>{descriptionError}</Text> : null}
        </View>

        {submitError ? <Text style={styles.submitErrorText}>{submitError}</Text> : null}

        <View style={styles.actions}>
          <AppButton
            title="Hủy"
            onPress={onClose}
            disabled={isSubmitting}
            style={styles.cancelButton}
          />
          <AppButton
            title="Tạo playlist"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </KeyboardAvoidingView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  headerContent: {
    flex: 1,
  },
  eyebrow: {
    color: '#8a8a8a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  closeButton: {
    paddingVertical: 4,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  textAreaGroup: {
    marginTop: 4,
    marginBottom: 6,
  },
  textAreaLabel: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
  },
  textAreaWrap: {
    minHeight: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    backgroundColor: '#141414',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textAreaWrapError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 98,
    color: '#ffffff',
    fontSize: 14,
  },
  textAreaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  helperText: {
    color: '#8a8a8a',
    fontSize: 11,
  },
  counterText: {
    color: '#8a8a8a',
    fontSize: 11,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
  },
  submitErrorText: {
    color: '#ef4444',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1ed760',
  },
});
