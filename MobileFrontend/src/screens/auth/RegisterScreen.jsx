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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import authService from '../../services/authService';
import { registerOtpSchema, registerSchema } from '../../validations/authValidation';

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

const waveBars = [6, 12, 18, 28, 40, 28, 18, 12, 6, 8, 12, 18, 34, 22, 12, 6];

export const RegisterScreen = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState('details');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [apiError, setApiError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState(5);
  const [otpValue, setOtpValue] = useState('');

  const detailsForm = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      email: '',
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

  const handleSendOtp = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      setApiError('');
      const response = await authService.requestRegisterOtp(normalizedEmail);
      const payload = getPayloadData(response);

      setPendingEmail(payload.email || normalizedEmail);
      setPendingPassword(password);
      setExpiresInMinutes(payload.expiresInMinutes || 5);
      startCooldown(payload.resendAfterSeconds || 0);
      setOtpValue('');
      otpForm.reset({ otp: '' });
      setStep('otp');
    } catch (error) {
      const emailError = getFieldErrorMessage(error, 'email');
      if (emailError) {
        detailsForm.setError('email', { type: 'server', message: emailError });
      }

      setApiError(error?.message || 'Unable to send OTP. Please try again.');
      startCooldown(error?.errors?.resendAfterSeconds || 0);
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
      });

      navigation.navigate('Login', {
        notice: `Account ${normalizedPendingEmail} was created successfully. Please sign in.`,
      });
    } catch (error) {
      const otpError = getFieldErrorMessage(error, 'otp');
      if (otpError) {
        otpForm.setError('otp', { type: 'server', message: otpError });
      }

      setApiError(error?.message || 'Unable to create account. Please try again.');
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
      setApiError(error?.message || 'Unable to resend OTP. Please try again.');
      startCooldown(error?.errors?.resendAfterSeconds || 0);
    } finally {
      setIsResendingOtp(false);
    }
  };

  const renderDetailsForm = () => (
    <>
      <Text style={styles.cardTitle}>Create Account</Text>
      <Text style={styles.cardSubtitle}>Use your email and password to join Reso.</Text>

      {apiError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      ) : null}

      <Controller
        control={detailsForm.control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Email"
            placeholder="Email Address"
            autoCapitalize="none"
            keyboardType="email-address"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={detailsErrors.email?.message}
            inputStyle={styles.customInput}
            labelStyle={styles.customLabel}
            wrapperStyle={styles.customInputWrapper}
          />
        )}
      />

      <Controller
        control={detailsForm.control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Password"
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={detailsErrors.password?.message}
            inputStyle={styles.customInput}
            labelStyle={styles.customLabel}
            wrapperStyle={styles.customInputWrapper}
          />
        )}
      />

      <Controller
        control={detailsForm.control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Confirm Password"
            placeholder="Confirm Password"
            secureTextEntry
            autoCapitalize="none"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={detailsErrors.confirmPassword?.message}
            inputStyle={styles.customInput}
            labelStyle={styles.customLabel}
            wrapperStyle={styles.customInputWrapper}
          />
        )}
      />

      <AppButton
        title="Send OTP"
        onPress={detailsForm.handleSubmit(handleSendOtp)}
        isLoading={detailsForm.formState.isSubmitting}
        buttonStyle={styles.primaryBtn}
        textStyle={styles.primaryBtnText}
      />
    </>
  );

  const renderOtpForm = () => (
    <>
      <Text style={styles.cardTitle}>Verify Email</Text>
      <Text style={styles.cardSubtitle}>
        Enter the 6-digit OTP sent to {normalizedPendingEmail}. It expires in about {expiresInMinutes} minutes.
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
            <Text style={styles.customLabel}>OTP</Text>
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
              style={[styles.customInputWrapper, styles.customInput, styles.otpInput, otpErrors.otp && styles.inputErrorBorder]}
              textContentType="oneTimeCode"
              value={otpValue}
            />
            {otpErrors.otp?.message ? <Text style={styles.fieldErrorText}>{otpErrors.otp.message}</Text> : null}
          </View>
        )}
      />

      <AppButton
        title="Create Account"
        onPress={otpForm.handleSubmit(handleRegister)}
        isLoading={otpForm.formState.isSubmitting}
        buttonStyle={styles.primaryBtn}
        textStyle={styles.primaryBtnText}
      />

      <View style={styles.otpActions}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('details')}>
          <Text style={styles.secondaryBtnText}>Edit email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, (remainingSeconds > 0 || isResendingOtp) && styles.secondaryBtnDisabled]}
          disabled={remainingSeconds > 0 || isResendingOtp}
          onPress={handleResendOtp}
        >
          <Text style={styles.secondaryBtnText}>
            {isResendingOtp ? 'Sending...' : remainingSeconds > 0 ? `Resend in ${remainingSeconds}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f14" />
      <View style={styles.glowLeft} />
      <View style={styles.glowRight} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <Text style={styles.tagline}>RESO MUSIC</Text>
          <Text style={styles.mainTitle}>JOIN THE</Text>
          <Text style={styles.gradientTextPlaceholder}>RHYTHM</Text>
          <Text style={styles.description}>Start your music journey today.</Text>
        </View>

        <View style={styles.waveContainer}>
          <View style={styles.waveLine} />
          <View style={styles.waveBarWrapper}>
            {waveBars.map((height, index) => (
              <View
                key={`${height}-${index}`}
                style={[
                  styles.waveBar,
                  {
                    height: height * 0.7,
                    backgroundColor: index < 9 ? '#ff9f43' : '#9b6cff',
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.waveLine} />
        </View>

        <View style={styles.card}>
          <Text style={styles.subBrand}>RESO MUSIC</Text>
          {step === 'details' ? renderDetailsForm() : renderOtpForm()}

          <View style={styles.footerLinks}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkTextBold}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f14',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  glowLeft: {
    position: 'absolute',
    top: '10%',
    left: '-20%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 159, 67, 0.15)',
    zIndex: 0,
  },
  glowRight: {
    position: 'absolute',
    bottom: '5%',
    right: '-20%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(155, 108, 255, 0.08)',
    zIndex: 0,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 25,
    zIndex: 1,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f5b66f',
    letterSpacing: 3,
    borderWidth: 1,
    borderColor: 'rgba(245,182,177,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 15,
  },
  gradientTextPlaceholder: {
    fontSize: 46,
    fontWeight: '900',
    color: '#ff9f43',
    lineHeight: 46,
  },
  description: {
    fontSize: 16,
    color: '#ece4da',
    marginTop: 10,
    fontStyle: 'italic',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
    zIndex: 1,
  },
  waveLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  waveBarWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 10,
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#ff9f43',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 10,
    zIndex: 1,
  },
  subBrand: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f5b66f',
    letterSpacing: 4,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#4e4e4e',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  customLabel: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 6,
  },
  customInputWrapper: {
    backgroundColor: '#f5f5f5',
    borderColor: '#000000',
    borderRadius: 25,
  },
  customInput: {
    color: '#1a1820',
    fontSize: 15,
  },
  otpInput: {
    textAlign: 'center',
    fontWeight: '700',
    height: 48,
    width: '100%',
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
    backgroundColor: '#ff9f43',
    borderRadius: 25,
    paddingVertical: 14,
    marginTop: 10,
    shadowColor: '#ff9f43',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(251,113,133,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  errorText: {
    color: '#e11d48',
    fontSize: 13,
    textAlign: 'center',
  },
  otpActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  secondaryBtnDisabled: {
    opacity: 0.5,
  },
  secondaryBtnText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 13,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  footerText: {
    fontSize: 14,
    color: '#6b6573',
  },
  linkTextBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
});

export default RegisterScreen;
