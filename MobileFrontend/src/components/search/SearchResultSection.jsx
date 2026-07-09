import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppLoader from '../common/AppLoader';
import theme from '../../theme';
import { getInitials, resolveImageUri } from '../../utils/media';

const Section = ({ title, items, onPressItem }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {items.map((item, index) => {
        const imageUri = resolveImageUri(item?.image || item?.coverImage || item?.avatar);
        const itemKey = `${item?.id || item?._id || title}-${index}`;
        const displayTitle = item?.title || item?.name || 'Không xác định';

        return (
          <TouchableOpacity
            key={itemKey}
            activeOpacity={0.82}
            onPress={() => onPressItem?.(item)}
            style={styles.itemRow}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.itemImage} resizeMode="cover" />
            ) : (
              <View style={styles.itemImageFallback}>
                <Text style={styles.itemImageFallbackText}>{getInitials(displayTitle)}</Text>
              </View>
            )}

            <View style={styles.itemContent}>
              <Text numberOfLines={1} style={styles.itemTitle}>
                {displayTitle}
              </Text>
              <Text numberOfLines={1} style={styles.itemSubtitle}>
                {item?.subtitle || ''}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const SearchResultSection = ({
  albums = [],
  artists = [],
  isLoading = false,
  onPressAlbum,
  onPressArtist,
  onPressTrack,
  tracks = [],
}) => {
  const hasAnyResults = tracks.length > 0 || artists.length > 0 || albums.length > 0;

  if (isLoading) {
    return (
      <View style={styles.stateBox}>
        <AppLoader color="#ffffff" size="large" />
      </View>
    );
  }

  if (!hasAnyResults) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.emptyText}>Không tìm thấy kết quả.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Section items={tracks} onPressItem={onPressTrack} title="Bài hát" />
      <Section items={artists} onPressItem={onPressArtist} title="Nghệ sĩ" />
      <Section items={albums} onPressItem={onPressAlbum} title="Album" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    marginBottom: 10,
  },
  itemImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#202020',
  },
  itemImageFallback: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImageFallbackText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: theme.typography.weights.semibold,
  },
  itemSubtitle: {
    marginTop: 4,
    color: '#9a9a9a',
    fontSize: 13,
  },
  stateBox: {
    marginTop: 18,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#b3b3b3',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default SearchResultSection;
