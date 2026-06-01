import React, { useState } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginSchema } from '../../validations/authValidation';
import { useAuth } from '../../hooks/useAuth';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import theme from '../../theme';

export const LoginScreen = () => {
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    try {
      setErrorMsg(null);
      await login(data.email, data.password);
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    }
  };

  // Các thanh sóng nhạc tượng trưng giả lập từ bản Web
  const waveBars = [6, 12, 18, 28, 40, 28, 18, 12, 6, 8, 12, 18, 34, 22, 12, 6];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f14" />
      
      {/* Các đốm sáng Neon chạy ngầm phía sau (Glow Effect) */}
      <View style={styles.glowLeft} />
      <View style={styles.glowRight} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        
        {/* KHỐI BRANDING ĐẬM CHẤT MUSIC */}
        <View style={styles.headerContainer}>
          <Text style={styles.tagline}>DARK SOUNDSCAPE</Text>
          <Text style={styles.mainTitle}>FEEL THE</Text>
          <Text style={styles.gradientTextPlaceholder}>RHYTHM</Text>
          <Text style={styles.description}>Music is the voice of the soul.</Text>
        </View>

        {/* ĐỒNG BỘ DẢI SÓNG NHẠC (WAVE BARS) TỪ WEB XUỐNG MOBILE */}
        <View style={styles.waveContainer}>
          <View style={styles.waveLine} />
          <View style={styles.waveBarWrapper}>
            {waveBars.map((height, index) => (
              <View 
                key={index} 
                style={[
                  styles.waveBar, 
                  { 
                    height: height * 0.7, // Thu nhỏ một chút để vừa vặn màn hình dọc mobile
                    backgroundColor: index < 9 ? '#ff9f43' : '#9b6cff' 
                  }
                ]} 
              />
            ))}
          </View>
          <View style={styles.waveLine} />
        </View>

        {/* KHỐI FORM ĐĂNG NHẬP TRẮNG NỔI BẬT TRÊN NỀN TỐI (GIỐNG ẢNH WEB) */}
        <View style={styles.card}>
          <Text style={styles.subBrand}>RESO MUSIC</Text>
          <Text style={styles.cardTitle}>Login</Text>
          <Text style={styles.cardSubtitle}>Login to continue your music journey.</Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Controller
            control={control}
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
                error={errors.email?.message}
                inputStyle={styles.customInput}
                labelStyle={styles.customLabel}
              />
            )}
          />

          <Controller
            control={control}
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
                error={errors.password?.message}
                inputStyle={styles.customInput}
                labelStyle={styles.customLabel}
              />
            )}
          />

          {/* NÚT SIGN IN CHUYỂN SẮC CAM CHÁY */}
          <AppButton 
            title="Sign In" 
            onPress={handleSubmit(onSubmit)} 
            isLoading={isSubmitting} 
            buttonStyle={styles.signInBtn}
            textStyle={styles.signInBtnText}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* NÚT GOOGLE GIẢ LẬP GIAO DIỆN WEB */}
          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.8}>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* FOOTER CHUYỂN ĐIỀU HƯỚNG */}
          <View style={styles.footerLinks}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity><Text style={styles.linkTextBold}>Create one</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.linkTextSmall}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0f0f14' // Nền tối huyền ảo khớp bản Web
  },
  scroll: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  // Hiệu ứng phát sáng Neon phía sau background
  glowLeft: {
    position: 'absolute',
    top: '10%',
    left: '-20%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 159, 67, 0.15)',
    verticalAlign: 'middle',
    shadowBlur: 100,
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
  // Khối tiêu đề nhạc
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
    letterSpacing: -1,
  },
  gradientTextPlaceholder: {
    fontSize: 46,
    fontWeight: '900',
    color: '#ff9f43', // Thay cho dải gradient màu cam cháy đặc trưng
    letterSpacing: 1,
    lineHeight: 46,
  },
  description: {
    fontSize: 16,
    color: '#ece4da',
    marginTop: 10,
    fontStyle: 'italic',
  },
  // Khối sóng âm thanh
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
  // Khối Card trắng chứa form đăng nhập (Đồng bộ chuẩn Form ảnh của bạn)
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
  customInput: {
    backgroundColor: '#f5f5f5',
    borderColor: '#000000',
    borderRadius: 25, // Bo tròn chuẩn form của bạn
    paddingHorizontal: 16,
    color: '#1a1820',
  },
  signInBtn: {
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
  signInBtnText: {
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    my: 20,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dividerText: {
    fontSize: 10,
    color: '#6b6573',
    fontWeight: '700',
    marginHorizontal: 10,
    letterSpacing: 2,
  },
  googleBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  googleBtnText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
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
  forgotBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  linkTextSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b6573',
  },
});

export default LoginScreen;