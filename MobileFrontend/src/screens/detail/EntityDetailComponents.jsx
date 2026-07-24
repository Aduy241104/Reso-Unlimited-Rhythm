import React from 'react';
import { Image, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TrackFavoriteButton from '../../components/detail/TrackFavoriteButton';
import { getInitials, resolveImageUri } from '../../utils/media';
import styles from './EntityDetailScreen.styles';

const getDisplayText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value);
    return normalizedValue.trim() ? normalizedValue : fallback;
  }

  if (value && typeof value === 'object') {
    if (typeof value.value === 'string' || typeof value.value === 'number') {
      const normalizedValue = String(value.value);
      return normalizedValue.trim() ? normalizedValue : fallback;
    }

    if (typeof value.label === 'string' || typeof value.label === 'number') {
      const normalizedValue = String(value.label);
      return normalizedValue.trim() ? normalizedValue : fallback;
    }
  }

  return fallback;
};

const isExplicitTrack = (item) => {
  return Boolean(
    item?.explicit ||
    item?.isExplicit ||
    item?.isExplicitContent ||
    item?.contentRating === 'explicit'
  );
};

export function Artwork({ uri, label, style, textStyle, rounded = false }) {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.artwork, rounded && styles.roundedArtwork, style]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.artwork, styles.artworkFallback, rounded && styles.roundedArtwork, style]}>
      <Text style={[styles.artworkFallbackText, textStyle]}>{getInitials(label)}</Text>
    </View>
  );
}

export function TrackListItem({
  artworkStyle,
  item,
  index,
  isFavorite = false,
  isFavoriteLoading = false,
  onFavoritePress,
  onMorePress,
  onPress,
  showIndex = false,
  style,
}) {
  const title = getDisplayText(item?.title, 'Nội dung không xác định');
  const subtitle = getDisplayText(item?.subtitle || item?.artistName);
  const explicit = isExplicitTrack(item);
  const artworkLabel = getDisplayText(item?.albumTitle || item?.artistName || item?.title, title);

  const handleMorePress = (event) => {
    event.stopPropagation?.();
    onMorePress?.();
  };

  const handleFavoritePress = (event) => {
    event.stopPropagation?.();
    onFavoritePress?.();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.listItem,
        style,
        pressed ? styles.listItemPressed : null,
      ]}
      onPress={onPress}
    >
      {showIndex ? (
        <Text style={styles.listIndex}>{index + 1}</Text>
      ) : null}

      <Artwork
        uri={item?.image || item?.coverImage}
        label={artworkLabel}
        style={[styles.listArtwork, artworkStyle]}
        textStyle={styles.listArtworkText}
      />

      <View style={styles.listContent}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.listSubtitleRow}>
          {explicit ? (
            <View style={styles.explicitBadge}>
              <Text style={styles.explicitBadgeText}>E</Text>
            </View>
          ) : null}

          {subtitle ? (
            <Text style={styles.listSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {onFavoritePress || onMorePress ? (
        <View style={styles.listActions}>
          {onFavoritePress ? (
            <TrackFavoriteButton
              style={styles.listActionButton}
              isFavorite={isFavorite}
              isLoading={isFavoriteLoading}
              onPress={handleFavoritePress}
            />
          ) : null}

          {onMorePress ? (
            <TouchableOpacity
              style={styles.moreButton}
              activeOpacity={0.7}
              onPress={handleMorePress}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#9f9f9f" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
