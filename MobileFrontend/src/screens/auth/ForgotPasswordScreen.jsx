import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import authService from '../../services/authService';
import { forgotPasswordSchema, resetPasswordSchema } from '../../validations/authValidation';
import appLogo from '../../../assets/reso-logo.png';
import authBg from '../../../assets/auth-bg.png';

const getPayloadData = (response) => response?.data || response || {};

const getFieldErrorMessage = (error, fieldName) => {
  if (Array.isArray(error?.errors)) {
    return error.errors.find((item) => item?.field === fieldName)?.message;
  }

  if (error?.errors?.field === fieldName) {
    return error.errors.message || error.message;
  }

  return '';
};

const getCooldownSeconds = (error) => {
  if (typeof error?.errors?.resendAfterSeconds === 'number') {
    return error.errors.resendAfterSeconds;
  }

  return 0;
};

export const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState('email');
  const [pendingEmail, setPendingEmail] = useState('');
  const [apiError, setApiError] = useState('');
  const [apiMessage, setApiMessage] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [expiresInMinutes, setExpiresInMinutes] = useState(15);
  const [otpValue, setOtpValue] = useState('');

  const emailForm = useForm({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      otp: '',
      password: '',
      confirmPassword: '',
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

  const normalizedPendingEmail = useMemo(() => pendingEmail.trim().toLowerCase(), [pendingEmail]);
  const emailErrors = emailForm.formState.errors;
  const resetErrors = resetForm.formState.errors;

  const startCooldown = (seconds) => {
    setRemainingSeconds(seconds > 0 ? seconds : 0);
  };

  const handleSendResetOtp = async ({ email }) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      setApiError('');
      setApiMessage('');
      const response = await authService.forgotPassword(normalizedEmail);
      const payload = getPayloadData(response);

      setPendingEmail(normalizedEmail);
      setExpiresInMinutes(payload?.expiresInMinutes || 15);
      startCooldown(payload?.resendAfterSeconds || 0);
      setOtpValue('');
      resetForm.reset({ otp: '', password: '', confirmPassword: '' });
      setApiMessage(response?.message || 'Nếu email tồn tại, mã OTP đã được gửi.');
      setStep('reset');
    } catch (error) {
      const emailError = getFieldErrorMessage(error, 'email');
      if (emailError) {
        emailForm.setError('email', { type: 'server', message: emailError });
      }

      setApiError(error?.message || 'Không gửi được OTP đặt lại mật khẩu. Vui lòng thử lại.');
      startCooldown(getCooldownSeconds(error));
    }
  };

  const handleResetPassword = async ({ password, confirmPassword }) => {
    if (!normalizedPendingEmail) {
      setStep('email');
      return;
    }

    try {
      setApiError('');
      await authService.resetPassword({
        email: normalizedPendingEmail,
        otp: otpValue,
        password,
        confirmPassword,
      });

      navigation.navigate('Login', {
        notice: 'Đặt lại mật khẩu thành công. Đăng nhập bằng mật khẩu mới nhé.',
      });
    } catch (error) {
      ['otp', 'password', 'confirmPassword'].forEach((fieldName) => {
        const fieldError = getFieldErrorMessage(error, fieldName);
        if (fieldError) {
          resetForm.setError(fieldName, { type: 'server', message: fieldError });
        }
      });

      setApiError(error?.message || 'Không đặt lại được mật khẩu. Vui lòng thử lại.');
    }
  };

  const handleResendOtp = async () => {
    if (!normalizedPendingEmail || remainingSeconds > 0) {
      return;
    }

    await handleSendResetOtp({ email: normalizedPendingEmail });
  };

  const renderEmailStep = () => (
    <>
      <Text style={styles.title}>Quên mật khẩu</Text>
      <Text style={styles.subtitle}>Nhập email để nhận mã OTP đặt lại mật khẩu.</Text>

      {apiError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      ) : null}

      <Controller
        control={emailForm.control}
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
            error={emailErrors.email?.message}
            inputStyle={styles.input}
            labelStyle={styles.label}
            wrapperStyle={styles.inputWrapper}
          />
        )}
      />

      <AppButton
        title={remainingSeconds > 0 ? `Thử lại sau ${remainingSeconds}s` : 'Gửi mã OTP'}
        onPress={emailForm.handleSubmit(handleSendResetOtp)}
        isLoading={emailForm.formState.isSubmitting}
        disabled={remainingSeconds > 0}
        buttonStyle={styles.primaryBtn}
        textStyle={styles.primaryBtnText}
      />
    </>
  );

  const renderResetStep = () => (
    <>
      <Text style={styles.title}>Đặt lại mật khẩu</Text>
      <Text style={styles.subtitle}>
        Nhập mã 6 số đã gửi tới {normalizedPendingEmail}. Mã hết hạn sau khoảng {expiresInMinutes} phút.
      </Text>

      {apiMessage && !apiError ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{apiMessage}</Text>
        </View>
      ) : null}

      {apiError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      ) : null}

      <Controller
        control={resetForm.control}
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
                resetForm.setValue('otp', nextOtp, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: Boolean(resetErrors.otp),
                });
              }}
              placeholder="123456"
              placeholderTextColor="#b7aeb8"
              returnKeyType="done"
              selectionColor="#ff9f43"
              style={[styles.inputWrapper, styles.input, styles.otpInput, resetErrors.otp && styles.inputErrorBorder]}
              textContentType="oneTimeCode"
              value={otpValue}
            />
            {resetErrors.otp?.message ? <Text style={styles.fieldErrorText}>{resetErrors.otp.message}</Text> : null}
          </View>
        )}
      />

      <Controller
        control={resetForm.control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Mật khẩu mới"
            placeholder="Tối thiểu 6 ký tự"
            secureTextEntry
            autoCapitalize="none"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={resetErrors.password?.message}
            inputStyle={styles.input}
            labelStyle={styles.label}
            wrapperStyle={styles.inputWrapper}
          />
        )}
      />

      <Controller
        control={resetForm.control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Nhập lại mật khẩu"
            placeholder="Nhập lại mật khẩu"
            secureTextEntry
            autoCapitalize="none"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={resetErrors.confirmPassword?.message}
            inputStyle={styles.input}
            labelStyle={styles.label}
            wrapperStyle={styles.inputWrapper}
          />
        )}
      />

      <AppButton
        title="Đặt lại mật khẩu"
        onPress={resetForm.handleSubmit(handleResetPassword)}
        isLoading={resetForm.formState.isSubmitting}
        buttonStyle={styles.primaryBtn}
        textStyle={styles.primaryBtnText}
      />

      <View style={styles.resetActions}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('email')}>
          <Text style={styles.secondaryBtnText}>Sửa email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, remainingSeconds > 0 && styles.secondaryBtnDisabled]}
          disabled={remainingSeconds > 0}
          onPress={handleResendOtp}
        >
          <Text style={styles.secondaryBtnText}>
            {remainingSeconds > 0 ? `Gửi lại sau ${remainingSeconds}s` : 'Gửi lại OTP'}
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
            <Text style={styles.heroTitle}>Reset the password</Text>
            <Text style={styles.heroText}>Lấy lại tài khoản để quay về playlist của bạn.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHandle} />
            {step === 'email' ? renderEmailStep() : renderResetStep()}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Nhớ mật khẩu rồi? </Text>
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
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 16,
    textAlign: 'center',
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
  cardHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 184, 107, 0.5)',
    marginBottom: 18,
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
  otpFieldContainer: {
    marginBottom: 16,
    width: '100%',
  },
  otpInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    paddingHorizontal: 14,
  },
  inputErrorBorder: {
    borderColor: '#e11d48',
  },
  fieldErrorText: {
    color: '#fecdd3',
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
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(187, 247, 208, 0.3)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#bbf7d0',
    fontSize: 13,
    lineHeight: 18,
  },
  resetActions: {
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

export default ForgotPasswordScreen;
