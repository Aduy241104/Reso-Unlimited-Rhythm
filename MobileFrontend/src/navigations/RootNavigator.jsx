import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { MainNavigator } from './MainNavigator';
import AppLoader from '../components/common/AppLoader';
import { navigationRef } from './navigationRef';
import theme from '../theme';

export const RootNavigator = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <AppLoader size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <MainNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
});
