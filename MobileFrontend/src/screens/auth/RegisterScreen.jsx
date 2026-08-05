import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import authService from '../../services/authService';
import {
  buildDateDisplayValue,
  parseAnyDateValue,
  toApiDateValue,
} from '../../utils/artistRegistrationDate';
import { registerOtpSchema, registerSchema } from '../../validations/authValidation';
import appLogo from '../../../assets/reso-logo.png';
import authBg from '../../../assets/auth-bg.png';

const getPayloadData = (response) => response?.data || response || {};

const GENDER_OPTIONS = [
  { label: 'Không muốn tiết lộ', value: 'prefer_not_to_say' },
  { label: 'Nam', value: 'male' },
  { label: 'Nữ', value: 'female' },
  { label: 'Khác', value: 'other' },
];

const MINIMUM_BIRTH_DATE = new Date(1900, 0, 1);

const getDatePickerValue = (value) => {
  const parsed = parseAnyDateValue(value);

  if (parsed) {
    return new Date(Number(parsed.year), Number(parsed.month) - 1, Number(parsed.day));
  }

  const defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() - 18);
  defaultDate.setHours(0, 0, 0, 0);
  return defaultDate;
};

const getDateDisplayValue = (date) => buildDateDisplayValue({
  day: date.getDate(),
  month: date.getMonth() + 1,
  year: date.getFullYear(),
});

const getFieldErrorMessage = (error, fieldName) => {
  if (Array.isArray(error?.errors)) {
    return error.errors.find((item) => item?.field === fieldName)?.message;
  }

  if (error?.errors?.field === fieldName) {
    return error.errors.message || error.message;
  }

  return '';
};

const getResendAfterSeconds = (error) => {
  const value = Number(error?.errors?.resendAfterSeconds);

  return Number.isFinite(value) && value > 0 ? value : 0;
};

