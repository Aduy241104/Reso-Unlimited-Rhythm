import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import ArtistDeclarationModal from '../../components/profile/ArtistDeclarationModal';
import ArtistBirthDatePickerModal from '../../components/profile/ArtistBirthDatePickerModal';
import { useAuth } from '../../hooks/useAuth';
import artistRegistrationRequestService from '../../services/artistRegistrationRequestService';
import { toDisplayDateValue } from '../../utils/artistRegistrationDate';
import { formatDateLabel } from '../../utils/media';

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
        color={value ? '#1ed760' : '#a3a3a3'}
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
          <Text style={styles.imagePlaceholderTitle}>Chá»n áº£nh</Text>
          <Text style={styles.imagePlaceholderText}>{helperText}</Text>
        </View>
      )}
    </TouchableOpacity>
    <View style={styles.imageActionRow}>
      <AppButton title={image?.uri ? 'Äá»•i áº£nh' : 'Chá»n áº£nh'} onPress={onPick} style={styles.secondaryActionButton} />
      {image?.uri ? <AppButton title="XĂ³a" onPress={onClear} style={styles.clearImageButton} /> : null}
    </View>
    {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
  </View>
);

const DECLARATION_CONTENT = {
  acceptedTerms: {
    title: 'Äiá»u khoáº£n dĂ nh cho nghá»‡ sÄ©',
    description: 'Báº¡n cáº§n Ä‘á»c ká»¹ Ä‘iá»u khoáº£n trÆ°á»›c khi xĂ¡c nháº­n tham gia vá»›i vai trĂ² nghá»‡ sÄ©.',
    acceptLabel: 'TĂ´i Ä‘Ă£ Ä‘á»c vĂ  Ä‘á»“ng Ă½',
    sections: [
      {
        heading: '1. TrĂ¡ch nhiá»‡m há»“ sÆ¡ nghá»‡ sÄ©',
        body: 'Báº¡n chá»‹u trĂ¡ch nhiá»‡m duy trĂ¬ há»“ sÆ¡ nghá»‡ sÄ© chĂ­nh xĂ¡c, Ä‘áº§y Ä‘á»§ vĂ  luĂ´n cáº­p nháº­t. Má»i thĂ´ng tin sai lá»‡ch vá» danh tĂ­nh, hĂ¬nh áº£nh Ä‘áº¡i diá»‡n, tiá»ƒu sá»­ hoáº·c liĂªn káº¿t giá»›i thiá»‡u Ä‘á»u cĂ³ thá»ƒ khiáº¿n yĂªu cáº§u bá»‹ tá»« chá»‘i hoáº·c bá»‹ thu há»“i quyá»n nghá»‡ sÄ© sau nĂ y.',
      },
      {
        heading: '2. Quy chuáº©n ná»™i dung cĂ´ng khai',
        body: 'Ná»™i dung báº¡n xuáº¥t hiá»‡n vá»›i vai trĂ² nghá»‡ sÄ© khĂ´ng Ä‘Æ°á»£c vi pháº¡m phĂ¡p luáº­t, khĂ´ng chá»©a yáº¿u tá»‘ giáº£ máº¡o, xĂºc pháº¡m, kĂ­ch Ä‘á»™ng thĂ¹ ghĂ©t hoáº·c gĂ¢y hiá»ƒu nháº§m cho ngÆ°á»i nghe. Ná»n táº£ng cĂ³ quyá»n yĂªu cáº§u chá»‰nh sá»­a hoáº·c táº¡m áº©n ná»™i dung náº¿u phĂ¡t hiá»‡n rá»§i ro.',
      },
      {
        heading: '3. Há»£p tĂ¡c vá»›i quĂ¡ trĂ¬nh xĂ©t duyá»‡t',
        body: 'Trong quĂ¡ trĂ¬nh xĂ©t duyá»‡t, báº¡n cĂ³ thá»ƒ Ä‘Æ°á»£c yĂªu cáº§u bá»• sung thĂ´ng tin, hĂ¬nh áº£nh xĂ¡c minh hoáº·c giáº£i trĂ¬nh thĂªm. Náº¿u khĂ´ng pháº£n há»“i trong thá»i gian há»£p lĂ½, yĂªu cáº§u Ä‘Äƒng kĂ½ cĂ³ thá»ƒ bá»‹ dá»«ng hoáº·c tá»« chá»‘i.',
      },
      {
        heading: '4. Quyá»n kiá»ƒm tra vĂ  xá»­ lĂ½',
        body: 'Ná»n táº£ng cĂ³ quyá»n kiá»ƒm tra láº¡i há»“ sÆ¡ nghá»‡ sÄ© báº¥t ká»³ lĂºc nĂ o Ä‘á»ƒ báº£o Ä‘áº£m an toĂ n cho cá»™ng Ä‘á»“ng. Náº¿u phĂ¡t hiá»‡n há»“ sÆ¡ khĂ´ng cĂ²n phĂ¹ há»£p, quyá»n nghá»‡ sÄ© cĂ³ thá»ƒ bá»‹ giá»›i háº¡n, táº¡m khĂ³a hoáº·c thu há»“i theo chĂ­nh sĂ¡ch quáº£n trá»‹.',
      },
    ],
  },
  copyrightCommitment: {
    title: 'Cam káº¿t báº£n quyá»n ná»™i dung',
    description: 'Báº¡n chá»‰ nĂªn xĂ¡c nháº­n khi tháº­t sá»± hiá»ƒu rĂµ trĂ¡ch nhiá»‡m báº£n quyá»n cá»§a mĂ¬nh.',
    acceptLabel: 'TĂ´i cam káº¿t chá»‹u trĂ¡ch nhiá»‡m',
    sections: [
      {
        heading: '1. Quyá»n sá»Ÿ há»¯u hoáº·c quyá»n sá»­ dá»¥ng há»£p phĂ¡p',
        body: 'Báº¡n xĂ¡c nháº­n ráº±ng má»i ná»™i dung Ă¢m nháº¡c, hĂ¬nh áº£nh, báº£n ghi, lá»i bĂ i hĂ¡t, artwork hoáº·c tĂ i liá»‡u quáº£ng bĂ¡ do báº¡n cung cáº¥p Ä‘á»u thuá»™c quyá»n sá»Ÿ há»¯u cá»§a báº¡n hoáº·c báº¡n Ä‘Ă£ Ä‘Æ°á»£c cho phĂ©p sá»­ dá»¥ng há»£p phĂ¡p.',
      },
      {
        heading: '2. KhĂ´ng Ä‘Äƒng táº£i ná»™i dung xĂ¢m pháº¡m',
        body: 'Báº¡n khĂ´ng Ä‘Æ°á»£c sá»­ dá»¥ng ná»™i dung cá»§a cĂ¡ nhĂ¢n, tá»• chá»©c hay nghá»‡ sÄ© khĂ¡c khi chÆ°a cĂ³ quyá»n rĂµ rĂ ng. Äiá»u nĂ y bao gá»“m báº£n thu, beat, phá»‘i khĂ­, áº£nh, logo, thiáº¿t káº¿, video, tĂ i khoáº£n máº¡ng xĂ£ há»™i vĂ  má»i tĂ i sáº£n trĂ­ tuá»‡ liĂªn quan.',
      },
      {
        heading: '3. Chá»‹u trĂ¡ch nhiá»‡m khi cĂ³ khiáº¿u náº¡i',
        body: 'Náº¿u cĂ³ tranh cháº¥p, khiáº¿u náº¡i hoáº·c yĂªu cáº§u gá»¡ bá» liĂªn quan Ä‘áº¿n báº£n quyá»n, báº¡n pháº£i phá»‘i há»£p cung cáº¥p chá»©ng cá»© vĂ  tá»± chá»‹u trĂ¡ch nhiá»‡m trÆ°á»›c phĂ¡p luáº­t cÅ©ng nhÆ° trÆ°á»›c bĂªn thá»© ba vá» ná»™i dung Ä‘Ă£ Ä‘Äƒng táº£i.',
      },
      {
        heading: '4. Biá»‡n phĂ¡p xá»­ lĂ½ vi pháº¡m',
        body: 'Khi phĂ¡t hiá»‡n dáº¥u hiá»‡u vi pháº¡m báº£n quyá»n, ná»n táº£ng cĂ³ thá»ƒ táº¡m áº©n ná»™i dung, Ä‘Ă³ng bÄƒng quyá»n nghá»‡ sÄ©, tá»« chá»‘i yĂªu cáº§u hiá»‡n táº¡i hoáº·c Ă¡p dá»¥ng biá»‡n phĂ¡p quáº£n trá»‹ cáº§n thiáº¿t Ä‘á»ƒ báº£o vá»‡ cá»™ng Ä‘á»“ng vĂ  chá»§ sá»Ÿ há»¯u quyá»n há»£p phĂ¡p.',
      },
    ],
  },
};

