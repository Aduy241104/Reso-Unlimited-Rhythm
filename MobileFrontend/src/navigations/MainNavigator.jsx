import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigator } from './BottomTabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import EntityDetailScreen from '../screens/detail/EntityDetailScreen';
import PremiumOverviewScreen from '../screens/premium/PremiumOverviewScreen';
import PremiumPlanDetailScreen from '../screens/premium/PremiumPlanDetailScreen';
import PremiumCheckoutScreen from '../screens/premium/PremiumCheckoutScreen';
import PremiumPaymentResultScreen from '../screens/premium/PremiumPaymentResultScreen';
import TrackLyricsScreen from '../screens/player/TrackLyricsScreen';

const Stack = createNativeStackNavigator();

export const MainNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="MainTabs" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: true,
          title: 'Đăng nhập',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="EntityDetail"
        component={EntityDetailScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="TrackLyrics"
        component={TrackLyricsScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="PremiumOverview"
        component={PremiumOverviewScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="PremiumPlanDetail"
        component={PremiumPlanDetailScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="PremiumCheckout"
        component={PremiumCheckoutScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="PremiumPaymentSuccess"
        component={PremiumPaymentResultScreen}
        options={{
          headerShown: false,
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="PremiumPaymentFailed"
        component={PremiumPaymentResultScreen}
        options={{
          headerShown: false,
          animation: 'fade_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
};
