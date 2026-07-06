import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/search/SearchScreen';
import LibraryScreen from '../screens/library/LibraryScreen';
import PremiumOverviewScreen from '../screens/premium/PremiumOverviewScreen';
import CreateForMeScreen from '../screens/createForMe/CreateForMeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import EntityDetailScreen from '../screens/detail/EntityDetailScreen';
import PlayerSheetScreen from '../screens/player/PlayerSheetScreen';
import AppTabBar from '../components/navigation/AppTabBar';
import theme from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcons = {
  Home: { active: 'home', inactive: 'home-outline' },
  Search: { active: 'search', inactive: 'search-outline' },
  Library: { active: 'library', inactive: 'library-outline' },
  Premium: { active: 'diamond', inactive: 'diamond-outline' },
  CreateForMe: { active: 'sparkles', inactive: 'sparkles-outline' },
};

function SharedTabStack({ rootName, component: RootComponent }) {
  return (
    <Stack.Navigator initialRouteName={rootName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name={rootName} component={RootComponent} />
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
}

const HomeStack = () => <SharedTabStack rootName="HomeScreen" component={HomeScreen} />;
const SearchStack = () => <SharedTabStack rootName="SearchScreen" component={SearchScreen} />;
const LibraryStack = () => <SharedTabStack rootName="LibraryScreen" component={LibraryScreen} />;
const PremiumStack = () => <SharedTabStack rootName="PremiumScreen" component={PremiumOverviewScreen} />;
const CreateForMeStack = () => <SharedTabStack rootName="CreateForMeScreen" component={CreateForMeScreen} />;

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
        component={HomeStack}
        options={{ tabBarLabel: 'Trang chủ' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{ tabBarLabel: 'Tìm kiếm' }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStack}
        options={{ tabBarLabel: 'Thư viện' }}
      />
      <Tab.Screen
        name="Premium"
        component={PremiumStack}
        options={{ tabBarLabel: 'Premium' }}
      />
      <Tab.Screen
        name="CreateForMe"
        component={CreateForMeStack}
        options={{ tabBarLabel: 'Tạo cho tôi' }}
      />
    </Tab.Navigator>
  );
};
