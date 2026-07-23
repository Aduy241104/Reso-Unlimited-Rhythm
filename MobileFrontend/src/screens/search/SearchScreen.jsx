import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import GenreCard from '../../components/search/GenreCard';
import SearchResultSection from '../../components/search/SearchResultSection';
import genreService from '../../services/genreService';
import searchService from '../../services/searchService';
import theme from '../../theme';

const FALLBACK_GENRE_COLORS = [
  '#E13300',
  '#1E3264',
  '#8D67AB',
  '#148A08',
  '#E8115B',
  '#27856A',
  '#BA5D07',
  '#BC5900',
  '#503750',
  '#777777',
];

const initialSearchResults = {
  tracks: [],
  artists: [],
  albums: [],
};

const getFallbackColor = (genre, index) => {
  const source = `${genre?.genreId || genre?.id || index}`;
  const hash = Array.from(source).reduce((total, character) => total + character.charCodeAt(0), 0);

  return FALLBACK_GENRE_COLORS[hash % FALLBACK_GENRE_COLORS.length];
};

const resolveGenreColor = (genre, index) => {
  const backendColor = typeof genre?.color === 'string' ? genre.color.trim() : '';
  return backendColor || getFallbackColor(genre, index);
};

export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [genres, setGenres] = useState([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(initialSearchResults);

  const trimmedSearchText = searchText.trim();
  const isSearchMode = trimmedSearchText.length > 0;

  const loadGenres = useCallback(async () => {
    setIsLoadingGenres(true);

    try {
      const result = await genreService.getGenres();
      setGenres(Array.isArray(result?.items) ? result.items : []);
    } finally {
      setIsLoadingGenres(false);
    }
  }, []);

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  useEffect(() => {
    if (!trimmedSearchText) {
      setIsSearching(false);
      setSearchResults(initialSearchResults);
      return undefined;
    }

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const result = await searchService.searchAll(trimmedSearchText);

        setSearchResults({
          tracks: Array.isArray(result?.tracks) ? result.tracks : [],
          artists: Array.isArray(result?.artists) ? result.artists : [],
          albums: Array.isArray(result?.albums) ? result.albums : [],
        });
      } catch (error) {
        console.log('Search failed:', error);
        setSearchResults(initialSearchResults);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [trimmedSearchText]);

  const availableRouteNames = navigation?.getState?.()?.routeNames || [];

  const handlePressGenre = useCallback(
    (genre, genreColor) => {
      const genreId = genre?._id || genre?.id || genre?.genreId;

      if (!genreId) {
        return;
      }

      navigation.navigate('GenreDetail', {
        genreId,
        genreName: genre?.name,
        genreImage: genre?.coverImage || genre?.image || genre?.avatar,
        genreColor: genre?.color || genreColor,
      });
    },
    [navigation]
  );

  const handlePressTrack = useCallback(
    (item) => {
      const trackId = item?._id || item?.id;

      if (!trackId) {
        return;
      }

      navigation.navigate('TrackDetail', { trackId });
    },
    [navigation]
  );

  const handlePressArtist = useCallback(
    (item) => {
      const artistId = item?._id || item?.id;

      if (!artistId) {
        return;
      }

      if (availableRouteNames.includes('ArtistProfile')) {
        navigation.navigate('ArtistProfile', { artistId });
        return;
      }

      navigation.navigate('EntityDetail', {
        entityType: 'artist',
        entityId: artistId,
        initialTitle: item?.title || item?.name || 'Nghệ sĩ',
      });
    },
    [availableRouteNames, navigation]
  );

  const handlePressAlbum = useCallback(
    (item) => {
      const albumId = item?._id || item?.id;

      if (!albumId) {
        return;
      }

      if (availableRouteNames.includes('AlbumDetail')) {
        navigation.navigate('AlbumDetail', { albumId });
        return;
      }

      navigation.navigate('EntityDetail', {
        entityType: 'album',
        entityId: albumId,
        initialTitle: item?.title || 'Album',
      });
    },
    [availableRouteNames, navigation]
  );

  const renderGenreCard = useCallback(
    ({ item, index }) => {
      const genreColor = resolveGenreColor(item, index);

      return (
        <View style={styles.genreCardSlot}>
          <GenreCard
            backgroundColor={genreColor}
            genre={item}
            onPress={(genre) => handlePressGenre(genre, genreColor)}
          />
        </View>
      );
    },
    [handlePressGenre]
  );

  const renderScreenTitle = <Text style={styles.screenTitle}>Tìm kiếm</Text>;

  const renderSearchHeader = (
    <View style={styles.headerContent}>
      {renderScreenTitle}

      <View style={styles.searchBar}>
        <Ionicons color="#111111" name="search" size={22} />
        <TextInput
          onChangeText={setSearchText}
          placeholder="Bạn muốn nghe gì?"
          placeholderTextColor="#6B7280"
          selectionColor="#111111"
          style={styles.searchInput}
          value={searchText}
        />
      </View>

      <SearchResultSection
        albums={searchResults.albums}
        artists={searchResults.artists}
        isLoading={isSearching}
        onPressAlbum={handlePressAlbum}
        onPressArtist={handlePressArtist}
        onPressTrack={handlePressTrack}
        tracks={searchResults.tracks}
      />
    </View>
  );

  const renderGenreHeader = (
    <View style={styles.headerContent}>
      {renderScreenTitle}

      <View style={styles.searchBar}>
        <Ionicons color="#111111" name="search" size={22} />
        <TextInput
          onChangeText={setSearchText}
          placeholder="Bạn muốn nghe gì?"
          placeholderTextColor="#6B7280"
          selectionColor="#111111"
          style={styles.searchInput}
          value={searchText}
        />
      </View>

      <Text style={styles.title}>Duyệt tìm tất cả</Text>
    </View>
  );

  if (isSearchMode) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <StatusBar style="light" />

        <ScrollView
          key="search-results"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) + 12 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderSearchHeader}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar style="light" />

      <FlatList
        key="genre-grid"
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) + 12 },
        ]}
        data={genres}
        keyExtractor={(item, index) => item?.id || item?._id || `genre-${index}`}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isLoadingGenres ? (
            <View style={styles.centerState}>
              <AppLoader color="#ffffff" size="large" />
            </View>
          ) : (
            <View style={styles.centerState}>
              <Text style={styles.emptyText}>Chưa có thể loại.</Text>
            </View>
          )
        }
        ListHeaderComponent={renderGenreHeader}
        numColumns={2}
        renderItem={renderGenreCard}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerContent: {
    paddingBottom: 20,
  },
  screenTitle: {
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: -0.45,
    marginBottom: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: '#111111',
    fontSize: 16,
    paddingVertical: 0,
  },
  title: {
    marginTop: 24,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  genreCardSlot: {
    width: '48.2%',
    marginBottom: 14,
  },
  centerState: {
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#b3b3b3',
    fontSize: 15,
    textAlign: 'center',
  },
});
