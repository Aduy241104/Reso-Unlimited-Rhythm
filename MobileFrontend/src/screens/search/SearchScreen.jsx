import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoader from '../../components/common/AppLoader';
import GenreCard from '../../components/search/GenreCard';
import genreService from '../../services/genreService';
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

const getFallbackColor = (genre, index) => {
  const source = `${genre?.genreId || genre?.id || index}`;
  const hash = Array.from(source).reduce((total, character) => total + character.charCodeAt(0), 0);

  return FALLBACK_GENRE_COLORS[hash % FALLBACK_GENRE_COLORS.length];
};

const resolveGenreColor = (genre, index) => {
  const backendColor = typeof genre?.color === 'string' ? genre.color.trim() : '';
  return backendColor || getFallbackColor(genre, index);
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [genres, setGenres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadGenres = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await genreService.getGenres();
      setGenres(Array.isArray(result?.items) ? result.items : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  const handlePressGenre = useCallback((genre) => {
    const genreId = genre?.genreId || genre?.id;
    console.log(genreId);
  }, []);

  const renderGenreCard = useCallback(
    ({ item, index }) => (
      <View style={styles.genreCardSlot}>
        <GenreCard
          backgroundColor={resolveGenreColor(item, index)}
          genre={item}
          onPress={handlePressGenre}
        />
      </View>
    ),
    [handlePressGenre]
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerContent}>
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
    ),
    [searchText]
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar style="light" />

      <FlatList
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) + 12 },
        ]}
        data={genres}
        keyExtractor={(item, index) => item?.id || item?._id || `genre-${index}`}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerState}>
              <AppLoader color="#ffffff" size="large" />
            </View>
          ) : (
            <View style={styles.centerState}>
              <Text style={styles.emptyText}>Chưa có thể loại.</Text>
            </View>
          )
        }
        ListHeaderComponent={renderHeader}
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