export default function ArtistRegistrationRequestScreen() {
  const navigation = useNavigation();
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

  const latestRequest = useMemo(() => getLatestRequest(requests), [requests]);
  const isListenerAccount = user?.role === 'user';
  const hasPendingRequest = latestRequest?.status === 'pending';
  const hasApprovedRequest = latestRequest?.status === 'approved';
  const isArtistAccount = user?.role === 'artist';
  const canSubmitRequest = isListenerAccount && !isArtistAccount && !hasPendingRequest && !hasApprovedRequest;
  const displayDateOfBirth = useMemo(() => toDisplayDateValue(draft.dateOfBirth), [draft.dateOfBirth]);
  const activeDeclarationConfig = activeDeclarationKey ? DECLARATION_CONTENT[activeDeclarationKey] : null;

  useEffect(() => {
    if (displayDateOfBirth && draft.dateOfBirth !== displayDateOfBirth) {
      setDraft((prev) => ({ ...prev, dateOfBirth: displayDateOfBirth }));
    }
  }, [displayDateOfBirth, draft.dateOfBirth]);

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
          'KhĂ´ng thá»ƒ táº£i thĂ´ng tin Ä‘Äƒng kĂ½ nghá»‡ sÄ© lĂºc nĂ y.'
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

  const handleDraftChange = useCallback((field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });
    setSubmitError('');
    setSubmitSuccess('');
  }, []);

  const handleToggleDeclaration = useCallback((field) => {
    setDraft((prev) => ({ ...prev, [field]: !prev[field] }));
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });
  }, []);

  const setDeclarationValue = useCallback((field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });
    setSubmitError('');
    setSubmitSuccess('');
  }, []);

  const handleDeclarationPress = useCallback((field) => {
    if (draft[field]) {
      setDeclarationValue(field, false);
      return;
    }

    setActiveDeclarationKey(field);
  }, [draft, setDeclarationValue]);

  const handlePickImage = useCallback(async (field, fallbackName) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('ChÆ°a cĂ³ quyá»n truy cáº­p', 'Vui lĂ²ng cáº¥p quyá»n thÆ° viá»‡n áº£nh Ä‘á»ƒ chá»n hĂ¬nh.');
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
        Alert.alert('KhĂ´ng thá»ƒ chá»n áº£nh', 'áº¢nh Ä‘Ă£ chá»n khĂ´ng há»£p lá»‡. Vui lĂ²ng thá»­ láº¡i.');
        return;
      }

      handleDraftChange(field, nextImage);
    } catch {
      Alert.alert('KhĂ´ng thá»ƒ chá»n áº£nh', 'ÄĂ£ cĂ³ lá»—i xáº£y ra khi má»Ÿ thÆ° viá»‡n áº£nh.');
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
      'Há»§y yĂªu cáº§u Ä‘Äƒng kĂ½',
      'Báº¡n cĂ³ cháº¯c muá»‘n há»§y yĂªu cáº§u Ä‘Äƒng kĂ½ nghá»‡ sÄ© Ä‘ang chá» duyá»‡t khĂ´ng?',
      [
        { text: 'KhĂ´ng', style: 'cancel' },
        {
          text: 'Há»§y yĂªu cáº§u',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              setSubmitError('');
              await artistRegistrationRequestService.cancelRequest(latestRequest.id);
              setSubmitSuccess('ÄĂ£ há»§y yĂªu cáº§u Ä‘Äƒng kĂ½ nghá»‡ sÄ©.');
              await loadRequests({ refresh: true });
            } catch (error) {
              setSubmitError(
                artistRegistrationRequestService.translateArtistRegistrationError(
                  error,
                  'KhĂ´ng thá»ƒ há»§y yĂªu cáº§u lĂºc nĂ y.'
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
      setSubmitError('Vui lĂ²ng kiá»ƒm tra láº¡i thĂ´ng tin Ä‘Äƒng kĂ½.');
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
      setSubmitSuccess('ÄĂ£ gá»­i yĂªu cáº§u Ä‘Äƒng kĂ½ nghá»‡ sÄ© thĂ nh cĂ´ng.');
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
    if (displayDateOfBirth && draft.dateOfBirth !== displayDateOfBirth) {
      handleDraftChange('dateOfBirth', displayDateOfBirth);
    }

    setIsDatePickerVisible(true);
  }, [displayDateOfBirth, draft.dateOfBirth, handleDraftChange]);

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
          <Text style={styles.backButtonText}>Quay láº¡i</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ÄÄƒng kĂ½ nghá»‡ sÄ©</Text>
        <View style={styles.headerSpacer} />
      </View>

      {screenError ? (
        <View style={styles.centerState}>
          <ErrorState message={screenError} />
          <AppButton title="Thá»­ láº¡i" onPress={() => loadRequests()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView
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
            <Text style={styles.heroTitle}>Gá»­i yĂªu cáº§u trá»Ÿ thĂ nh nghá»‡ sÄ©</Text>
            <Text style={styles.heroText}>
              Äiá»n thĂ´ng tin xĂ¡c minh vĂ  gá»­i yĂªu cáº§u Ä‘á»ƒ Ä‘á»™i ngÅ© quáº£n trá»‹ xĂ©t duyá»‡t tĂ i khoáº£n nghá»‡ sÄ© cá»§a báº¡n.
            </Text>
          </View>

          {latestRequest ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tráº¡ng thĂ¡i yĂªu cáº§u gáº§n nháº¥t</Text>
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <View>
                    <Text style={styles.statusName}>{latestRequest.stageName || 'YĂªu cáº§u Ä‘Äƒng kĂ½ nghá»‡ sÄ©'}</Text>
                    <Text style={styles.statusDate}>Gá»­i ngĂ y {formatDateLabel(latestRequest.createdAt) || '--'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { borderColor: getStatusColor(latestRequest.status) }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(latestRequest.status) }]}>
                      {latestRequest.statusLabel}
                    </Text>
                  </View>
                </View>

                {latestRequest.rejectReason ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteTitle}>LĂ½ do tá»« chá»‘i</Text>
                    <Text style={styles.noteText}>{latestRequest.rejectReason}</Text>
                  </View>
                ) : null}

                {latestRequest.status === 'pending' ? (
                  <AppButton
                    title="Há»§y yĂªu cáº§u Ä‘ang chá» duyá»‡t"
                    onPress={handleCancelPendingRequest}
                    isLoading={isCancelling}
                    style={styles.cancelRequestButton}
                  />
                ) : null}
              </View>
            </View>
          ) : null}

          {submitSuccess ? <Text style={styles.successBanner}>{submitSuccess}</Text> : null}
          {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

          {!isListenerAccount ? (
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>TĂ i khoáº£n hiá»‡n khĂ´ng phĂ¹ há»£p</Text>
                <Text style={styles.infoText}>Chá»‰ tĂ i khoáº£n ngÆ°á»i dĂ¹ng thÆ°á»ng má»›i cĂ³ thá»ƒ gá»­i yĂªu cáº§u Ä‘Äƒng kĂ½ nghá»‡ sÄ©.</Text>
              </View>
            </View>
          ) : isArtistAccount ? (
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>TĂ i khoáº£n Ä‘Ă£ lĂ  nghá»‡ sÄ©</Text>
                <Text style={styles.infoText}>Báº¡n khĂ´ng cáº§n gá»­i thĂªm yĂªu cáº§u Ä‘Äƒng kĂ½ nghá»‡ sÄ© cho tĂ i khoáº£n nĂ y.</Text>
              </View>
            </View>
          ) : hasApprovedRequest ? (
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>YĂªu cáº§u Ä‘Ă£ Ä‘Æ°á»£c duyá»‡t</Text>
                <Text style={styles.infoText}>YĂªu cáº§u Ä‘Äƒng kĂ½ nghá»‡ sÄ© cá»§a báº¡n Ä‘Ă£ Ä‘Æ°á»£c cháº¥p thuáº­n. Vui lĂ²ng Ä‘Äƒng nháº­p láº¡i náº¿u quyá»n nghá»‡ sÄ© chÆ°a cáº­p nháº­t.</Text>
              </View>
            </View>
          ) : canSubmitRequest ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ThĂ´ng tin Ä‘Äƒng kĂ½</Text>

              <AppInput
                label="Nghá»‡ danh"
                value={draft.stageName}
                onChangeText={(value) => handleDraftChange('stageName', value)}
                placeholder="VĂ­ dá»¥: Luna Echo"
                autoCapitalize="words"
                autoCorrect={false}
                error={fieldErrors.stageName}
              />

              <AppInput
                label="Há» tĂªn trĂªn CCCD"
                value={draft.fullName}
                onChangeText={(value) => handleDraftChange('fullName', value)}
                placeholder="Nháº­p há» tĂªn Ä‘áº§y Ä‘á»§"
                autoCapitalize="words"
                autoCorrect={false}
                error={fieldErrors.fullName}
              />

              <AppInput
                label="Sá»‘ CCCD"
                value={draft.idNumber}
                onChangeText={(value) => handleDraftChange('idNumber', value)}
                placeholder="Nháº­p sá»‘ CCCD"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                error={fieldErrors.idNumber}
              />

              <View style={styles.dateFieldGroup}>
                <Text style={styles.fieldTitle}>NgĂ y sinh</Text>
                <TouchableOpacity
                  style={[styles.dateFieldButton, fieldErrors.dateOfBirth ? styles.dateFieldButtonError : null]}
                  onPress={handleOpenDatePicker}
                  activeOpacity={0.85}
                >
                  <Ionicons name="calendar-outline" size={18} color="#1ed760" />
                  <Text
                    style={[
                      styles.dateFieldValue,
                      !displayDateOfBirth ? styles.dateFieldValuePlaceholder : null,
                    ]}
                  >
                    {displayDateOfBirth || 'Chá»n ngĂ y sinh theo Ä‘á»‹nh dáº¡ng dd-mm-yyyy'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#8f8f8f" />
                </TouchableOpacity>
                <Text style={styles.dateFieldHelper}>Báº¡n cĂ³ thá»ƒ chá»n nhanh ngĂ y, thĂ¡ng, nÄƒm trong popup.</Text>
                {fieldErrors.dateOfBirth ? <Text style={styles.fieldErrorText}>{fieldErrors.dateOfBirth}</Text> : null}
              </View>

              <AppInput
                label="Tiá»ƒu sá»­ ngáº¯n"
                value={draft.bio}
                onChangeText={(value) => handleDraftChange('bio', value)}
                placeholder="Giá»›i thiá»‡u ngáº¯n vá» báº¡n"
                autoCapitalize="sentences"
                autoCorrect={false}
              />

              <AppInput
                label="Thá»ƒ loáº¡i"
                value={draft.genresText}
                onChangeText={(value) => handleDraftChange('genresText', value)}
                placeholder="Pop, Indie, Ballad"
                autoCapitalize="words"
                autoCorrect={false}
              />

              <AppInput
                label="Link nháº¡c / máº¡ng xĂ£ há»™i"
                value={draft.musicLinksText}
                onChangeText={(value) => handleDraftChange('musicLinksText', value)}
                placeholder="Má»—i link cĂ¡ch nhau báº±ng dáº¥u pháº©y"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <AppInput
                label="Link demo track"
                value={draft.demoTrackUrlsText}
                onChangeText={(value) => handleDraftChange('demoTrackUrlsText', value)}
                placeholder="Má»—i link cĂ¡ch nhau báº±ng dáº¥u pháº©y"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.textAreaGroup}>
                <Text style={styles.fieldTitle}>MĂ´ táº£ portfolio</Text>
                <View style={styles.textAreaWrap}>
                  <TextInput
                    value={draft.portfolioDescription}
                    onChangeText={(value) => handleDraftChange('portfolioDescription', value)}
                    placeholder="MĂ´ táº£ thĂªm vá» hĂ nh trĂ¬nh Ă¢m nháº¡c hoáº·c hoáº¡t Ä‘á»™ng nghá»‡ thuáº­t cá»§a báº¡n"
                    placeholderTextColor="#7d7d7d"
                    style={styles.textArea}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <ImagePickerField
                title="áº¢nh Ä‘áº¡i diá»‡n nghá»‡ sÄ©"
                helperText="KhĂ´ng báº¯t buá»™c"
                image={draft.avatar}
                onPick={() => handlePickImage('avatar', 'artist-avatar')}
                onClear={() => handleClearImage('avatar')}
              />

              <ImagePickerField
                title="áº¢nh máº·t trÆ°á»›c CCCD"
                helperText="Báº¯t buá»™c Ä‘á»ƒ xĂ¡c minh danh tĂ­nh"
                image={draft.frontImage}
                onPick={() => handlePickImage('frontImage', 'identity-front')}
                onClear={() => handleClearImage('frontImage')}
                error={fieldErrors.frontImage}
              />

              <ImagePickerField
                title="áº¢nh máº·t sau CCCD"
                helperText="Báº¯t buá»™c Ä‘á»ƒ xĂ¡c minh danh tĂ­nh"
                image={draft.backImage}
                onPick={() => handlePickImage('backImage', 'identity-back')}
                onClear={() => handleClearImage('backImage')}
                error={fieldErrors.backImage}
              />

              <DeclarationToggle
                label="TĂ´i Ä‘á»“ng Ă½ vá»›i Ä‘iá»u khoáº£n dĂ nh cho nghá»‡ sÄ©."
                value={draft.acceptedTerms}
                onPress={() => handleDeclarationPress('acceptedTerms')}
                error={fieldErrors.acceptedTerms}
              />
              <DeclarationToggle
                label="TĂ´i cam káº¿t chá»‹u trĂ¡ch nhiá»‡m vá» báº£n quyá»n ná»™i dung."
                value={draft.copyrightCommitment}
                onPress={() => handleDeclarationPress('copyrightCommitment')}
                error={fieldErrors.copyrightCommitment}
              />
              <DeclarationToggle
                label="TĂ´i xĂ¡c nháº­n má»i thĂ´ng tin cung cáº¥p lĂ  trung thá»±c."
                value={draft.truthfulInformationCommitment}
                onPress={() => handleToggleDeclaration('truthfulInformationCommitment')}
                error={fieldErrors.truthfulInformationCommitment}
              />

              <AppButton
                title="Gá»­i yĂªu cáº§u Ä‘Äƒng kĂ½ nghá»‡ sÄ©"
                onPress={handleSubmitRequest}
                isLoading={isSubmitting}
                style={styles.submitButton}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>ChÆ°a thá»ƒ gá»­i yĂªu cáº§u má»›i</Text>
                <Text style={styles.infoText}>
                  Báº¡n Ä‘ang cĂ³ má»™t yĂªu cáº§u Ä‘Äƒng kĂ½ nghá»‡ sÄ© chá» duyá»‡t. Vui lĂ²ng Ä‘á»£i káº¿t quáº£ hoáº·c há»§y yĂªu cáº§u hiá»‡n táº¡i.
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
        acceptLabel={activeDeclarationConfig?.acceptLabel || 'XĂ¡c nháº­n'}
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
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
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    backgroundColor: '#141414',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateFieldButtonError: {
    borderColor: '#ef4444',
  },
  dateFieldValue: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
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
  textAreaGroup: {
    marginBottom: 16,
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
    backgroundColor: '#1ed760',
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
    backgroundColor: '#1ed760',
  },
  retryButton: {
    minWidth: 160,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
});
