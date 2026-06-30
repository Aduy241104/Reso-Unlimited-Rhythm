import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/search/SearchScreen';
import LibraryScreen from '../screens/library/LibraryScreen';
import PremiumScreen from '../screens/premium/PremiumScreen';
import CreateForMeScreen from '../screens/createForMe/CreateForMeScreen';
import AppTabBar from '../components/navigation/AppTabBar';
import theme from '../theme';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Home: { active: 'home', inactive: 'home-outline' },
  Search: { active: 'search', inactive: 'search-outline' },
  Library: { active: 'library', inactive: 'library-outline' },
  Premium: { active: 'diamond', inactive: 'diamond-outline' },
  CreateForMe: { active: 'sparkles', inactive: 'sparkles-outline' },
};

export const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#7d7d7d',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const iconSet = tabIcons[route.name] || tabIcons.Home;
          const iconName = focused ? iconSet.active : iconSet.inactive;

          return <Ionicons name={iconName} size={size || 22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Trang chủ' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarLabel: 'Tìm kiếm' }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{ tabBarLabel: 'Thư viện' }}
      />
      <Tab.Screen
        name="Premium"
        component={PremiumScreen}
        options={{ tabBarLabel: 'Premium' }}
      />
      <Tab.Screen
        name="CreateForMe"
        component={CreateForMeScreen}
        options={{ tabBarLabel: 'Tạo cho tôi' }}
      />
    </Tab.Navigator>
  );
};
