import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppButton from '../../components/common/AppButton';
import AppHeader from '../../components/common/AppHeader';
import theme from '../../theme';

export default function PremiumScreen() {
  const navigation = useNavigation();

  const openScreen = (screenName) => {
    const parentNavigation = navigation.getParent();

    if (parentNavigation) {
      parentNavigation.navigate(screenName);
      return;
    }

    navigation.navigate(screenName);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Premium" />
      <View style={styles.content}>
        <Text style={styles.title}>Khám phá Premium</Text>
        <Text style={styles.text}>
          Chọn nơi bạn muốn tiếp tục để xem gói Premium hoặc kiểm tra các giao dịch đã thanh toán.
        </Text>

        <View style={styles.actions}>
          <AppButton title="Xem các gói Premium" onPress={() => openScreen('PremiumOverview')} style={styles.primaryButton} />
          <AppButton title="Lịch sử thanh toán" onPress={() => openScreen('PaymentHistory')} style={styles.secondaryButton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  text: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    marginTop: 12,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#f0c15d',
  },
  secondaryButton: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: '#2c2c34',
  },
});
