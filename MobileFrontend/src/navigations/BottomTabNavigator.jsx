import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/search/SearchScreen';
import FollowedAlbumsScreen from '../screens/library/FollowedAlbumsScreen';
import LibraryScreen from '../screens/library/LibraryScreen';
import FollowedArtistsScreen from '../screens/library/FollowedArtistsScreen';
import CreateForMeScreen from '../screens/createForMe/CreateForMeScreen';
import EntityDetailScreen from '../screens/detail/EntityDetailScreen';
import FavoriteTracksScreen from '../screens/favorite/FavoriteTracksScreen';
import PlaylistDetailScreen from '../screens/playlist/PlaylistDetailScreen';
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

function PremiumRedirectScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const parentNavigation = navigation.getParent();

    if (parentNavigation) {
      parentNavigation.navigate('PremiumOverview');
    }
  }, [navigation]);

  return <View style={styles.redirectScreen} />;
}

function SharedTabStack({ rootName, component: RootComponent }) {
  return (
    <Stack.Navigator initialRouteName={rootName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name={rootName} component={RootComponent} />
      <Stack.Screen
        name="EntityDetail"
        component={EntityDetailScreen}
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
        component={PremiumRedirectScreen}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.getParent()?.navigate('PremiumOverview');
          },
        })}
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

const styles = {
  redirectScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
};
