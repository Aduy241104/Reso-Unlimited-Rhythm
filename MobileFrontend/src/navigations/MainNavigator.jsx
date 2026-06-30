import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigator } from './BottomTabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import EntityDetailScreen from '../screens/detail/EntityDetailScreen';
import PlayerSheetScreen from '../screens/player/PlayerSheetScreen';

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
          title: 'Login',
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
        name="PlayerSheet"
        component={PlayerSheetScreen}
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack.Navigator>
  );
};
