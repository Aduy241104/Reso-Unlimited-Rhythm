import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { getInitials, resolveImageUri } from '../../utils/media';

const Artwork = ({ uri, label, rounded = false }) => {
  const imageUri = resolveImageUri(uri);
  const artworkStyle = [styles.artwork, rounded && styles.roundedArtwork];

  if (imageUri) {
    return (
      <Image
        source={imageUri}
        style={artworkStyle}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={imageUri}
        allowDownscaling
        enforceEarlyResizing
      />
    );
  }

  return (
    <View style={[artworkStyle, styles.artworkFallback]}>
      <Text style={styles.artworkText}>{getInitials(label)}</Text>
    </View>
  );
};

function FeaturedCollectionCard({
  title,
  description,
  image,
  onPress,
  rounded = false,
  style,
}) {
  return (
    <TouchableOpacity style={[styles.card, style]} activeOpacity={0.85} onPress={onPress}>
      <Artwork uri={image} label={title} rounded={rounded} />
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.description} numberOfLines={2}>{description}</Text>
    </TouchableOpacity>
  );
}

export default memo(FeaturedCollectionCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 5,
    padding: 0,
    backgroundColor: 'transparent',
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    backgroundColor: '#202020',
  },
  roundedArtwork: {
    borderRadius: 999,
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202020',
  },
  artworkText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  description: {
    marginTop: 3,
    color: '#a3a3a3',
    fontSize: 10,
    lineHeight: 14,
    minHeight: 28,
  },
});
