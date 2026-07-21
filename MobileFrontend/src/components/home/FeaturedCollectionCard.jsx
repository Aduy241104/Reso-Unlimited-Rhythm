import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getInitials, resolveImageUri } from '../../utils/media';

const Artwork = ({ uri, label }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.artwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.artwork, styles.artworkFallback]}>
      <Text style={styles.artworkText}>{getInitials(label)}</Text>
    </View>
  );
};

export default function FeaturedCollectionCard({
  title,
  description,
  image,
  onPress,
  style,
}) {
  return (
    <TouchableOpacity style={[styles.card, style]} activeOpacity={0.85} onPress={onPress}>
      <Artwork uri={image} label={title} />
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.description} numberOfLines={2}>{description}</Text>
    </TouchableOpacity>
  );
}

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