export const RegisterScreen = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState('details');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [pendingProfile, setPendingProfile] = useState({
    fullName: '',
    gender: 'prefer_not_to_say',
    dateOfBirth: '',
  });
  const [apiError, setApiError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState(5);
  const [otpValue, setOtpValue] = useState('');
  const [isBirthDatePickerVisible, setIsBirthDatePickerVisible] = useState(false);

  const detailsForm = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      gender: 'prefer_not_to_say',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
    },
  });

  const otpForm = useForm({
    resolver: yupResolver(registerOtpSchema),
    defaultValues: {
      otp: '',
    },
  });

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setRemainingSeconds((current) => (current > 1 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [remainingSeconds]);

  const detailsErrors = detailsForm.formState.errors;
  const otpErrors = otpForm.formState.errors;
  const normalizedPendingEmail = useMemo(() => pendingEmail.trim().toLowerCase(), [pendingEmail]);

  const startCooldown = (seconds) => {
    setRemainingSeconds(seconds > 0 ? seconds : 0);
  };

  const handleBirthDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setIsBirthDatePickerVisible(false);
    }

    if (event?.type === 'dismissed' || !selectedDate) {
      return;
    }

    detailsForm.setValue('dateOfBirth', getDateDisplayValue(selectedDate), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleOpenBirthDatePicker = () => {
    const pickerValue = getDatePickerValue(detailsForm.getValues('dateOfBirth'));

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode: 'date',
        display: 'default',
        minimumDate: MINIMUM_BIRTH_DATE,
        maximumDate: new Date(),
        onChange: handleBirthDateChange,
      });
      return;
    }

    setIsBirthDatePickerVisible(true);
  };

  const handleSendOtp = async ({ fullName, email, gender, dateOfBirth, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedDateOfBirth = toApiDateValue(dateOfBirth);

    try {
      setApiError('');
      const response = await authService.requestRegisterOtp(normalizedEmail);
      const payload = getPayloadData(response);

      setPendingEmail(payload.email || normalizedEmail);
      setPendingPassword(password);
      setPendingProfile({
        fullName: fullName.trim(),
        gender,
        dateOfBirth: normalizedDateOfBirth,
      });
      setExpiresInMinutes(payload.expiresInMinutes || 5);
      startCooldown(payload.resendAfterSeconds || 0);
      setOtpValue('');
      otpForm.reset({ otp: '' });
      setStep('otp');
    } catch (error) {
      const emailError = getFieldErrorMessage(error, 'email');
      if (emailError) {
        detailsForm.setError('email', { type: 'server', message: emailError });
      } else {
        setApiError(error?.message || 'Không gửi được OTP. Vui lòng thử lại.');
      }

      startCooldown(getResendAfterSeconds(error));
    }
  };

  const handleRegister = async ({ otp }) => {
    if (!normalizedPendingEmail || !pendingPassword) {
      setStep('details');
      return;
    }

    try {
      setApiError('');
      await authService.register({
        email: normalizedPendingEmail,
        otp: otp.trim(),
        password: pendingPassword,
        fullName: pendingProfile.fullName,
        gender: pendingProfile.gender,
        dateOfBirth: pendingProfile.dateOfBirth,
      });

      navigation.reset({
        index: 0,
        routes: [{
          name: 'Login',
          params: {
            notice: `Tài khoản ${normalizedPendingEmail} đã được tạo thành công. Bạn có thể đăng nhập ngay.`,
          },
        }],
      });
    } catch (error) {
      const otpError = getFieldErrorMessage(error, 'otp');
      if (otpError) {
        otpForm.setError('otp', { type: 'server', message: otpError });
      }

      const emailError = getFieldErrorMessage(error, 'email');
      const passwordError = getFieldErrorMessage(error, 'password');
      const fullNameError = getFieldErrorMessage(error, 'fullName');
      const genderError = getFieldErrorMessage(error, 'gender');
      const dateOfBirthError = getFieldErrorMessage(error, 'dateOfBirth');

      if (emailError) {
        detailsForm.setError('email', { type: 'server', message: emailError });
      }

      if (passwordError) {
        detailsForm.setError('password', { type: 'server', message: passwordError });
      }

      if (fullNameError) {
        detailsForm.setError('fullName', { type: 'server', message: fullNameError });
      }

      if (genderError) {
        detailsForm.setError('gender', { type: 'server', message: genderError });
      }

      if (dateOfBirthError) {
        detailsForm.setError('dateOfBirth', { type: 'server', message: dateOfBirthError });
      }

      if (emailError || passwordError || fullNameError || genderError || dateOfBirthError) {
        setApiError(error?.message || 'Thông tin đăng ký không còn hợp lệ. Vui lòng kiểm tra lại.');
        setStep('details');
        return;
      }

      if (!otpError) {
        setApiError(error?.message || 'Không tạo được tài khoản. Vui lòng thử lại.');
      }
    }
  };

  const handleResendOtp = async () => {
    if (!normalizedPendingEmail || remainingSeconds > 0) {
      return;
    }

    try {
      setApiError('');
      setIsResendingOtp(true);
      const response = await authService.requestRegisterOtp(normalizedPendingEmail);
      const payload = getPayloadData(response);

      setPendingEmail(payload.email || normalizedPendingEmail);
      setExpiresInMinutes(payload.expiresInMinutes || expiresInMinutes);
      startCooldown(payload.resendAfterSeconds || 0);
    } catch (error) {
      const emailError = getFieldErrorMessage(error, 'email');

      if (emailError) {
        detailsForm.setError('email', { type: 'server', message: emailError });
        setApiError(error?.message || 'Thông tin đăng ký không còn hợp lệ. Vui lòng kiểm tra lại.');
        setStep('details');
      } else {
        setApiError(error?.message || 'Không gửi lại được OTP. Vui lòng thử lại.');
      }

      startCooldown(getResendAfterSeconds(error));
    } finally {
      setIsResendingOtp(false);
    }
  };

  const renderDetailsForm = () => (
    <>
      <Text style={styles.title}>Tạo tài khoản</Text>
      <Text style={styles.subtitle}>Điền thông tin của bạn, rồi mình gửi OTP xác nhận email.</Text>

      {apiError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      ) : null}

      <Controller
        control={detailsForm.control}
        name="fullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Họ và tên"
            placeholder="Nguyễn Văn A"
            autoCapitalize="words"
            autoComplete="name"
            maxLength={100}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={detailsErrors.fullName?.message}
            inputStyle={styles.input}
            labelStyle={styles.label}
            wrapperStyle={styles.inputWrapper}
          />
        )}
      />

      <Controller
        control={detailsForm.control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={detailsErrors.email?.message}
            inputStyle={styles.input}
            labelStyle={styles.label}
            wrapperStyle={styles.inputWrapper}
          />
        )}
      />

      <Controller
        control={detailsForm.control}
        name="gender"
        render={({ field: { onChange, value } }) => (
          <View style={styles.choiceFieldContainer}>
            <Text style={styles.label}>Giới tính</Text>
            <View style={styles.genderOptions}>
              {GENDER_OPTIONS.map((option) => {
                const isSelected = value === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.genderOption, isSelected && styles.genderOptionSelected]}
                    onPress={() => onChange(option.value)}
                    activeOpacity={0.82}
                  >
                    <Text style={[styles.genderOptionText, isSelected && styles.genderOptionTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {detailsErrors.gender?.message ? (
              <Text style={styles.fieldErrorText}>{detailsErrors.gender.message}</Text>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={detailsForm.control}
        name="dateOfBirth"
        render={({ field: { value } }) => (
          <View style={styles.choiceFieldContainer}>
            <Text style={styles.label}>Ngày sinh</Text>
            <TouchableOpacity
              style={[styles.dateFieldButton, detailsErrors.dateOfBirth && styles.inputErrorBorder]}
              onPress={handleOpenBirthDatePicker}
              activeOpacity={0.82}
            >
              <Text style={[styles.dateFieldText, !value && styles.dateFieldPlaceholder]}>
                {value || 'Chọn ngày sinh'}
              </Text>
            </TouchableOpacity>
            {Platform.OS === 'ios' && isBirthDatePickerVisible ? (
              <View style={styles.iosDatePickerContainer}>
                <DateTimePicker
                  value={getDatePickerValue(value)}
                  mode="date"
                  display="default"
                  minimumDate={MINIMUM_BIRTH_DATE}
                  maximumDate={new Date()}
                  onChange={handleBirthDateChange}
                  themeVariant="dark"
                />
                <TouchableOpacity
                  style={styles.iosDatePickerDoneButton}
                  onPress={() => setIsBirthDatePickerVisible(false)}
                  activeOpacity={0.82}
                >
                  <Text style={styles.iosDatePickerDoneText}>Xong</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {detailsErrors.dateOfBirth?.message ? (
              <Text style={styles.fieldErrorText}>{detailsErrors.dateOfBirth.message}</Text>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={detailsForm.control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Mật khẩu"
            placeholder="Mật khẩu"
            secureTextEntry
            autoCapitalize="none"
            maxLength={33}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={detailsErrors.password?.message}
            inputStyle={styles.input}
            labelStyle={styles.label}
            wrapperStyle={styles.inputWrapper}
          />
        )}
      />

      <Controller
        control={detailsForm.control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Nhập lại mật khẩu"
            placeholder="Nhập lại mật khẩu"
            secureTextEntry
            autoCapitalize="none"
            maxLength={33}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={detailsErrors.confirmPassword?.message}
            inputStyle={styles.input}
            labelStyle={styles.label}
            wrapperStyle={styles.inputWrapper}
          />
        )}
      />

      <AppButton
        title="Gửi mã OTP"
        onPress={detailsForm.handleSubmit(handleSendOtp)}
        isLoading={detailsForm.formState.isSubmitting}
        buttonStyle={styles.primaryBtn}
        textStyle={styles.primaryBtnText}
      />
    </>
  );

  const renderOtpForm = () => (
    <>
      <Text style={styles.title}>Xác nhận email</Text>
      <Text style={styles.subtitle}>
        Nhập mã 6 số đã gửi tới {normalizedPendingEmail}. Mã hết hạn sau khoảng {expiresInMinutes} phút.
      </Text>

      {apiError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      ) : null}

      <Controller
        control={otpForm.control}
        name="otp"
        render={({ field: { onBlur } }) => (
          <View style={styles.otpFieldContainer}>
            <Text style={styles.label}>OTP</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numeric"
              maxLength={6}
              onBlur={onBlur}
              onChangeText={(text) => {
                const nextOtp = text.replace(/\D/g, '').slice(0, 6);
                setOtpValue(nextOtp);
                otpForm.setValue('otp', nextOtp, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: Boolean(otpErrors.otp),
                });
              }}
              placeholder="123456"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              selectionColor="#ff9f43"
              style={[styles.inputWrapper, styles.input, styles.otpInput, otpErrors.otp && styles.inputErrorBorder]}
              textContentType="oneTimeCode"
              value={otpValue}
            />
            {otpErrors.otp?.message ? <Text style={styles.fieldErrorText}>{otpErrors.otp.message}</Text> : null}
          </View>
        )}
      />

      <AppButton
        title="Tạo tài khoản"
        onPress={otpForm.handleSubmit(handleRegister)}
        isLoading={otpForm.formState.isSubmitting}
        buttonStyle={styles.primaryBtn}
        textStyle={styles.primaryBtnText}
      />

      <View style={styles.otpActions}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('details')}>
          <Text style={styles.secondaryBtnText}>Sửa email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, (remainingSeconds > 0 || isResendingOtp) && styles.secondaryBtnDisabled]}
          disabled={remainingSeconds > 0 || isResendingOtp}
          onPress={handleResendOtp}
        >
          <Text style={styles.secondaryBtnText}>
            {isResendingOtp ? 'Đang gửi...' : remainingSeconds > 0 ? `Gửi lại sau ${remainingSeconds}s` : 'Gửi lại OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#070a12" />
      <View style={styles.background}>
        <Image source={authBg} style={styles.bgArtwork} resizeMode="contain" />
        <View style={styles.overlay} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image source={appLogo} style={styles.logo} resizeMode="cover" />
            <Text style={styles.brandText}>RESO MUSIC</Text>
            <Text style={styles.heroTitle}>Join the beat</Text>
            <Text style={styles.heroText}>Tạo tài khoản để lưu gu nhạc và playlist của bạn.</Text>
          </View>

          <View style={styles.card}>
            {step === 'details' ? renderDetailsForm() : renderOtpForm()}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a12',
  },
  background: {
    flex: 1,
  },
  bgArtwork: {
    position: 'absolute',
    top: 38,
    left: -86,
    width: 560,
    height: 560,
    opacity: 0.78,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 14, 0.5)',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 34,
    paddingBottom: 22,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 74,
    height: 74,
    borderRadius: 24,
    marginBottom: 10,
    backgroundColor: '#1a1624',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  brandText: {
    color: '#f8fbff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  heroText: {
    maxWidth: 280,
    color: '#f7d7b8',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(19, 18, 26, 0.78)',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#ff8f2f',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    color: '#fffaf5',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#d7c8bd',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 18,
  },
  label: {
    color: '#fffaf5',
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrapper: {
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255, 218, 185, 0.24)',
    borderRadius: 18,
  },
  input: {
    color: '#fffaf5',
    fontSize: 15,
  },
  choiceFieldContainer: {
    marginBottom: 16,
    width: '100%',
  },
  genderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 7,
  },
  genderOption: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 218, 185, 0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  genderOptionSelected: {
    borderColor: '#ff9f43',
    backgroundColor: 'rgba(255, 138, 42, 0.2)',
  },
  genderOptionText: {
    color: '#d7c8bd',
    fontSize: 13,
    fontWeight: '700',
  },
  genderOptionTextSelected: {
    color: '#fffaf5',
  },
  dateFieldButton: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 7,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255, 218, 185, 0.24)',
    borderRadius: 18,
    borderWidth: 1,
  },
  dateFieldText: {
    flex: 1,
    color: '#fffaf5',
    fontSize: 15,
  },
  dateFieldPlaceholder: {
    color: '#9ca3af',
  },
  iosDatePickerContainer: {
    marginTop: 8,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 218, 185, 0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  iosDatePickerDoneButton: {
    alignSelf: 'flex-end',
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ff8a2a',
  },
  iosDatePickerDoneText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  otpInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    paddingHorizontal: 14,
  },
  otpFieldContainer: {
    marginBottom: 16,
    width: '100%',
  },
  inputErrorBorder: {
    borderColor: '#e11d48',
  },
  fieldErrorText: {
    color: '#e11d48',
    fontSize: 12,
    marginTop: 6,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#ff8a2a',
    borderRadius: 18,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(253, 164, 175, 0.35)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fecdd3',
    fontSize: 13,
    lineHeight: 18,
  },
  otpActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: 'rgba(255, 218, 185, 0.24)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
  },
  secondaryBtnDisabled: {
    opacity: 0.5,
  },
  secondaryBtnText: {
    color: '#fffaf5',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#d7c8bd',
    fontSize: 14,
  },
  linkText: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default RegisterScreen;
