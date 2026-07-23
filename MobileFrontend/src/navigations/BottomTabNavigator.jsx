
import React from 'react';

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/search/SearchScreen';
import GenreDetailScreen from '../screens/search/GenreDetailScreen';
import FollowedAlbumsScreen from '../screens/library/FollowedAlbumsScreen';
import LibraryScreen from '../screens/library/LibraryScreen';
import FollowedArtistsScreen from '../screens/library/FollowedArtistsScreen';
import CreateForMeScreen from '../screens/createForMe/CreateForMeScreen';
import EntityDetailScreen from '../screens/detail/EntityDetailScreen';
import FavoriteTracksScreen from '../screens/favorite/FavoriteTracksScreen';
import PlaylistDetailScreen from '../screens/playlist/PlaylistDetailScreen';
import PlayerSheetScreen from '../screens/player/PlayerSheetScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import RankingListScreen from '../screens/ranking/RankingListScreen';

import PremiumScreen from '../screens/premium/PremiumScreen';

import ArtistRegistrationRequestDetailScreen from '../screens/profile/ArtistRegistrationRequestDetailScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import SubscriptionStatusScreen from '../screens/subscription/SubscriptionStatusScreen';
import ArtistRegistrationRequestMobileScreen from '../screens/profile/ArtistRegistrationRequestMobileScreen';
import CreateReportScreen from '../screens/report/CreateReportScreen';
import ReportDetailScreen from '../screens/report/ReportDetailScreen';
import ReportListScreen from '../screens/report/ReportListScreen';

import AppTabBar from '../components/navigation/AppTabBar';
import theme from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const TAB_ICON_SIZE = 22;

const tabIcons = {
  Home: { active: 'home', inactive: 'home-outline' },
  Search: { active: 'search', inactive: 'search-outline' },
  Library: { active: 'library', inactive: 'library-outline' },
  Premium: { active: 'star', inactive: 'star-outline' },
  CreateForMe: { active: 'sparkles', inactive: 'sparkles-outline' },
};

function SharedTabStack({ rootName, component: RootComponent }) {
  return (
    <Stack.Navigator initialRouteName={rootName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name={rootName} component={RootComponent} />
      <Stack.Screen
        name="GenreDetail"
        component={GenreDetailScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="TrackDetail"
        component={EntityDetailScreen}
        options={{
          headerShown: false,
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
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="RankingList"
        component={RankingListScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="PlaylistDetail"
        component={PlaylistDetailScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="FavoriteTracks"
        component={FavoriteTracksScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="FollowedArtists"
        component={FollowedArtistsScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
            <Stack.Screen
        name="FollowedAlbums"
        component={FollowedAlbumsScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="SubscriptionStatus"
        component={SubscriptionStatusScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ArtistRegistrationRequest"
        component={ArtistRegistrationRequestMobileScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ArtistRegistrationRequestDetail"
        component={ArtistRegistrationRequestDetailScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="CreateReport"
        component={CreateReportScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ReportList"
        component={ReportListScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
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
const CreateForMeStack = () => <SharedTabStack rootName="CreateForMeScreen" component={CreateForMeScreen} />;

export const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.primaryLight,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarIcon: ({ color, size, focused }) => {
          const iconSet = tabIcons[route.name] || tabIcons.Home;
          const iconName = focused ? iconSet.active : iconSet.inactive;

          return (
            <Ionicons
              name={iconName}
              size={Math.max(size || TAB_ICON_SIZE, TAB_ICON_SIZE)}
              color={color}
            />
          );
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
        component={PremiumScreen}
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
