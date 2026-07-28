import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import theme from '../../theme';
import { getInitials, resolveImageUri } from '../../utils/media';

export const AppAvatar = ({ source, uri, label, size = 40, style }) => {
  const imageUri = resolveImageUri(source || uri);
  const avatarSize = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View style={[styles.avatar, avatarSize, style]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.img} transition={150} contentFit="cover" />
      ) : (
        <View style={styles.fallback}>
          <Text style={[styles.fallbackText, { fontSize: Math.max(12, size * 0.36) }]}>
            {getInitials(label)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  img: { width: '100%', height: '100%' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202020',
  },
  fallbackText: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
export default AppAvatar;
