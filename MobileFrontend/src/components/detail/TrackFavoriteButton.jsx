import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TrackFavoriteButton({
  activeOpacity = 0.75,
  color = '#9f9f9f',
  filledColor = '#ff6b81',
  isFavorite = false,
  isLoading = false,
  onPress,
  size = 20,
  style,
}) {
  return (
    <TouchableOpacity
      style={style}
      activeOpacity={activeOpacity}
      disabled={isLoading}
      onPress={onPress}
    >
      <Ionicons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? filledColor : color}
      />
    </TouchableOpacity>
  );
}
