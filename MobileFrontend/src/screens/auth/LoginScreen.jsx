import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { ResponseType } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { loginSchema } from '../../validations/authValidation';
import { useAuth } from '../../hooks/useAuth';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import appLogo from '../../../assets/reso-logo.png';
import authBg from '../../../assets/auth-bg.png';

WebBrowser.maybeCompleteAuthSession();

const navigateToHome = (navigation) => {
  navigation.reset({
    index: 0,
    routes: [
      {
        name: 'MainTabs',
        params: { screen: 'Home' },
      },
    ],
  });
};

const buildGoogleProxyRedirectUri = () => {
  const owner = process.env.EXPO_PUBLIC_EXPO_OWNER || '';
  const slug = 'MobileFrontend';

  if (!owner || owner === 'expo-username') {
    return '';
  }

  return `https://auth.expo.io/@${owner}/${slug}`;
};

const buildExpoProxyStartUrl = ({ authUrl, proxyRedirectUri, returnUrl }) => {
  const query = new URLSearchParams({ authUrl, returnUrl }).toString();
  return `${proxyRedirectUri}/start?${query}`;
};

export const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { login, googleLogin } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const notice = route.params?.notice;
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  const googleRedirectUri = buildGoogleProxyRedirectUri();
  const googleRequestRedirectUri = googleRedirectUri || 'https://auth.expo.io/@expo-username/MobileFrontend';

  const [googleRequest] = Google.useAuthRequest({
    clientId: googleClientId || 'missing-google-client-id',
    webClientId: googleClientId || 'missing-google-client-id',
    redirectUri: googleRequestRedirectUri,
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    try {
      setErrorMsg('');
      await login(data.email.trim().toLowerCase(), data.password);
      navigateToHome(navigation);
    } catch (err) {
      setErrorMsg(err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const handleGoogleLogin = async () => {
    if (!googleClientId) {
      setErrorMsg('Google login chưa được cấu hình.');
      return;
    }

    if (!googleRedirectUri) {
      setErrorMsg('Google redirect URI chưa được cấu hình.');
      return;
    }

    try {
      setErrorMsg('');
      setIsGoogleSubmitting(true);

      if (!googleRequest?.url) {
        setErrorMsg('Google login chưa sẵn sàng. Thử lại sau nhé.');
        return;
      }

      const returnUrl = AuthSession.getDefaultReturnUrl();
      const proxyStartUrl = buildExpoProxyStartUrl({
        authUrl: googleRequest.url,
        proxyRedirectUri: googleRedirectUri,
        returnUrl,
      });

      const browserResult = await WebBrowser.openAuthSessionAsync(proxyStartUrl, returnUrl);
      const result =
        browserResult.type === 'success'
          ? googleRequest.parseReturnUrl(browserResult.url)
          : browserResult;

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }

      if (result.type !== 'success') {
        setErrorMsg(result.params?.error_description || 'Google login chưa hoàn tất.');
        return;
      }

      const idToken = result.params?.id_token;
      if (!idToken) {
        setErrorMsg('Google không trả về ID token.');
        return;
      }

      await googleLogin(idToken);
      navigateToHome(navigation);
    } catch (err) {
      setErrorMsg(err?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

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
            <Text style={styles.heroTitle}>Feel the rhythm</Text>
            <Text style={styles.heroText}>Đăng nhập để giữ nhịp nghe nhạc của riêng bạn.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHandle} />
            <Text style={styles.title}>Đăng nhập</Text>
            <Text style={styles.subtitle}>Chào mừng quay lại.</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {notice && !errorMsg ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{notice}</Text>
              </View>
            ) : null}

            <Controller
              control={control}
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
                  error={errors.email?.message}
                  inputStyle={styles.input}
                  labelStyle={styles.label}
                  wrapperStyle={styles.inputWrapper}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Mật khẩu"
                  placeholder="Nhập mật khẩu"
                  secureTextEntry
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                  inputStyle={styles.input}
                  labelStyle={styles.label}
                  wrapperStyle={styles.inputWrapper}
                />
              )}
            />

            <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.linkText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <AppButton
              title="Đăng nhập"
              onPress={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
              buttonStyle={styles.primaryBtn}
              textStyle={styles.primaryBtnText}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, (!googleRequest || isGoogleSubmitting) && styles.disabledBtn]}
              activeOpacity={0.85}
              disabled={!googleRequest || isGoogleSubmitting}
              onPress={handleGoogleLogin}
            >
              <Text style={styles.googleBtnText}>
                {isGoogleSubmitting ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.linkText}>Tạo ngay</Text>
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
    maxWidth: 260,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 14,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#ff8a2a',
    borderRadius: 18,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    color: '#b9aeb8',
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  googleBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 218, 185, 0.24)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  googleBtnText: {
    color: '#fffaf5',
    fontSize: 15,
    fontWeight: '700',
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

export default LoginScreen;
