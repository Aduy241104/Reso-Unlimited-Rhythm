import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import theme from '../../theme';
import { getInitials, resolveImageUri } from '../../utils/media';

export const GenreCard = ({ genre, backgroundColor, onPress }) => {
  const title = genre?.name || 'Genre';
  const imageUri = resolveImageUri(genre?.coverImage || genre?.image);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress?.(genre)}
      style={[styles.card, { backgroundColor }]}
    >
      <Text numberOfLines={2} style={styles.title}>
        {title}
      </Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.coverImage} />
      ) : (
        <View style={styles.coverFallback}>
          <Text style={styles.coverFallbackText}>{getInitials(title)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 118,
    borderRadius: 14,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    maxWidth: '72%',
  },
  coverImage: {
    position: 'absolute',
    right: -12,
    bottom: -12,
    width: 78,
    height: 78,
    borderRadius: 10,
    transform: [{ rotate: '18deg' }],
  },
  coverFallback: {
    position: 'absolute',
    right: -12,
    bottom: -12,
    width: 78,
    height: 78,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '18deg' }],
  },
  coverFallbackText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    transform: [{ rotate: '-18deg' }],
  },
});

export default GenreCard;
