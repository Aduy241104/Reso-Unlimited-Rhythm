import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { MainNavigator } from './MainNavigator';
import AppLoader from '../components/common/AppLoader';
import { navigationRef } from './navigationRef';
import { APP_LINK_PREFIX, PAYMENT_FAILED_PATH, PAYMENT_SUCCESS_PATH } from '../config/linking';
import theme from '../theme';

export const RootNavigator = () => {
  const { isLoading } = useAuth();

  const linking = {
    prefixes: [APP_LINK_PREFIX],
    config: {
      screens: {
        PremiumPaymentSuccess: PAYMENT_SUCCESS_PATH,
        PremiumPaymentFailed: PAYMENT_FAILED_PATH,
      },
    },
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <AppLoader size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <MainNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
});
